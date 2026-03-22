import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const QUESTIONS = [
  {
    id: 'cuisines',
    question: "What cuisines are you feeling?",
    subtitle: "Pick all that sound good right now.",
    type: 'multi',
    options: [
      { label: '🍕 Italian', value: 'Italian' },
      { label: '🍣 Japanese', value: 'Japanese' },
      { label: '🌮 Mexican', value: 'Mexican' },
      { label: '🍔 American', value: 'American' },
      { label: '🍜 Chinese', value: 'Chinese' },
      { label: '🍛 Indian', value: 'Indian' },
      { label: '🥙 Mediterranean', value: 'Mediterranean' },
      { label: '🥡 Thai', value: 'Thai' },
      { label: '🍗 Korean', value: 'Korean' },
      { label: '🥗 Healthy / Salads', value: 'Healthy' },
    ]
  },
  {
    id: 'priceRange',
    question: "What's your budget for tonight?",
    subtitle: "Per person, before drinks.",
    type: 'single',
    options: [
      { label: '$ Under $15', value: '$' },
      { label: '$$ $15 – $30', value: '$$' },
      { label: '$$$ $30 – $60', value: '$$$' },
      { label: '$$$$ $60+', value: '$$$$' },
    ]
  },
  {
    id: 'vibe',
    question: "What's the vibe you're going for?",
    subtitle: "Pick the one that fits tonight.",
    type: 'single',
    options: [
      { label: '🕯️ Romantic & intimate', value: 'romantic' },
      { label: '😎 Casual & laid-back', value: 'casual' },
      { label: '⚡ Quick & easy', value: 'fast' },
      { label: '✨ Trendy & fun', value: 'trendy' },
    ]
  },
  {
    id: 'dietary',
    question: "Any dietary needs?",
    subtitle: "Select all that apply.",
    type: 'multi',
    options: [
      { label: '🥬 Vegetarian options needed', value: 'vegetarian' },
      { label: '🌱 Vegan options needed', value: 'vegan' },
      { label: '🌾 Gluten-free options needed', value: 'gluten-free' },
      { label: '🥩 Halal', value: 'halal' },
      { label: '✡️ Kosher', value: 'kosher' },
      { label: '😌 No restrictions', value: 'none' },
    ]
  },
  {
    id: 'diningMode',
    question: "How do you want to eat?",
    subtitle: "Just one tonight.",
    type: 'single',
    options: [
      { label: '🪑 Sit-down / dine-in', value: 'dine-in' },
      { label: '📦 Takeout / pickup', value: 'takeout' },
      { label: '🛵 Delivery', value: 'delivery' },
      { label: '🙂 No preference', value: 'any' },
    ]
  },
  {
    id: 'mood',
    question: "What's your food mood?",
    subtitle: "How adventurous are you feeling?",
    type: 'single',
    options: [
      { label: '🗺️ Let\'s try something new', value: 'adventurous' },
      { label: '🏡 Comfort food please', value: 'comfort' },
      { label: '⚖️ Somewhere in between', value: 'balanced' },
    ]
  },
  {
    id: 'seating',
    question: "Seating preference?",
    subtitle: "Inside, outside, or anywhere?",
    type: 'single',
    options: [
      { label: '🏠 Indoors', value: 'indoor' },
      { label: '🌿 Outdoors / patio', value: 'outdoor' },
      { label: '💁 No preference', value: 'any' },
    ]
  },
  {
    id: 'waitTime',
    question: "How long are you willing to wait?",
    subtitle: "Hunger level check.",
    type: 'single',
    options: [
      { label: '⚡ I\'m starving — 10 min max', value: 'none' },
      { label: '🕐 Up to 30 minutes is fine', value: 'short' },
      { label: '🕑 We can wait an hour if it\'s worth it', value: 'long' },
    ]
  },
  {
    id: 'dealbreakers',
    question: "Any absolute dealbreakers?",
    subtitle: "We'll try to avoid these.",
    type: 'multi',
    options: [
      { label: '🐟 No seafood', value: 'no-seafood' },
      { label: '🌶️ Nothing too spicy', value: 'no-spicy' },
      { label: '🥩 No red meat', value: 'no-red-meat' },
      { label: '🧅 No onions / garlic', value: 'no-alliums' },
      { label: '🥛 No dairy', value: 'no-dairy' },
      { label: '👍 No dealbreakers', value: 'none' },
    ]
  },
  {
    id: 'priority',
    question: "What matters most when picking a place?",
    subtitle: "Pick your top priority.",
    type: 'single',
    options: [
      { label: '⭐ Best ratings & reviews', value: 'rating' },
      { label: '📍 Closest to us', value: 'distance' },
      { label: '💰 Best value for money', value: 'value' },
      { label: '📸 Instagrammable / ambiance', value: 'ambiance' },
    ]
  },
];

