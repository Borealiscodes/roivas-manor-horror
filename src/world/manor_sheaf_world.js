import { Q16_ONE, q16Clamp } from '../core/q16.js';

export const ALIGN = { CHATTURGHA: 0, ULYAOTH: 1, XELLOTATH: 2, MANTOROK: 3 };

export function countersAlignment(spellAlign, horrorAlign) {
  if (spellAlign === ALIGN.MANTOROK) return true;
  if (spellAlign === ALIGN.CHATTURGHA && horrorAlign === ALIGN.XELLOTATH) return true;
  if (spellAlign === ALIGN.XELLOTATH && horrorAlign === ALIGN.ULYAOTH) return true;
  if (spellAlign === ALIGN.ULYAOTH && horrorAlign === ALIGN.CHATTURGHA) return true;
  return false;
}

export class ManorWorld {
  constructor() {
    this.currentRoom = 'FOYER';
    this.player = { x: 64, y: 186, vx: 0, vy: 0, grounded: true, facing: 1, hidden: false };
    this.sanityQ16 = Q16_ONE;
    this.dirichletTensionQ16 = 0;
    this.inventory = new Set();
    this.unsealedGates = new Set();
    this.activeSpellAlign = ALIGN.ULYAOTH;
    this.statusLog = 'FOYER: Push the wooden crate to jump onto the Grandfather Clock ledge, grab the Brass Key, and cast Ulyaoth + Bankorok + Redgormor at the Crimson Flesh Door!';

    this.rooms = {
      FOYER: {
        name: 'Grandfather Foyer',
        ambienceAlign: ALIGN.ULYAOTH,
        backRoom: null,
        nextRoom: 'GALLERY',
        gateId: 'FOYER_FLESH_DOOR',
        gateHint: 'Crimson Flesh Seal blocks the East Arch. Cast ULYAOTH + BANKOROK + REDGORMOR to dissolve it.',
        platforms: Array.of(
          { x: 170, y: 162, w: 72, h: 10 },
          { x: 265, y: 132, w: 80, h: 10 }
        ),
        crate: { x: 125, y: 194, w: 24, h: 24 },
        shadows: Array.of({ x: 350, w: 46 }),
        prop: { x: 292, y: 112, name: 'Clock Ledge Key', item: 'BRASS_KEY', text: 'You climbed the clock shelf and took the tarnished BRASS KEY!' },
        watcher: null
      },
      GALLERY: {
        name: 'Portrait Corridor (Stealth)',
        ambienceAlign: ALIGN.CHATTURGHA,
        backRoom: 'FOYER',
        nextRoom: 'LIBRARY',
        gateId: 'LIBRARY_OAK_DOOR',
        gateHint: 'Locked Oak Door — tap [Interact / Grab] while holding the BRASS KEY.',
        platforms: Array.of(
          { x: 140, y: 166, w: 90, h: 10 },
          { x: 270, y: 146, w: 90, h: 10 }
        ),
        crate: null,
        shadows: Array.of({ x: 165, w: 52 }, { x: 310, w: 52 }),
        prop: { x: 305, y: 126, name: 'Weeping Portrait', item: 'TOME_PAGE', text: 'TORN TOME PAGE: "Hide in dark alcoves when the Watcher\'s gaze turns red. Red Chattur\'gha banishes Green Xel\'lotath."' },
        watcher: { alive: true, x: 370, dir: -1, minX: 110, maxX: 410, align: ALIGN.XELLOTATH, name: 'Xel\'lotath Watcher', hp: 1 }
      },
      LIBRARY: {
        name: 'Forbidden Library',
        ambienceAlign: ALIGN.XELLOTATH,
        backRoom: 'GALLERY',
        nextRoom: 'OBSERVATORY',
        gateId: 'OBSERVATORY_SEAL',
        gateHint: 'Emerald Mind Phantasm blocks the Observatory! Cast CHATTURGHA + ANTORBOK + ARETAK.',
        platforms: Array.of(
          { x: 110, y: 168, w: 76, h: 10 },
          { x: 215, y: 140, w: 76, h: 10 },
          { x: 320, y: 168, w: 76, h: 10 }
        ),
        crate: { x: 185, y: 194, w: 24, h: 24 },
        shadows: Array.of({ x: 230, w: 48 }),
        prop: { x: 242, y: 120, name: 'Obsidian Lectern', item: 'GLADIUS_RELIC', text: 'You recovered Alexandra\'s ENCHANTED GLADIUS from the upper catwalk!' },
        watcher: { alive: true, x: 350, dir: -1, minX: 120, maxX: 400, align: ALIGN.ULYAOTH, name: 'Ulyaoth Trapper', hp: 1 }
      },
      OBSERVATORY: {
        name: 'Sub-Basement Observatory',
        ambienceAlign: ALIGN.MANTOROK,
        backRoom: 'LIBRARY',
        nextRoom: null,
        gateId: null,
        gateHint: '',
        platforms: Array.of(
          { x: 120, y: 164, w: 80, h: 10 },
          { x: 280, y: 164, w: 80, h: 10 }
        ),
        crate: null,
        shadows: Array.of({ x: 90, w: 44 }, { x: 345, w: 44 }),
        prop: { x: 240, y: 188, name: '3D Crystal Altar', item: 'ALTAR', text: 'Cast MANTOROK + BANKOROK + REDGORMOR + PARGON to bind the 3D Crystal forever!' },
        watcher: { alive: true, x: 330, dir: -1, minX: 110, maxX: 390, align: ALIGN.CHATTURGHA, name: 'Crystal Avatar', hp: 2 }
      }
    };
  }

