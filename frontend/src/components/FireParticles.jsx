import { useEffect, useRef } from 'react';

export default function FireParticles({ count = 60 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * 100,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -(Math.random() * 2 + 1),
      life: Math.random(),
      maxLife: Math.random() * 0.8 + 0.5,
      size: Math.random() * 4 + 2,
      hue: Math.random() * 30,  // 0-30 for red/orange range
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx + Math.sin(p.life * 10) * 0.3;
        p.y += p.vy;
        p.life += 0.008;

        if (p.life > p.maxLife) {
          p.x = Math.random() * canvas.width;
          p.y = canvas.height + 10;
          p.life = 0;
          p.vx = (Math.random() - 0.5) * 0.8;
          p.vy = -(Math.random() * 2 + 1);
          p.size = Math.random() * 4 + 2;
        }

        const alpha = (1 - p.life / p.maxLife) * 0.7;
        const size = p.size * (1 - p.life / p.maxLife * 0.5);
        const hue = 10 + p.hue + p.life * 20;

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 2);
        grad.addColorStop(0, `hsla(${hue}, 100%, 70%, ${alpha})`);
        grad.addColorStop(0.5, `hsla(${hue + 10}, 100%, 50%, ${alpha * 0.7})`);
        grad.addColorStop(1, `hsla(${hue + 20}, 100%, 30%, 0)`);

        ctx.beginPath();
        ctx.fillStyle = grad;
        ctx.ellipse(p.x, p.y, size, size * 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [count]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}