export default function Survey({ session }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [partnerReady, setPartnerReady] = useState(false);

  // Listen for partner events
  useEffect(() => {
    if (!session?.ws) return;
    const handler = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'PARTNER_READY') setPartnerReady(true);
        if (data.type === 'RESULTS') {
          navigate('/results', { state: { restaurants: data.restaurants, sharedCuisines: data.sharedCuisines } });
        }
        if (data.type === 'PARTNER_DISCONNECTED') {
          alert('Your partner disconnected.');
        }
      } catch {}
    };
    session.ws.addEventListener('message', handler);
    return () => session.ws.removeEventListener('message', handler);
  }, [session, navigate]);

  // Try GPS on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocationError('Could not auto-detect location. Please enter it manually.')
      );
    } else {
      setLocationError('Geolocation not supported. Please enter manually.');
    }
  }, []);

  const current = QUESTIONS[step];
  const answer = answers[current?.id];
  const isMulti = current?.type === 'multi';

  const toggle = (value) => {
    setAnswers(prev => {
      const existing = prev[current.id] || [];
      if (isMulti) {
        return {
          ...prev,
          [current.id]: existing.includes(value)
            ? existing.filter(v => v !== value)
            : [...existing, value]
        };
      }
      return { ...prev, [current.id]: value };
    });
  };

  const isSelected = (value) => {
    if (isMulti) return (answers[current.id] || []).includes(value);
    return answers[current.id] === value;
  };

  const canProceed = isMulti
    ? (answers[current?.id] || []).length > 0
    : !!answers[current?.id];

  const next = () => {
    if (step < QUESTIONS.length - 1) {
      setStep(s => s + 1);
    } else {
      submitAnswers();
    }
  };

  const submitAnswers = () => {
    const loc = location || (manualLat && manualLng ? { lat: parseFloat(manualLat), lng: parseFloat(manualLng) } : null);
    session.send({ type: 'SUBMIT_ANSWERS', answers, location: loc });
    navigate('/waiting', { state: { partnerReady } });
  };

  const progress = ((step + 1) / QUESTIONS.length) * 100;

  return (
    <div className="page">
      {/* Room code badge */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Room: <strong style={{ color: 'var(--pink)', letterSpacing: '0.1em' }}>{session.roomCode}</strong>
        </span>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {step + 1} / {QUESTIONS.length}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 99, marginBottom: 32, overflow: 'hidden' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--pink)', borderRadius: 99, transition: 'width 0.3s' }} />
      </div>

      {/* Location warning */}
      {!location && (
        <div style={{ width: '100%', marginBottom: 20 }}>
          {locationError && (
            <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 10, padding: '12px 16px', fontSize: '0.85rem', color: '#92400e' }}>
              ⚠️ {locationError}
              <button onClick={() => setShowManual(!showManual)} style={{ marginLeft: 8, color: 'var(--pink)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                {showManual ? 'Hide' : 'Enter manually'}
              </button>
            </div>
          )}
          {showManual && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input type="number" placeholder="Latitude" value={manualLat} onChange={e => setManualLat(e.target.value)} style={{ flex: 1 }} />
              <input type="number" placeholder="Longitude" value={manualLng} onChange={e => setManualLng(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-primary" style={{ padding: '14px 18px' }}
                onClick={() => { if (manualLat && manualLng) setLocation({ lat: parseFloat(manualLat), lng: parseFloat(manualLng) }); }}>
                ✓
              </button>
            </div>
          )}
          {location && <p style={{ color: '#15803d', fontSize: '0.85rem', marginTop: 8 }}>📍 Location set!</p>}
        </div>
      )}
      {location && (
        <div style={{ width: '100%', marginBottom: 16, fontSize: '0.8rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: 4 }}>
          📍 Location detected
        </div>
      )}

      {/* Question card */}
      <div className="card" style={{ width: '100%' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: 6 }}>{current.question}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 24 }}>{current.subtitle}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {current.options.map(opt => (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              style={{
                padding: '14px 18px',
                borderRadius: 12,
                border: `2px solid ${isSelected(opt.value) ? 'var(--pink)' : 'var(--border)'}`,
                background: isSelected(opt.value) ? 'var(--rose)' : 'white',
                color: isSelected(opt.value) ? 'var(--pink-dark)' : 'var(--text)',
                fontWeight: isSelected(opt.value) ? 600 : 400,
                fontSize: '0.95rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, gap: 12 }}>
          {step > 0 ? (
            <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>
              ← Back
            </button>
          ) : <div />}
          <button
            className="btn btn-primary"
            onClick={next}
            disabled={!canProceed}
            style={{ minWidth: 140 }}
          >
            {step === QUESTIONS.length - 1 ? '🍽️ Find Restaurants' : 'Next →'}
          </button>
        </div>
      </div>

      {partnerReady && (
        <div style={{ marginTop: 20, padding: '12px 20px', background: '#d1fae5', borderRadius: 12, fontSize: '0.9rem', color: '#065f46' }}>
          ✅ Your partner has finished their survey!
        </div>
      )}
    </div>
  );
}
