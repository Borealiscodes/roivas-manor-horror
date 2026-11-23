import { Q16_ONE, q16Clamp } from '../core/q16.js';

// D Minor / Phrygian haunting cello & music-box frequencies (Hz)
const CELLO_PROGRESSION = [73.42, 77.78, 98.00, 65.41]; // D2 -> Eb2 -> G2 -> C2
const MUSIC_BOX_NOTES = [293.66, 311.13, 440.00, 392.00, 349.23, 311.13, 277.18, 293.66];

export class HorrorAudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.celloOsc1 = null;
    this.celloOsc2 = null;
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
    this.master.gain.value = 0.28;

    // Warm lowpass filter to eliminate all harsh harmonics
    this.celloFilter = this.ctx.createBiquadFilter();
    this.celloFilter.type = 'lowpass';
    this.celloFilter.frequency.value = 340;
    this.celloFilter.Q.value = 2.5;

    // Cathedral stereo delay feedback
    const delay = this.ctx.createDelay(1.0);
    delay.delayTime.value = 0.38;
    const fbGain = this.ctx.createGain();
    fbGain.gain.value = 0.42;
    delay.connect(fbGain);
    fbGain.connect(delay);

    this.celloFilter.connect(this.master);
    this.celloFilter.connect(delay);
    delay.connect(this.master);
    this.master.connect(this.ctx.destination);

    // Dual bowed cello oscillators (fundamental + detuned fifth/octave warmth)
    this.celloOsc1 = this.ctx.createOscillator();
    this.celloOsc1.type = 'sawtooth';
    this.celloOsc1.frequency.value = 73.42;

    this.celloOsc2 = this.ctx.createOscillator();
    this.celloOsc2.type = 'triangle';
    this.celloOsc2.frequency.value = 110.0;

    const celloGain = this.ctx.createGain();
    celloGain.gain.value = 0.22;

    this.celloOsc1.connect(celloGain);
    this.celloOsc2.connect(celloGain);
    celloGain.connect(this.celloFilter);

    this.celloOsc1.start();
    this.celloOsc2.start();

    // Haunted celesta / music-box arpeggiator
    this.stepTimer = setInterval(() => this._tickMusicBox(), 520);
    return this.ctx;
  }

  _tickMusicBox() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const noteHz = MUSIC_BOX_NOTES[this.stepIdx % MUSIC_BOX_NOTES.length];
    if (this.stepIdx % 4 === 0) {
      const bassHz = CELLO_PROGRESSION[(this.stepIdx >> 2) % CELLO_PROGRESSION.length];
      this.celloOsc1.frequency.setTargetAtTime(bassHz, now, 0.18);
      this.celloOsc2.frequency.setTargetAtTime(bassHz * 1.498, now, 0.18);
    }
    this.stepIdx++;

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(noteHz, now);
    env.gain.setValueAtTime(0.001, now);
    env.gain.exponentialRampToValueAtTime(0.09, now + 0.03);
    env.gain.exponentialRampToValueAtTime(0.0008, now + 0.85);

    osc.connect(env);
    env.connect(this.celloFilter);
    osc.start(now);
    osc.stop(now + 0.9);
  }

  updateSanity(sanityQ16 = Q16_ONE, horrorNear = false) {
    if (!this.ctx || !this.celloFilter) return;
    const loss = (Q16_ONE - q16Clamp(sanityQ16, 0, Q16_ONE)) / Q16_ONE;
    const now = this.ctx.currentTime;
    // Open filter and bend cello pitch into eerie tritone tension when Sanity drops or Watcher is near
    const cutoff = horrorNear ? 620 : (320 + loss * 380);
    this.celloFilter.frequency.setTargetAtTime(cutoff, now, 0.15);
    this.celloOsc2.detune.setTargetAtTime(loss * 65 + (horrorNear ? 35 : 0), now, 0.15);
  }

  triggerSting(hz = 293.66) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(hz, now);
    osc.frequency.exponentialRampToValueAtTime(hz * 0.749, now + 0.45);
    env.gain.setValueAtTime(0.16, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(env);
    env.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.52);
  }
}
