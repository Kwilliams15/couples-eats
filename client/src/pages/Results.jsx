import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PRICE_LABEL = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

export default function Results() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [picked, setPicked] = useState(null);

  const restaurants = state?.restaurants || [];
  const sharedCuisines = state?.sharedCuisines || [];

  if (!restaurants.length) {
    return (
      <div className="page" style={{ justifyContent: 'center', minHeight: '100vh', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>😕</div>
        <h2 className="page-title">No results found</h2>
        <p className="page-subtitle">Try adjusting your preferences or expanding your area.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>Start Over</button>
      </div>
    );
  }

  if (picked) {
    return <PickedScreen restaurant={picked} onBack={() => setPicked(null)} onHome={() => navigate('/')} />;
  }

  return (
    <div className="page">
      <div style={{ textAlign: 'center', marginBottom: 32, paddingTop: 16 }}>
        <div style={{ fontSize: 52 }}>🎉</div>
        <h1 className="page-title" style={{ fontSize: '2rem', marginTop: 8 }}>Here are your matches!</h1>
        {sharedCuisines.length > 0 && (
          <p className="page-subtitle" style={{ marginTop: 8 }}>
            You both enjoy: <strong>{sharedCuisines.join(', ')}</strong>
          </p>
        )}
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Sorted by how well they match both of your preferences.
        </p>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {restaurants.map((r, i) => (
          <RestaurantCard key={r.place_id || i} restaurant={r} rank={i + 1} onPick={() => setPicked(r)} />
        ))}
      </div>

      <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginTop: 32 }}>
        🔄 Start Over
      </button>
    </div>
  );
}

function RestaurantCard({ restaurant: r, rank, onPick }) {
  const photo = r.photos?.[0]
    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${r.photos[0].photo_reference}&key=${import.meta.env.VITE_GOOGLE_API_KEY}`
    : null;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }} onClick={onPick}>
      {photo && (
        <img src={photo} alt={r.name} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
      )}
      {!photo && (
        <div style={{ width: '100%', height: 100, background: 'linear-gradient(135deg, var(--rose), #ffecd2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
          🍽️
        </div>
      )}
      <div style={{ padding: '20px 24px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {rank <= 3 && <span style={{ fontSize: '1.1rem' }}>{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</span>}
              <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1.1rem' }}>{r.name}</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{r.vicinity}</p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {r.price_level && (
              <span style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 600 }}>
                {PRICE_LABEL[r.price_level]}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
          {r.rating && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.9rem' }}>
              ⭐ <strong>{r.rating}</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({r.user_ratings_total?.toLocaleString()})</span>
            </span>
          )}
          {r.opening_hours?.open_now !== undefined && (
            <span style={{
              fontSize: '0.8rem',
              padding: '3px 10px',
              borderRadius: 99,
              background: r.opening_hours.open_now ? '#d1fae5' : '#fee2e2',
              color: r.opening_hours.open_now ? '#065f46' : '#dc2626',
              fontWeight: 600
            }}>
              {r.opening_hours.open_now ? 'Open now' : 'Closed'}
            </span>
          )}
        </div>

        {r.types?.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {r.types.slice(0, 3).filter(t => t !== 'food' && t !== 'establishment' && t !== 'point_of_interest').map(t => (
              <span key={t} style={{
                fontSize: '0.75rem',
                padding: '3px 10px',
                borderRadius: 99,
                background: 'var(--rose)',
                color: 'var(--pink-dark)',
              }}>
                {t.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{
            padding: '4px 12px',
            borderRadius: 99,
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            fontSize: '0.8rem',
            color: '#15803d',
            fontWeight: 600,
          }}>
            Match: {r.matchScore}pts
          </div>
          <span style={{ color: 'var(--pink)', fontWeight: 600, fontSize: '0.9rem' }}>Tap to pick →</span>
        </div>
      </div>
    </div>
  );
}

function PickedScreen({ restaurant: r, onBack, onHome }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name)}&query_place_id=${r.place_id}`;

  return (
    <div className="page" style={{ justifyContent: 'center', minHeight: '100vh', textAlign: 'center' }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>🎊</div>
      <h1 className="page-title" style={{ fontSize: '2.2rem', marginBottom: 8 }}>You're going to</h1>
      <h2 style={{ fontSize: '1.8rem', color: 'var(--pink)', marginBottom: 8, fontFamily: 'Playfair Display' }}>{r.name}</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>{r.vicinity}</p>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ textDecoration: 'none' }}
        >
          📍 Open in Google Maps
        </a>
        <button className="btn btn-secondary" onClick={onBack}>← See Other Options</button>
      </div>

      <button className="btn" onClick={onHome} style={{ marginTop: 16, color: 'var(--text-muted)', background: 'transparent' }}>
        Start a new session
      </button>
    </div>
  );
}
