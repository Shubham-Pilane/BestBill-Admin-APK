import React from 'react';
import { Award, Flame } from 'lucide-react';

export default function TopItemsTable({ topItems }) {
  const formatCurrency = (amt) => `₹ ${Number(amt || 0).toFixed(2)}`;

  return (
    <div className="glass-card" style={{ padding: '20px', marginBottom: '20px', borderRadius: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Flame size={20} color="var(--amber-primary)" />
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          Top Selling Dishes & Items
        </h3>
      </div>

      {(!topItems || topItems.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
          No item sales data found for the selected range.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>Rank</th>
                <th>Dish Name</th>
                <th style={{ textAlign: 'center' }}>Qty Sold</th>
                <th style={{ textAlign: 'right' }}>Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topItems.map((item, index) => (
                <tr key={index}>
                  <td>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 800,
                      backgroundColor: index === 0 ? 'var(--amber-primary)' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : 'var(--bg-accent)',
                      color: index < 3 ? '#ffffff' : 'var(--text-secondary)'
                    }}>
                      {index + 1}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {item.item_name || item.name}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--cyan-primary)' }}>
                    {item.qty || item.quantity}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--emerald-primary)' }}>
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
