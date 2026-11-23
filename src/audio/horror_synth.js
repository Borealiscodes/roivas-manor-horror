import { Q16_ONE, q16Clamp } from '../core/q16.js';

// 32-step multi-phrase gothic melody & bass progression (D minor -> BbMaj7 -> Gm -> A7b9 -> Dm -> Fm -> C#dim7 -> A7)
const BASS_PHRASES = [
  73.42, 73.42, 58.27, 58.27, 49.00, 49.00, 55.00, 55.00, // Phrase A: Mourning D2 -> Bb1 -> G1 -> A1
  73.42, 65.41, 58.27, 55.00, 43.65, 49.00, 51.91, 55.00  // Phrase B: Descending chromatic dread
];

const MELODY_PHRASES = [
  // Section A: Haunting celesta motif
  293.66, 349.23, 440.00, 415.30, 349.23, 329.63, 293.66, 261.63,
  233.08, 293.66, 349.23, 329.63, 277.18, 329.63, 440.00, 0,
  // Section B: High glass-harmonica tension
  587.33, 554.37, 440.00, 466.16, 440.00, 349.23, 329.63, 293.66,
  311.13, 293.66, 277.18, 220.00, 233.08, 277.18, 293.66, 0
];

export class HorrorAudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.celloOsc1 = null;
    this.celloOsc2 = null;
    this.celloGain = null;
    this.celloFilter = null;
    this.stepTimer = null;
    this.stepIdx = 0;
  }

  start() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctor();

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.30;

    this.celloFilter = this.ctx.createBiquadFilter();
    this.celloFilter.type = 'lowpass';
    this.celloFilter.frequency.value = 360;
    this.celloFilter.Q.value = 2.2;

    const delay = this.ctx.createDelay(1.2);
    delay.delayTime.value = 0.44;
    const fbGain = this.ctx.createGain();
    fbGain.gain.value = 0.45;
    delay.connect(fbGain);
    fbGain.connect(delay);

    this.celloFilter.connect(this.master);
    this.celloFilter.connect(delay);
    delay.connect(this.master);
    this.master.connect(this.ctx.destination);

    this.celloOsc1 = this.ctx.createOscillator();
    this.celloOsc1.type = 'sawtooth';
    this.celloOsc1.frequency.value = 73.42;

    this.celloOsc2 = this.ctx.createOscillator();
    this.celloOsc2.type = 'triangle';
    this.celloOsc2.frequency.value = 146.83;

    this.celloGain = this.ctx.createGain();
    this.celloGain.gain.value = 0.20;

    this.celloOsc1.connect(this.celloGain);
    this.celloOsc2.connect(this.celloGain);
    this.celloGain.connect(this.celloFilter);

    this.celloOsc1.start();
    this.celloOsc2.start();

    this.stepTimer = setInterval(() => this._advanceScore(), 560);
    return this.ctx;
  }

  _advanceScore() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const mIdx = this.stepIdx % MELODY_PHRASES.length;
    const bIdx = (this.stepIdx >> 1) % BASS_PHRASES.length;

    // Expressive bowed cello swell on every 2nd beat
    if (this.stepIdx % 2 === 0) {
      const bassHz = BASS_PHRASES[bIdx];
      this.celloOsc1.frequency.setTargetAtTime(bassHz, now, 0.22);
      this.celloOsc2.frequency.setTargetAtTime(bassHz * 1.498, now, 0.22);
      this.celloGain.gain.setTargetAtTime(0.24, now, 0.15);
      this.celloGain.gain.setTargetAtTime(0.14, now + 0.55, 0.25);
    }

    const noteHz = MELODY_PHRASES[mIdx];
    this.stepIdx++;
    if (noteHz <= 0) return; // Dramatic rest beat

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(noteHz, now);
    env.gain.setValueAtTime(0.001, now);
    env.gain.exponentialRampToValueAtTime(0.085, now + 0.04);
    env.gain.exponentialRampToValueAtTime(0.0008, now + 1.15);

    osc.connect(env);
    env.connect(this.celloFilter);
    osc.start(now);
    osc.stop(now + 1.2);
  }

  updateSanity(sanityQ16 = Q16_ONE, horrorNear = false) {
    if (!this.ctx || !this.celloFilter) return;
    const loss = (Q16_ONE - q16Clamp(sanityQ16, 0, Q16_ONE)) / Q16_ONE;
    const now = this.ctx.currentTime;
    const cutoff = horrorNear ? 580 : (340 + loss * 340);
    this.celloFilter.frequency.setTargetAtTime(cutoff, now, 0.18);
    this.celloOsc2.detune.setTargetAtTime(loss * 55 + (horrorNear ? 30 : 0), now, 0.18);
  }

  triggerSting(hz = 293.66) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(hz, now);
    osc.frequency.exponentialRampToValueAtTime(hz * 0.749, now + 0.5);
    env.gain.setValueAtTime(0.15, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(env);
    env.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.58);
  }
}
