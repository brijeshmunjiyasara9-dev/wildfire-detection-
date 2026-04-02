import { useState, useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Cpu, Database, PlayCircle, Film, Archive,
  Upload, CheckCircle, AlertTriangle, Zap, RefreshCw,
  LogOut, BarChart2, Clock, TrendingUp, ChevronRight,
  Settings, Activity, List
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getAdminModels, activateModel, uploadModel,
  getDatasets, uploadDataset,
  getTrainingJobs, startTraining, getTrainingLogs,
  getAdminDetections,
  uploadDemoVideo,
} from '../api/client';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
  { id: 'models', label: 'Models', icon: Cpu },
  { id: 'training', label: 'Training', icon: PlayCircle },
  { id: 'datasets', label: 'Datasets', icon: Database },
  { id: 'demo', label: 'Demo Videos', icon: Film },
  { id: 'research', label: 'Research', icon: Archive },
];

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab({ models, detections }) {
  const activeModel = models?.find((m) => m.is_active);
  const todayDetections = detections?.filter((d) => {
    const today = new Date().toISOString().slice(0, 10);
    return d.created_at?.startsWith(today);
  });

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Cpu, label: 'Active Model', value: activeModel?.name || 'None', sub: activeModel?.version || '—', color: 'fire' },
          { icon: Activity, label: "Today's Jobs", value: todayDetections?.length ?? '—', sub: 'detection runs', color: 'blue' },
          { icon: TrendingUp, label: 'Model Accuracy', value: activeModel?.accuracy ? `${(activeModel.accuracy * 100).toFixed(1)}%` : '—', sub: 'test accuracy', color: 'green' },
          { icon: Database, label: 'Total Models', value: models?.length ?? '—', sub: 'in registry', color: 'ember' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass rounded-xl p-4 border border-fire-500/20 card-3d">
            <div className="w-9 h-9 rounded-lg bg-fire-500/10 flex items-center justify-center mb-3">
              <s.icon className="w-5 h-5 text-fire-500" />
            </div>
            <div className="text-xl font-bold font-mono text-white truncate">{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {activeModel && (
        <div className="glass rounded-2xl p-5 border border-fire-500/20">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-fire-500" /> Active Model Configuration
          </h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            {[
              ['Architecture', activeModel.architecture || 'MobileNetV2'],
              ['Image Size', `${activeModel.image_size || 224}×${activeModel.image_size || 224}`],
              ['Confidence Threshold', activeModel.confidence_threshold || 0.6],
              ['Accuracy', activeModel.accuracy ? `${(activeModel.accuracy * 100).toFixed(2)}%` : '—'],
              ['Val Loss', activeModel.val_loss?.toFixed(4) || '—'],
              ['Created', activeModel.created_at ? new Date(activeModel.created_at).toLocaleDateString() : '—'],
            ].map(([key, val]) => (
              <div key={key} className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-xs text-slate-500">{key}</div>
                <div className="text-white font-mono mt-0.5">{String(val)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Models Tab ──────────────────────────────────────────────────────────────
function ModelsTab({ models, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: '', version: '', accuracy: '', notes: '' });
  const [file, setFile] = useState(null);

  const handleUpload = async () => {
    if (!file || !form.name || !form.version) return alert('Fill all required fields');
    setUploading(true);
    try {
      await uploadModel(file, form.name, form.version, form.accuracy || null, form.notes || null);
      setForm({ name: '', version: '', accuracy: '', notes: '' });
      setFile(null);
      onRefresh();
    } catch (e) {
      alert(e.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleActivate = async (id) => {
    try {
      await activateModel(id);
      onRefresh();
    } catch (e) {
      alert('Failed to activate');
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload form */}
      <div className="glass rounded-2xl p-5 border border-fire-500/20">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Upload className="w-4 h-4 text-fire-500" /> Upload New Model
        </h3>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <input placeholder="Model name *" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-fire-500 transition-colors" />
          <input placeholder="Version * (e.g. v1.0)" value={form.version}
            onChange={(e) => setForm({ ...form, version: e.target.value })}
            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-fire-500 transition-colors" />
          <input placeholder="Accuracy (0-1)" type="number" step="0.001" value={form.accuracy}
            onChange={(e) => setForm({ ...form, accuracy: e.target.value })}
            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-fire-500 transition-colors" />
          <input placeholder="Notes (optional)" value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-fire-500 transition-colors" />
        </div>
        <div className="flex gap-3">
          <label className="flex-1 cursor-pointer">
            <div className="drop-zone rounded-xl p-3 text-center text-sm text-slate-400 hover:text-white transition-colors">
              {file ? (
                <span className="text-fire-400">{file.name}</span>
              ) : (
                <span>Click to select .keras or .h5 file</span>
              )}
            </div>
            <input type="file" accept=".keras,.h5" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
          </label>
          <button onClick={handleUpload} disabled={uploading}
            className="btn-fire flex items-center gap-2 text-sm whitespace-nowrap">
            {uploading ? <><div className="fire-spinner w-4 h-4" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload</>}
          </button>
        </div>
      </div>

      {/* Model list */}
      <div className="glass rounded-2xl border border-fire-500/20 overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300">Model Registry ({models?.length || 0})</h3>
        </div>
        <div className="divide-y divide-slate-800">
          {models?.length > 0 ? models.map((m) => (
            <div key={m.id} className={`p-4 flex items-center justify-between hover:bg-fire-500/5 transition-colors ${m.is_active ? 'bg-fire-500/5' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${m.is_active ? 'bg-fire-500/20' : 'bg-slate-800'}`}>
                  <Cpu className={`w-5 h-5 ${m.is_active ? 'text-fire-400' : 'text-slate-500'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">{m.name}</span>
                    <span className="text-xs text-slate-500 font-mono">{m.version}</span>
                    {m.is_active && (
                      <span className="text-xs bg-fire-500/20 text-fire-400 px-2 py-0.5 rounded-full border border-fire-500/30">Active</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {m.architecture} • Acc: {m.accuracy ? `${(m.accuracy * 100).toFixed(1)}%` : '—'} • {m.created_at?.slice(0, 10)}
                  </div>
                </div>
              </div>
              {!m.is_active && (
                <button onClick={() => handleActivate(m.id)}
                  className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Activate
                </button>
              )}
            </div>
          )) : (
            <div className="text-center py-10 text-slate-600 text-sm">No models uploaded yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Training Tab ─────────────────────────────────────────────────────────────
function TrainingTab({ models, datasets }) {
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState({ base_model_id: '', dataset_ids: [], epochs: 15, learning_rate: 0.001, batch_size: 32 });
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const logsRef = useRef(null);

  useEffect(() => {
    getTrainingJobs().then(r => setJobs(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    if (!selectedJobId) return;
    const interval = setInterval(async () => {
      try {
        const r = await getTrainingLogs(selectedJobId);
        setLogs(r.data.log || []);
        if (['completed', 'failed'].includes(r.data.status)) {
          clearInterval(interval);
          getTrainingJobs().then(r => setJobs(r.data));
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedJobId]);

  const handleStart = async () => {
    if (!form.dataset_ids.length) return alert('Select at least one dataset');
    setRunning(true);
    try {
      const res = await startTraining(form);
      setSelectedJobId(res.data.job_id);
      setLogs([]);
      getTrainingJobs().then(r => setJobs(r.data));
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to start training');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-5 border border-fire-500/20">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <PlayCircle className="w-4 h-4 text-fire-500" /> Start New Training Run
        </h3>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Base Model (optional)</label>
            <select value={form.base_model_id} onChange={e => setForm({...form, base_model_id: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-fire-500">
              <option value="">Train from scratch</option>
              {models?.map(m => <option key={m.id} value={m.id}>{m.name} {m.version}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Epochs</label>
            <input type="number" value={form.epochs} onChange={e => setForm({...form, epochs: +e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-fire-500" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Learning Rate</label>
            <input type="number" step="0.0001" value={form.learning_rate} onChange={e => setForm({...form, learning_rate: +e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-fire-500" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Batch Size</label>
            <input type="number" value={form.batch_size} onChange={e => setForm({...form, batch_size: +e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-fire-500" />
          </div>
        </div>
        <div className="mb-4">
          <label className="text-xs text-slate-500 block mb-2">Datasets (select one or more)</label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {datasets?.length > 0 ? datasets.map(d => (
              <label key={d.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 cursor-pointer">
                <input type="checkbox" checked={form.dataset_ids.includes(d.id)}
                  onChange={e => setForm({...form, dataset_ids: e.target.checked
                    ? [...form.dataset_ids, d.id]
                    : form.dataset_ids.filter(id => id !== d.id)})}
                  className="accent-fire-500" />
                <span className="text-sm text-white">{d.filename}</span>
                <span className="text-xs text-slate-500">{d.image_count} images • {d.label}</span>
              </label>
            )) : <p className="text-sm text-slate-600 py-2">No datasets uploaded yet</p>}
          </div>
        </div>
        <button onClick={handleStart} disabled={running}
          className="btn-fire flex items-center gap-2 text-sm">
          {running ? <><div className="fire-spinner w-4 h-4" /> Starting...</> : <><PlayCircle className="w-4 h-4" /> Start Training</>}
        </button>
      </div>

      {/* Live log */}
      {logs.length > 0 && (
        <div className="glass rounded-2xl p-5 border border-fire-500/20">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Training Progress</h3>
          <div ref={logsRef} className="bg-slate-900 rounded-xl p-3 h-48 overflow-y-auto font-mono text-xs space-y-1">
            {logs.map((entry, i) => (
              <div key={i} className="flex gap-3 text-slate-400">
                <span className="text-slate-600">Epoch {entry.epoch}</span>
                <span className="text-green-400">acc={entry.accuracy}</span>
                <span className="text-fire-400">loss={entry.loss}</span>
                <span className="text-blue-400">val_acc={entry.val_accuracy}</span>
                <span className="text-yellow-400">val_loss={entry.val_loss}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Training history */}
      <div className="glass rounded-2xl border border-fire-500/20 overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300">Training History</h3>
        </div>
        <div className="divide-y divide-slate-800">
          {jobs.length > 0 ? jobs.map(j => (
            <div key={j.id} className="p-4 flex items-center justify-between hover:bg-fire-500/5 cursor-pointer"
              onClick={() => setSelectedJobId(j.id)}>
              <div>
                <div className="text-sm text-white font-mono">{j.id.slice(0, 12)}...</div>
                <div className="text-xs text-slate-500">{j.created_at?.slice(0, 16)}</div>
              </div>
              <div className="flex items-center gap-3">
                {j.final_accuracy && (
                  <span className="text-green-400 text-xs font-mono">
                    {(j.final_accuracy * 100).toFixed(1)}%
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full badge-${j.status}`}>{j.status}</span>
              </div>
            </div>
          )) : <div className="text-center py-10 text-slate-600 text-sm">No training runs yet</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Datasets Tab ─────────────────────────────────────────────────────────────
function DatasetsTab({ datasets, onRefresh }) {
  const [file, setFile] = useState(null);
  const [label, setLabel] = useState('mixed');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert('Select a zip file');
    setUploading(true);
    try {
      await uploadDataset(file, label);
      setFile(null);
      onRefresh();
    } catch (e) {
      alert(e.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-5 border border-fire-500/20">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Upload className="w-4 h-4 text-fire-500" /> Upload Dataset (ZIP)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          ZIP must contain <code className="bg-slate-800 px-1 rounded">wildfire/</code> and <code className="bg-slate-800 px-1 rounded">nowildfire/</code> subdirectories with images.
        </p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="cursor-pointer block">
              <div className="drop-zone rounded-xl p-3 text-center text-sm text-slate-400">
                {file ? <span className="text-fire-400">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                  : 'Click to select ZIP file'}
              </div>
              <input type="file" accept=".zip" className="hidden" onChange={e => setFile(e.target.files[0])} />
            </label>
          </div>
          <select value={label} onChange={e => setLabel(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none">
            <option value="mixed">Mixed</option>
            <option value="wildfire">Wildfire</option>
            <option value="nowildfire">No Wildfire</option>
          </select>
          <button onClick={handleUpload} disabled={uploading} className="btn-fire text-sm flex items-center gap-2">
            {uploading ? <div className="fire-spinner w-4 h-4" /> : <Upload className="w-4 h-4" />}
            Upload
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl border border-fire-500/20 overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300">Uploaded Datasets ({datasets?.length || 0})</h3>
        </div>
        <div className="divide-y divide-slate-800">
          {datasets?.length > 0 ? datasets.map(d => (
            <div key={d.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Database className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-sm text-white">{d.filename}</div>
                  <div className="text-xs text-slate-500">{d.image_count?.toLocaleString()} images • {d.label} • {d.created_at?.slice(0, 10)}</div>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                d.label === 'wildfire' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                d.label === 'nowildfire' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}>{d.label}</span>
            </div>
          )) : <div className="text-center py-10 text-slate-600 text-sm">No datasets uploaded yet</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Demo Videos Tab ──────────────────────────────────────────────────────────
function DemoVideosTab() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpload = async () => {
    if (!file || !title) return alert('Fill all required fields');
    setUploading(true);
    try {
      await uploadDemoVideo(file, title, desc || null);
      setSuccess(true);
      setFile(null);
      setTitle('');
      setDesc('');
    } catch (e) {
      alert(e.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-6 border border-fire-500/20">
      <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
        <Film className="w-4 h-4 text-fire-500" /> Upload Featured Demo Video
      </h3>
      <p className="text-xs text-slate-500 mb-4">
        Upload a video, detection will run automatically. It becomes the homepage demo.
      </p>
      {success && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-2 text-green-400 text-sm">
          <CheckCircle className="w-4 h-4" /> Video uploaded! Detection running in background.
        </div>
      )}
      <div className="space-y-3">
        <input placeholder="Demo title *" value={title} onChange={e => setTitle(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-fire-500" />
        <input placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-fire-500" />
        <label className="cursor-pointer block">
          <div className="drop-zone rounded-xl p-4 text-center text-sm text-slate-400">
            {file ? <span className="text-fire-400">{file.name}</span> : 'Click to select video (MP4, max 500MB)'}
          </div>
          <input type="file" accept="video/mp4" className="hidden" onChange={e => setFile(e.target.files[0])} />
        </label>
        <button onClick={handleUpload} disabled={uploading} className="btn-fire flex items-center gap-2 text-sm">
          {uploading ? <><div className="fire-spinner w-4 h-4" /> Processing...</> : <><Film className="w-4 h-4" /> Upload Demo Video</>}
        </button>
      </div>
    </div>
  );
}

// ─── Research Export Tab ──────────────────────────────────────────────────────
function ResearchExportTab() {
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getAdminDetections({ page: 1, limit: 100 })
      .then(r => setDetections(r.data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(detections, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wildfirewatch_full_export_${Date.now()}.json`;
    a.click();
  };

  const exportCSV = () => {
    const headers = Object.keys(detections[0] || {});
    const rows = detections.map(d => headers.map(h => JSON.stringify(d[h] ?? '')).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wildfirewatch_full_export_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-5 border border-fire-500/20 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Full Detection Archive</h3>
          <p className="text-xs text-slate-500 mt-1">{detections.length} records loaded</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportCSV} className="btn-ghost text-sm flex items-center gap-2">
            <Archive className="w-4 h-4" /> CSV
          </button>
          <button onClick={exportJSON} className="btn-fire text-sm flex items-center gap-2">
            <Archive className="w-4 h-4" /> JSON
          </button>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><div className="fire-spinner w-8 h-8" /></div>
      ) : (
        <div className="glass rounded-2xl border border-fire-500/20 overflow-hidden overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Detection%</th>
                <th className="px-4 py-3 text-right">Max Conf</th>
                <th className="px-4 py-3 text-right">Frames</th>
                <th className="px-4 py-3 text-right">Time(s)</th>
                <th className="px-4 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {detections.map(d => (
                <tr key={d.id} className="border-b border-slate-800/50 hover:bg-fire-500/5">
                  <td className="px-4 py-2 font-mono text-slate-400">{d.id?.slice(0, 8)}...</td>
                  <td className="px-4 py-2">
                    <span className={`badge-${d.status} px-2 py-0.5 rounded-full`}>{d.status}</span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-fire-400">{d.detection_percentage?.toFixed(1)}%</td>
                  <td className="px-4 py-2 text-right font-mono text-yellow-400">{d.max_confidence ? `${(d.max_confidence*100).toFixed(1)}%` : '—'}</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-400">{d.total_frames?.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-400">{d.processing_time_seconds?.toFixed(1)}</td>
                  <td className="px-4 py-2 text-right text-slate-500">{d.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export default function Admin() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [models, setModels] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [detections, setDetections] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const loadAll = async () => {
      try {
        const [mRes, dRes, detRes] = await Promise.all([
          getAdminModels(),
          getDatasets(),
          getAdminDetections({ page: 1, limit: 100 }),
        ]);
        setModels(mRes.data);
        setDatasets(dRes.data);
        setDetections(detRes.data.items);
      } catch (e) {
        console.error('Admin load error', e);
      }
    };
    loadAll();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const refreshData = async () => {
    const [mRes, dRes] = await Promise.all([getAdminModels(), getDatasets()]);
    setModels(mRes.data);
    setDatasets(dRes.data);
  };

  return (
    <div className="pt-20 pb-16 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-fire-400 text-sm font-medium mb-2 bg-fire-500/10 px-4 py-1.5 rounded-full border border-fire-500/20">
            <Shield className="w-4 h-4" /> Admin Panel
          </div>
          <h1 className="text-2xl font-bold text-white">Control Center</h1>
        </div>
        <button onClick={handleLogout} className="btn-ghost flex items-center gap-2 text-sm text-red-400 border-red-500/30 hover:bg-red-500/10">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0 hidden md:block">
          <div className="glass rounded-2xl p-2 border border-fire-500/20 sticky top-24">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-1 ${
                  activeTab === tab.id
                    ? 'bg-fire-500/20 text-fire-400 border border-fire-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile tab bar */}
        <div className="md:hidden flex gap-2 overflow-x-auto pb-2 flex-shrink-0 w-full mb-4">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id ? 'bg-fire-500/20 text-fire-400 border border-fire-500/30' : 'bg-slate-800 text-slate-400'
              }`}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <DashboardTab models={models} detections={detections} />}
              {activeTab === 'models' && <ModelsTab models={models} onRefresh={refreshData} />}
              {activeTab === 'training' && <TrainingTab models={models} datasets={datasets} />}
              {activeTab === 'datasets' && <DatasetsTab datasets={datasets} onRefresh={refreshData} />}
              {activeTab === 'demo' && <DemoVideosTab />}
              {activeTab === 'research' && <ResearchExportTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
