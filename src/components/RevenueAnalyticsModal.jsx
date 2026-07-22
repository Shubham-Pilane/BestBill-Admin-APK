import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Download, TrendingUp, Calendar, Filter, ChevronLeft, ChevronRight, Wallet, CreditCard, IndianRupee } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getCachedSnapshots, saveSnapshotsToCache } from '../utils/localCache';
import { exportRevenueAnalyticsPdf } from '../utils/pdfExporter';

export default function RevenueAnalyticsModal({ isOpen, onClose, selectedHotelCode, hotels, session }) {
  const [filterType, setFilterType] = useState('last_15_days');
  const todayStr = new Date().toISOString().slice(0, 10);
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(todayStr);

  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [dailyRows, setDailyRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // Helper to format date string to DD-MM-YYYY
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  // Compute date range based on filter pill selection
  useEffect(() => {
    const now = new Date();
    let s = new Date();
    let e = new Date();

    if (filterType === 'last_15_days') {
      s.setDate(now.getDate() - 14);
      e = now;
    } else if (filterType === 'current_month') {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
      e = now;
    } else if (filterType === 'last_month') {
      s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      e = new Date(now.getFullYear(), now.getMonth(), 0);
    }

    if (filterType !== 'custom') {
      setStartDate(s.toISOString().slice(0, 10));
      setEndDate(e.toISOString().slice(0, 10));
    }
    setCurrentPage(1);
  }, [filterType]);

  // Reset pagination on custom date change
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate]);

  // Fetch & process daily revenue records
  const fetchRevenueData = useCallback(async () => {
    if (!isOpen || !session || !supabase) return;

    // 1. Instant cache fallback
    const cachedRows = await getCachedSnapshots(selectedHotelCode, startDate, endDate);
    if (cachedRows && cachedRows.length > 0) {
      processDailyData(cachedRows);
    } else {
      setLoading(true);
    }

    try {
      let query = supabase
        .from('analytics_snapshots')
        .select('*')
        .gte('snapshot_date', startDate)
        .lte('snapshot_date', endDate)
        .order('snapshot_date', { ascending: false });

      if (selectedHotelCode !== 'ALL') {
        query = query.eq('hotel_code', selectedHotelCode);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rawRows = data || [];
      await saveSnapshotsToCache(rawRows);
      processDailyData(rawRows);
    } catch (err) {
      console.error('Fetch revenue analytics error:', err);
    } finally {
      setLoading(false);
    }
  }, [isOpen, session, startDate, endDate, selectedHotelCode]);

  // Process raw rows by deduplicating and grouping per date descending
  const processDailyData = (rawRows) => {
    const latestMap = {};
    (rawRows || []).forEach((snap) => {
      const key = `${snap.hotel_code}_${snap.snapshot_date}`;
      if (!latestMap[key] || new Date(snap.synced_at || snap.created_at) > new Date(latestMap[key].synced_at || latestMap[key].created_at)) {
        latestMap[key] = snap;
      }
    });

    const deduplicated = Object.values(latestMap);

    // Group by snapshot_date
    const dateMap = {};
    deduplicated.forEach((snap) => {
      const d = snap.snapshot_date;
      if (!dateMap[d]) {
        dateMap[d] = {
          date: d,
          formattedDate: formatDisplayDate(d),
          cash_collection: 0,
          online_collection: 0,
          total_revenue: 0
        };
      }
      dateMap[d].cash_collection += Number(snap.cash_collection || 0);
      dateMap[d].online_collection += Number(snap.online_collection || 0);
      dateMap[d].total_revenue += Number(snap.total_revenue || 0);
    });

    // Sort descending by date (latest first)
    const sorted = Object.values(dateMap).sort((a, b) => new Date(b.date) - new Date(a.date));
    setDailyRows(sorted);
  };

  useEffect(() => {
    fetchRevenueData();
  }, [fetchRevenueData]);

  // Calculated overall summary stats
  const summary = useMemo(() => {
    let rev = 0, cash = 0, online = 0;
    dailyRows.forEach((r) => {
      rev += r.total_revenue;
      cash += r.cash_collection;
      online += r.online_collection;
    });

    return {
      total_revenue: rev,
      cash_collection: cash,
      online_collection: online,
      total_days: dailyRows.length
    };
  }, [dailyRows]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(dailyRows.length / rowsPerPage));
  const paginatedRows = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return dailyRows.slice(startIdx, startIdx + rowsPerPage);
  }, [dailyRows, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Helper for rendering pagination page numbers with ellipsis
  const renderPaginationButtons = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    return pages.map((page, idx) => {
      if (page === '...') {
        return (
          <span key={`ellipsis-${idx}`} style={{ padding: '0 6px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 700 }}>
            ...
          </span>
        );
      }
      return (
        <button
          key={`page-${page}`}
          onClick={() => handlePageChange(page)}
          className={`filter-pill ${currentPage === page ? 'active' : ''}`}
          style={{ padding: '6px 12px', minWidth: '32px', fontSize: '13px', borderRadius: '8px' }}
        >
          {page}
        </button>
      );
    });
  };

  // Export PDF Handler
  const handleExportPdf = async () => {
    setIsExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 150));

    const hotelObj = hotels.find((h) => h.hotel_code === selectedHotelCode);
    const hotelName = selectedHotelCode === 'ALL' ? 'All Hotels Combined' : (hotelObj ? hotelObj.hotel_name : selectedHotelCode);
    const dateText = `${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)}`;

    const reportData = {
      hotelName,
      dateRangeText: dateText,
      summary,
      dailyRows
    };

    try {
      const success = await exportRevenueAnalyticsPdf(reportData);
      if (success) {
        showToast('Analytics PDF downloaded successfully.', 'success');
      } else {
        showToast('Failed to generate PDF.', 'error');
      }
    } catch (err) {
      console.error('PDF export crash:', err);
      showToast('Error generating PDF.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const formattedTotalRevenue = `₹${summary.total_revenue.toLocaleString('en-IN')}`;
  const selectedHotelName = selectedHotelCode === 'ALL' 
    ? 'All Hotels Combined' 
    : (hotels.find(h => h.hotel_code === selectedHotelCode)?.hotel_name || selectedHotelCode);

  // Dynamic Highlight Banner Text
  const getBannerMessage = () => {
    if (filterType === 'last_15_days') {
      return (
        <>
          You have generated a total revenue of <span style={{ color: 'var(--emerald-primary)', fontSize: '20px', fontWeight: 800 }}>{formattedTotalRevenue}</span> in the last 15 days.
        </>
      );
    } else if (filterType === 'current_month') {
      return (
        <>
          You have generated a total revenue of <span style={{ color: 'var(--emerald-primary)', fontSize: '20px', fontWeight: 800 }}>{formattedTotalRevenue}</span> in the current month.
        </>
      );
    } else if (filterType === 'last_month') {
      return (
        <>
          You generated a total revenue of <span style={{ color: 'var(--emerald-primary)', fontSize: '20px', fontWeight: 800 }}>{formattedTotalRevenue}</span> in the previous month.
        </>
      );
    } else {
      return (
        <>
          Your total revenue from <strong style={{ color: 'var(--text-primary)' }}>{formatDisplayDate(startDate)}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{formatDisplayDate(endDate)}</strong> is <span style={{ color: 'var(--emerald-primary)', fontSize: '20px', fontWeight: 800 }}>{formattedTotalRevenue}</span>.
        </>
      );
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 8, 15, 0.85)',
      backdropFilter: 'blur(10px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div className="glass-card animate-fade-in" style={{
        width: '100%',
        maxWidth: '900px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
      }}>
        
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={22} color="var(--emerald-primary)" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Revenue Analytics
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                {selectedHotelName}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 14px' }}
            >
              <Download size={15} />
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'var(--bg-accent)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Top Filter Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              <button
                onClick={() => setFilterType('last_15_days')}
                className={`filter-pill ${filterType === 'last_15_days' ? 'active' : ''}`}
              >
                📅 Last 15 Days
              </button>

              <button
                onClick={() => setFilterType('current_month')}
                className={`filter-pill ${filterType === 'current_month' ? 'active' : ''}`}
              >
                🗓️ Current Month
              </button>

              <button
                onClick={() => setFilterType('last_month')}
                className={`filter-pill ${filterType === 'last_month' ? 'active' : ''}`}
              >
                🔙 Last Month
              </button>

              <button
                onClick={() => setFilterType('custom')}
                className={`filter-pill ${filterType === 'custom' ? 'active' : ''}`}
              >
                🔍 Custom Date Range
              </button>
            </div>

            {/* Custom Date Pickers */}
            {filterType === 'custom' && (
              <div className="animate-fade-in" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
                padding: '12px',
                background: 'var(--bg-accent)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>FROM DATE</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>TO DATE</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Highlight Summary Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.12) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '10px 14px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 600,
            lineHeight: '1.5',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--emerald-primary)',
              boxShadow: '0 0 8px var(--emerald-primary)',
              flexShrink: 0
            }}></div>
            <div>
              {getBannerMessage()}
            </div>
          </div>

          {/* Summary Cards Grid (2x2 Compact on Mobile) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px'
          }}>
            {/* Total Revenue */}
            <div className="glass-card" style={{ padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-accent)' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Total Revenue
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--emerald-primary)', marginTop: '2px', margin: 0 }}>
                ₹{summary.total_revenue.toLocaleString('en-IN')}
              </h3>
            </div>

            {/* Cash Collection */}
            <div className="glass-card" style={{ padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-accent)' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Cash Collection
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px', margin: 0 }}>
                ₹{summary.cash_collection.toLocaleString('en-IN')}
              </h3>
            </div>

            {/* Online Collection */}
            <div className="glass-card" style={{ padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-accent)' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Online Collection
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--cyan-primary)', marginTop: '2px', margin: 0 }}>
                ₹{summary.online_collection.toLocaleString('en-IN')}
              </h3>
            </div>

            {/* Total Days */}
            <div className="glass-card" style={{ padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-accent)' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Total Days
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--indigo-primary)', marginTop: '2px', margin: 0 }}>
                {summary.total_days} Days
              </h3>
            </div>
          </div>

          {/* Section Heading for Daily Breakdown */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              📊 Daily Sales Breakdown ({summary.total_days} Days)
            </span>
          </div>

          {/* Daily Revenue Table */}
          <div className="glass-card" style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr style={{ background: 'var(--bg-accent)' }}>
                    <th style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontSize: '11px' }}>Date</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '11px' }}>Cash Coll.</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '11px' }}>Online Coll.</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '11px' }}>Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '13px' }}>
                        Loading analytics data...
                      </td>
                    </tr>
                  ) : paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '13px' }}>
                        No billing records found for the selected date range.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row) => (
                      <tr key={row.date} style={{ transition: 'background 0.15s ease' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', fontSize: '12px' }}>
                          {row.formattedDate}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: '12px' }}>
                          ₹{row.cash_collection.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: '12px' }}>
                          ₹{row.online_collection.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--emerald-primary)', whiteSpace: 'nowrap', fontSize: '12px' }}>
                          ₹{row.total_revenue.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {!loading && dailyRows.length > 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                borderTop: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Showing {Math.min((currentPage - 1) * rowsPerPage + 1, dailyRows.length)} to {Math.min(currentPage * rowsPerPage, dailyRows.length)} of {dailyRows.length} entries
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="btn-secondary"
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      opacity: currentPage === 1 ? 0.5 : 1,
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <ChevronLeft size={14} />
                    Previous
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {renderPaginationButtons()}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="btn-secondary"
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      opacity: currentPage === totalPages ? 0.5 : 1,
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Floating Toast Notification inside Modal */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: toast.type === 'success' ? 'var(--emerald-primary)' : 'var(--rose-primary)',
          color: '#ffffff',
          padding: '10px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
          zIndex: 10000,
          fontWeight: 700,
          fontSize: '13px'
        }}>
          {toast.type === 'success' ? '✓' : '✗'} {toast.message}
        </div>
      )}
    </div>
  );
}
