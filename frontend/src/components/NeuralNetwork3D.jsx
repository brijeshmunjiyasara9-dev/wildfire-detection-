import { useEffect, useRef } from 'react';

export default function NeuralNetwork3D({ width = 400, height = 300 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    // Define layers [input, hidden1, hidden2, output]
    const layers = [4, 6, 5, 2];
    const nodes = [];
    const connections = [];

    // Build node positions
    layers.forEach((count, li) => {
      const x = (li / (layers.length - 1)) * (width * 0.8) + width * 0.1;
      for (let ni = 0; ni < count; ni++) {
        const y = ((ni + 0.5) / count) * (height * 0.8) + height * 0.1;
        nodes.push({ x, y, layer: li, index: ni, activation: Math.random() });
      }
    });

    // Build connections
    let layerStart = 0;
    for (let li = 0; li < layers.length - 1; li++) {
      const fromCount = layers[li];
      const toCount = layers[li + 1];
      const toStart = layerStart + fromCount;
      for (let f = 0; f < fromCount; f++) {
        for (let t = 0; t < toCount; t++) {
          connections.push({
            from: layerStart + f,
            to: toStart + t,
            weight: Math.random() * 2 - 1,
          });
        }
      }
      layerStart += fromCount;
    }

    let frame = 0;
    let raf;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      frame++;

      // Animate activations
      nodes.forEach((n) => {
        n.activation = 0.4 + 0.5 * Math.abs(Math.sin(frame * 0.02 + n.layer * 1.5 + n.index));
      });

      // Draw connections
      connections.forEach((c) => {
        const from = nodes[c.from];
        const to = nodes[c.to];
        const alpha = 0.08 + Math.abs(c.weight) * 0.15;
        const pulse = 0.5 + 0.5 * Math.sin(frame * 0.03 + c.from * 0.4);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = c.weight > 0
          ? `rgba(255,107,0,${alpha * pulse})`
          : `rgba(100,149,237,${alpha * pulse})`;
        ctx.lineWidth = 0.5 + Math.abs(c.weight) * 0.5;
        ctx.stroke();
      });

      // Draw signal particles on connections
      if (frame % 3 === 0) {
        const active = connections[Math.floor(Math.random() * connections.length)];
        if (active) {
          const from = nodes[active.from];
          const to = nodes[active.to];
          const t = (frame % 60) / 60;
          const px = from.x + (to.x - from.x) * t;
          const py = from.y + (to.y - from.y) * t;
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#FFC107';
          ctx.fill();
        }
      }

      // Draw nodes
      nodes.forEach((n) => {
        const r = 6 + n.activation * 4;
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2);
        
        if (n.layer === 0) {
          grad.addColorStop(0, `rgba(100,149,237,${n.activation})`);
          grad.addColorStop(1, 'rgba(100,149,237,0)');
        } else if (n.layer === layers.length - 1) {
          grad.addColorStop(0, n.index === 0 ? `rgba(255,107,0,${n.activation})` : `rgba(16,185,129,${n.activation})`);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
        } else {
          grad.addColorStop(0, `rgba(255,193,7,${n.activation * 0.8})`);
          grad.addColorStop(1, 'rgba(255,193,7,0)');
        }

        // Glow
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 2, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = n.layer === 0 ? '#6495ed' 
          : n.layer === layers.length - 1 
            ? (n.index === 0 ? '#FF6B00' : '#10b981')
            : '#FFC107';
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', maxWidth: width, maxHeight: height }}
    />
  );
}
