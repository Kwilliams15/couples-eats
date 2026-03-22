import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Waiting({ session }) {
  const navigate = useNavigate();
  const { state } = useLocation();

  useEffect(() => {
    if (!session?.ws) return;
    const handler = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'RESULTS') {
          navigate('/results', { state: { restaurants: data.restaurants, sharedCuisines: data.sharedCuisines } });
        }
        if (data.type === 'ERROR') {
          alert(data.message);
        }
        if (data.type === 'PARTNER_DISCONNECTED') {
          alert('Your partner disconnected. Please try again.');
          navigate('/');
        }
      } catch {}
    };
    session.ws.addEventListener('message', handler);
    return () => session.ws.removeEventListener('message', handler);
  }, [session, navigate]);

  return (
    <div className="page" style={{ justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 24, animation: 'spin 2s linear infinite' }}>⏳</div>
        <h1 className="page-title" style={{ fontSize: '2rem', marginBottom: 12 }}>You're all done!</h1>
        <p className="page-subtitle" style={{ maxWidth: 340, margin: '0 auto 32px' }}>
          {state?.partnerReady
            ? 'Both surveys received! Finding your perfect restaurants…'
            : 'Waiting for your partner to finish their survey…'}
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 32 }}>
          <div style={dotStyle(1)} />
          <div style={dotStyle(2)} />
          <div style={dotStyle(3)} />
        </div>

        <div className="card" style={{ maxWidth: 340, margin: '0 auto', textAlign: 'left' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Share your room code with your partner so they can join:
          </p>
          <div style={{
            marginTop: 12,
            padding: '16px',
            background: 'var(--rose)',
            borderRadius: 12,
            textAlign: 'center',
            fontSize: '2rem',
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: 'var(--pink-dark)',
            fontFamily: 'monospace',
          }}>
            {session?.roomCode}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-10px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function dotStyle(n) {
  return {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: 'var(--pink)',
    animation: `bounce 1.2s ease-in-out ${(n - 1) * 0.2}s infinite`,
  };
}
