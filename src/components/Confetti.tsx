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

function createParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 40 + Math.random() * 20,
    y: 50,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.random() * 6,
    rotation: Math.random() * 360,
    dx: (Math.random() - 0.5) * 30,
    dy: -(Math.random() * 20 + 10),
    shape: (['circle', 'square', 'strip'] as const)[Math.floor(Math.random() * 3)],
  }));
}

function ParticleEl({ p, duration }: { p: Particle; duration: number }) {
  const [style, setStyle] = useState({
    left: `${p.x}%`,
    top: `${p.y}%`,
    width: p.shape === 'strip' ? p.size * 0.4 : p.size,
    height: p.shape === 'strip' ? p.size * 1.5 : p.size,
    backgroundColor: p.color,
    borderRadius: p.shape === 'circle' ? '50%' : '2px',
    position: 'absolute' as const,
    opacity: 1,
    transform: `rotate(${p.rotation}deg) translate(0px, 0px)`,
    transition: `all ${duration}s ease-out`,
  });

  useEffect(() => {
    requestAnimationFrame(() => {
      setStyle(prev => ({
        ...prev,
        opacity: 0,
        transform: `rotate(${p.rotation + 720}deg) translate(${p.dx}vw, ${80 + Math.abs(p.dy)}vh)`,
      }));
    });
  }, []);

  return <div style={style} />;
}

export function Confetti({ trigger, intensity = 'normal' }: { trigger: number; intensity?: 'normal' | 'big' | 'perfect' }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    const count = intensity === 'perfect' ? 60 : intensity === 'big' ? 40 : 20;
    setParticles(createParticles(count));
    const timer = setTimeout(() => setParticles([]), 2000);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (particles.length === 0) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {particles.map((p) => (
        <ParticleEl key={p.id} p={p} duration={1.2} />
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
    const timer = setTimeout(() => setParticles([]), 2500);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (particles.length === 0) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      {particles.map((p) => (
        <ParticleEl key={p.id} p={p} duration={1.8} />
      ))}
    </div>
  );
}