import { Q16_ONE, Q16_TAU, q16Clamp, q16Sin, GaloisLFSR16 } from '../core/q16.js';

export class HorrorAudioEngine {
  constructor(sampleRate = 22050) {
    this.sampleRate = sampleRate;
    this.lfsr = new GaloisLFSR16(0x6661);
    this.p1 = 0;
    this.p2 = 0;
    this.heartbeatTimer = 0;
    this.stingEnv = 0;
    this.stingFreq = 220;
    this.stingPhase = 0;
    this.reverb = new Int32Array(4096);
    this.revIdx = 0;
  }

  triggerSting(hz = 185) {
    this.stingFreq = hz;
    this.stingEnv = (this.sampleRate * 0.45) | 0;
  }

  renderBlock(frameCount, sanityQ16 = Q16_ONE, horrorNear = false) {
    const out = new Int16Array(frameCount);
    const loss = Q16_ONE - q16Clamp(sanityQ16, 0, Q16_ONE);
    const step1 = ((41 * Q16_TAU) / this.sampleRate) | 0;
    const step2 = (((58 + (loss >> 11)) * Q16_TAU) / this.sampleRate) | 0;
    const beatPeriod = horrorNear ? (this.sampleRate >> 1) : this.sampleRate;

    for (let i = 0; i < frameCount; i++) {
      this.p1 = (this.p1 + step1) % Q16_TAU;
      this.p2 = (this.p2 + step2) % Q16_TAU;
      let mix = (q16Sin(this.p1) >> 4) + (q16Sin(this.p2) >> 5);
// Double-thump heartbeat when horror is near or sanity is low
this.heartbeatTimer = (this.heartbeatTimer + 1) % beatPeriod;
if (this.heartbeatTimer < 900 || (this.heartbeatTimer > 2400 && this.heartbeatTimer < 3200)) {
mix += q16Sin((this.heartbeatTimer * 18) % Q16_TAU) >> 3;
}
// Dissonant horror string sting on spell/encounter
if (this.stingEnv > 0) {
this.stingPhase = (this.stingPhase + (((this.stingFreq * Q16_TAU) / this.sampleRate) | 0)) % Q16_TAU;
mix += ((q16Sin(this.stingPhase) >> 3) * (this.stingEnv >> 6)) >> 7;
this.stingEnv--;
}
// Cold wind hiss
mix += this.lfsr.nextQ16Signed() >> 7;
const echo = this.reverb[this.revIdx];
const wet = mix + (echo >> 1) + (echo >> 2);
this.reverb[this.revIdx] = q16Clamp(wet, -32768, 32767);
this.revIdx = (this.revIdx + 1) & 4095;
out[i] = q16Clamp(wet >> 1, -32768, 32767);
}
return out;
}
}
