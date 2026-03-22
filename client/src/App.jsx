import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Survey from './pages/Survey';
import Waiting from './pages/Waiting';
import Results from './pages/Results';

export default function App() {
  const [session, setSession] = useState(null);
  // session: { roomCode, role, ws, send }

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home setSession={setSession} />} />
        <Route path="/survey" element={
          session ? <Survey session={session} /> : <Navigate to="/" />
        } />
        <Route path="/waiting" element={
          session ? <Waiting session={session} /> : <Navigate to="/" />
        } />
        <Route path="/results" element={<Results />} />
      </Routes>
    </div>
  );
}
