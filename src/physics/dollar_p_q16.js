import { Q16_ONE, q16Clamp, q16Sqrt, q16Cos, q16Sin, Q16_TAU, q16Div } from '../core/q16.js';

const CLOUD_N = 32;

/** Resample multi-stroke array into N order-independent cloud points */
function resampleStrokes(strokes, n = CLOUD_N) {
  const segs = [];
  let totalLen = 0;
  for (const stroke of strokes) {
    for (let i = 1; i < stroke.length; i++) {
      const a = stroke.at(i - 1), b = stroke.at(i);
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d > 0) {
        segs.push({ a, b, d });
        totalLen += d;
      }
    }
  }
  if (totalLen < 14 || segs.length === 0) return null;

  const step = totalLen / n;
  const pts = [];
  let distAcc = 0;

  for (const seg of segs) {
    let cursor = 0;
    while (distAcc + (seg.d - cursor) >= step && pts.length < n) {
      const need = step - distAcc;
      const t = (cursor + need) / seg.d;
      pts.push({
        x: seg.a.x + t * (seg.b.x - seg.a.x),
        y: seg.a.y + t * (seg.b.y - seg.a.y)
      });
      cursor += need;
      distAcc = 0;
    }
    distAcc += (seg.d - cursor);
  }
  while (pts.length < n) pts.push({ x: segs.at(-1).b.x, y: segs.at(-1).b.y });
  return pts.slice(0, n);
}

function normalizeCloudQ16(pts) {
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const scale = Math.max(14, maxX - minX, maxY - minY);
  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;
  return pts.map((p) => ({
    x: (((p.x - cx) / scale) * Q16_ONE) | 0,
    y: (((p.y - cy) / scale) * Q16_ONE) | 0
  }));
}

/** Greedy bidirectional point-cloud matching distance in Q16.16 */
function cloudDistanceQ16(cloudA, cloudB) {
  const n = cloudA.length;
  const used = new Uint8Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    let best = 0x7fffffff;
    let bestJ = 0;
    for (let j = 0; j < n; j++) {
      if (used[j]) continue;
      const dx = (cloudA.at(i).x - cloudB.at(j).x) >> 4;
      const dy = (cloudA.at(i).y - cloudB.at(j).y) >> 4;
      const d = q16Sqrt((dx * dx + dy * dy) << 8);
      if (d < best) { best = d; bestJ = j; }
    }
    used[bestJ] = 1;
    sum += best;
  }
  return (sum / n) | 0;
}

function buildMultiStrokeTemplates() {
  const defs = {
    // 4 Alignments (multi-stroke friendly!)
    CHATTURGHA: Array.of(Array.of({x:0,y:0},{x:50,y:100},{x:100,y:0})), // Fang V
    ULYAOTH:    Array.of(Array.of({x:50,y:0},{x:100,y:50},{x:50,y:100},{x:0,y:50},{x:50,y:0})), // Diamond
    XELLOTATH:  Array.of(Array.of({x:20,y:0},{x:20,y:100}), Array.of({x:80,y:0},{x:80,y:100})), // Twin Pillars ||
    MANTOROK:   Array.of(Array.of({x:0,y:0},{x:100,y:100}), Array.of({x:100,y:0},{x:0,y:100})), // Two-stroke X Cross!

    // 3 Core Actions (Verbs/Nouns fused for fast survival horror combat & wards)
    ANTORBOK:   Array.of(Array.of({x:50,y:100},{x:50,y:0}), Array.of({x:20,y:35},{x:50,y:0},{x:80,y:35})), // Two-stroke Spear ↑
    BANKOROK:   Array.of(Array.of({x:0,y:20},{x:100,y:20}), Array.of({x:0,y:80},{x:100,y:80}), Array.of({x:50,y:0},{x:50,y:100})), // Ward Barricade
    PARGON:     Array.of(Array.from({ length: 17 }, (_, i) => {
      const a = q16Div(i * Q16_TAU, 16 << 16);
      return { x: 50 + ((50 * q16Cos(a)) >> 16), y: 50 + ((50 * q16Sin(a)) >> 16) };
    }))
  };

  const out = {};
  for (const [k, strokes] of Object.entries(defs)) {
    out[k] = normalizeCloudQ16(resampleStrokes(strokes, CLOUD_N));
  }
  return out;
}

export class DollarPQ16Recognizer {
  constructor() {
    this.templates = buildMultiStrokeTemplates();
    this.strokes = [];
    this.current = [];
  }

  beginStroke(x, y) {
    this.current = Array.of({ x, y });
  }

  addPoint(x, y) {
    const last = this.current.at(-1);
    if (!last) return;
    if ((x - last.x) ** 2 + (y - last.y) ** 2 >= 9) this.current.push({ x, y });
  }

  endStroke() {
    if (this.current.length > 1) this.strokes.push(this.current);
    this.current = [];
  }

  clear() {
    this.strokes = [];
    this.current = [];
  }

  recognizeStrokes(strokeList) {
    const resampled = resampleStrokes(strokeList, CLOUD_N);
    if (!resampled) return null;
    const cand = normalizeCloudQ16(resampled);

    let bestRune = null;
    let bestDist = 0x7fffffff;
    for (const [runeId, tmpl] of Object.entries(this.templates)) {
      const d1 = cloudDistanceQ16(cand, tmpl);
      const d2 = cloudDistanceQ16(tmpl, cand);
      const avg = (d1 + d2) >> 1;
      if (avg < bestDist) {
        bestDist = avg;
        bestRune = runeId;
      }
    }
    const accuracyQ16 = q16Clamp(Q16_ONE - (bestDist << 1), 16384, Q16_ONE);
    return { runeId: bestRune, accuracyQ16 };
  }

  commitGlyph() {
    if (this.current.length > 1) this.endStroke();
    const res = this.recognizeStrokes(this.strokes);
    this.clear();
    return res;
  }
}
