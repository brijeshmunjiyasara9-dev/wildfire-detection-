import { motion } from 'framer-motion';

export default function StatsCard({ icon: Icon, label, value, color = 'fire', delay = 0 }) {
  const colorMap = {
    fire: { bg: 'bg-fire-500/10', border: 'border-fire-500/20', text: 'text-fire-400', icon: 'text-fire-500' },
    ember: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', icon: 'text-yellow-500' },
    green: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', icon: 'text-green-500' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: 'text-blue-500' },
    red: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: 'text-red-500' },
  };
  const c = colorMap[color] || colorMap.fire;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={`glass rounded-xl p-4 border ${c.border} card-3d`}
    >
      <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${c.icon}`} />
      </div>
      <div className={`text-2xl font-bold font-mono ${c.text}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </motion.div>
  );
}
