import { useEffect, useRef } from 'react';

export default function Globe3D({ size = 200 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const S = size;
    canvas.width = S;
    canvas.height = S;
    const cx = S / 2, cy = S / 2, r = S * 0.38;

    // Generate hotspot dots (wildfire detection points)
    const hotspots = Array.from({ length: 12 }, () => ({
      lat: (Math.random() - 0.5) * Math.PI * 0.8,
      lng: Math.random() * Math.PI * 2,
      intensity: 0.5 + Math.random() * 0.5,
      pulse: Math.random() * Math.PI * 2,
    }));

    // Lat/lng to 3D and then to 2D with rotation
    const project = (lat, lng, rotY) => {
      const x3 = Math.cos(lat) * Math.sin(lng + rotY);
      const y3 = Math.sin(lat);
      const z3 = Math.cos(lat) * Math.cos(lng + rotY);
      return { x: cx + r * x3, y: cy - r * y3, z: z3 };
    };

    let rotY = 0;
    let raf;

    const draw = () => {
      ctx.clearRect(0, 0, S, S);
      rotY += 0.005;

      // Globe base
      const gGlobe = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r);
      gGlobe.addColorStop(0, 'rgba(26,35,50,0.9)');
      gGlobe.addColorStop(0.7, 'rgba(10,15,26,0.95)');
      gGlobe.addColorStop(1, 'rgba(255,107,0,0.05)');

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = gGlobe;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,107,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Longitude lines
      for (let lng = 0; lng < Math.PI * 2; lng += Math.PI / 6) {
        ctx.beginPath();
        let first = true;
        for (let lat = -Math.PI / 2; lat <= Math.PI / 2; lat += 0.1) {
          const p = project(lat, lng, rotY);
          if (p.z < 0) { first = true; continue; }
          if (first) { ctx.moveTo(p.x, p.y); first = false; }
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'rgba(255,107,0,0.08)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Latitude lines
      for (let lat = -Math.PI / 2 + Math.PI / 6; lat < Math.PI / 2; lat += Math.PI / 6) {
        ctx.beginPath();
        let first = true;
        for (let lng = 0; lng <= Math.PI * 2; lng += 0.08) {
          const p = project(lat, lng, rotY);
          if (p.z < 0) { first = true; continue; }
          if (first) { ctx.moveTo(p.x, p.y); first = false; }
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'rgba(255,107,0,0.06)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Hotspot dots
      const t = Date.now() / 1000;
      hotspots.forEach((hs) => {
        const p = project(hs.lat, hs.lng, rotY);
        if (p.z < 0) return;

        const pulseR = 3 + 4 * Math.abs(Math.sin(t * 2 + hs.pulse));
        
        // Outer glow
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pulseR * 3);
        g.addColorStop(0, `rgba(255,107,0,${0.6 * hs.intensity})`);
        g.addColorStop(0.5, `rgba(255,193,7,${0.3 * hs.intensity})`);
        g.addColorStop(1, 'rgba(255,107,0,0)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseR * 3, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FF6B00';
        ctx.fill();
      });

      // Highlight rim
      const rim = ctx.createRadialGradient(cx - r * 0.5, cy - r * 0.5, r * 0.3, cx, cy, r);
      rim.addColorStop(0, 'rgba(255,255,255,0.02)');
      rim.addColorStop(1, 'rgba(255,107,0,0.08)');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = rim;
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
    />
  );
}
