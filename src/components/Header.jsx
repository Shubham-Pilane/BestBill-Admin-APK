import React from 'react';
import { Building2, LogOut, RefreshCw, Sun, Moon, Plus } from 'lucide-react';

export default function Header({ 
  hotels, 
  selectedHotelCode, 
  onSelectHotel, 
  onLogout, 
  onRefresh, 
  loading,
  theme,
  onToggleTheme,
  onAddHotel
}) {
  const isMultiHotel = hotels.length > 1;
  const singleHotel = hotels.length === 1 ? hotels[0] : null;

  return (
    <header className="glass-card" style={{ padding: '14px 16px', marginBottom: '16px', borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Top Row: Brand & Quick Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
          
          {/* Logo & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <img
              src="/logo.svg"
              alt="BestBill Logo"
              style={{
                width: '36px',
                height: '36px',
                objectFit: 'contain',
                flexShrink: 0
              }}
            />
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                BestBill <span style={{ color: 'var(--emerald-primary)' }}>Admin</span>
              </h1>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {singleHotel ? `🏨 ${singleHotel.hotel_name}` : 'Cloud Analytics'}
              </span>
            </div>
          </div>

          {/* Quick Header Actions: Add Hotel, Theme Toggle, Refresh & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            
            {/* Add Hotel Button */}
            {onAddHotel && (
              <button
                onClick={onAddHotel}
                title="Add New Hotel Code"
                style={{
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--emerald-primary)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Plus size={16} color="var(--emerald-primary)" />
                <span style={{ fontSize: '12px' }}>Add Hotel</span>
              </button>
            )}

            {/* Theme Toggle Button */}
            <button 
              onClick={onToggleTheme} 
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              style={{ 
                padding: '8px 12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '6px',
                backgroundColor: 'var(--bg-accent)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={16} color="var(--amber-primary)" />
                  <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>Light</span>
                </>
              ) : (
                <>
                  <Moon size={16} color="var(--indigo-primary)" />
                  <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>Dark</span>
                </>
              )}
            </button>

            {/* Refresh Button */}
            <button 
              onClick={onRefresh} 
              disabled={loading}
              title="Refresh Data"
              style={{ 
                padding: '8px 12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '6px',
                backgroundColor: 'var(--bg-accent)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.7 : 1
              }}
            >
              <RefreshCw 
                size={16} 
                className={loading ? 'animate-spin' : ''} 
                style={{ 
                  color: 'var(--cyan-primary)',
                  transition: 'transform 0.3s ease'
                }} 
              />
              <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </span>
            </button>

            {/* Header Logout Button */}
            <button 
              onClick={onLogout} 
              title="Logout"
              style={{ 
                padding: '8px 12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '6px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)', 
                color: 'var(--rose-primary)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Dropdown ONLY shown if user is associated with MULTIPLE hotels */}
        {isMultiHotel && (
          <div style={{ position: 'relative', width: '100%' }}>
            <Building2 size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--emerald-primary)', pointerEvents: 'none', zIndex: 1 }} />
            <select
              value={selectedHotelCode}
              onChange={(e) => onSelectHotel(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-accent)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                padding: '10px 14px 10px 36px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
                textOverflow: 'ellipsis',
                boxSizing: 'border-box'
              }}
            >
              <option value="ALL">🏨 All Hotels Combined ({hotels.length} Hotels)</option>
              {hotels.map((h) => (
                <option key={h.hotel_code} value={h.hotel_code}>
                  🏨 {h.hotel_name} ({h.hotel_code})
                </option>
              ))}
            </select>
          </div>
        )}

      </div>
    </header>
  );
}
