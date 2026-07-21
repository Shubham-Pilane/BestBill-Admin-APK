import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { supabase, clearSupabaseSession } from './supabaseClient';
import { LocalNotifications } from '@capacitor/local-notifications';
import { FileOpener } from '@capacitor-community/file-opener';

export default function App() {
  const [session, setSession] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const setupNotificationListener = async () => {
      try {
        const listener = await LocalNotifications.addListener(
          'localNotificationActionPerformed',
          async (action) => {
            console.log('Local Notification Action Performed:', action);
            const fileUri = action.notification.extra?.fileUri;
            if (fileUri) {
              try {
                await FileOpener.open({
                  filePath: fileUri,
                  contentType: 'application/pdf',
                  openWithDefault: true
                });
              } catch (err) {
                console.error('FileOpener error:', err);
                alert('Could not open PDF file. Make sure you have a PDF viewer installed.');
              }
            }
          }
        );
        return listener;
      } catch (err) {
        console.error('Error setting up notification listener:', err);
      }
    };

    const listenerPromise = setupNotificationListener();

    return () => {
      listenerPromise.then((listener) => {
        if (listener) {
          listener.remove();
        }
      });
    };
  }, []);

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
