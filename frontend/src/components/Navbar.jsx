import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Radio, Archive, Shield, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import { healthCheck } from '../api/client';

const navItems = [
  { path: '/', label: 'Home', icon: Flame },
  { path: '/detect', label: 'Detect', icon: Radio },
  { path: '/research', label: 'Research', icon: Archive },
  { path: '/admin/login', label: 'Admin', icon: Shield },
];

export default function Navbar() {
  const location = useLocation();
  const [apiStatus, setApiStatus] = useState('unknown');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await healthCheck();
        setApiStatus('online');
      } catch {
        setApiStatus('offline');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass border-b border-fire-500/20 shadow-lg shadow-fire-500/5' : 'bg-transparent'
      }`}
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-fire-500 to-fire-700 flex items-center justify-center fire-glow group-hover:fire-glow-strong transition-all">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-ember animate-fire-pulse" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight">
              Wildfire<span className="text-fire-500">Watch</span>
            </span>
            <div className="text-xs text-slate-500 -mt-0.5 font-mono">AI Detection System</div>
          </div>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path || 
              (path !== '/' && location.pathname.startsWith(path));
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-fire-500/20 text-fire-400 border border-fire-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono border ${
            apiStatus === 'online'
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : apiStatus === 'offline'
              ? 'border-red-500/30 bg-red-500/10 text-red-400'
              : 'border-slate-600/30 bg-slate-700/20 text-slate-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              apiStatus === 'online' ? 'bg-green-400 animate-pulse' :
              apiStatus === 'offline' ? 'bg-red-400' : 'bg-slate-400'
            }`} />
            <Activity className="w-3 h-3" />
            {apiStatus === 'online' ? 'API Online' : apiStatus === 'offline' ? 'API Offline' : 'Checking...'}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
