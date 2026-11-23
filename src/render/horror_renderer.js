import { Q16_ONE, Q16_TAU, q16Clamp, q16Sin, q16Cos } from '../core/q16.js';

export const FB_WIDTH = 480;
export const FB_HEIGHT = 272;

const BAYER_4X4 = Uint8Array.of(0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5);

export function buildHorrorCLUT8() {
  const lut = new Uint32Array(256);
  const ramps = Array.of(
    Array.of(235, 32, 52),
    Array.of(42, 150, 248),
    Array.of(38, 226, 122),
    Array.of(182, 74, 242)
  );
  for (let bank = 0; bank < 4; bank++) {
    const r0 = ramps.at(bank).at(0), g0 = ramps.at(bank).at(1), b0 = ramps.at(bank).at(2);
    for (let i = 0; i < 64; i++) {
      const c = i < 4 ? i : ((i * i) >> 6);
      const r = Math.min(255, ((r0 * c) >> 6) + (i > 52 ? (i - 52) * 16 : 0));
      const g = Math.min(255, ((g0 * c) >> 6) + (i > 52 ? (i - 52) * 16 : 0));
      const b = Math.min(255, ((b0 * c) >> 6) + (i > 52 ? (i - 52) * 16 : 0));
      lut[(bank << 6) + i] = (255 << 24) | (b << 16) | (g << 8) | r;
    }
  }
  return lut;
}

export class HorrorFramebuffer {
  constructor() {
    this.indices = new Uint8Array(FB_WIDTH * FB_HEIGHT);
    this.clut = buildHorrorCLUT8();
    this.rgba32 = new Uint32Array(FB_WIDTH * FB_HEIGHT);
    this.rotY = 0;
  }

  renderScene(world, strokes, currentStroke, tick, spotted = false) {
    const room = world.rooms[world.currentRoom];
    const bank = (room.ambienceAlign & 3) << 6;
    const p = world.player;
    const lx = p.x + (p.facing * 12);
    const ly = p.y + 14;
    const sanityRatio = q16Clamp(world.sanityQ16, 8192, Q16_ONE);
    const lanternR = (p.hidden ? 42 : 95) + ((sanityRatio * 85) >> 16);
    const lanternRSq = lanternR * lanternR;

    for (let y = 0; y < FB_HEIGHT; y++) {
      const row = y * FB_WIDTH;
      const bRow = (y & 3) << 2;
      const dy = y - ly;
      const dy2 = dy * dy;
      const isFloor = y >= 218;

      for (let x = 0; x < FB_WIDTH; x++) {
        const dx = x - lx;
        const d2 = dx * dx + dy2;
        let light = isFloor ? 8 : 3;
        if (d2 < lanternRSq) {
          const beam = 26 - (((d2 * 22) / lanternRSq) | 0);
          light = q16Clamp(beam + (isFloor ? 6 : 0), 3, 34);
        }
        const dither = BAYER_4X4[bRow + (x & 3)] >> 2;
        this.indices[row + x] = bank + q16Clamp(light + dither, 1, 38);
      }
    }

    // Floor & Gothic Lancet Windows
    this.drawLine(0, 218, FB_WIDTH - 1, 218, bank + 34);
    for (const wx of Array.of(95, 240, 385)) {
      this.drawLine(wx - 22, 165, wx - 22, 54, bank + 22);
      this.drawLine(wx + 22, 165, wx + 22, 54, bank + 22);
      this.drawLine(wx - 22, 54, wx, 28, bank + 28);
      this.drawLine(wx + 22, 54, wx, 28, bank + 28);
      this.drawLine(wx - 24, 165, wx + 24, 165, bank + 24);
    }

    // Stealth Shadow Alcoves
    for (const sh of room.shadows) {
      for (let y = 148; y < 218; y++) {
        const row = y * FB_WIDTH;
        for (let x = sh.x; x < sh.x + sh.w; x++) this.indices[row + x] = bank + 1;
      }
      this.drawRectOutline(sh.x, 148, sh.x + sh.w, 218, bank + 18);
    }

    // Ledges & Pushable Crate
    for (const plat of room.platforms) {
      this.fillRect(plat.x, plat.y, plat.x + plat.w, plat.y + plat.h, bank + 28);
      this.drawRectOutline(plat.x, plat.y, plat.x + plat.w, plat.y + plat.h, bank + 48);
    }
    if (room.crate) {
      const c = room.crate;
      this.fillRect(c.x, c.y, c.x + c.w, c.y + c.h, bank + 32);
      this.drawRectOutline(c.x, c.y, c.x + c.w, c.y + c.h, bank + 56);
      this.drawLine(c.x, c.y, c.x + c.w, c.y + c.h, bank + 44);
    }

    // Doorways
    if (room.backRoom) this.drawRectOutline(22, 142, 56, 218, bank + 36);
    if (room.nextRoom) {
      const locked = room.gateId && !world.unsealedGates.has(room.gateId);
      const col = locked ? 56 : (bank + 44);
      this.drawRectOutline(424, 142, 458, 218, col);
      if (locked) {
        const pulse = (q16Sin((tick * 3200) % Q16_TAU) * 4) >> 16;
        this.drawLine(424, 142 + pulse, 458, 218 - pulse, 58);
        this.drawLine(458, 142 - pulse, 424, 218 + pulse, 58);
      }
    }

    // Distinct Gothic Prop Silhouettes (Books, Keys, Portraits, Gladius, Scrolls)
    for (const prop of room.props) {
      const taken = prop.item && prop.item !== 'ALTAR' && world.inventory.has(prop.item);
      if (taken) continue;
      this.drawCustomProp(prop, bank, tick);
    }

    || world.dirichletTensionQ16 > 24000) {
      this.renderCrystal3D(240, 72, world.activeSpellAlign, world.dirichletTensionQ16, tick);
    }

