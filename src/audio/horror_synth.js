import { Q16_ONE, Q16_TAU, q16Clamp, q16Sin } from '../core/q16.js';

// Haunted D Phrygian Dominant scale frequencies (Hz): D2, Eb2, F#2, G2, A2, Bb2, C3, D3
const GOTHIC_NOTES = Uint16Array.of(73, 78, 92, 98, 110, 117, 131, 147);

export class HorrorAudioEngine {
  constructor(sampleRate = 22050) {
    this.sampleRate = sampleRate;
    this.padPhase1 = 0;
    this.padPhase2 = 0;
    this.arpPhase = 0;
    this.lfoPhase = 0;
    this.noteTimer = 0;
    this.noteIdx = 0;
    this.stingEnv = 0;
    this.stingFreq = 220;
    this.stingPhase = 0;
    this.reverb = new Int32Array(4096);
    this.revIdx = 0;
  }

  triggerSting(hz = 220) {
    this.stingFreq = hz;
    this.stingEnv = (this.sampleRate * 0.4) | 0;
  }

  /** Soft triangle-sine hybrid wave for warm pipe-organ / glass-harmonica tone */
  _organWave(phase) {
    const s1 = q16Sin(phase);
    const s2 = q16Sin((phase << 1) % Q16_TAU) >> 2;
    return (s1 + s2) >> 1;
  }

  renderBlock(frameCount, sanityQ16 = Q16_ONE, horrorNear = false) {
    const out = new Int16Array(frameCount);
    const loss = Q16_ONE - q16Clamp(sanityQ16, 0, Q16_ONE);
    const notePeriod = horrorNear ? (this.sampleRate >> 2) : ((this.sampleRate * 0.45) | 0);

    for (let i = 0; i < frameCount; i++) {
      // Slow haunted vibrato LFO
      this.lfoPhase = (this.lfoPhase + 18) % Q16_TAU;
      const vibrato = (q16Sin(this.lfoPhase) * (1 + (loss >> 13))) >> 15;

      // Advance gothic arpeggio note
      this.noteTimer++;
      if (this.noteTimer >= notePeriod) {
        this.noteTimer = 0;
        this.noteIdx = (this.noteIdx + (horrorNear ? 3 : 1)) % GOTHIC_NOTES.length;
      }

      const baseHz = GOTHIC_NOTES.at(this.noteIdx);
      // Detune upward toward tritone as Sanity drops
      const detune = (baseHz * (loss >> 3)) >> 16;
      const arpStep = (((baseHz + detune + vibrato) * Q16_TAU) / this.sampleRate) | 0;
      const padStep1 = (((36 + (vibrato >> 1)) * Q16_TAU) / this.sampleRate) | 0;
      const padStep2 = (((55 + detune) * Q16_TAU) / this.sampleRate) | 0;

      this.padPhase1 = (this.padPhase1 + padStep1) % Q16_TAU;
      this.padPhase2 = (this.padPhase2 + padStep2) % Q16_TAU;
      this.arpPhase = (this.arpPhase + arpStep) % Q16_TAU;

      // Envelope for each plucked music-box / pipe-organ note
      const env = Math.max(0, 256 - ((this.noteTimer * 256) / notePeriod | 0));
      let mix =
        (this._organWave(this.padPhase1) >> 4) +
        (this._organWave(this.padPhase2) >> 5) +
        (((this._organWave(this.arpPhase) >> 4) * env) >> 8);

      // Chime/sting feedback on spell cast or item pickup
      if (this.stingEnv > 0) {
        this.stingPhase = (this.stingPhase + (((this.stingFreq * Q16_TAU) / this.sampleRate) | 0)) % Q16_TAU;
        mix += ((q16Sin(this.stingPhase) >> 3) * (this.stingEnv >> 6)) >> 7;
        this.stingEnv--;
      }

      // Cathedral echo
      const echo = this.reverb[this.revIdx];
      const wet = mix + (echo >> 1) + (echo >> 2);
      this.reverb[this.revIdx] = q16Clamp(wet, -32768, 32767);
      this.revIdx = (this.revIdx + 1) & 4095;

      out[i] = q16Clamp(wet >> 1, -32768, 32767);
    }
    return out;
  }
}
