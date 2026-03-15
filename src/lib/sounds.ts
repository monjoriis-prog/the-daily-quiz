const AudioContext = typeof window !== 'undefined'
  ? (window.AudioContext || (window as any).webkitAudioContext)
  : null;

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (!AudioContext) return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function beep(freq: number, duration: number, volume: number, delay: number = 0, type: OscillatorType = 'sine') {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, c.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(c.currentTime + delay);
  osc.stop(c.currentTime + delay + duration);
}

export function playCorrect() {
  beep(659, 0.12, 0.15, 0);
  beep(784, 0.15, 0.15, 0.08);
}

export function playWrong() {
  beep(262, 0.2, 0.08, 0, 'triangle');
  beep(247, 0.25, 0.08, 0.12, 'triangle');
}

export function playStreak() {
  beep(523, 0.1, 0.15, 0);
  beep(659, 0.1, 0.15, 0.07);
  beep(784, 0.1, 0.15, 0.14);
  beep(1047, 0.18, 0.15, 0.21);
}

export function playComplete() {
  beep(523, 0.2, 0.12, 0);
  beep(659, 0.2, 0.12, 0.15);
  beep(784, 0.3, 0.12, 0.3);
}

export function playPerfect() {
  beep(523, 0.15, 0.15, 0);
  beep(659, 0.15, 0.15, 0.1);
  beep(784, 0.15, 0.15, 0.2);
  beep(1047, 0.4, 0.18, 0.3);
}

export function playTick() {
  beep(880, 0.03, 0.05);
}