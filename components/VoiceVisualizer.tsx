'use client';

import { useEffect, useRef } from 'react';

interface VoiceVisualizerProps {
  isActive: boolean;
}

export function VoiceVisualizer({ isActive }: VoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const barCount = 20;
    const barWidth = width / barCount / 1.5;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      if (!isActive) {
        // Draw flat line
        ctx.fillStyle = '#4a4a5a';
        for (let i = 0; i < barCount; i++) {
          const x = i * (barWidth * 1.5) + barWidth * 0.25;
          const barHeight = 2;
          ctx.fillRect(x, (height - barHeight) / 2, barWidth, barHeight);
        }
        return;
      }

      // Animate random bars
      ctx.fillStyle = '#6ee7b7';
      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth * 1.5) + barWidth * 0.25;
        const barHeight = Math.random() * height * 0.8 + 4;
        const y = (height - barHeight) / 2;
        ctx.globalAlpha = 0.6 + Math.random() * 0.4;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
      ctx.globalAlpha = 1;

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={80}
      className="w-full max-w-[320px] h-20 rounded-lg bg-terminal-surface/50"
    />
  );
}