  jump() {
    if (this.player.grounded) {
      this.player.vy = -8;
      this.player.grounded = false;
    }
  }

  interact() {
    const room = this.rooms[this.currentRoom];
    const p = this.player;

    if (p.x < 68 && room.backRoom) {
      this.currentRoom = room.backRoom;
      p.x = 400; p.y = 186;
      this.statusLog = 'Returned to ' + this.rooms[this.currentRoom].name + '.';
      return { event: 'DOOR' };
    }

    if (Math.hypot(p.x - room.prop.x, p.y - room.prop.y) < 38) {
      if (room.prop.item && room.prop.item !== 'ALTAR') this.inventory.add(room.prop.item);
      this.statusLog = room.prop.text;
      return { event: 'INSPECT' };
    }

    if (p.x > 405 && room.nextRoom) {
      const gate = room.gateId;
      if (!gate || this.unsealedGates.has(gate)) {
        this.currentRoom = room.nextRoom;
        p.x = 68; p.y = 186;
        this.statusLog = 'Entered ' + this.rooms[this.currentRoom].name + '.';
        return { event: 'DOOR' };
      }
      if (gate === 'LIBRARY_OAK_DOOR' && this.inventory.has('BRASS_KEY')) {
        this.unsealedGates.add(gate);
        this.statusLog = 'Unlocked the Oak Door with the BRASS KEY! Tap [Interact / Grab] again to enter.';
        return { event: 'UNLOCK' };
      }
      this.dirichletTensionQ16 = q16Clamp(this.dirichletTensionQ16 + 10000, 0, Q16_ONE);
      this.statusLog = 'BLOCKED: ' + room.gateHint;
      return { event: 'BLOCKED' };
    }

    this.statusLog = 'Nothing to grab here. Jump onto ledges or approach doors.';
    return { event: 'NONE' };
  }

  castFullSpell(alignId, verbId, nounId, pargonCount = 0) {
    const map = { CHATTURGHA: ALIGN.CHATTURGHA, ULYAOTH: ALIGN.ULYAOTH, XELLOTATH: ALIGN.XELLOTATH, MANTOROK: ALIGN.MANTOROK };
    const spellAlign = map[alignId] ?? ALIGN.MANTOROK;
    this.activeSpellAlign = spellAlign;
    const room = this.rooms[this.currentRoom];

    if (room.gateId === 'FOYER_FLESH_DOOR' && spellAlign === ALIGN.ULYAOTH && verbId === 'BANKOROK' && nounId === 'REDGORMOR') {
      this.unsealedGates.add('FOYER_FLESH_DOOR');
      this.dirichletTensionQ16 = 0;
      this.statusLog = 'Ulyaoth\'s cobalt ward dissolves the Crimson Flesh Seal! Walk right to enter.';
      return { outcome: 'UNSEALED' };
    }

    if (room.gateId === 'OBSERVATORY_SEAL' && spellAlign === ALIGN.CHATTURGHA && verbId === 'ANTORBOK') {
      this.unsealedGates.add('OBSERVATORY_SEAL');
      this.dirichletTensionQ16 = 0;
      this.statusLog = 'Chattur\'gha\'s crimson bolt shatters the Emerald Phantasm! The Observatory is open.';
      return { outcome: 'UNSEALED' };
    }

    if (this.currentRoom === 'OBSERVATORY' && spellAlign === ALIGN.MANTOROK && verbId === 'BANKOROK' && nounId === 'REDGORMOR' && pargonCount >= 1) {
      if (room.watcher) room.watcher.alive = false;
      this.dirichletTensionQ16 = 0;
      this.sanityQ16 = Q16_ONE;
      this.statusLog = 'VICTORY! Mantorok\'s amplified binding seals the 3D Crystal. Roivas Manor is saved!';
      return { outcome: 'VICTORY' };
    }

    if (room.watcher && room.watcher.alive && verbId === 'ANTORBOK') {
      if (countersAlignment(spellAlign, room.watcher.align)) {
        room.watcher.hp -= (1 + pargonCount);
        this.dirichletTensionQ16 = Math.max(0, this.dirichletTensionQ16 - 18000);
        if (room.watcher.hp <= 0) {
          room.watcher.alive = false;
          this.statusLog = 'Banished ' + room.watcher.name + '!';
          return { outcome: 'BANISHED' };
        }
        this.statusLog = 'Hit ' + room.watcher.name + '! (' + room.watcher.hp + ' HP left)';
        return { outcome: 'HIT' };
      } else {
        this.sanityQ16 = q16Clamp(this.sanityQ16 - 8192, 0, Q16_ONE);
        this.statusLog = 'WRONG ALIGNMENT! ' + room.watcher.name + ' resists that element!';
        return { outcome: 'BACKFIRE' };
      }
    }

    if (verbId === 'BANKOROK') {
      this.sanityQ16 = q16Clamp(this.sanityQ16 + 8192 + pargonCount * 4096, 0, Q16_ONE);
      this.statusLog = 'Protective ward cast — Sanity steadied.';
      return { outcome: 'WARD' };
    }

    this.statusLog = 'Incantation cast (' + alignId + ' + ' + verbId + ' + ' + nounId + ').';
    return { outcome: 'FIZZLE' };
  }

