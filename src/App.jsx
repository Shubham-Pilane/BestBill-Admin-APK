import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { supabase, clearSupabaseSession } from './supabaseClient';

export default function App() {
  const [session, setSession] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setInitializing(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setInitializing(false);
      });

      return () => subscription.unsubscribe();
    } else {
      setInitializing(false);
    }
  }, []);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    clearSupabaseSession();
    setSession(null);
  };

  if (initializing) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald-primary)', fontWeight: 800 }}>
        Loading BestBill Admin Portal...
      </div>
    );
  }

  return session ? (
    <Dashboard session={session} onLogout={handleLogout} />
  ) : (
    <Login onLoginSuccess={(sess) => setSession(sess)} />
  );
}
