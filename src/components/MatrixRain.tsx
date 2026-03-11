import { useEffect, useRef } from 'react';

const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÑñÁÉÍÓÚáéíóú<>{}[]=/\\*+-_%$#@!?';
const FONT_SIZE = 14;
const FADE_ALPHA = 0.04;
const DROP_SPEED_MIN = 0.4;
const DROP_SPEED_MAX = 1.2;
const COLUMN_GAP = FONT_SIZE + 2;

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let columns: number;
    let drops: number[];
    let speeds: number[];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      columns = Math.floor(canvas!.width / COLUMN_GAP);

      const oldDrops = drops ?? [];
      const oldSpeeds = speeds ?? [];
      drops = new Array(columns);
      speeds = new Array(columns);

      for (let i = 0; i < columns; i++) {
        // Keep existing positions if possible, otherwise randomize
        if (i < oldDrops.length) {
          drops[i] = oldDrops[i];
          speeds[i] = oldSpeeds[i];
        } else {
          drops[i] = Math.random() * -100;
          speeds[i] = DROP_SPEED_MIN + Math.random() * (DROP_SPEED_MAX - DROP_SPEED_MIN);
        }
      }
    }

    resize();
    window.addEventListener('resize', resize);

    function draw() {
      // Semi-transparent black to create trail fade
      ctx!.fillStyle = `rgba(0, 0, 0, ${FADE_ALPHA})`;
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);

      ctx!.font = `${FONT_SIZE}px "Share Tech Mono", monospace`;

      for (let i = 0; i < columns; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const x = i * COLUMN_GAP;
        const y = drops[i] * FONT_SIZE;

        // Head character — bright green
        ctx!.fillStyle = '#00ff41';
        ctx!.globalAlpha = 0.9;
        ctx!.fillText(char, x, y);

        // Trail characters slightly dimmer
        if (Math.random() > 0.7) {
          const trailChar = CHARS[Math.floor(Math.random() * CHARS.length)];
          ctx!.fillStyle = '#00cc33';
          ctx!.globalAlpha = 0.3;
          ctx!.fillText(trailChar, x, y - FONT_SIZE * 2);
        }

        ctx!.globalAlpha = 1;

        // Advance drop
        drops[i] += speeds[i];

        // Reset when off screen, with random delay
        if (y > canvas!.height && Math.random() > 0.975) {
          drops[i] = Math.random() * -20;
          speeds[i] = DROP_SPEED_MIN + Math.random() * (DROP_SPEED_MAX - DROP_SPEED_MIN);
        }
      }

      animationId = requestAnimationFrame(draw);
    }

    animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0.35 }}
    />
  );
}
