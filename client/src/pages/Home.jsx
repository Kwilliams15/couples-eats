import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export default function Home({ setSession }) {
  const navigate = useNavigate();
  const [view, setView] = useState('home'); // 'home' | 'join'
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMessage = useCallback((data) => {
    if (data.type === 'ROOM_CREATED') {
      setSession(s => ({ ...s, roomCode: data.roomCode, role: data.role }));
      navigate('/survey');
    } else if (data.type === 'ROOM_JOINED') {
      setSession(s => ({ ...s, roomCode: data.roomCode, role: data.role }));
      navigate('/survey');
    } else if (data.type === 'ERROR') {
      setError(data.message);
      setLoading(false);
    }
  }, [navigate, setSession]);

  const { connect, send } = useWebSocket(handleMessage);

  const createRoom = () => {
    setLoading(true);
    setError('');
    const socket = connect();
    socket.onopen = () => {
      setSession({ send: (d) => socket.send(JSON.stringify(d)), ws: socket });
      socket.send(JSON.stringify({ type: 'CREATE_ROOM' }));
    };
    socket.onerror = () => { setError('Could not connect to server.'); setLoading(false); };
  };

  const joinRoom = () => {
    if (!joinCode.trim()) { setError('Enter a room code.'); return; }
    setLoading(true);
    setError('');
    const socket = connect();
    socket.onopen = () => {
      setSession({ send: (d) => socket.send(JSON.stringify(d)), ws: socket });
      socket.send(JSON.stringify({ type: 'JOIN_ROOM', roomCode: joinCode.trim() }));
    };
    socket.onerror = () => { setError('Could not connect to server.'); setLoading(false); };
  };

  return (
    <div className="page" style={{ justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🍽️</div>
        <h1 className="page-title" style={{ fontSize: '2.6rem' }}>Couples Eats</h1>
        <p className="page-subtitle" style={{ maxWidth: 360, margin: '12px auto 0' }}>
          Answer a quick survey together and we'll find the perfect restaurant for your date night.
        </p>
      </div>

      {view === 'home' && (
        <div className="card" style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button className="btn btn-primary" onClick={createRoom} disabled={loading} style={{ width: '100%', fontSize: '1.05rem', padding: '16px' }}>
            {loading ? 'Connecting…' : '💑 Start a New Session'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>or</span>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
          </div>
          <button className="btn btn-secondary" onClick={() => setView('join')} style={{ width: '100%' }}>
            🔗 Join Partner's Session
          </button>
          {error && <p className="error-msg">{error}</p>}
        </div>
      )}

      {view === 'join' && (
        <div className="card" style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: '1.3rem', fontFamily: 'Inter', fontWeight: 600 }}>Enter Room Code</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Your partner will see a 5-letter code after they start a session.</p>
          <input
            type="text"
            placeholder="e.g. XKQZ2"
            maxLength={5}
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '1.2rem', textAlign: 'center' }}
            onKeyDown={e => e.key === 'Enter' && joinRoom()}
          />
          <button className="btn btn-primary" onClick={joinRoom} disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Joining…' : 'Join Session'}
          </button>
          <button className="btn btn-secondary" onClick={() => { setView('home'); setError(''); }} style={{ width: '100%' }}>
            ← Back
          </button>
          {error && <p className="error-msg">{error}</p>}
        </div>
      )}

      <p style={{ marginTop: 32, color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
        Each person fills out the survey on their own device, then we match you to the perfect spot.
      </p>
    </div>
  );
}
