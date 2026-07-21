import React from 'react';
import { IndianRupee, ShoppingBag, Wallet, UtensilsCrossed, Package, CreditCard } from 'lucide-react';

export default function MetricsCards({ summary }) {
  const formatCurrency = (amt) => `₹ ${Number(amt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
      
      {/* 1. Total Revenue Card */}
      <div className="glass-card gradient-banner" style={{ padding: '20px', borderRadius: '16px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', opacity: 0.9 }}>
            Total Net Revenue
          </span>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IndianRupee size={20} color="#ffffff" />
          </div>
        </div>
        <h2 style={{ fontSize: '26px', fontWeight: 800, margin: '12px 0 4px 0', color: '#ffffff' }}>
          {formatCurrency(summary.total_revenue)}
        </h2>
        <span style={{ fontSize: '11px', opacity: 0.85, fontWeight: 600 }}>
          {summary.total_orders} Total Orders Processed
        </span>
      </div>

      {/* 2. Cash Collection Card */}
      <div className="glass-card" style={{ padding: '20px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Cash Collection
          </span>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={20} color="var(--emerald-primary)" />
          </div>
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '12px 0 4px 0', color: 'var(--text-primary)' }}>
          {formatCurrency(summary.cash_collection)}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
          <div style={{ flex: 1, height: '4px', background: 'var(--bg-accent)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              background: 'var(--emerald-primary)', 
              width: `${summary.total_revenue > 0 ? (summary.cash_collection / summary.total_revenue) * 100 : 0}%` 
            }}></div>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>
            {summary.total_revenue > 0 ? Math.round((summary.cash_collection / summary.total_revenue) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* 3. Online / UPI Collection Card */}
      <div className="glass-card" style={{ padding: '20px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            UPI / Online Collection
          </span>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={20} color="var(--cyan-primary)" />
          </div>
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '12px 0 4px 0', color: 'var(--text-primary)' }}>
          {formatCurrency(summary.online_collection)}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
          <div style={{ flex: 1, height: '4px', background: 'var(--bg-accent)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              background: 'var(--cyan-primary)', 
              width: `${summary.total_revenue > 0 ? (summary.online_collection / summary.total_revenue) * 100 : 0}%` 
            }}></div>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>
            {summary.total_revenue > 0 ? Math.round((summary.online_collection / summary.total_revenue) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* 4. Dine-In vs Parcel Split Card */}
      <div className="glass-card" style={{ padding: '20px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Dine-In vs Parcel
          </span>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UtensilsCrossed size={20} color="var(--indigo-primary)" />
          </div>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>🍽️ Dine-In:</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{formatCurrency(summary.dine_in_sales)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>🛍️ Parcel:</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{formatCurrency(summary.parcel_sales)}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
