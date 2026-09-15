'use client';

import { useEffect, useRef } from 'react';

interface VoiceVisualizerProps {
  isActive: boolean;
}

export function VoiceVisualizer({ isActive }: VoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Pre-compute stable bar positions once. The previous implementation called
  // Math.random() inside requestAnimationFrame on every frame, which is a
  // measurable CPU cost during dictation and produces jittery bars. Deriving
  // a fixed per-bar baseline + a time-varying amplitude is cheaper and smoother.
  const barsRef = useRef<number[] | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth || 320;
    const cssHeight = canvas.clientHeight || 80;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = cssWidth;
    const height = cssHeight;
    const barCount = 24;
    const barWidth = (width / barCount) * 0.6;
    const gap = width / barCount;

    // Stable per-bar baseline heights (0.2–0.5 of full height).
    if (!barsRef.current || barsRef.current.length !== barCount) {
      barsRef.current = Array.from({ length: barCount }, (_, i) => {
        // Deterministic pseudo-random so the layout is stable across frames.
        const seed = Math.sin(i * 12.9898) * 43758.5453;
        return 0.2 + (seed - Math.floor(seed)) * 0.3;
      });
    }
    const baselines = barsRef.current;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);

      if (!isActive) {
        ctx.fillStyle = '#4a4a5a';
        for (let i = 0; i < barCount; i++) {
          const x = i * gap + (gap - barWidth) / 2;
          ctx.fillRect(x, (height - 2) / 2, barWidth, 2);
        }
        return;
      }

      ctx.fillStyle = '#6ee7b7';
      const time = t / 1000;
      for (let i = 0; i < barCount; i++) {
        const x = i * gap + (gap - barWidth) / 2;
        // Sine-wave envelope modulated by the per-bar baseline so bars move
        // together but keep individual character.
        const wave = Math.sin(time * 2.5 + i * 0.5) * 0.5 + 0.5;
        const barHeight = (baselines[i] * 0.4 + wave * 0.6) * height * 0.85 + 4;
        const y = (height - barHeight) / 2;
        ctx.globalAlpha = 0.55 + wave * 0.45;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
      ctx.globalAlpha = 1;

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={isActive ? 'Voice activity visualizer' : 'Idle voice visualizer'}
      className="w-full max-w-[320px] h-20 rounded-lg bg-terminal-surface/50"
    />
  );
}