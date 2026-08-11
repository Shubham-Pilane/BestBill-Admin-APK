import React, { useState } from 'react';
import { initSupabase } from '../supabaseClient';
import { Lock, Mail, Key } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState(localStorage.getItem('bb_user_email') || '');
  const [password, setPassword] = useState('');
  const [hotelCodesInput, setHotelCodesInput] = useState(localStorage.getItem('bb_user_hotel_codes_input') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (!password.trim()) {
      setError('Password is required.');
      return;
    }
    if (!hotelCodesInput.trim()) {
      setError('Hotel Code is required. Please enter your Hotel Code.');
      return;
    }

    const parsedCodes = hotelCodesInput
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);

    if (parsedCodes.length === 0) {
      setError('Hotel Code is required. Please enter your Hotel Code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const client = initSupabase();
      if (!client) {
        throw new Error('Connection failed. Please check your internet connection.');
      }

      const { data, error: authErr } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (authErr) {
        throw new Error(authErr.message || 'Invalid Email or Password');
      }

      // Verify EVERY entered Hotel Code exists
      const { data: matchedHotels, error: hotelErr } = await client
        .from('hotels')
        .select('hotel_code, hotel_name')
        .in('hotel_code', parsedCodes);

      const foundCodes = (matchedHotels || []).map(h => h.hotel_code);
      const allCodesValid = parsedCodes.length > 0 && parsedCodes.every(code => foundCodes.includes(code));

      if (hotelErr || !allCodesValid) {
        // Sign out immediately so session is not active for unauthorized codes
        await client.auth.signOut().catch(() => {});
        localStorage.removeItem('bb_authorized_hotel_codes');
        throw new Error('Invalid Hotel Code. Please check your Hotel Code and try again.');
      }

      const validCodes = Array.from(new Set(foundCodes));

      localStorage.setItem('bb_user_email', email.trim());
      localStorage.setItem('bb_user_hotel_codes_input', hotelCodesInput.trim());
      localStorage.setItem('bb_authorized_hotel_codes', JSON.stringify(validCodes));

      onLoginSuccess(data.session, validCodes);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials and Hotel Code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-card animate-fade-in" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '32px 24px',
        borderRadius: '24px'
      }}>
        
        {/* App Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img
            src="/logo.svg"
            alt="BestBill Logo"
            style={{
              width: '64px',
              height: '64px',
              objectFit: 'contain',
              marginBottom: '12px',
              filter: 'drop-shadow(0 8px 16px rgba(14, 165, 233, 0.35))'
            }}
          />
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            BestBill <span style={{ color: 'var(--emerald-primary)' }}>Admin</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '6px 0 0 0', fontWeight: 600 }}>
            Hotel Owner Remote Analytics Portal
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid var(--rose-primary)',
            color: 'var(--rose-primary)',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '20px'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Owner Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>OWNER EMAIL ADDRESS</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)' }} />
              <input
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@gmail.com"
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 40px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Owner Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>ACCOUNT PASSWORD</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 40px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Hotel Code(s) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>HOTEL CODE(S)</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Key size={18} style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={hotelCodesInput}
                onChange={(e) => setHotelCodesInput(e.target.value)}
                placeholder=""
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 40px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ marginTop: '8px', padding: '14px', fontSize: '15px' }}
          >
            {loading ? 'Validating Hotel Codes...' : 'Sign In to Dashboard'}
          </button>

        </form>
      </div>
    </div>
  );
}
