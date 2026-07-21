import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Header from '../components/Header';
import DateFilter from '../components/DateFilter';
import MetricsCards from '../components/MetricsCards';
import TopItemsTable from '../components/TopItemsTable';
import { exportAnalyticsPdf } from '../utils/pdfExporter';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';

export default function Dashboard({ session, onLogout }) {
  const [hotels, setHotels] = useState([]);
  const [selectedHotelCode, setSelectedHotelCode] = useState('ALL');
  const [activeFilter, setActiveFilter] = useState('today');
  
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

  // Fetch registered hotels for this owner
  const fetchHotels = useCallback(async () => {
    if (!supabase || !session) return;
    try {
      const { data, error } = await supabase
        .from('hotels')
        .select('*')
        .order('hotel_name', { ascending: true });

      if (!error && data) {
        setHotels(data);
        // If owner has exactly 1 hotel, default selectedHotelCode to that hotel's code
        if (data.length === 1) {
          setSelectedHotelCode(data[0].hotel_code);
        }
      }
    } catch (err) {
      console.error('Fetch hotels error:', err);
    }
  }, [session]);

  // Compute date range based on filter pill selection
  useEffect(() => {
    const now = new Date();
    let s = new Date();
    let e = new Date();

    if (activeFilter === 'today') {
      s = now;
      e = now;
    } else if (activeFilter === 'week') {
      s.setDate(now.getDate() - 6);
      e = now;
    } else if (activeFilter === 'month') {
      s.setDate(now.getDate() - 29);
      e = now;
    } else if (activeFilter === 'year') {
      s.setMonth(now.getMonth() - 11);
      e = now;
    }

    if (activeFilter !== 'custom') {
      setStartDate(s.toISOString().slice(0, 10));
      setEndDate(e.toISOString().slice(0, 10));
    }
  }, [activeFilter]);

  // Fetch Analytics Snapshots from Supabase
  const fetchAnalyticsSnapshots = useCallback(async () => {
    if (!supabase || !session) return;
    setLoading(true);
    const startTime = Date.now();

    try {
      let query = supabase
        .from('analytics_snapshots')
        .select('*')
        .gte('snapshot_date', startDate)
        .lte('snapshot_date', endDate)
        .order('snapshot_date', { ascending: true });

      if (selectedHotelCode !== 'ALL') {
        query = query.eq('hotel_code', selectedHotelCode);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rawRows = data || [];
      
      // Deduplicate rows by hotel_code and snapshot_date (keep the latest synced row for each date)
      const latestMap = {};
      rawRows.forEach((snap) => {
        const key = `${snap.hotel_code}_${snap.snapshot_date}`;
        if (!latestMap[key] || new Date(snap.synced_at || snap.created_at) > new Date(latestMap[key].synced_at || latestMap[key].created_at)) {
          latestMap[key] = snap;
        }
      });
      const rows = Object.values(latestMap);
      setSnapshots(rows);

      // Aggregate Metrics
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

        // Aggregate chart trends by date
        const d = snap.snapshot_date;
        chartMap[d] = (chartMap[d] || 0) + Number(snap.total_revenue || 0);

        // Aggregate Top Items
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

      // Sort Top Items by qty
      const sortedItems = Object.values(itemsMap)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 10);
      setAggregatedTopItems(sortedItems);

      // Prepare Chart Data
      const formattedChart = Object.keys(chartMap).map((d) => ({
        date: d.slice(5),
        revenue: chartMap[d]
      }));
      setChartData(formattedChart);

    } catch (err) {
      console.error('Fetch snapshots error:', err.message);
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 750 - elapsed);
      setTimeout(() => {
        setLoading(false);
      }, remaining);
    }
  }, [session, startDate, endDate, selectedHotelCode]);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  useEffect(() => {
    fetchAnalyticsSnapshots();
  }, [fetchAnalyticsSnapshots]);

  const handleExportPdf = async () => {
    setIsExporting(true);
    const hotelObj = hotels.find((h) => h.hotel_code === selectedHotelCode);
    const hotelName = selectedHotelCode === 'ALL' ? 'All Hotels Combined' : (hotelObj ? hotelObj.hotel_name : selectedHotelCode);
    const dateText = `${startDate} to ${endDate}`;
    await exportAnalyticsPdf('pdf-report-container', 'Analytics Report', dateText, hotelName);
    setIsExporting(false);
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
      />

      {/* Date Filter & PDF Trigger */}
      <DateFilter
        activeFilter={activeFilter}
        onChangeFilter={setActiveFilter}
        startDate={startDate}
        endDate={endDate}
        onChangeStartDate={setStartDate}
        onChangeEndDate={setEndDate}
        onExportPdf={handleExportPdf}
        isExporting={isExporting}
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

    </div>
  );
}
