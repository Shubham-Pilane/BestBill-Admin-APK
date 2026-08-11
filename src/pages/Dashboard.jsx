import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Header from '../components/Header';
import DateFilter from '../components/DateFilter';
import MetricsCards from '../components/MetricsCards';
import TopItemsTable from '../components/TopItemsTable';
import RevenueAnalyticsModal from '../components/RevenueAnalyticsModal';
import { exportAnalyticsPdf } from '../utils/pdfExporter';
import { getCachedSnapshots, saveSnapshotsToCache } from '../utils/localCache';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';

export default function Dashboard({ session, onLogout }) {
  const [hotels, setHotels] = useState([]);
  const [selectedHotelCode, setSelectedHotelCode] = useState('ALL');
  const [activeFilter, setActiveFilter] = useState('today');
  const [isRevenueAnalyticsOpen, setIsRevenueAnalyticsOpen] = useState(false);
  
  const [theme, setTheme] = useState(() => localStorage.getItem('bestbill_admin_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bestbill_admin_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };
  
  const todayStr = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  
  const [summary, setSummary] = useState({
    total_revenue: 0,
    total_orders: 0,
    cash_collection: 0,
    online_collection: 0,
    dine_in_sales: 0,
    parcel_sales: 0
  });

  const [aggregatedTopItems, setAggregatedTopItems] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  // Helper to read authorized Hotel Codes array from localStorage
  const getAuthorizedCodes = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem('bb_authorized_hotel_codes') || '[]');
    } catch (e) {
      return [];
    }
  }, []);

  // Add Hotel Modal State
  const [showAddHotelPassModal, setShowAddHotelPassModal] = useState(false);
  const [addHotelPasscode, setAddHotelPasscode] = useState('');
  const [showAddHotelCodeModal, setShowAddHotelCodeModal] = useState(false);
  const [newHotelCodeInput, setNewHotelCodeInput] = useState('');
  const [addHotelError, setAddHotelError] = useState('');

  // Fetch registered hotels for authorized hotel codes
  const fetchHotels = useCallback(async () => {
    if (!supabase || !session) return;
    const authCodes = getAuthorizedCodes();
    if (!authCodes || authCodes.length === 0) {
      setHotels([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('hotels')
        .select('*')
        .in('hotel_code', authCodes)
        .order('hotel_name', { ascending: true });

      if (!error && data) {
        setHotels(data);
        if (data.length === 1) {
          setSelectedHotelCode(data[0].hotel_code);
        }
      }
    } catch (err) {
      console.error('Fetch hotels error:', err);
    }
  }, [session, getAuthorizedCodes]);

  // Compute date range based on filter pill selection
  useEffect(() => {
    const now = new Date();
    let s = new Date();
    let e = new Date();

    if (activeFilter === 'today') {
      s = now;
      e = now;
    } else if (activeFilter === 'yesterday') {
      const y = new Date();
      y.setDate(now.getDate() - 1);
      s = y;
      e = y;
    } else if (activeFilter === 'week') {
      s.setDate(now.getDate() - 6);
      e = now;
    } else if (activeFilter === 'last_week') {
      const lwStart = new Date();
      lwStart.setDate(now.getDate() - 13);
      const lwEnd = new Date();
      lwEnd.setDate(now.getDate() - 7);
      s = lwStart;
      e = lwEnd;
    } else if (activeFilter === 'month') {
      s.setDate(now.getDate() - 29);
      e = now;
    } else if (activeFilter === 'last_month') {
      const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      s = lmStart;
      e = lmEnd;
    } else if (activeFilter === 'year') {
      s.setMonth(now.getMonth() - 11);
      e = now;
    }

    if (activeFilter !== 'custom') {
      setStartDate(s.toISOString().slice(0, 10));
      setEndDate(e.toISOString().slice(0, 10));
    }
  }, [activeFilter]);

  // Helper to deduplicate & aggregate snapshot metrics for state
  const processSnapshotsData = useCallback((rawRows) => {
    const latestMap = {};
    (rawRows || []).forEach((snap) => {
      // Key by owner_id + snapshot_date (or hotel_code + date) to ensure exactly 1 single record per date
      const storeKey = snap.owner_id ? `${snap.owner_id}_${snap.snapshot_date}` : `${snap.hotel_code}_${snap.snapshot_date}`;
      if (!latestMap[storeKey] || new Date(snap.synced_at || snap.created_at) > new Date(latestMap[storeKey].synced_at || latestMap[storeKey].created_at)) {
        latestMap[storeKey] = snap;
      }
    });
    const rows = Object.values(latestMap);
    setSnapshots(rows);

    let rev = 0, ord = 0, cash = 0, online = 0, dine = 0, parcel = 0;
    const itemsMap = {};
    const chartMap = {};

    rows.forEach((snap) => {
      rev += Number(snap.total_revenue || 0);
      ord += Number(snap.total_orders || 0);
      cash += Number(snap.cash_collection || 0);
      online += Number(snap.online_collection || 0);
      dine += Number(snap.dine_in_sales || 0);
      parcel += Number(snap.parcel_sales || 0);

      const d = snap.snapshot_date;
      chartMap[d] = (chartMap[d] || 0) + Number(snap.total_revenue || 0);

      const items = Array.isArray(snap.top_items) ? snap.top_items : [];
      items.forEach((it) => {
        const name = it.item_name || it.name;
        if (!name) return;
        if (!itemsMap[name]) {
          itemsMap[name] = { item_name: name, qty: 0, amount: 0 };
        }
        itemsMap[name].qty += Number(it.qty || it.quantity || 0);
        itemsMap[name].amount += Number(it.amount || 0);
      });
    });

    setSummary({
      total_revenue: rev,
      total_orders: ord,
      cash_collection: cash,
      online_collection: online,
      dine_in_sales: dine,
      parcel_sales: parcel
    });

    const sortedItems = Object.values(itemsMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
    setAggregatedTopItems(sortedItems);

    const formattedChart = Object.keys(chartMap).sort().map((d) => ({
      date: d.slice(5),
      revenue: chartMap[d]
    }));
    setChartData(formattedChart);
  }, []);

  // Fetch Analytics Snapshots from Supabase restricted to authorized Hotel Codes ONLY
  const fetchAnalyticsSnapshots = useCallback(async () => {
    if (!supabase || !session) return;
    const authCodes = getAuthorizedCodes();
    if (!authCodes || authCodes.length === 0) {
      setSnapshots([]);
      processSnapshotsData([]);
      setLoading(false);
      return;
    }
    
    // 1. INSTANT DATA: Check IndexedDB local cache first (0ms latency!)
    const cachedRows = await getCachedSnapshots(selectedHotelCode, startDate, endDate);
    if (cachedRows && cachedRows.length > 0) {
      // Filter cache by authorized codes
      const filteredCache = cachedRows.filter(r => authCodes.includes(r.hotel_code));
      processSnapshotsData(filteredCache);
    } else {
      setLoading(true);
    }

    const startTime = Date.now();

    try {
      let query = supabase
        .from('analytics_snapshots')
        .select('*')
        .in('hotel_code', authCodes)
        .gte('snapshot_date', startDate)
        .lte('snapshot_date', endDate)
        .order('snapshot_date', { ascending: true });

      if (selectedHotelCode !== 'ALL') {
        query = query.eq('hotel_code', selectedHotelCode);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rawRows = data || [];
      
      // Save fetched records to IndexedDB local cache (auto-purges records older than 2 years)
      await saveSnapshotsToCache(rawRows);

      // Render fresh data
      processSnapshotsData(rawRows);

    } catch (err) {
      console.error('Fetch snapshots error:', err.message);
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 200 - elapsed);
      setTimeout(() => {
        setLoading(false);
      }, remaining);
    }
  }, [session, startDate, endDate, selectedHotelCode, processSnapshotsData, getAuthorizedCodes]);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  useEffect(() => {
    fetchAnalyticsSnapshots();
  }, [fetchAnalyticsSnapshots]);

  const handleExportPdf = async () => {
    setIsExporting(true);
    
    // Defer execution slightly to let React repaint the UI with "Generating PDF..." loading state
    await new Promise((resolve) => setTimeout(resolve, 150));
    
    const hotelObj = hotels.find((h) => h.hotel_code === selectedHotelCode);
    const hotelName = selectedHotelCode === 'ALL' ? 'All Hotels Combined' : (hotelObj ? hotelObj.hotel_name : selectedHotelCode);
    const dateText = `${startDate} to ${endDate}`;
    
    const reportData = {
      hotelName,
      dateRangeText: dateText,
      summary,
      topItems: aggregatedTopItems,
      chartData // pass in case we need to calculate anything else
    };

    try {
      const success = await exportAnalyticsPdf(reportData);
      if (success) {
        showToast('PDF downloaded successfully.', 'success');
      } else {
        showToast('Failed to generate PDF.', 'error');
      }
    } catch (err) {
      console.error('PDF generation crash:', err);
      showToast('Error generating PDF.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleVerifyAddHotelPasscode = (e) => {
    e.preventDefault();
    if (addHotelPasscode.trim() === '972265') {
      setShowAddHotelPassModal(false);
      setAddHotelPasscode('');
      setAddHotelError('');
      setNewHotelCodeInput('');
      setShowAddHotelCodeModal(true);
    } else {
      setAddHotelError('Incorrect Security Password! Access Denied.');
    }
  };

  const handleConfirmAddHotelCode = async (e) => {
    e.preventDefault();
    const code = newHotelCodeInput.trim();
    if (!code) {
      setAddHotelError('Please enter a 5-character Hotel Code.');
      return;
    }

    setLoading(true);
    setAddHotelError('');

    try {
      const { data, error } = await supabase
        .from('hotels')
        .select('*')
        .eq('hotel_code', code);

      if (error || !data || data.length === 0) {
        throw new Error(`Hotel Code "${code}" not found. Please check your Hotel Code and make sure Online Sync is turned on in your store app.`);
      }

      const hotelObj = data[0];
      const currentAuthCodes = getAuthorizedCodes();
      if (!currentAuthCodes.includes(code)) {
        currentAuthCodes.push(code);
        localStorage.setItem('bb_authorized_hotel_codes', JSON.stringify(currentAuthCodes));
      }

      setShowAddHotelCodeModal(false);
      setNewHotelCodeInput('');
      showToast(`Hotel "${hotelObj.hotel_name}" (${code}) added successfully!`, 'success');

      fetchHotels();
      fetchAnalyticsSnapshots();

    } catch (err) {
      setAddHotelError(err.message || 'Failed to add hotel code.');
    } finally {
      setLoading(false);
    }
  };

  const selectedHotelName = selectedHotelCode === 'ALL' 
    ? 'All Hotels Combined' 
    : (hotels.find(h => h.hotel_code === selectedHotelCode)?.hotel_name || selectedHotelCode);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      
      {/* Header */}
      <Header
        hotels={hotels}
        selectedHotelCode={selectedHotelCode}
        onSelectHotel={setSelectedHotelCode}
        onLogout={onLogout}
        onRefresh={fetchAnalyticsSnapshots}
        loading={loading}
        theme={theme}
        onToggleTheme={toggleTheme}
        onAddHotel={() => {
          setShowAddHotelPassModal(true);
          setAddHotelPasscode('');
          setAddHotelError('');
        }}
      />

      {/* Date Filter & PDF / Analytics Triggers */}
      <DateFilter
        activeFilter={activeFilter}
        onChangeFilter={setActiveFilter}
        startDate={startDate}
        endDate={endDate}
        onChangeStartDate={setStartDate}
        onChangeEndDate={setEndDate}
        onExportPdf={handleExportPdf}
        isExporting={isExporting}
        onOpenRevenueAnalytics={() => setIsRevenueAnalyticsOpen(true)}
      />

      {/* Revenue Analytics Modal */}
      <RevenueAnalyticsModal
        isOpen={isRevenueAnalyticsOpen}
        onClose={() => setIsRevenueAnalyticsOpen(false)}
        selectedHotelCode={selectedHotelCode}
        hotels={hotels}
        session={session}
      />

      {/* Printable / Capturable Container */}
      <div id="pdf-report-container">
        
        {/* Active Selection Banner */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--emerald-primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ● ACTIVE HOTEL: {selectedHotelName}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginLeft: '12px' }}>
              (Range: {startDate} → {endDate})
            </span>
          </div>
        </div>

        {/* Metrics Cards */}
        <MetricsCards summary={summary} />

        {/* Sales Trend Chart */}
        {chartData.length > 0 && (
          <div className="glass-card" style={{ padding: '20px', marginBottom: '20px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <TrendingUp size={20} color="var(--emerald-primary)" />
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Sales Trend Breakdown
              </h3>
            </div>
            <div style={{ width: '100%', height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                    formatter={(val) => [`₹ ${val.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--emerald-primary)' : 'var(--cyan-primary)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Top Items Table */}
        <TopItemsTable topItems={aggregatedTopItems} />

      </div>

      {/* Security Password Modal for Add Hotel (Password: 972265) */}
      {showAddHotelPassModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '380px', padding: '28px', borderRadius: '24px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>Security Password Required</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 20px 0', fontWeight: 600 }}>Enter security password:</p>
            
            {addHotelError && (
              <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.12)', border: '1px solid var(--rose-primary)', color: 'var(--rose-primary)', padding: '10px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, marginBottom: '16px' }}>
                ⚠️ {addHotelError}
              </div>
            )}

            <form onSubmit={handleVerifyAddHotelPasscode} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                type="password"
                required
                autoFocus
                value={addHotelPasscode}
                onChange={(e) => setAddHotelPasscode(e.target.value)}
                placeholder="Enter Security Password"
                style={{ width: '100%', padding: '14px', borderRadius: '12px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', textAlign: 'center', fontWeight: 700, outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowAddHotelPassModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', backgroundColor: 'var(--bg-accent)', color: 'var(--text-secondary)', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px', fontSize: '14px' }}>Verify</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Hotel Code Modal */}
      {showAddHotelCodeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '380px', padding: '28px', borderRadius: '24px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 20px 0' }}>Add New Hotel</h3>
            
            {addHotelError && (
              <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.12)', border: '1px solid var(--rose-primary)', color: 'var(--rose-primary)', padding: '10px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, marginBottom: '16px' }}>
                ⚠️ {addHotelError}
              </div>
            )}

            <form onSubmit={handleConfirmAddHotelCode} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                type="text"
                required
                autoFocus
                value={newHotelCodeInput}
                onChange={(e) => setNewHotelCodeInput(e.target.value)}
                placeholder=""
                style={{ width: '100%', padding: '14px', borderRadius: '12px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '16px', textAlign: 'center', fontWeight: 800, letterSpacing: '1px', outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowAddHotelCodeModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', backgroundColor: 'var(--bg-accent)', color: 'var(--text-secondary)', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 1, padding: '12px', fontSize: '14px' }}>{loading ? 'Verifying...' : 'Add Hotel'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast.show && (
        <div className="animate-fade-in" style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: toast.type === 'success' ? 'var(--emerald-primary)' : 'var(--rose-primary)',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 700,
          fontSize: '14px',
          pointerEvents: 'none',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}>
          {toast.type === 'success' ? '✓' : '✗'} {toast.message}
        </div>
      )}

    </div>
  );
}
