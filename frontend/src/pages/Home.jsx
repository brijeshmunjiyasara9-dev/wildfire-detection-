import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import {
  Flame, Radio, Database, Cpu, Zap, Eye, ChevronRight,
  TrendingUp, Shield, Activity, Play, AlertTriangle
} from 'lucide-react';
import FireParticles from '../components/FireParticles';
import { getDemoVideos } from '../api/client';

const methodologyCards = [
  {
    icon: Database,
    title: 'Dataset',
    color: 'fire',
    stats: ['30,250 training images', '6,300 validation images', '6,300 test images'],
    desc: 'Trained on the Wildfire Prediction Dataset: 3,480 wildfire images and 2,820 no-wildfire images across train/validation/test splits. Balanced with augmentation for robust generalization.',
  },
  {
    icon: Cpu,
    title: 'Model Architecture',
    color: 'blue',
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
    fire:  { bg: 'bg-fire-500/10',  border: 'border-fire-500/20',  text: 'text-fire-400',  icon: 'text-fire-500'  },
    blue:  { bg: 'bg-blue-500/10',  border: 'border-blue-500/20',  text: 'text-blue-400',  icon: 'text-blue-500'  },
    ember: { bg: 'bg-yellow-500/10',border: 'border-yellow-500/20',text: 'text-yellow-400',icon: 'text-yellow-500'},
    green: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', icon: 'text-green-500' },
  };
  const c = colorMap[card.color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      whileHover={{ y: -6, scale: 1.01 }}
      className={`glass rounded-2xl p-6 border ${c.border} card-3d group cursor-default`}
    >
      <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <card.icon className={`w-6 h-6 ${c.icon}`} />
      </div>
      <h3 className="text-lg font-bold text-white mb-1">{card.title}</h3>
      <div className="flex flex-wrap gap-2 mb-3">
        {card.stats.map((s, i) => (
          <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${c.bg} ${c.text} font-mono border ${c.border}`}>
            {s}
          </span>
        ))}
      </div>
      <p className="text-sm text-slate-400 leading-relaxed">{card.desc}</p>
    </motion.div>
  );
}

function HeroOrb() {
  return (
    <div className="relative w-80 h-80 mx-auto">
      {/* Outer rings */}
      {[120, 100, 80].map((size, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 m-auto rounded-full border border-fire-500/20"
          style={{ width: size * 2, height: size * 2, marginLeft: `calc(50% - ${size}px)`, marginTop: `calc(50% - ${size}px)` }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8 + i * 4, repeat: Infinity, ease: 'linear' }}
        />
      ))}

      {/* Core sphere */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="w-48 h-48 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #FF8C42, #FF6B00, #c2410c, #7c2d12)',
            boxShadow: '0 0 60px rgba(255,107,0,0.6), 0 0 120px rgba(255,107,0,0.3), inset 0 0 40px rgba(255,255,255,0.1)',
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Flame className="w-20 h-20 text-white drop-shadow-lg" />
        </motion.div>
      </div>

      {/* Orbiting dots */}
      {[0, 72, 144, 216, 288].map((deg, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-full bg-fire-400"
          style={{
            top: '50%',
            left: '50%',
            transformOrigin: '0 0',
          }}
          animate={{ rotate: [deg, deg + 360] }}
          transition={{ duration: 6 + i, repeat: Infinity, ease: 'linear' }}
        >
          <div
            className="absolute w-3 h-3 rounded-full bg-fire-400"
            style={{ transform: 'translate(-50%, -50%) translateX(130px)' }}
          />
        </motion.div>
      ))}
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
      className="glass rounded-2xl p-6 border border-fire-500/20"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Radio className="w-5 h-5 text-fire-500" />
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
            <div className="relative">
              <div className="absolute top-2 left-2 z-10 bg-slate-900/80 text-slate-300 text-xs px-2 py-1 rounded font-mono">
                Original
              </div>
              <video
                ref={origRef}
                src={activeDemo.original_url}
                className="w-full rounded-xl aspect-video object-cover border border-slate-700"
                loop
                muted
              />
            </div>
            <div className="relative">
              <div className="absolute top-2 left-2 z-10 bg-fire-500/80 text-white text-xs px-2 py-1 rounded font-mono">
                Detection Output
              </div>
              <video
                ref={detRef}
                src={activeDemo.detection_url}
                className="w-full rounded-xl aspect-video object-cover border border-fire-500/30"
                loop
                muted
              />
            </div>
          </div>
          <div className="flex items-center justify-center">
            <button
              onClick={togglePlay}
              className="btn-fire flex items-center gap-2 text-sm"
            >
              <Play className="w-4 h-4" />
              {playing ? 'Pause Demo' : 'Play Synchronized Demo'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-slate-500">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p className="text-sm">No demo video configured yet.</p>
          <p className="text-xs mt-1">Upload one in the Admin panel.</p>
        </div>
      )}
    </motion.div>
  );
}

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-16">
        <div className="absolute inset-0 overflow-hidden">
          <FireParticles count={50} />
          {/* Radial gradient overlay */}
          <div className="absolute inset-0 bg-gradient-radial from-fire-500/5 via-transparent to-transparent" style={{background: 'radial-gradient(ellipse at 70% 50%, rgba(255,107,0,0.08) 0%, transparent 60%)'}} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 grid lg:grid-cols-2 gap-12 items-center">
          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 bg-fire-500/10 border border-fire-500/20 rounded-full px-4 py-1.5 text-fire-400 text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-fire-500 animate-pulse" />
              AI-Powered Forest Fire Detection
            </div>

            <h1 className="text-5xl sm:text-6xl font-black leading-tight mb-6">
              <span className="text-white">Wildfire</span>
              <br />
              <span className="text-glow" style={{color: '#FF6B00'}}>Watch</span>
              <span className="text-white text-4xl sm:text-5xl"> Platform</span>
            </h1>

            <p className="text-lg text-slate-400 leading-relaxed mb-8 max-w-lg">
              Real-time wildfire detection from video footage using{' '}
              <span className="text-fire-400 font-semibold">MobileNetV2 deep learning</span>{' '}
              and sliding-window heatmap analysis. 97% accuracy on 30,000+ images.
            </p>

            {/* Metrics row */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: 'Test Accuracy', value: '97.02%', color: 'text-fire-400' },
                { label: 'F1 Score', value: '0.9729', color: 'text-yellow-400' },
                { label: 'Precision', value: '97.63%', color: 'text-green-400' },
              ].map((m) => (
                <div key={m.label} className="glass rounded-xl p-3 text-center border border-fire-500/10">
                  <div className={`text-xl font-bold font-mono ${m.color}`}>{m.value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <Link to="/detect">
                <motion.button
                  className="btn-fire flex items-center gap-2"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Radio className="w-5 h-5" />
                  Upload Your Video
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </Link>
              <Link to="/research">
                <motion.button
                  className="btn-ghost flex items-center gap-2"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Archive className="w-5 h-5" />
                  Research Archive
                </motion.button>
              </Link>
            </div>
          </motion.div>

          {/* Hero orb */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
            className="hidden lg:flex justify-center"
          >
            <HeroOrb />
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

      {/* Methodology Section */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 text-fire-400 text-sm font-medium mb-4 bg-fire-500/10 px-4 py-1.5 rounded-full border border-fire-500/20">
            <Cpu className="w-4 h-4" />
            Scientific Methodology
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            How <span style={{color:'#FF6B00'}}>WildfireWatch</span> Works
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            From raw video to detection heatmaps — a complete ML pipeline built for accuracy and speed.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {methodologyCards.map((card, i) => (
            <MethodologyCard key={card.title} card={card} index={i} />
          ))}
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 text-fire-400 text-sm font-medium mb-4 bg-fire-500/10 px-4 py-1.5 rounded-full border border-fire-500/20">
            <Play className="w-4 h-4" />
            See It In Action
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Side-by-Side Detection
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Watch the AI analyze footage in real-time with confidence heatmap overlays and detection bounding boxes.
          </p>
        </motion.div>
        <DemoSection />
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass rounded-3xl p-12 border border-fire-500/20 relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-30">
              <FireParticles count={20} />
            </div>
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-fire-500/20 flex items-center justify-center mx-auto mb-6 fire-glow">
                <Shield className="w-8 h-8 text-fire-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Detect Wildfires in Your Footage
              </h2>
              <p className="text-slate-400 mb-8">
                Upload any video up to 500MB. Get AI analysis with confidence scores, 
                detection heatmaps, and detailed statistics.
              </p>
              <Link to="/detect">
                <motion.button
                  className="btn-fire text-lg px-8 py-4"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Start Detection Now →
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
