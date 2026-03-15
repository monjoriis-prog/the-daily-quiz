'use client';

import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  dx: number;
  dy: number;
  shape: 'circle' | 'square' | 'strip';
}

const COLORS = ['#059669', '#2563EB', '#D97706', '#DC2626', '#7C3AED', '#F59E0B', '#10B981'];

function createParticles(count: number, originY: number = 50): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 40 + Math.random() * 20,
    y: originY,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.random() * 6,
    rotation: Math.random() * 360,
    dx: (Math.random() - 0.5) * 30,
    dy: -(Math.random() * 20 + 10),
    shape: (['circle', 'square', 'strip'] as const)[Math.floor(Math.random() * 3)],
  }));
}

export function Confetti({ trigger, intensity = 'normal' }: { trigger: number; intensity?: 'normal' | 'big' | 'perfect' }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    const count = intensity === 'perfect' ? 60 : intensity === 'big' ? 40 : 20;
    setParticles(createParticles(count));
    const timer = setTimeout(() => setParticles([]), 1500);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (particles.length === 0) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(var(--dx), calc(var(--dy) + 100vh)) rotate(720deg);
            opacity: 0;
          }
        }
        .confetti-particle {
          position: absolute;
          animation: confetti-fall 1.2s ease-out forwards;
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.shape === 'strip' ? p.size * 0.4 : p.size,
            height: p.shape === 'strip' ? p.size * 1.5 : p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`,
            '--dx': `${p.dx}vw`,
            '--dy': `${p.dy}vh`,
            animationDelay: `${Math.random() * 0.3}s`,
            animationDuration: `${1 + Math.random() * 0.5}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export function GoldConfetti({ trigger }: { trigger: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    const golds = ['#F59E0B', '#EAB308', '#FCD34D', '#FBBF24', '#D97706'];
    const ps = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: 30 + Math.random() * 40,
      y: 40 + Math.random() * 10,
      color: golds[Math.floor(Math.random() * golds.length)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
      dx: (Math.random() - 0.5) * 40,
      dy: -(Math.random() * 25 + 10),
      shape: (['circle', 'square', 'strip'] as const)[Math.floor(Math.random() * 3)],
    }));
    setParticles(ps);
    const timer = setTimeout(() => setParticles([]), 2000);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (particles.length === 0) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      <style jsx>{`
        @keyframes gold-fall {
          0% {
            transform: translate(0, 0) rotate(0deg) scale(1);
            opacity: 1;
          }
          50% {
            opacity: 1;