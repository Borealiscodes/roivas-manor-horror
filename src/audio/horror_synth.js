import { Q16_ONE, q16Clamp } from '../core/q16.js';

const BASS_PHRASES = [
  73.42, 73.42, 58.27, 58.27, 49.00, 49.00, 55.00, 55.00,
  73.42, 65.41, 58.27, 55.00, 43.65, 49.00, 51.91, 55.00
];

const MELODY_PHRASES = [
  293.66, 349.23, 440.00, 415.30, 349.23, 329.63, 293.66, 261.63,
  233.08, 293.66, 349.23, 329.63, 277.18, 329.63, 440.00, 0,
  587.33, 554.37, 440.00, 466.16, 440.00, 349.23, 329.63, 293.66,
  311.13, 293.66, 277.18, 220.00, 233.08, 277.18, 293.66, 0
];

// Sharp wooden bone-marimba frequencies (D4, Eb4, G4, A4, Bb4, C#5, D5)
const MARIMBA_NOTES = [293.66, 311.13, 392.00, 440.00, 466.16, 554.37, 587.33];

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
    this.celloFilter.frequency.value = 380;
    this.celloFilter.Q.value = 2.2;

    const delay = this.ctx.createDelay(1.2);
    delay.delayTime.value = 0.42;
    const fbGain = this.ctx.createGain();
    fbGain.gain.value = 0.44;
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
    this.celloGain.gain.value = 0.18;

    this.celloOsc1.connect(this.celloGain);
    this.celloOsc2.connect(this.celloGain);
    this.celloGain.connect(this.celloFilter);

    this.celloOsc1.start();
    this.celloOsc2.start();

    this.stepTimer = setInterval(() => this._advanceScore(), 280);
    return this.ctx;
  }

  _playBoneMarimba(hz, now) {
    // Sharp wooden FM mallet strike (4:1 overtone transient + fast exponential decay)
    const carrier = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const env = this.ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(hz, now);

    mod.type = 'sine';
    mod.frequency.setValueAtTime(hz * 3.98, now);
    modGain.gain.setValueAtTime(hz * 2.4, now);
    modGain.gain.exponentialRampToValueAtTime(1.0, now + 0.045);

    env.gain.setValueAtTime(0.001, now);
    env.gain.exponentialRampToValueAtTime(0.14, now + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0008, now + 0.24);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(env);
    env.connect(this.master);

    carrier.start(now);
    mod.start(now);
    carrier.stop(now + 0.26);
    mod.stop(now + 0.26);
  }

  _advanceScore() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const step = this.stepIdx++;

    // Syncopated creepy bone-marimba hits on off-beats (steps 1, 3, 4, 6, 7)
    const sub = step & 7;
    if (sub === 1 || sub === 3 || sub === 4 || sub === 6 || sub === 7) {
      const mNote = MARIMBA_NOTES[(step * 3 + (step >> 2)) % MARIMBA_NOTES.length];
      this._playBoneMarimba(mNote, now);
    }

    // Half-time bowed cello & celesta phrase on even steps
    if ((step & 1) === 0) {
      const halfStep = step >> 1;
      if ((halfStep & 1) === 0) {
        const bassHz = BASS_PHRASES[(halfStep >> 1) % BASS_PHRASES.length];
        this.celloOsc1.frequency.setTargetAtTime(bassHz, now, 0.20);
        this.celloOsc2.frequency.setTargetAtTime(bassHz * 1.498, now, 0.20);
        this.celloGain.gain.setTargetAtTime(0.22, now, 0.14);
        this.celloGain.gain.setTargetAtTime(0.13, now + 0.50, 0.24);
      }

      const noteHz = MELODY_PHRASES[halfStep % MELODY_PHRASES.length];
      if (noteHz > 0) {
        const osc = this.ctx.createOscillator();
        const env = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(noteHz, now);
        env.gain.setValueAtTime(0.001, now);
        env.gain.exponentialRampToValueAtTime(0.075, now + 0.035);
        env.gain.exponentialRampToValueAtTime(0.0008, now + 1.05);
        osc.connect(env);
        env.connect(this.celloFilter);
        osc.start(now);
        osc.stop(now + 1.1);
      }
    }
  }

  updateSanity(sanityQ16 = Q16_ONE, horrorNear = false) {
    if (!this.ctx || !this.celloFilter) return;
    const loss = (Q16_ONE - q16Clamp(sanityQ16, 0, Q16_ONE)) / Q16_ONE;
    const now = this.ctx.currentTime;
    const cutoff = horrorNear ? 600 : (360 + loss * 340);
    this.celloFilter.frequency.setTargetAtTime(cutoff, now, 0.18);
    this.celloOsc2.detune.setTargetAtTime(loss * 55 + (horrorNear ? 30 : 0), now, 0.18);
  }

  triggerSting(hz = 293.66) {
    if (!this.ctx) return;
    this._playBoneMarimba(hz * 2, this.ctx.currentTime);
  }
}
