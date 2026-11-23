import { Q16_ONE, Q16_TAU, q16Clamp, q16Sin, q16Cos, q16Mul, q16Div } from '../core/q16.js';
import { ALIGN } from '../world/manor_sheaf_world.js';

export const FB_WIDTH = 480;
export const FB_HEIGHT = 272;

const BAYER_4X4 = Uint8Array.of(0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5);

const SPRITE_INVESTIGATOR = Uint16Array.of(
  0x03C, 0x07E, 0x05A, 0x07E, 0x03C, 0x0FF, 0x1BD, 0x1BD,
  0x1FF, 0x0FF, 0x0EE, 0x0EE, 0x0EE, 0x06C, 0x06C, 0x0EE
);

const SPRITE_HORROR = Uint16Array.of(
  0x108, 0x39C, 0x7FE, 0xD6B, 0xFFF, 0x7FE, 0x39C, 0x7FE,
  0xDB6, 0x999, 0x108, 0x204, 0x402, 0x801, 0x000, 0x000
);

export function buildHorrorCLUT8() {
  const lut = new Uint32Array(256);
  const ramps = Array.of(
    Array.of(240, 26, 44),   // 0: Chattur'gha (Blood Crimson)
    Array.of(34, 145, 250),  // 1: Ulyaoth (Astral Cobalt)
    Array.of(32, 232, 118),  // 2: Xel'lotath (Necrotic Emerald)
    Array.of(185, 68, 245)   // 3: Mantorok (Void Amethyst)
  );
  for (let bank = 0; bank < 4; bank++) {
    const r0 = ramps.at(bank).at(0), g0 = ramps.at(bank).at(1), b0 = ramps.at(bank).at(2);
    for (let i = 0; i < 64; i++) {
      // Index 0..3 are near pitch black for true shadow immersion
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
    const sanityRatio = q16Clamp(world.sanityQ16, 8192, Q16_ONE);
    // Lantern radius shrinks as Sanity drops!
    const lanternR = 65 + ((sanityRatio * 95) >> 16) + (((tick >> 2) & 3) - 1);
    const lanternRSq = lanternR * lanternR;
    const lx = world.playerX;
    const ly = 188;

    // 1. Pitch-black shadow backdrop illuminated by Bayer-dithered lantern cone
    for (let y = 0; y < FB_HEIGHT; y++) {
      const row = y * FB_WIDTH;
      const bRow = (y & 3) << 2;
      const dy = y - ly;
      const dy2 = dy * dy;
      const floorBonus = y > 218 ? 6 : 0;

      for (let x = 0; x < FB_WIDTH; x++) {
        const dx = x - lx;
        const d2 = dx * dx + dy2;
        let light = 1;
        if (d2 < lanternRSq) {
          const falloff = 26 - (((d2 * 24) / lanternRSq) | 0);
          light = q16Clamp(falloff + floorBonus, 2, 32);
        }
        const dither = BAYER_4X4[bRow + (x & 3)] >> 2;
        this.indices[row + x] = bank + q16Clamp(light + dither, 1, 36);
      }
    }

    // 2. Room Architecture (Gothic Windows / Shelves / Doorway Thresholds)
    this.drawLine(0, 218, FB_WIDTH - 1, 218, bank + 24);
    if (room.leftDoor) {
      this.drawRectOutline(26, 136, 62, 218, bank + 34);
    }
    if (room.rightDoor) {
      const locked = room.rightDoor.gateId && !world.unsealedGates.has(room.rightDoor.gateId);
      const doorColor = locked ? 52 : (bank + 38); // Glowing crimson lock if gated
      this.drawRectOutline(418, 136, 454, 218, doorColor);
      if (locked) {
        this.drawLine(418, 136, 454, 218, 56);
        this.drawLine(454, 136, 418, 218, 56);
      }
    }

    // 3. Interactive Props
    for (const prop of room.props) {
      const taken = prop.item && prop.item !== 'VICTORY_PENDING' && world.inventory.has(prop.item);
      const col = taken ? (bank + 22) : (bank + 48);
      this.drawRectOutline(prop.x - 14, 174, prop.x + 14, 218, col);
      if (!taken) this.drawCircleOutline(prop.x, 166, 4, bank + 60, 12);
    }

    // 4. Floating 3D Octahedron Crystal in Observatory (or hovering reflection)
    if (world.currentRoom === 'OBSERVATORY' || world.dirichletTensionQ16 > 24000) {
      this.renderCrystal3D(240, 88, world.activeSpellAlign, world.dirichletTensionQ16, tick);
    }

    // 5. Investigator Sprite
    this.blitSprite(SPRITE_INVESTIGATOR, world.playerX - 18, 170, 3, bank + 58);

    // 6. Stalking Horror Sprite (Glowing eyes visible even in pitch darkness!)
    if (room.horror && room.horror.alive) {
      const hBank = (room.horror.align & 3) << 6;
      const hx = room.horror.x - 18;
      const hy = 166 + (((tick >> 3) & 3) - 1);
      // Only show full body if inside lantern beam; otherwise only glowing eyes pierce the dark!
      if (Math.abs(room.horror.x - lx) < lanternR + 20) {
        this.blitSprite(SPRITE_HORROR, hx, hy, 3, hBank + 54);
      }
      this.indices[(hy + 9) * FB_WIDTH + (hx + 12)] = hBank + 63;
      this.indices[(hy + 9) * FB_WIDTH + (hx + 21)] = hBank + 63;
    }

    // 7. Live Multi-Stroke Rune Ink Overlay
    const inkColor = ((world.activeSpellAlign & 3) << 6) + 63;
    for (const st of strokes) this.drawPoly(st, inkColor);
    if (currentStroke.length > 1) this.drawPoly(currentStroke, inkColor);

    // 8. Low-Sanity Crimson Wall-Bleed
    if (world.sanityQ16 < 36000) {
      const drips = (36000 - world.sanityQ16) >> 10;
      for (let i = 0; i < drips; i++) {
        const dx = ((i * 73 + tick * 3) % (FB_WIDTH - 4)) + 2;
        const len = 12 + ((i * 29 + tick) & 31);
        this.drawLine(dx, 0, dx, len, 46);
      }
    }
  }

  renderCrystal3D(cx, baseCy, align, tension, tick) {
    this.rotY = (this.rotY + 1400 + (tension >> 7)) % Q16_TAU;
    const cy = baseCy + ((q16Sin((tick * 2400) % Q16_TAU) * 5) >> 16);
    const r = 24 + (tension >> 12);
    const cosY = q16Cos(this.rotY), sinY = q16Sin(this.rotY);
    const bank = (align & 3) << 6;
    const top = { x: cx, y: cy - 30 }, bot = { x: cx, y: cy + 30 };
    const ring = Array.from({ length: 4 }, (_, i) => {
      const a = this.rotY + i * 102944;
      return { x: cx + ((r * q16Cos(a)) >> 16), y: cy + ((10 * q16Sin(a)) >> 16) };
    });
    for (let i = 0; i < 4; i++) {
      const p0 = ring.at(i), p1 = ring.at((i + 1) & 3);
      this.drawLine(top.x, top.y, p0.x, p0.y, bank + 62);
      this.drawLine(bot.x, bot.y, p0.x, p0.y, bank + 54);
      this.drawLine(p0.x, p0.y, p1.x, p1.y, bank + 63);
    }
  }

  blitSprite(rows, x, y, scale, colorIdx) {
    for (let r = 0; r < 16; r++) {
      const bits = rows.at(r);
      for (let c = 0; c < 12; c++) {
        if ((bits >> (11 - c)) & 1) {
          for (let sy = 0; sy < scale; sy++) {
            const py = y + r * scale + sy;
            if (py < 0 || py >= FB_HEIGHT) continue;
            for (let sx = 0; sx < scale; sx++) {
              const px = x + c * scale + sx;
              if (px >= 0 && px < FB_WIDTH) this.indices[py * FB_WIDTH + px] = colorIdx;
            }
          }
        }
      }
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
      const a = q16Div(i * Q16_TAU, segs << 16);
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
