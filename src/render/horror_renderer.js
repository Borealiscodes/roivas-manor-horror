import { Q16_ONE, Q16_TAU, q16Clamp, q16Sin, q16Cos } from '../core/q16.js';

export const FB_WIDTH = 480;
export const FB_HEIGHT = 272;

const BAYER_4X4 = Uint8Array.of(0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5);

export function buildHorrorCLUT8() {
  const lut = new Uint32Array(256);
  const ramps = Array.of(
    Array.of(240, 28, 46),   // 0: Chattur'gha (Crimson)
    Array.of(36, 148, 252),  // 1: Ulyaoth (Cobalt)
    Array.of(34, 232, 120),  // 2: Xel'lotath (Emerald)
    Array.of(185, 68, 245)   // 3: Mantorok (Amethyst)
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

  renderScene(world, strokes, currentStroke, tick) {
    const room = world.rooms[world.currentRoom];
    const bank = (room.ambienceAlign & 3) << 6;
    const vx = 240, vy = 118; // 3D vanishing point
    const sanityRatio = q16Clamp(world.sanityQ16, 8192, Q16_ONE);
    const lanternRadius = 75 + ((sanityRatio * 95) >> 16) + (((tick >> 2) & 3) - 1);
    const lanternRSq = lanternRadius * lanternRadius;

    // 1. 3D Perspective Floor/Ceiling + Volumetric Lantern Cone
    for (let y = 0; y < FB_HEIGHT; y++) {
      const row = y * FB_WIDTH;
      const bRow = (y & 3) << 2;
      const dy = y - 132;
      const dy2 = dy * dy;
      const isFloor = y > vy;

      for (let x = 0; x < FB_WIDTH; x++) {
        const dx = x - vx;
        const d2 = dx * dx + dy2;
        let shade = 2;
        if (d2 < lanternRSq) {
          const beam = 28 - (((d2 * 25) / lanternRSq) | 0);
          shade = q16Clamp(beam + (isFloor ? 4 : 0), 2, 34);
        }
        const dither = BAYER_4X4[bRow + (x & 3)] >> 2;
        this.indices[row + x] = bank + q16Clamp(shade + dither, 1, 38);
      }
    }

    // 2. Receding 3D Gothic Corridor Perspective Lines & Pillars
    const wallCol = bank + 28;
    this.drawLine(0, 0, vx - 46, vy - 28, wallCol);
    this.drawLine(FB_WIDTH - 1, 0, vx + 46, vy - 28, wallCol);
    this.drawLine(0, FB_HEIGHT - 1, vx - 46, vy + 36, wallCol + 4);
    this.drawLine(FB_WIDTH - 1, FB_HEIGHT - 1, vx + 46, vy + 36, wallCol + 4);

    // Scrolling depth pillars based on player depth
    for (let p = 0; p < 4; p++) {
      const relZ = ((p * 28 - (world.depth % 28) + 112) % 112) + 8;
      const scale = (1800 / relZ) | 0;
      const halfW = q16Clamp(scale * 3, 46, 235);
      const topY = q16Clamp(vy - ((scale * 2) | 0), 0, vy - 28);
      const botY = q16Clamp(vy + ((scale * 2.5) | 0), vy + 36, FB_HEIGHT - 1);
      const col = bank + q16Clamp(44 - (relZ >> 2), 14, 46);
      this.drawLine(vx - halfW, topY, vx - halfW, botY, col);
      this.drawLine(vx + halfW, topY, vx + halfW, botY, col);
      this.drawLine(vx - halfW, botY, vx + halfW, botY, col - 4);
    }

    // 3. Far Threshold Archway & Gated Barrier
    this.drawRectOutline(vx - 46, vy - 28, vx + 46, vy + 36, bank + 44);
    if (room.gateId && !world.unsealedGates.has(room.gateId)) {
      const pulse = (q16Sin((tick * 3200) % Q16_TAU) * 6) >> 16;
      // Organic crimson flesh barrier / lock seal
      for (let w = -36; w <= 36; w += 12) {
        this.drawLine(vx + w, vy - 28, vx + w + pulse, vy + 36, 54);
      }
      this.drawLine(vx - 46, vy + pulse, vx + 46, vy - pulse, 60);
    }

    // 4. Mid-Room Relic / Prop scaled by perspective distance
    const propDist = Math.max(12, Math.abs(room.prop.depth - world.depth) + 18);
    const pSize = q16Clamp((520 / propDist) | 0, 8, 36);
    const py = vy + pSize;
    const taken = room.prop.item && room.prop.item !== 'ALTAR' && world.inventory.has(room.prop.item);
    this.drawRectOutline(vx - pSize, py - pSize, vx + pSize, py + pSize, taken ? (bank + 24) : (bank + 58));

    // 5. Floating 3D Octahedron Crystal (Observatory or high tension)
    if (world.currentRoom === 'OBSERVATORY' || world.dirichletTensionQ16 > 20000) {
      this.renderCrystal3D(vx, vy - 6, world.activeSpellAlign, world.dirichletTensionQ16, tick);
    }

    // 6. Looming Horror in 3D Depth
    if (room.horror && room.horror.alive) {
      const hBank = (room.horror.align & 3) << 6;
      const hDist = Math.max(10, Math.abs(room.horror.depth - world.depth) + 12);
      const hScale = q16Clamp((720 / hDist) | 0, 10, 52);
      const hy = vy + (hScale >> 1);
      // Jagged horror silhouette + glowing eyes
      this.drawLine(vx - hScale, hy + hScale, vx, hy - hScale, hBank + 46);
      this.drawLine(vx + hScale, hy + hScale, vx, hy - hScale, hBank + 46);
      this.drawLine(vx - (hScale >> 1), hy, vx + (hScale >> 1), hy, hBank + 52);
      this.drawCircleOutline(vx - (hScale >> 2), hy - (hScale >> 2), 2, hBank + 63, 8);
      this.drawCircleOutline(vx + (hScale >> 2), hy - (hScale >> 2), 2, hBank + 63, 8);
    }

    // 7. Over-the-Shoulder Investigator Foreground Silhouette (Lower-Left)
    const bobY = ((q16Sin((tick * 4800) % Q16_TAU) * 2) >> 16);
    for (let sy = 178 + bobY; sy < FB_HEIGHT; sy++) {
      const shoulderW = q16Clamp((sy - 170) * 1.4 | 0, 12, 92);
      this.drawLine(58 - (shoulderW >> 1), sy, 58 + shoulderW, sy, bank + 6);
    }
    // Head silhouette + extended lantern arm
    this.drawCircleOutline(68, 162 + bobY, 16, bank + 18, 20);
    this.drawLine(98, 212 + bobY, 136, 178 + bobY, bank + 28);
    this.drawCircleOutline(138, 172 + bobY, 6 + ((tick >> 2) & 1), bank + 63, 12);

    // 8. Multi-Stroke Rune Ink Overlay
    const inkColor = ((world.activeSpellAlign & 3) << 6) + 63;
    for (const st of strokes) this.drawPoly(st, inkColor);
    if (currentStroke.length > 1) this.drawPoly(currentStroke, inkColor);

    // 9. Low-Sanity Crimson Wall-Bleed
    if (world.sanityQ16 < 38000) {
      const drips = (38000 - world.sanityQ16) >> 10;
      for (let i = 0; i < drips; i++) {
        const dx = ((i * 73 + tick * 3) % (FB_WIDTH - 4)) + 2;
        const len = 12 + ((i * 29 + tick) & 31);
        this.drawLine(dx, 0, dx, len, 48);
      }
    }
  }

  renderCrystal3D(cx, baseCy, align, tension, tick) {
    this.rotY = (this.rotY + 1400 + (tension >> 7)) % Q16_TAU;
    const cy = baseCy + ((q16Sin((tick * 2400) % Q16_TAU) * 4) >> 16);
    const r = 22 + (tension >> 12);
    const bank = (align & 3) << 6;
    const top = { x: cx, y: cy - 28 }, bot = { x: cx, y: cy + 28 };
    const ring = Array.from({ length: 4 }, (_, i) => {
      const a = this.rotY + i * 102944;
      return { x: cx + ((r * q16Cos(a)) >> 16), y: cy + ((9 * q16Sin(a)) >> 16) };
    });
    for (let i = 0; i < 4; i++) {
      const p0 = ring.at(i), p1 = ring.at((i + 1) & 3);
      this.drawLine(top.x, top.y, p0.x, p0.y, bank + 62);
      this.drawLine(bot.x, bot.y, p0.x, p0.y, bank + 54);
      this.drawLine(p0.x, p0.y, p1.x, p1.y, bank + 63);
    }
  }

  drawPoly(pts, c) {
    for (let i = 1; i < pts.length; i++) {
      this.drawLine(pts.at(i - 1).x, pts.at(i - 1).y, pts.at(i).x, pts.at(i).y, c);
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
