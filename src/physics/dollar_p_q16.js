import { Q16_ONE, q16Clamp, q16Sqrt, q16Cos, q16Sin, Q16_TAU, q16Div } from '../core/q16.js';

const CLOUD_N = 32;

function resampleStrokes(strokes, n = CLOUD_N) {
  const segs = [];
  let totalLen = 0;
  for (const stroke of strokes) {
    for (let i = 1; i < stroke.length; i++) {
      const a = stroke.at(i - 1), b = stroke.at(i);
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d > 0) { segs.push({ a, b, d }); totalLen += d; }
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
      pts.push({ x: seg.a.x + t * (seg.b.x - seg.a.x), y: seg.a.y + t * (seg.b.y - seg.a.y) });
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
  const cx = (minX + maxX) * 0.5, cy = (minY + maxY) * 0.5;
  return pts.map((p) => ({
    x: (((p.x - cx) / scale) * Q16_ONE) | 0,
    y: (((p.y - cy) / scale) * Q16_ONE) | 0
  }));
}

function countSharpCorners(strokes) {
  let corners = 0;
  for (const st of strokes) {
    for (let i = 2; i < st.length; i += 2) {
      const a = st.at(i - 2), b = st.at(i - 1), c = st.at(i);
      const v1x = b.x - a.x, v1y = b.y - a.y;
      const v2x = c.x - b.x, v2y = c.y - b.y;
      const m1 = Math.hypot(v1x, v1y), m2 = Math.hypot(v2x, v2y);
      if (m1 > 4 && m2 > 4 && (v1x * v2x + v1y * v2y) / (m1 * m2) < 0.45) corners++;
    }
  }
  return corners;
}

function cloudDistanceQ16(cloudA, cloudB) {
  const n = cloudA.length;
  const used = new Uint8Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    let best = 0x7fffffff, bestJ = 0;
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

function build12RuneTemplates() {
  const defs = {
    CHATTURGHA: Array.of(Array.of({x:0,y:0},{x:50,y:100},{x:100,y:0})), // V
    ULYAOTH:    Array.of(Array.of({x:50,y:0},{x:100,y:50},{x:50,y:100},{x:0,y:50},{x:50,y:0})), // Diamond
    XELLOTATH:  Array.of(Array.of({x:25,y:0},{x:25,y:100}), Array.of({x:75,y:0},{x:75,y:100})), // Twin Pillars ||
    MANTOROK:   Array.of(Array.of({x:0,y:0},{x:100,y:100}), Array.of({x:100,y:0},{x:0,y:100})), // X Cross
    ANTORBOK:   Array.of(Array.of({x:50,y:100},{x:50,y:0}), Array.of({x:20,y:35},{x:50,y:0},{x:80,y:35})), // Spear ↑
    BANKOROK:   Array.of(Array.of({x:0,y:25},{x:100,y:25}), Array.of({x:0,y:75},{x:100,y:75}), Array.of({x:50,y:0},{x:50,y:100})), // Ward #
    TIER:       Array.of(Array.of({x:15,y:100},{x:15,y:0},{x:85,y:0},{x:85,y:100})), // Gate Arch
    NAROKATH:   Array.of(Array.of({x:0,y:0},{x:100,y:0},{x:0,y:100},{x:100,y:100})), // Z-Seal
    REDGORMOR:  Array.of(Array.of({x:50,y:0},{x:100,y:100},{x:0,y:100},{x:50,y:0})), // Triangle
    MAGORMOR:   Array.of(Array.of({x:10,y:15},{x:90,y:15},{x:90,y:85},{x:10,y:85},{x:10,y:15})), // Box
    ARETAK:     Array.of(Array.of({x:50,y:100},{x:50,y:0}), Array.of({x:10,y:40},{x:90,y:40})), // Cross †
    PARGON:     Array.of(Array.from({ length: 17 }, (_, i) => {
      const a = q16Div(i * Q16_TAU, 16 << 16);
      return { x: 50 + ((50 * q16Cos(a)) >> 16), y: 50 + ((50 * q16Sin(a)) >> 16) };
    }))
  };
  const out = {};
  for (const [k, strokes] of Object.entries(defs)) out[k] = normalizeCloudQ16(resampleStrokes(strokes, CLOUD_N));
  return out;
}

export class DollarPQ16Recognizer {
  constructor() {
    this.templates = build12RuneTemplates();
    this.strokes = [];
    this.current = [];
  }

  beginStroke(x, y) { this.current = Array.of({ x, y }); }
  addPoint(x, y) {
    const last = this.current.at(-1);
    if (last && (x - last.x) ** 2 + (y - last.y) ** 2 >= 9) this.current.push({ x, y });
  }
  endStroke() { if (this.current.length > 1) this.strokes.push(this.current); this.current = []; }
  clear() { this.strokes = []; this.current = []; }

  recognizeStrokes(strokeList) {
    const resampled = resampleStrokes(strokeList, CLOUD_N);
    if (!resampled) return null;
    const cand = normalizeCloudQ16(resampled);
    const corners = countSharpCorners(strokeList);

    let bestRune = null, bestDist = 0x7fffffff;
    for (const [runeId, tmpl] of Object.entries(this.templates)) {
      let avg = (cloudDistanceQ16(cand, tmpl) + cloudDistanceQ16(tmpl, cand)) >> 1;
      // Separate smooth Enso PARGON from 4-corner ULYAOTH / MAGORMOR / REDGORMOR
      if (runeId === 'PARGON' && (corners >= 2 || strokeList.length > 1)) avg += 16000;
      if ((runeId === 'ULYAOTH' || runeId === 'MAGORMOR' || runeId === 'REDGORMOR') && corners >= 2) avg = Math.max(0, avg - 5000);
      if (avg < bestDist) { bestDist = avg; bestRune = runeId; }
    }
    return { runeId: bestRune, accuracyQ16: q16Clamp(Q16_ONE - (bestDist << 1), 16384, Q16_ONE) };
  }

  commitGlyph() {
    if (this.current.length > 1) this.endStroke();
    const res = this.recognizeStrokes(this.strokes);
    this.clear();
    return res;
  }
}
