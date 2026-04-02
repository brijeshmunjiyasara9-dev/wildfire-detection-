import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import {
  Archive, Filter, Download, TrendingUp, Activity,
  AlertTriangle, CheckCircle, Search, ChevronLeft, ChevronRight
} from 'lucide-react';
import { getResearchDetections, getResearchStats } from '../api/client';

const FIRE_COLORS = ['#FF6B00', '#FFC107', '#ef4444', '#10b981', '#3b82f6'];

function StatCard({ icon: Icon, label, value, sub, color = 'fire' }) {
  const c = {
    fire: 'text-fire-400 bg-fire-500/10 border-fire-500/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-xl p-5 border card-3d ${c[color].split(' ').slice(-2).join(' ')}`}
    >
      <div className={`w-10 h-10 rounded-lg ${c[color].split(' ').slice(-3, -1).join(' ')} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${c[color].split(' ')[0]}`} />
      </div>
      <div className={`text-2xl font-bold font-mono ${c[color].split(' ')[0]}`}>{value}</div>
      <div className="text-sm text-white font-medium mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </motion.div>
  );
}

const CUSTOM_TOOLTIP_STYLE = {
  background: '#1a2332',
  border: '1px solid rgba(255,107,0,0.2)',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '12px',
};

export default function Research() {
  const [detections, setDetections] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const limit = 20;

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [detRes, statRes] = await Promise.all([
          getResearchDetections(page, limit),
          getResearchStats(),
        ]);
        setDetections(detRes.data.items);
        setTotal(detRes.data.total);
        setStats(statRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [page]);

  const exportCSV = () => {
    const headers = ['id', 'status', 'detection_percentage', 'max_confidence',
      'total_frames', 'wildfire_frames', 'processing_time_seconds', 'created_at'];
    const rows = detections.map((d) => headers.map((h) => d[h] ?? '').join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wildfirewatch_research_${Date.now()}.csv`;
    a.click();
  };

  const pieData = stats ? [
    { name: 'Wildfire', value: stats.wildfire_detections },
    { name: 'No Wildfire', value: (stats.total_detections - stats.wildfire_detections) },
  ] : [];

  const barData = stats?.daily_counts?.slice().reverse() || [];

  const filtered = search
    ? detections.filter((d) =>
        d.id?.includes(search) ||
        d.status?.includes(search)
      )
    : detections;

  return (
    <div className="pt-20 pb-16 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="inline-flex items-center gap-2 text-fire-400 text-sm font-medium mb-4 bg-fire-500/10 px-4 py-1.5 rounded-full border border-fire-500/20">
          <Archive className="w-4 h-4" />
          Research Archive
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Detection Database</h1>
            <p className="text-slate-400 mt-1">All public detection runs — available for research and academic use.</p>
          </div>
          <button
            onClick={exportCSV}
            className="btn-ghost flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </motion.div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Activity} label="Total Detections" value={stats.total_detections} color="fire" />
          <StatCard icon={AlertTriangle} label="Wildfire Cases" value={stats.wildfire_detections} color="yellow"
            sub={`${((stats.wildfire_detections / Math.max(stats.total_detections, 1)) * 100).toFixed(1)}% of all`} />
          <StatCard icon={TrendingUp} label="Avg Max Confidence" value={`${(stats.avg_max_confidence * 100).toFixed(1)}%`} color="blue" />
          <StatCard icon={CheckCircle} label="No Wildfire Cases"
            value={stats.total_detections - stats.wildfire_detections} color="green" />
        </div>
      )}

      {/* Charts */}
      {stats && (
        <div className="grid lg:grid-cols-3 gap-5 mb-8">
          {/* Bar chart */}
          <div className="lg:col-span-2 glass rounded-2xl p-5 border border-fire-500/20">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <BarChart className="w-4 h-4 text-fire-500" />
              Detections Per Day (Last 30 days)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,107,0,0.1)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="#FF6B00" radius={[4, 4, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="glass rounded-2xl p-5 border border-fire-500/20">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4 text-fire-500" />
              Wildfire vs Safe
            </h3>
            {pieData[0]?.value || pieData[1]?.value ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    <Cell fill="#FF6B00" />
                    <Cell fill="#10b981" />
                  </Pie>
                  <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-slate-600 text-sm">No data yet</div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass rounded-2xl border border-fire-500/20 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">Detection Records</h3>
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search job ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-slate-300 outline-none w-40 placeholder:text-slate-600"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="fire-spinner w-8 h-8" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Detection %</th>
                  <th className="px-4 py-3 text-right">Max Confidence</th>
                  <th className="px-4 py-3 text-right">Frames</th>
                  <th className="px-4 py-3 text-right">Process Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map((d, i) => (
                  <motion.tr
                    key={d.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-slate-800/50 hover:bg-fire-500/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                      {d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium badge-${d.status}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {d.detection_percentage != null ? (
                        <span className={`font-mono font-bold ${
                          d.detection_percentage > 20 ? 'text-red-400' :
                          d.detection_percentage > 5 ? 'text-fire-400' : 'text-green-400'
                        }`}>
                          {d.detection_percentage.toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {d.max_confidence != null ? (
                        <span className="font-mono text-yellow-400">
                          {(d.max_confidence * 100).toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 font-mono">
                      {d.total_frames?.toLocaleString() || '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 font-mono">
                      {d.processing_time_seconds ? `${d.processing_time_seconds.toFixed(1)}s` : '—'}
                    </td>
                  </motion.tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-600">
                      No detections found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-sm text-slate-400">
          <span>
            Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs">Page {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * limit >= total}
              className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
