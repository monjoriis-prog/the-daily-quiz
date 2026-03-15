import * as Tone from 'tone';

let initialized = false;

async function init() {
  if (initialized) return;
  await Tone.start();
  initialized = true;
}

export async function playCorrect() {
  await init();
  const synth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.1 },
    volume: -12,
  }).toDestination();
  synth.triggerAttackRelease('E5', '0.1');
  setTimeout(() => synth.triggerAttackRelease('G5', '0.12'), 80);
  setTimeout(() => synth.dispose(), 500);
}

export async function playWrong() {
  await init();
  const synth = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 },
    volume: -18,
  }).toDestination();
  synth.triggerAttackRelease('C4', '0.2');
  setTimeout(() => synth.triggerAttackRelease('B3', '0.25'), 120);
  setTimeout(() => synth.dispose(), 600);
}

export async function playStreak() {
  await init();
  const synth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.12, sustain: 0, release: 0.1 },
    volume: -10,
  }).toDestination();
  synth.triggerAttackRelease('C5', '0.1');
  setTimeout(() => synth.triggerAttackRelease('E5', '0.1'), 70);
  setTimeout(() => synth.triggerAttackRelease('G5', '0.1'), 140);
  setTimeout(() => synth.triggerAttackRelease('C6', '0.15'), 210);
  setTimeout(() => synth.dispose(), 700);
}

export async function playComplete() {
  await init();
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.4, sustain: 0.1, release: 0.3 },
    volume: -10,
  }).toDestination();
  synth.triggerAttackRelease(['C5', 'E5', 'G5'], '0.3');
  setTimeout(() => synth.triggerAttackRelease(['D5', 'F5', 'A5'], '0.3'), 200);
  setTimeout(() => synth.triggerAttackRelease(['E5', 'G5', 'C6'], '0.5'), 400);
  setTimeout(() => synth.dispose(), 1200);
}

export async function playTick() {
  await init();
  const synth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
    volume: -25,
  }).toDestination();
  synth.triggerAttackRelease('A5', '0.02');
  setTimeout(() => synth.dispose(), 200);
}

export async function playPerfect() {
  await init();
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0.15, release: 0.4 },
    volume: -8,
  }).toDestination();
  synth.triggerAttackRelease(['C5', 'E5'], '0.2');
  setTimeout(() => synth.triggerAttackRelease(['E5', 'G5'], '0.2'), 150);
  setTimeout(() => synth.triggerAttackRelease(['G5', 'C6'], '0.2'), 300);
  setTimeout(() => synth.triggerAttackRelease(['C5', 'E5', 'G5', 'C6'], '0.6'), 450);
  setTimeout(() => synth.dispose(), 1500);
}