  step(moveDir, tick) {
    const room = this.rooms[this.currentRoom];
    const p = this.player;
    const floorY = 218;

    if (moveDir !== 0) {
      p.facing = moveDir > 0 ? 1 : -1;
      p.x = q16Clamp(p.x + moveDir * 3, 28, 452);
    }

    // Pushable crate physics (LittleBigPlanet / Little Nightmares tactile block)
    if (room.crate) {
      const c = room.crate;
      if (Math.abs(p.y + 32 - (c.y + c.h)) < 12 && Math.abs(p.x - (c.x + (c.w >> 1))) < 22 && moveDir !== 0) {
        c.x = q16Clamp(c.x + moveDir * 2, 70, 380);
      }
    }

    // Gravity & platform landing
    const prevBottom = p.y + 32;
    p.vy = Math.min(9, p.vy + 1);
    p.y += p.vy;
    p.grounded = false;

    if (p.y + 32 >= floorY) {
      p.y = floorY - 32;
      p.vy = 0;
      p.grounded = true;
    }

    // Land on wooden crate
    if (room.crate && p.vy >= 0) {
      const c = room.crate;
      if (p.x >= c.x - 6 && p.x <= c.x + c.w + 6 && prevBottom <= c.y + 4 && p.y + 32 >= c.y) {
        p.y = c.y - 32;
        p.vy = 0;
        p.grounded = true;
      }
    }

    // Land on manor shelves/ledges
    if (p.vy >= 0) {
      for (const plat of room.platforms) {
        if (p.x >= plat.x - 4 && p.x <= plat.x + plat.w + 4 && prevBottom <= plat.y + 4 && p.y + 32 >= plat.y) {
          p.y = plat.y - 32;
          p.vy = 0;
          p.grounded = true;
        }
      }
    }

    // Check stealth shadow alcoves (Little Nightmares hide mechanic)
p.hidden = false;
for (const sh of room.shadows) {
if (p.x >= sh.x && p.x <= sh.x + sh.w && p.grounded) p.hidden = true;
}
// Watcher patrol & searchlight gaze
let spotted = false;
if (room.watcher && room.watcher.alive) {
const w = room.watcher;
if (tick % 2 === 0) {
w.x += w.dir;
if (w.x <= w.minX || w.x >= w.maxX) w.dir *= -1;
}
const lookingAtPlayer = (w.dir > 0 && p.x > w.x && p.x - w.x < 115) || (w.dir < 0 && p.x < w.x && w.x - p.x < 115);
if (lookingAtPlayer && !p.hidden) {
spotted = true;
this.sanityQ16 = q16Clamp(this.sanityQ16 - 130, 0, Q16_ONE);
this.dirichletTensionQ16 = q16Clamp(this.dirichletTensionQ16 + 90, 0, Q16_ONE);
}
}
return { sanityQ16: this.sanityQ16, dirichletTensionQ16: this.dirichletTensionQ16, spotted };
}
}
