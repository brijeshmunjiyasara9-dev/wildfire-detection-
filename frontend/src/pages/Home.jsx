import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import {
  Flame, Radio, Database, Cpu, Zap, Eye, ChevronRight,
  TrendingUp, Shield, Activity, Play, AlertTriangle, Archive,
  Brain, Target, Layers, GitBranch, BarChart2
} from 'lucide-react';
import FireParticles from '../components/FireParticles';
import NeuralNetwork3D from '../components/NeuralNetwork3D';
import Globe3D from '../components/Globe3D';
import { getDemoVideos } from '../api/client';

const methodologyCards = [
  {
    icon: Database,
    title: 'Dataset',
    color: 'blue',
    stats: ['30,250 training images', '6,300 validation images', '6,300 test images'],
    desc: 'Trained on the Wildfire Prediction Dataset: 3,480 wildfire images and 2,820 no-wildfire images across train/validation/test splits. Balanced with augmentation for robust generalization.',
  },
  {
    icon: Cpu,
    title: 'Model Architecture',
    color: 'fire',
    stats: ['MobileNetV2 backbone', '2.4M parameters', '224×224×3 input'],
    desc: 'MobileNetV2 Transfer Learning: Pre-trained ImageNet weights as backbone. Custom head: GlobalAveragePooling2D → Dense(128, ReLU) → Dense(1, Sigmoid). Binary classification: Wildfire vs No Wildfire.',
  },
  {
    icon: TrendingUp,
    title: 'Training Setup',
    color: 'ember',
    stats: ['97.02% test accuracy', 'F1 Score: 0.9729', 'Precision: 97.63%'],
    desc: '15 epochs maximum with Early Stopping (patience=3) on validation loss. Adam optimizer (lr=0.001), Binary Crossentropy loss. Data augmentation: rotation ±20°, horizontal flip, zoom ±10%, shifts.',
  },
  {
    icon: Eye,
    title: 'Video Detection',
    color: 'fire',
    stats: ['32×32 sliding window', '15% frame scale', 'Every 30th frame'],
    desc: 'Sliding Window Heatmap: Each frame scaled to 15% for speed, scanned with 32×32 pixel patches processed in batches of 2. Detection runs every 30th frame (≈1 fps equivalent). Confidence threshold: 0.6 for wildfire alert.',
  },
  {
    icon: Zap,
    title: 'Real-Time Processing',
    color: 'green',
    stats: ['GPU-accelerated', 'Red/orange heatmap', '10–12 FPS CPU'],
    desc: 'GPU-accelerated inference with memory growth enabled. Per-frame heatmaps overlaid in red/orange gradient. Tracks: wildfire frame %, max confidence, average confidence across video.',
  },
];

function MethodologyCard({ card, index }) {
  const colorMap = {
    fire:  { bg: 'bg-fire-500/10',  border: 'border-fire-500/20',  text: 'text-fire-400',  icon: 'text-fire-500', glow: 'rgba(255,107,0,0.2)'  },
    blue:  { bg: 'bg-blue-500/10',  border: 'border-blue-500/20',  text: 'text-blue-400',  icon: 'text-blue-500', glow: 'rgba(99,102,241,0.2)'  },
    ember: { bg: 'bg-yellow-500/10',border: 'border-yellow-500/20',text: 'text-yellow-400',icon: 'text-yellow-500', glow: 'rgba(255,193,7,0.2)'},
    green: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', icon: 'text-green-500', glow: 'rgba(16,185,129,0.2)' },
  };
  const c = colorMap[card.color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.2 } }}
      className={`glass rounded-2xl p-6 border ${c.border} card-3d group cursor-default relative overflow-hidden`}
      style={{
        '--hover-glow': c.glow,
      }}
    >
      {/* Background gradient on hover */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl`}
        style={{ background: `radial-gradient(circle at 30% 20%, ${c.glow}, transparent 60%)` }}
      />
      
      <div className={`relative z-10 w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border ${c.border}`}>
        <card.icon className={`w-6 h-6 ${c.icon}`} />
      </div>
      <h3 className="relative z-10 text-lg font-bold text-white mb-2">{card.title}</h3>
      <div className="relative z-10 flex flex-wrap gap-2 mb-3">
        {card.stats.map((s, i) => (
          <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${c.bg} ${c.text} font-mono border ${c.border}`}>
            {s}
          </span>
        ))}
      </div>
      <p className="relative z-10 text-sm text-slate-400 leading-relaxed">{card.desc}</p>
    </motion.div>
  );
}

