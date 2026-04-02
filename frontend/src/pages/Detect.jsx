import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Video, AlertTriangle, CheckCircle, Clock,
  Download, RefreshCw, Flame, TrendingUp, BarChart2,
  Play, Activity, Info
} from 'lucide-react';
import { uploadVideo, getJobStatus, getVideoStreamUrl } from '../api/client';

const STATUS_CONFIG = {
  queued:     { label: 'Queued',     icon: Clock,       color: 'text-slate-400',  bg: 'bg-slate-700/30',  border: 'border-slate-600/30',  step: 1 },
  processing: { label: 'Processing', icon: Activity,    color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', step: 2, animate: true },
  completed:  { label: 'Completed',  icon: CheckCircle, color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20',  step: 4 },
  failed:     { label: 'Failed',     icon: AlertTriangle,color:'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    step: -1 },
};

function UploadZone({ onUpload, uploading, uploadProgress }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    const valid = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo'];
    if (!valid.includes(f.type)) {
      alert('Please upload an MP4, AVI, or MOV file.');
      return;
    }
    const maxMB = 500;
    if (f.size > maxMB * 1024 * 1024) {
      alert(`File too large. Max ${maxMB}MB.`);
      return;
    }
    setFile(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div
        className={`drop-zone rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 relative overflow-hidden ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/avi,video/quicktime"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        <AnimatePresence mode="wait">
          {file ? (
            <motion.div
              key="file"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="w-16 h-16 rounded-2xl bg-fire-500/20 flex items-center justify-center mx-auto">
                <Video className="w-8 h-8 text-fire-500" />
              </div>
              <div>
                <p className="text-white font-semibold text-lg">{file.name}</p>
                <p className="text-slate-400 text-sm">{formatSize(file.size)}</p>
              </div>
              <p className="text-slate-500 text-xs">Click or drag to change file</p>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-16 h-16 rounded-2xl bg-slate-800 border border-fire-500/20 flex items-center justify-center mx-auto"
              >
                <Upload className="w-8 h-8 text-fire-400" />
              </motion.div>
              <div>
                <p className="text-white font-semibold text-lg">Drop your video here</p>
                <p className="text-slate-400 text-sm mt-1">or click to browse</p>
              </div>
              <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" /> MP4, AVI, MOV
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" /> Up to 500MB
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-fire-600 to-fire-400 rounded-full"
              style={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      <motion.button
        onClick={() => file && onUpload(file)}
        disabled={!file || uploading}
        className={`w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-3 transition-all ${
          file && !uploading
            ? 'btn-fire'
            : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
        }`}
        whileHover={file && !uploading ? { scale: 1.02 } : {}}
        whileTap={file && !uploading ? { scale: 0.98 } : {}}
      >
        {uploading ? (
          <>
            <div className="fire-spinner w-5 h-5" />
            Uploading...
          </>
        ) : (
          <>
            <Flame className="w-5 h-5" />
            Start Wildfire Detection
          </>
        )}
      </motion.button>

      <p className="text-center text-xs text-slate-600 flex items-center justify-center gap-1">
        <Info className="w-3 h-3" />
        Videos are saved for research purposes
      </p>
    </div>
  );
}

function ProgressSteps({ status }) {
  const steps = [
    { key: 'queued', label: 'Queued' },
    { key: 'processing', label: 'Processing' },
    { key: 'analyzing', label: 'Analyzing' },
    { key: 'completed', label: 'Complete' },
  ];
  const statusStep = STATUS_CONFIG[status]?.step || 0;

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const done = i < statusStep;
        const active = i === statusStep - 1;
        return (
          <div key={step.key} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 text-xs font-medium transition-all ${
              done || active ? 'text-fire-400' : 'text-slate-600'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                done ? 'bg-fire-500 text-white' :
                active ? 'bg-fire-500/20 border border-fire-500/50 text-fire-400' :
                'bg-slate-800 border border-slate-700 text-slate-600'
              }`}>
                {done ? '✓' : i + 1}
              </div>
              <span className="hidden sm:block">{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-8 sm:w-12 ${i < statusStep - 1 ? 'bg-fire-500' : 'bg-slate-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ResultsPanel({ job }) {
  const confidence = job.max_confidence || 0;
  const detPct = job.detection_percentage || 0;
  const isWildfire = detPct > 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Alert banner */}
      <div className={`rounded-xl p-4 border flex items-center gap-3 ${
        isWildfire
          ? 'bg-red-500/10 border-red-500/30 text-red-400'
          : 'bg-green-500/10 border-green-500/30 text-green-400'
      }`}>
        {isWildfire
          ? <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          : <CheckCircle className="w-6 h-6 flex-shrink-0" />
        }
        <div>
          <p className="font-bold text-base">
            {isWildfire ? 'Wildfire Activity Detected' : 'No Significant Wildfire Detected'}
          </p>
          <p className="text-sm opacity-80">
            {isWildfire
              ? `${detPct.toFixed(1)}% of frames showed fire signatures`
              : 'Video analyzed — no fire pattern exceeded detection threshold'}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: BarChart2, label: 'Detection Rate', value: `${detPct.toFixed(1)}%`, color: isWildfire ? 'text-red-400' : 'text-green-400' },
          { icon: TrendingUp, label: 'Max Confidence', value: `${(confidence * 100).toFixed(1)}%`, color: 'text-fire-400' },
          { icon: Video, label: 'Total Frames', value: job.total_frames?.toLocaleString() || '—', color: 'text-blue-400' },
          { icon: Clock, label: 'Process Time', value: `${job.processing_time_seconds?.toFixed(1)}s` || '—', color: 'text-yellow-400' },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-xl p-3 border border-fire-500/10 text-center">
            <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
            <div className={`text-lg font-bold font-mono ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Confidence meter */}
      <div className="glass rounded-xl p-4 border border-fire-500/10">
        <div className="flex justify-between text-sm text-slate-400 mb-2">
          <span>Max Confidence Score</span>
          <span className="text-fire-400 font-mono">{(confidence * 100).toFixed(2)}%</span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, #10b981, #FFC107, #FF6B00, #ef4444)`,
              width: `${confidence * 100}%`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${confidence * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-600 mt-1">
          <span>Safe</span>
          <span className="text-yellow-500/70">0.6 threshold</span>
          <span>Critical</span>
        </div>
      </div>

      {/* Video players */}
      {job.output_video_url && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Play className="w-4 h-4 text-fire-500" /> Detection Output Video
          </h4>
          <video
            src={job.output_video_url}
            controls
            className="w-full rounded-xl border border-fire-500/30"
            style={{ maxHeight: '400px' }}
          />
          <a
            href={job.output_video_url}
            download
            className="btn-ghost w-full flex items-center justify-center gap-2 text-sm py-3"
          >
            <Download className="w-4 h-4" />
            Download Detection Video
          </a>
        </div>
      )}

      <p className="text-center text-xs text-slate-600">
        This video has been saved for research purposes. Job ID: {job.id?.slice(0, 8)}
      </p>
    </motion.div>
  );
}

export default function Detect() {
  const [jobId, setJobId] = useState(null);
  const [job, setJob] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const startPolling = (id) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await getJobStatus(id);
        setJob(res.data);
        if (['completed', 'failed'].includes(res.data.status)) {
          clearInterval(pollRef.current);
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 3000);
  };

  const handleUpload = async (file) => {
    setUploading(true);
    setError(null);
    setJob(null);
    setJobId(null);
    if (pollRef.current) clearInterval(pollRef.current);

    try {
      const res = await uploadVideo(file, null, (progressEvent) => {
        const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(pct);
      });
      const id = res.data.job_id;
      setJobId(id);
      setJob({ id, status: 'queued' });
      startPolling(id);
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed. Check your connection.');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setJobId(null);
    setJob(null);
    setError(null);
    setUploadProgress(0);
  };

  const status = job?.status;
  const statusCfg = STATUS_CONFIG[status] || {};

  return (
    <div className="pt-20 pb-16 px-4 sm:px-6 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <div className="inline-flex items-center gap-2 text-fire-400 text-sm font-medium mb-4 bg-fire-500/10 px-4 py-1.5 rounded-full border border-fire-500/20">
          <Flame className="w-4 h-4" />
          AI Detection Engine
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Wildfire Detection</h1>
        <p className="text-slate-400">
          Upload any video footage for AI-powered wildfire analysis with confidence heatmaps.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-6 border border-fire-500/20"
      >
        {/* Job status header */}
        {job && (
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <ProgressSteps status={status} />
              <button onClick={reset} className="text-slate-500 hover:text-slate-300 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${statusCfg.bg} ${statusCfg.border}`}>
              {statusCfg.icon && (
                <statusCfg.icon className={`w-5 h-5 ${statusCfg.color} ${statusCfg.animate ? 'animate-pulse' : ''}`} />
              )}
              <div>
                <p className={`font-semibold ${statusCfg.color}`}>
                  {statusCfg.label}
                  {status === 'processing' && (
                    <span className="ml-2 text-xs">
                      Processing frames... This may take 1-3 minutes.
                    </span>
                  )}
                </p>
                {job.id && <p className="text-xs text-slate-600 font-mono mt-0.5">Job: {job.id.slice(0, 16)}...</p>}
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-400 text-sm font-medium">{error}</p>
              <button onClick={reset} className="text-xs text-red-400/60 hover:text-red-400 mt-1">
                Try again
              </button>
            </div>
          </motion.div>
        )}

        {/* Upload form — show when no job */}
        {(!job || status === 'failed') && (
          <UploadZone onUpload={handleUpload} uploading={uploading} uploadProgress={uploadProgress} />
        )}

        {/* Results — show when completed */}
        {status === 'completed' && job && (
          <>
            <ResultsPanel job={job} />
            <div className="mt-6 pt-6 border-t border-slate-800 text-center">
              <button
                onClick={reset}
                className="btn-ghost flex items-center gap-2 mx-auto text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Analyze Another Video
              </button>
            </div>
          </>
        )}

        {/* Processing state with animation */}
        {(status === 'queued' || status === 'processing') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 text-center"
          >
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="fire-spinner w-20 h-20 border-4 absolute" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Flame className="w-8 h-8 text-fire-500 animate-fire-pulse" />
              </div>
            </div>
            <p className="text-white font-semibold text-lg mb-2">
              {status === 'queued' ? 'In Queue...' : 'Analyzing Video...'}
            </p>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              {status === 'queued'
                ? 'Your video is queued for processing.'
                : 'Sliding window heatmap analysis in progress. This typically takes 1-3 minutes.'}
            </p>
            <div className="flex justify-center gap-4 mt-6 text-xs text-slate-600">
              <span>Every 30th frame analyzed</span>
              <span>•</span>
              <span>32×32 sliding windows</span>
              <span>•</span>
              <span>GPU-accelerated</span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