    this.drawInvestigator(p, bank, tick);

    if (room.watcher && room.watcher.alive) {
      this.drawWatcher(room.watcher, spotted, tick);
    }

    const inkColor = ((world.activeSpellAlign & 3) << 6) + 63;
    for (const st of strokes) this.drawPoly(st, inkColor);
    if (currentStroke.length > 1) this.drawPoly(currentStroke, inkColor);

    if (world.sanityQ16 < 38000) {
      const drips = (38000 - world.sanityQ16) >> 10;
      for (let i = 0; i < drips; i++) {
        const dx = ((i * 73 + tick * 3) % (FB_WIDTH - 4)) + 2;
        const len = 12 + ((i * 29 + tick) & 31);
        this.drawLine(dx, 0, dx, len, 48);
      }
    }
  }

  /** Render distinct gothic artifact silhouettes instead of generic boxes/circles */
  drawCustomProp(prop, bank, tick) {
    const x = prop.x | 0;
    const bob = ((q16Sin((tick * 3200) % Q16_TAU) * 2) >> 16);
    const y = (prop.y | 0) + (prop.item ? bob : 0);
    const hi = bank + 63;
    const mid = bank + 46;

    if (prop.id === 'KEY_PROP') {
      // Ornate Brass Key: circular bow + shaft + ward teeth
      this.drawCircleOutline(x - 6, y, 4, hi, 12);
      this.drawLine(x - 2, y, x + 9, y, hi);
      this.drawLine(x + 5, y, x + 5, y + 4, hi);
      this.drawLine(x + 8, y, x + 8, y + 5, hi);
    } else if (prop.id === 'JOURNAL_PROP' || prop.id === 'ECHO_PROP') {
      // Open Leather Tome with curved twin pages
      this.drawLine(x - 10, y + 4, x, y + 6, hi);
      this.drawLine(x, y + 6, x + 10, y + 4, hi);
      this.drawLine(x - 10, y - 4, x, y - 2, hi);
      this.drawLine(x, y - 2, x + 10, y - 4, hi);
      this.drawLine(x - 10, y - 4, x - 10, y + 4, mid);
      this.drawLine(x + 10, y - 4, x + 10, y + 4, mid);
      this.drawLine(x, y - 2, x, y + 6, mid);
    } else if (prop.id === 'PORTRAIT_PROP') {
      // Gilded Gothic Portrait Frame + silhouette bust
      this.drawRectOutline(x - 9, y - 13, x + 9, y + 7, mid);
      this.drawCircleOutline(x, y - 5, 3, hi, 10);
      this.drawLine(x - 5, y + 5, x + 5, y + 5, hi);
    } else if (prop.id === 'GLADIUS_PROP') {
      // Roman Gladius Sword: pommel, crossguard & tapered blade
      this.drawLine(x, y - 12, x, y + 8, hi);
      this.drawLine(x - 5, y + 3, x + 5, y + 3, hi);
      this.drawLine(x - 2, y + 8, x + 2, y + 8, mid);
    } else if (prop.id === 'TOME_PAGE_PROP' || prop.id === 'NOTE_PROP') {
      // Torn Vellum Scroll
      this.drawRectOutline(x - 7, y - 8, x + 7, y + 6, hi);
      this.drawLine(x - 4, y - 4, x + 4, y - 4, mid);
      this.drawLine(x - 4, y - 1, x + 3, y - 1, mid);
      this.drawLine(x - 4, y + 2, x + 4, y + 2, mid);
    } else {
      // Stone Pedestal Altar
      this.fillRect(x - 12, y - 4, x + 12, y + 18, bank + 26);
      this.drawRectOutline(x - 12, y - 4, x + 12, y + 18, hi);
    }
  }

  drawInvestigator(p, bank, tick) {
    const cx = p.x | 0;
    const breath = ((q16Sin((tick * 3600) % Q16_TAU) * 1) >> 16);
    const topY = (p.y | 0) + (p.grounded ? breath : -2);
    const coatCol = p.hidden ? (bank + 12) : (bank + 52);
    const trimCol = p.hidden ? (bank + 22) : (bank + 63);

    this.fillTri({ x: cx, y: topY }, { x: cx - 8, y: topY + 12 }, { x: cx + 8, y: topY + 12 }, coatCol);
    this.fillTri({ x: cx, y: topY + 8 }, { x: cx - 10, y: topY + 25 }, { x: cx + 10, y: topY + 25 }, coatCol);
    this.drawLine(cx - 10, topY + 25, cx + 10, topY + 25, trimCol);

    const stride = !p.grounded ? 3 : p.moving ? (((q16Sin((tick * 11000) % Q16_TAU) * 4) >> 16) * p.facing) : 0;
    this.drawLine(cx - 3, topY + 25, cx - 3 - stride, topY + 32, trimCol);
    this.drawLine(cx + 3, topY + 25, cx + 3 + stride, topY + 32, trimCol);

    const handX = cx + p.facing * 11;
    const handY = topY + 16;
    this.drawLine(cx + p.facing * 4, topY + 14, handX, handY, trimCol);
    if (!p.hidden) {
      this.fillRect(handX - 2, handY, handX + 2, handY + 5, bank + 63);
      this.drawCircleOutline(handX, handY + 3, 5 + ((tick >> 2) & 1), bank + 60, 10);
    }
  }

  drawWatcher(w, spotted, tick) {
    const hBank = (w.align & 3) << 6;
    const wx = w.x | 0;
    const wy = 152 + (((tick >> 3) & 3) - 1);
    const beamCol = spotted ? 56 : (hBank + 20);
    const reach = wx + w.dir * 110;
    this.drawLine(wx, wy + 12, reach, 182, beamCol);
    this.drawLine(wx, wy + 12, reach, 218, beamCol);

    this.fillTri({ x: wx, y: wy }, { x: wx - 16, y: 218 }, { x: wx + 16, y: 218 }, hBank + 36);
    this.drawRectOutline(wx - 8, wy - 8, wx + 8, wy + 6, hBank + 54);
    const eyeX = wx + w.dir * 4;
    this.fillRect(eyeX - 1, wy - 3, eyeX + 2, wy - 1, spotted ? 63 : (hBank + 63));
  }

  renderCrystal3D(cx, baseCy, align, tension, tick) {
    this.rotY = (this.rotY + 1400 + (tension >> 7)) % Q16_TAU;
    const cy = baseCy + ((q16Sin((tick * 2400) % Q16_TAU) * 4) >> 16);
    const r = 22 + (tension >> 12);
    const bank = (align & 3) << 6;
    const top = { x: cx, y: cy - 26 }, bot = { x: cx, y: cy + 26 };
    const ring = Array.from({ length: 4 }, (_, i) => {
      const a = this.rotY + i * 102944;
return { x: cx + ((r * q16Cos(a)) >> 16), y: cy + ((9 * q16Sin(a)) >> 16) };
});
for (let i = 0; i < 4; i++) {
const p0 = (i), p1 = ring.at((i + 1) & 3);
this.drawLine(top.x, top.y, p0.x, p0.y, bank + 62);
this.drawLine(bot.x, bot.y, p0.x, p0.y, bank + 54);
this.drawLine(p0.x, p0.y, p1.x, p1.y, bank + 63);
}
}
fillRect(x0, y0, x1, y1, c) {
for (let y = Math.max(0, y0); y <= Math.min(FB_HEIGHT - 1, y1); y++) {
const row = y * FB_WIDTH;
for (let x = Math.max(0, x0); x <= Math.min(FB_WIDTH - 1, x1); x++) this.indices[row + x] = c;
}
}
fillTri(a, b, c, col) {
const minX = q16Clamp(Math.min(a.x, b.x, c.x), 0, FB_WIDTH - 1);
const maxX = q16Clamp(Math.max(a.x, b.x, c.x), 0, FB_WIDTH - 1);
const minY = q16Clamp(Math.min(a.y, b.y, c.y), 0, FB_HEIGHT - 1);
const maxY = q16Clamp(Math.max(a.y, b.y, c.y), 0, FB_HEIGHT - 1);
const area = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
if (area === 0) return;
for (let y = minY; y <= maxY; y++) {
const row = y * FB_WIDTH;
for (let x = minX; x <= maxX; x++) {
const w0 = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
const w1 = (c.x - b.x) * (y - b.y) - (c.y - b.y) * (x - b.x);
const w2 = (a.x - c.x) * (y - c.y) - (a.y - c.y) * (x - c.x);
if ((area > 0 && w0 >= 0 && w1 >= 0 && w2 >= 0) || (area < 0 && w0 <= 0 && w1 <= 0 && w2 <= 0)) {
this.indices[row + x] = col;
}
}
}
}
drawPoly(pts, c) {
for (let i = 1; i < pts.length; i++) {
this.drawLine((i - 1).x, (i - 1).y, pts.at(i).x, pts.at(i).y, c);
this.drawLine(pts.at(i - 1).x + 1, pts.at(i - 1).y, pts.at(i).x + 1, pts.at(i).y, c - 8);
}
}
drawRectOutline(x0, y0, x1, y1, c) {
this.drawLine(x0, y0, x1, y0, c);
this.drawLine(x1, y0, x1, y1, c);
this.drawLine(x1, y1, x0, y1, c);
this.drawLine(x0, y1, x0, y0, c);
}
drawCircleOutline(cx, cy, r, c, segs = 16) {
let px = cx + r, py = cy;
for (let i = 1; i <= segs; i++) {
const a = ((i * Q16_TAU) / segs) | 0;
const nx = cx + ((r * q16Cos(a)) >> 16), ny = cy + ((r * q16Sin(a)) >> 16);
this.drawLine(px, py, nx, ny, c);
px = nx; py = ny;
}
}
drawLine(x0, y0, x1, y1, c) {
x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
let err = dx - dy;
while (true) {
if (x0 >= 0 && x0 < FB_WIDTH && y0 >= 0 && y0 < FB_HEIGHT) this.indices[y0 * FB_WIDTH + x0] = c;
if (x0 === x1 && y0 === y1) break;
const e2 = err << 1;
if (e2 > -dy) { err -= dy; x0 += sx; }
if (e2 < dx) { err += dx; y0 += sy; }
}
}
resolveRGBA32() {
for (let i = 0; i < this.indices.length; i++) this.rgba32[i] = this.clut[this.indices[i]];
return this.rgba32;
}
}
