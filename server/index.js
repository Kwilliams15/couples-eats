require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const rooms = {};

const { inferCuisineFromName, getCuisineCompat, harmonicMean, scorePlace, CUISINE_SEARCH_MAP } = require('./algorithm');

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function broadcast(room, data) {
  Object.values(room.players).forEach(player => {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(data));
    }
  });
}

// ─────────────────────────────────────────────────────────────
// GOOGLE PLACES SEARCH
// ─────────────────────────────────────────────────────────────

async function searchNearby(location, cuisine, apiKey) {
  const keyword = CUISINE_SEARCH_MAP[cuisine] || cuisine;
  const params = {
    location: `${location.lat},${location.lng}`,
    radius: 8047, // 5 miles in meters
    type: 'restaurant',
    keyword: keyword.toLowerCase(),
    key: apiKey,
  };
  const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', { params });
  const status = response.data.status;
  if (status === 'REQUEST_DENIED') throw Object.assign(new Error('API key invalid or Places API not enabled.'), { code: 'DENIED' });
  if (status === 'INVALID_REQUEST') throw Object.assign(new Error('Invalid request — check location data.'), { code: 'INVALID' });
  return response.data.results || [];
}

// ─────────────────────────────────────────────────────────────
// COMPUTE RESULTS
// ─────────────────────────────────────────────────────────────
async function computeAndSendResults(room, roomCode) {
  try {
    const { p1, p2 } = room.players;
    const a1 = p1.answers;
    const a2 = p2.answers;
    const location = room.location;

    if (!location) {
      broadcast(room, { type: 'ERROR', message: 'Location not available. Reload and allow location access.' });
      return;
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      broadcast(room, { type: 'ERROR', message: 'No Google Places API key set on the server.' });
      return;
    }

    // Build search terms: all unique cuisines from both people + a broad catch-all
    const cuisines1 = a1.cuisines || [];
    const cuisines2 = a2.cuisines || [];
    const allTerms = [...new Set([...cuisines1, ...cuisines2, 'restaurant'])];

    console.log(`[${roomCode}] Searching for: ${allTerms.join(', ')}`);

    // Fire all searches in parallel
    const results = await Promise.allSettled(
      allTerms.map(term => searchNearby(location, term, apiKey))
    );

    // Check for API denial
    for (const r of results) {
      if (r.status === 'rejected' && r.reason && r.reason.code === 'DENIED') {
        broadcast(room, { type: 'ERROR', message: r.reason.message });
        return;
      }
    }

    // Merge results — deduplicate by place_id, track which cuisine searches found each place
    const placeMap = new Map();
    allTerms.forEach((term, i) => {
      if (results[i].status !== 'fulfilled') return;
      (results[i].value || []).forEach(place => {
        if (placeMap.has(place.place_id)) {
          // Accumulate cuisine tags (skip the generic 'restaurant' term)
          if (term !== 'restaurant') placeMap.get(place.place_id).foundBy.push(term);
        } else {
          place.foundBy = term !== 'restaurant' ? [term] : [];
          placeMap.set(place.place_id, place);
        }
      });
    });

    const places = Array.from(placeMap.values());
    console.log(`[${roomCode}] Pool size: ${places.length} restaurants`);

    // Score every restaurant
    const scored = places.map(place => ({
      ...place,
      matchScore: scorePlace(place, a1, a2),
    }));

    scored.sort((a, b) => b.matchScore - a.matchScore);
    const top = scored.slice(0, 10);

    const sharedCuisines = cuisines1.filter(c => cuisines2.includes(c));

    broadcast(room, { type: 'RESULTS', restaurants: top, sharedCuisines });

    // Clean up room after 30 min
    setTimeout(() => delete rooms[roomCode], 30 * 60 * 1000);

  } catch (err) {
    console.error('computeAndSendResults error:', err.message);
    broadcast(room, { type: 'ERROR', message: 'Failed to fetch restaurants. Please try again.' });
  }
}

// ─────────────────────────────────────────────────────────────
// WEBSOCKET HANDLER
// ─────────────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  let currentRoom = null;
  let currentRole = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'CREATE_ROOM') {
      const code = generateRoomCode();
      rooms[code] = { players: { p1: { ws, answers: null, ready: false } }, location: null, created: Date.now() };
      currentRoom = code;
      currentRole = 'p1';
      ws.send(JSON.stringify({ type: 'ROOM_CREATED', roomCode: code, role: 'p1' }));
    }

    else if (msg.type === 'JOIN_ROOM') {
      const code = (msg.roomCode || '').toUpperCase();
      const room = rooms[code];
      if (!room) { ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found.' })); return; }
      if (room.players.p2) { ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is full.' })); return; }
      room.players.p2 = { ws, answers: null, ready: false };
      currentRoom = code;
      currentRole = 'p2';
      ws.send(JSON.stringify({ type: 'ROOM_JOINED', roomCode: code, role: 'p2' }));
      broadcast(room, { type: 'PARTNER_JOINED' });
    }

    else if (msg.type === 'SUBMIT_ANSWERS') {
      const room = rooms[currentRoom];
      if (!room || !currentRole) return;
      room.players[currentRole].answers = msg.answers;
      room.players[currentRole].ready = true;
      if (msg.location) room.location = msg.location;

      const partnerRole = currentRole === 'p1' ? 'p2' : 'p1';
      const partner = room.players[partnerRole];
      if (partner && partner.ws && partner.ws.readyState === WebSocket.OPEN) {
        partner.ws.send(JSON.stringify({ type: 'PARTNER_READY' }));
      }

      if (room.players.p1 && room.players.p1.ready && room.players.p2 && room.players.p2.ready) {
        computeAndSendResults(room, currentRoom);
      }
    }

    else if (msg.type === 'SET_LOCATION') {
      const room = rooms[currentRoom];
      if (room && !room.location) room.location = msg.location;
    }
  });

  ws.on('close', () => {
    if (currentRoom && rooms[currentRoom]) {
      const partnerRole = currentRole === 'p1' ? 'p2' : 'p1';
      const partner = rooms[currentRoom].players[partnerRole];
      if (partner && partner.ws && partner.ws.readyState === WebSocket.OPEN) {
        partner.ws.send(JSON.stringify({ type: 'PARTNER_DISCONNECTED' }));
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────
// REST ENDPOINTS
// ─────────────────────────────────────────────────────────────
app.get('/api/restaurants', async (req, res) => {
  const { lat, lng, keyword = 'restaurant' } = req.query;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
      params: { location: `${lat},${lng}`, radius: 8047, type: 'restaurant', keyword, key: apiKey }
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
