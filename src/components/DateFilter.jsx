import React from 'react';
import { Calendar, Download, Filter, TrendingUp } from 'lucide-react';

export default function DateFilter({
  activeFilter,
  onChangeFilter,
  startDate,
  endDate,
  onChangeStartDate,
  onChangeEndDate,
  onExportPdf,
  isExporting,
  onOpenRevenueAnalytics
}) {
  return (
    <div className="glass-card" style={{ padding: '16px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '4px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700 }}>
            <Filter size={14} />
            RANGE:
          </div>

          <button
            onClick={() => onChangeFilter('today')}
            className={`filter-pill ${activeFilter === 'today' ? 'active' : ''}`}
          >
            ⚡ Today
          </button>

          <button
            onClick={() => onChangeFilter('yesterday')}
            className={`filter-pill ${activeFilter === 'yesterday' ? 'active' : ''}`}
          >
            ⏪ Yesterday
          </button>

          <button
            onClick={() => onChangeFilter('week')}
            className={`filter-pill ${activeFilter === 'week' ? 'active' : ''}`}
          >
            📅 This Week
          </button>

          <button
            onClick={() => onChangeFilter('last_week')}
            className={`filter-pill ${activeFilter === 'last_week' ? 'active' : ''}`}
          >
            ⏮️ Last Week
          </button>

          <button
            onClick={() => onChangeFilter('month')}
            className={`filter-pill ${activeFilter === 'month' ? 'active' : ''}`}
          >
            🗓️ Monthly
          </button>

          <button
            onClick={() => onChangeFilter('last_month')}
            className={`filter-pill ${activeFilter === 'last_month' ? 'active' : ''}`}
          >
            🔙 Last Month
          </button>

          <button
            onClick={() => onChangeFilter('year')}
            className={`filter-pill ${activeFilter === 'year' ? 'active' : ''}`}
          >
            📆 Yearly
          </button>

          <button
            onClick={() => onChangeFilter('custom')}
            className={`filter-pill ${activeFilter === 'custom' ? 'active' : ''}`}
          >
            🔍 Custom Range
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onOpenRevenueAnalytics}
            className="btn-analytics"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
          >
            <TrendingUp size={16} color="#ffffff" />
            Revenue Analytics
          </button>

          <button
            onClick={onExportPdf}
            disabled={isExporting}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '9px 16px' }}
          >
            <Download size={16} />
            {isExporting ? 'Generating PDF...' : 'Export PDF Report'}
          </button>
        </div>

      </div>

      {/* Custom Date Pickers (Visible when custom filter active) */}
      {activeFilter === 'custom' && (
        <div className="animate-fade-in" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
          gap: '12px', 
          marginTop: '16px', 
          paddingTop: '16px', 
          borderTop: '1px solid var(--border-color)' 
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>FROM DATE</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onChangeStartDate(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-main)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>TO DATE</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onChangeEndDate(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-main)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