function HeroOrb() {
  return (
    <div className="relative w-80 h-80 mx-auto">
      {/* Outer rings */}
      {[140, 115, 90].map((size, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: size * 2,
            height: size * 2,
            left: '50%',
            top: '50%',
            marginLeft: -size,
            marginTop: -size,
            border: `1px solid rgba(255,107,0,${0.1 + i * 0.05})`,
          }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 10 + i * 5, repeat: Infinity, ease: 'linear' }}
        >
          {/* Dots on ring */}
          {[0, 90, 180, 270].map((deg) => (
            <div
              key={deg}
              className="absolute w-1.5 h-1.5 rounded-full bg-fire-500/60"
              style={{
                top: '50%',
                left: '50%',
                marginTop: -3,
                marginLeft: -3,
                transform: `rotate(${deg}deg) translateX(${size}px)`,
              }}
            />
          ))}
        </motion.div>
      ))}

      {/* Core sphere */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="w-52 h-52 rounded-full flex items-center justify-center relative"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #FF8C42, #FF6B00, #c2410c, #7c2d12)',
            boxShadow: '0 0 80px rgba(255,107,0,0.7), 0 0 160px rgba(255,107,0,0.3), inset 0 0 60px rgba(255,255,255,0.1)',
          }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Highlight */}
          <div className="absolute top-4 left-8 w-12 h-8 rounded-full bg-white/20 blur-md" />
          <Flame className="w-24 h-24 text-white drop-shadow-lg relative z-10" />
        </motion.div>
      </div>

      {/* Data labels orbiting */}
      {['97%', 'AI', 'ML', '4K'].map((label, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            top: '50%',
            left: '50%',
            transformOrigin: '0 0',
          }}
          animate={{ rotate: [i * 90, i * 90 + 360] }}
          transition={{ duration: 12 + i * 2, repeat: Infinity, ease: 'linear' }}
        >
          <div
            className="text-xs font-mono font-bold text-fire-400 bg-slate-900/80 px-2 py-0.5 rounded border border-fire-500/30"
            style={{ transform: `translate(-50%, -50%) translateX(160px)` }}
          >
            {label}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function StatsCounter({ target, suffix = '', label, color = 'text-fire-400' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) {
        setStarted(true);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const duration = 1500;
    const step = target / (duration / 16);
    let cur = 0;
    const timer = setInterval(() => {
      cur = Math.min(cur + step, target);
      setCount(Math.floor(cur));
      if (cur >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [started, target]);

  return (
    <div ref={ref} className="text-center">
      <div className={`text-3xl sm:text-4xl font-black font-mono ${color}`}>
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function DemoSection() {
  const [demos, setDemos] = useState([]);
  const [playing, setPlaying] = useState(false);
  const origRef = useRef(null);
  const detRef = useRef(null);

  useEffect(() => {
    getDemoVideos().then(r => setDemos(r.data)).catch(() => {});
  }, []);

  const togglePlay = () => {
    if (origRef.current && detRef.current) {
      if (playing) {
        origRef.current.pause();
        detRef.current.pause();
      } else {
        origRef.current.play();
        detRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  const activeDemo = demos[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="glass rounded-2xl p-6 border border-fire-500/20 relative overflow-hidden"
    >
      {/* Background grid */}
      <div className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,107,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,0,0.05) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-fire-500 animate-pulse" />
            Live Detection Demo
          </h3>
          {activeDemo && (
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span className="bg-fire-500/20 text-fire-400 px-3 py-1 rounded-full border border-fire-500/30 font-mono text-xs">
                {activeDemo.detection_percentage?.toFixed(1)}% detected
              </span>
              <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full border border-yellow-500/30 font-mono text-xs">
                {(activeDemo.max_confidence * 100).toFixed(1)}% max conf
              </span>
            </div>
          )}
        </div>

        {activeDemo ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative group">
                <div className="absolute top-2 left-2 z-10 bg-slate-900/80 text-slate-300 text-xs px-2 py-1 rounded font-mono">
                  Original
                </div>
                <video
                  ref={origRef}
                  src={activeDemo.original_url}
                  className="w-full rounded-xl aspect-video object-cover border border-slate-700 group-hover:border-slate-500 transition-colors"
                  loop muted
                />
              </div>
              <div className="relative group">
                <div className="absolute top-2 left-2 z-10 bg-fire-500/80 text-white text-xs px-2 py-1 rounded font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Detection Output
                </div>
                <video
                  ref={detRef}
                  src={activeDemo.detection_url}
                  className="w-full rounded-xl aspect-video object-cover border border-fire-500/30 group-hover:border-fire-500/60 transition-colors"
                  loop muted
                />
              </div>
            </div>
            <div className="flex items-center justify-center">
              <motion.button
                onClick={togglePlay}
                className="btn-fire flex items-center gap-2 text-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Play className={`w-4 h-4 ${playing ? 'fill-white' : ''}`} />
                {playing ? 'Pause Demo' : 'Play Synchronized Demo'}
              </motion.button>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-sm">No demo video configured yet.</p>
            <p className="text-xs mt-1">Upload one in the Admin panel.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function PipelineStep({ step, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15 }}
      className="flex items-start gap-4"
    >
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-fire-500/20 border border-fire-500/30 flex items-center justify-center text-fire-400 font-bold text-sm z-10 relative">
          {index + 1}
        </div>
        {index < 4 && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gradient-to-b from-fire-500/30 to-transparent" />
        )}
      </div>
      <div className="pb-8">
        <h4 className="font-semibold text-white text-sm">{step.title}</h4>
        <p className="text-xs text-slate-400 mt-1">{step.desc}</p>
      </div>
    </motion.div>
  );
}

const pipeline = [
  { title: 'Video Upload', desc: 'User uploads footage (up to 500MB) — stored securely in Cloudflare R2' },
  { title: 'Frame Sampling', desc: 'Every 30th frame extracted; downscaled to 15% for memory efficiency' },
  { title: 'Sliding Window', desc: '32×32 patches scanned across each frame in batches of 2' },
  { title: 'MobileNetV2 Inference', desc: 'Each patch classified by the TF model (score ≥ 0.6 = wildfire)' },
  { title: 'Heatmap Overlay', desc: 'Confidence map rendered in red/orange gradient on output video' },
];

export default function Home() {
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);

  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        <motion.div className="absolute inset-0" style={{ y: heroY }}>
          <FireParticles count={60} />
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse at 65% 40%, rgba(255,107,0,0.10) 0%, transparent 60%)',
          }} />
        </motion.div>

        {/* Deep space background */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 80 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: Math.random() * 2 + 0.5,
                height: Math.random() * 2 + 0.5,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.6 + 0.1,
                animationDuration: `${Math.random() * 4 + 2}s`,
              }}
            />
          ))}
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 grid lg:grid-cols-2 gap-12 items-center w-full">
          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          >
            <motion.div
              className="inline-flex items-center gap-2 bg-fire-500/10 border border-fire-500/20 rounded-full px-4 py-1.5 text-fire-400 text-sm font-medium mb-6"
              animate={{ boxShadow: ['0 0 0 0 rgba(255,107,0,0)', '0 0 0 8px rgba(255,107,0,0.1)', '0 0 0 0 rgba(255,107,0,0)'] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <span className="w-2 h-2 rounded-full bg-fire-500 animate-pulse" />
              AI-Powered Forest Fire Detection
            </motion.div>

            <h1 className="text-5xl sm:text-7xl font-black leading-tight mb-6">
              <span className="text-white block">Wildfire</span>
              <span
                className="block"
                style={{
                  color: '#FF6B00',
                  textShadow: '0 0 30px rgba(255,107,0,0.8), 0 0 60px rgba(255,107,0,0.4)',
                  letterSpacing: '-0.02em',
                }}
              >
                Watch
              </span>
              <span className="text-white text-3xl sm:text-4xl font-semibold block mt-1">
                MLOps Platform
              </span>
            </h1>

            <p className="text-lg text-slate-400 leading-relaxed mb-8 max-w-lg">
              Real-time wildfire detection from video footage using{' '}
              <span className="text-fire-400 font-semibold">MobileNetV2 deep learning</span>{' '}
              and sliding-window heatmap analysis. 97% accuracy on 30,000+ images.
            </p>

            {/* Metrics row */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { label: 'Test Accuracy', value: '97.02%', color: 'text-fire-400', border: 'border-fire-500/20' },
                { label: 'F1 Score', value: '0.9729', color: 'text-yellow-400', border: 'border-yellow-500/20' },
                { label: 'Precision', value: '97.63%', color: 'text-green-400', border: 'border-green-500/20' },
              ].map((m) => (
                <motion.div
                  key={m.label}
                  className={`glass rounded-xl p-3 text-center border ${m.border}`}
                  whileHover={{ scale: 1.05, y: -2 }}
                >
                  <div className={`text-xl font-bold font-mono ${m.color}`}>{m.value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <Link to="/detect">
                <motion.button
                  className="btn-fire flex items-center gap-2 text-base"
                  whileHover={{ scale: 1.03, boxShadow: '0 0 30px rgba(255,107,0,0.5)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Radio className="w-5 h-5" />
                  Upload Your Video
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </Link>
              <Link to="/research">
                <motion.button
                  className="btn-ghost flex items-center gap-2 text-base"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Archive className="w-5 h-5" />
                  Research Archive
                </motion.button>
              </Link>
            </div>
          </motion.div>

          {/* Hero orb + globe */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
            className="hidden lg:flex flex-col items-center gap-6"
          >
            <HeroOrb />
            <div className="flex items-center gap-6">
              <div className="text-center">
                <Globe3D size={120} />
                <p className="text-xs text-slate-500 mt-1 font-mono">Global Monitoring</p>
              </div>
              <div className="flex-1">
                <NeuralNetwork3D width={220} height={120} />
                <p className="text-xs text-slate-500 mt-1 font-mono text-center">MobileNetV2 Pipeline</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-fire-500/40 rounded-full flex items-start justify-center pt-2">
            <div className="w-1 h-2 bg-fire-500 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* Live Stats Bar */}
      <div className="bg-slate-900/80 border-y border-fire-500/10 py-8 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <StatsCounter target={30250} suffix="+" label="Training Images" color="text-fire-400" />
            <StatsCounter target={9702} suffix="%" label="Test Accuracy (×0.01)" color="text-yellow-400" />
            <StatsCounter target={9729} suffix="" label="F1 Score (×0.0001)" color="text-green-400" />
            <StatsCounter target={2420000} suffix="" label="Model Parameters" color="text-blue-400" />
          </div>
        </div>
      </div>

      {/* Methodology Section */}
      <section className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 text-fire-400 text-sm font-medium mb-4 bg-fire-500/10 px-4 py-1.5 rounded-full border border-fire-500/20">
            <Brain className="w-4 h-4" />
            Scientific Methodology
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            How <span style={{ color: '#FF6B00' }}>WildfireWatch</span> Works
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            From raw video to detection heatmaps — a complete ML pipeline built for accuracy and speed.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {methodologyCards.map((card, i) => (
            <MethodologyCard key={card.title} card={card} index={i} />
          ))}
        </div>

        {/* Neural Network visualization */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass rounded-2xl p-8 border border-fire-500/20 flex flex-col lg:flex-row gap-8 items-center"
        >
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Layers className="w-5 h-5 text-fire-500" />
              MobileNetV2 Architecture
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Live visualization of the neural network as it processes wildfire imagery.
              Each layer transforms the input progressively from raw pixels to fire probability.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Input Layer', value: '224×224×3', color: 'text-blue-400' },
                { label: 'Conv Blocks', value: '16 layers', color: 'text-yellow-400' },
                { label: 'Dense Head', value: '128→1', color: 'text-fire-400' },
                { label: 'Output', value: 'Binary', color: 'text-green-400' },
              ].map((item) => (
                <div key={item.label} className="bg-slate-800/50 rounded-lg p-3">
                  <div className={`text-sm font-bold font-mono ${item.color}`}>{item.value}</div>
                  <div className="text-xs text-slate-500">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="w-full lg:w-96 h-48 lg:h-56">
            <NeuralNetwork3D width={384} height={224} />
          </div>
        </motion.div>
      </section>

      {/* Detection Pipeline */}
      <section className="py-24 px-4 sm:px-6 bg-slate-900/40">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 text-yellow-400 text-sm font-medium mb-4 bg-yellow-500/10 px-4 py-1.5 rounded-full border border-yellow-500/20">
              <GitBranch className="w-4 h-4" />
              Detection Pipeline
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">
              From Video to{' '}
              <span className="text-yellow-400">Alert</span>
            </h2>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-0">
              {pipeline.map((step, i) => (
                <PipelineStep key={i} step={step} index={i} />
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass rounded-2xl p-6 border border-yellow-500/20"
            >
              <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-yellow-400" />
                Model Performance Breakdown
              </h4>
              {[
                { label: 'Test Accuracy', value: 97.02, color: '#FF6B00' },
                { label: 'Precision', value: 97.63, color: '#FFC107' },
                { label: 'Recall', value: 96.95, color: '#10b981' },
                { label: 'F1 Score', value: 97.29, color: '#6366f1' },
              ].map((m, i) => (
                <div key={m.label} className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">{m.label}</span>
                    <span className="font-mono font-bold" style={{ color: m.color }}>{m.value}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: m.color }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${m.value}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: i * 0.2, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              ))}
              
              <div className="mt-6 pt-4 border-t border-slate-700">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-slate-800/50 rounded-xl p-3">
                    <div className="text-2xl font-black font-mono text-green-400">3,374</div>
                    <div className="text-xs text-slate-500">True Positives</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-3">
                    <div className="text-2xl font-black font-mono text-fire-400">82</div>
                    <div className="text-xs text-slate-500">False Positives</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 text-fire-400 text-sm font-medium mb-4 bg-fire-500/10 px-4 py-1.5 rounded-full border border-fire-500/20">
            <Play className="w-4 h-4" />
            See It In Action
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Side-by-Side Detection
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Watch the AI analyze footage in real-time with confidence heatmap overlays and detection bounding boxes.
          </p>
        </motion.div>
        <DemoSection />
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass rounded-3xl p-12 border border-fire-500/20 relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-20">
              <FireParticles count={25} />
            </div>
            {/* Background orb */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <div className="w-96 h-96 rounded-full"
                style={{ background: 'radial-gradient(circle, #FF6B00, transparent 60%)' }}
              />
            </div>
            <div className="relative z-10">
              <motion.div
                className="w-20 h-20 rounded-2xl bg-fire-500/20 flex items-center justify-center mx-auto mb-6"
                style={{ boxShadow: '0 0 30px rgba(255,107,0,0.3)' }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Shield className="w-10 h-10 text-fire-400" />
              </motion.div>
              <h2 className="text-4xl font-bold text-white mb-4">
                Detect Wildfires in Your Footage
              </h2>
              <p className="text-slate-400 mb-8 text-lg max-w-2xl mx-auto">
                Upload any video up to 500MB. Get AI analysis with confidence scores,
                detection heatmaps, and detailed statistics — all powered by MobileNetV2.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/detect">
                  <motion.button
                    className="btn-fire text-lg px-8 py-4 flex items-center gap-2"
                    whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(255,107,0,0.6)' }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Radio className="w-5 h-5" />
                    Start Detection Now
                  </motion.button>
                </Link>
                <Link to="/research">
                  <motion.button
                    className="btn-ghost text-lg px-8 py-4 flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Archive className="w-5 h-5" />
                    View Research
                  </motion.button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
