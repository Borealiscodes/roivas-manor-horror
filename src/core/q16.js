export const Q16_ONE = 65536;
export const Q16_HALF = 32768;
export const Q16_PI = 205887;
export const Q16_TAU = 411775;
export const Q16_HALF_PI = 102944;

export function q16Mul(a, b) {
  return Number((BigInt(a | 0) * BigInt(b | 0)) >> 16n) | 0;
}

export function q16Div(a, b) {
  if ((b | 0) === 0) return a >= 0 ? 0x7fffffff : -0x80000000;
  return Number((BigInt(a | 0) << 16n) / BigInt(b | 0)) | 0;
}

export function q16Clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function q16Sqrt(x) {
  if (x <= 0) return 0;
  let val = BigInt(x) << 16n;
  let bit = 1n << 46n;
  while (bit > val) bit >>= 2n;
  let res = 0n;
  while (bit !== 0n) {
    if (val >= res + bit) {
      val -= res + bit;
      res = (res >> 1n) + bit;
    } else {
      res >>= 1n;
    }
    bit >>= 2n;
  }
  return Number(res) | 0;
}

export function q16Sin(theta) {
  let x = (theta | 0) % Q16_TAU;
  if (x < 0) x += Q16_TAU;
  let sign = 1;
  if (x > Q16_PI) { x -= Q16_PI; sign = -1; }
  const bx = BigInt(x), bPi = BigInt(Q16_PI);
  const xPiMinusX = (bx * (bPi - bx)) >> 16n;
  const fivePiSq = (5n * bPi * bPi) >> 16n;
  const den = fivePiSq - 4n * xPiMinusX;
  if (den === 0n) return 0;
  const res = Number(((16n * xPiMinusX) << 16n) / den) | 0;
  return sign < 0 ? -res : res;
}

export function q16Cos(theta) {
  return q16Sin((theta | 0) + Q16_HALF_PI);
}

export class GaloisLFSR16 {
  constructor(seed = 0xace1) {
    this.state = (seed & 0xffff) || 0xace1;
  }
  nextBit() {
    const lsb = this.state & 1;
    this.state >>= 1;
    if (lsb) this.state ^= 0xb400;
    return lsb;
  }
  nextQ16Signed() {
    this.nextBit();
    return (((this.state - 32768) << 1) | 0);
  }
}
