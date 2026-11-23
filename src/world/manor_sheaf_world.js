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
    this.player = { x: 56, y: 186, vx: 0, vy: 0, grounded: true, facing: 1, hidden: false, moving: false };
    this.sanityQ16 = Q16_ONE;
    this.dirichletTensionQ16 = 0;
    this.inventory = new Set();
    this.unsealedGates = new Set();
    this.journal = Array.of('Entry I (Oct 2026): Aunt Alexandra\'s will left me Roivas Manor—with one warning: "Never wind the Foyer clock."');
    this.activeSpellAlign = ALIGN.ULYAOTH;
    this.statusLog = 'FOYER: The storm locked the front doors behind you. Jump onto the upper clock ledges to reach the Brass Key, and read the family ledger.';

    this.rooms = {
      FOYER: {
        name: 'I. The Breathing Foyer',
        ambienceAlign: ALIGN.ULYAOTH,
        backRoom: null,
        nextRoom: 'GALLERY',
        gateId: 'FOYER_FLESH_DOOR',
        gateHint: 'A pulsing Crimson Flesh Seal blocks the East Arch. Cast ULYAOTH + BANKOROK + REDGORMOR (Blue Ward Field) to dissolve it.',
        platforms: Array.of(
          { x: 155, y: 174, w: 78, h: 10 },
          { x: 255, y: 144, w: 84, h: 10 }
        ),
        crate: { x: 112, y: 194, w: 24, h: 24 },
        shadows: Array.of({ x: 356, w: 46 }),
        props: Array.of(
          { x: 185, y: 158, name: 'Alexandra\'s Journal', item: null, journalEntry: 'Entry II: "The house remembers every Roivas who died here. Its walls are stitched together by four opposing wills."', text: 'JOURNAL: "The house remembers every Roivas who died here. Cast Ulyaoth + Bankorok + Redgormor to part the flesh."' },
          { x: 295, y: 128, name: 'Pendulum Case', item: 'BRASS_KEY', journalEntry: 'Entry III: Found the tarnished Brass Key inside the stopped grandfather clock.', text: 'Took the tarnished BRASS KEY from the stopped clock ledge!' }
        ),
        watcher: null
      },
      GALLERY: {
        name: 'II. Gallery of Weeping Portraits',
        ambienceAlign: ALIGN.CHATTURGHA,
        backRoom: 'FOYER',
        nextRoom: 'LIBRARY',
        gateId: 'LIBRARY_OAK_DOOR',
        gateHint: 'The Oak Library Door is bolted. Press [Grab / Door] at the door with the BRASS KEY.',
        platforms: Array.of(
          { x: 135, y: 172, w: 92, h: 10 },
          { x: 265, y: 148, w: 92, h: 10 }
        ),
        crate: null,
        shadows: Array.of({ x: 155, w: 54 }, { x: 305, w: 54 }),
        props: Array.of(
          { x: 175, y: 156, name: 'Maximilian\'s Portrait', item: null, journalEntry: 'Entry IV: Maximilian\'s eyes follow me. His asylum diary says Green Xel\'lotath feeds on doubt—only Red Chattur\'gha burns it away.', text: 'ECHO OF MAXIMILIAN (1760): "Green Mind-Leaches feed on hesitation. Hide in the dark curtains, or burn them with Red Chattur\'gha!"' },
          { x: 310, y: 132, name: 'Silver Reliquary', item: 'TOME_PAGE', journalEntry: 'Entry V: Recovered the Torn Tome Page detailing the Tri-Alignment dominance cycle.', text: 'Recovered the TORN TOME PAGE from the upper gallery shelf!' }
        ),
        watcher: { alive: true, x: 375, dir: -1, minX: 110, maxX: 410, align: ALIGN.XELLOTATH, name: 'Grief Phantasm (Green)', hp: 1 }
      },
      LIBRARY: {
        name: 'III. The Sunken Archive',
        ambienceAlign: ALIGN.XELLOTATH,
        backRoom: 'GALLERY',
        nextRoom: 'OBSERVATORY',
        gateId: 'OBSERVATORY_SEAL',
        gateHint: 'An Emerald Mind Barrier seals the cellar stairs! Cast CHATTURGHA + ANTORBOK + ARETAK.',
        platforms: Array.of(
          { x: 105, y: 174, w: 78, h: 10 },
          { x: 210, y: 146, w: 82, h: 10 },
          { x: 315, y: 174, w: 78, h: 10 }
        ),
        crate: { x: 178, y: 194, w: 24, h: 24 },
        shadows: Array.of({ x: 226, w: 50 }),
        props: Array.of(
          { x: 140, y: 158, name: 'Edward\'s Autopsy Note', item: null, journalEntry: 'Entry VI: Grandfather Edward discovered the manor has no foundation—it rests on a floating 3D crystal below the cellar.', text: 'EDWARD\'S NOTE (1952): "The house is a cage built around a fractured octahedron. Without Mantorok\'s binding, the geometry will devour the town."' },
          { x: 250, y: 130, name: 'Obsidian Lectern', item: 'GLADIUS_RELIC', journalEntry: 'Entry VII: Claimed Alexandra\'s Enchanted Gladius from the archive lectern.', text: 'Claimed Alexandra\'s ENCHANTED GLADIUS from the upper catwalk!' }
        ),
        watcher: { alive: true, x: 355, dir: -1, minX: 115, maxX: 405, align: ALIGN.ULYAOTH, name: 'Astral Warden (Blue)', hp: 1 }
      },
      OBSERVATORY: {
        name: 'IV. Heart of the Octahedron',
        ambienceAlign: ALIGN.MANTOROK,
        backRoom: 'LIBRARY',
        nextRoom: null,
        gateId: null,
        gateHint: '',
        platforms: Array.of(
          { x: 115, y: 170, w: 84, h: 10 },
          { x: 280, y: 170, w: 84, h: 10 }
        ),
        crate: null,
        shadows: Array.of({ x: 85, w: 46 }, { x: 348, w: 46 }),
        props: Array.of(
          { x: 155, y: 154, name: 'Alexandra\'s Final Echo', item: null, journalEntry: 'Entry VIII: "Evelyn, bind the crystal with Mantorok (Purple) + Bankorok + Redgormor + Pargon before our bloodline becomes part of the walls."', text: 'ALEXANDRA\'S ECHO: "Bind the crystal now! Cast MANTOROK + BANKOROK + REDGORMOR + PARGON!"' },
          { x: 240, y: 196, name: 'The 3D Octahedron', item: 'ALTAR', journalEntry: null, text: 'The 3D Crystal pulses with centuries of Roivas grief. Cast MANTOROK + BANKOROK + REDGORMOR + PARGON!' }
        ),
        watcher: { alive: true, x: 340, dir: -1, minX: 110, maxX: 395, align: ALIGN.CHATTURGHA, name: 'Manor Avatar (Red)', hp: 2 }
      }
    };
  }

  jump() {
    if (this.player.grounded) {
      this.player.vy = -10;
      this.player.grounded = false;
    }
  }

  interact() {
    const room = this.rooms[this.currentRoom];
    const p = this.player;

    if (p.x < 68 && room.backRoom) {
      this.currentRoom = room.backRoom;
      p.x = 400; p.y = 186;
      this.statusLog = 'Stepped back into ' + this.rooms[this.currentRoom].name + '.';
      return { event: 'DOOR' };
    }

    for (const prop of room.props) {
      if (Math.hypot(p.x - prop.x, p.y - prop.y) < 42) {
        if (prop.item && prop.item !== 'ALTAR') this.inventory.add(prop.item);
        if (prop.journalEntry && !this.journal.includes(prop.journalEntry)) {
          this.journal.push(prop.journalEntry);
        }
        this.statusLog = prop.text;
        return { event: 'INSPECT' };
      }
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
        this.statusLog = 'Unlocked the Oak Door with the BRASS KEY! Press [Grab / Door] again to enter.';
        return { event: 'UNLOCK' };
      }
      this.dirichletTensionQ16 = q16Clamp(this.dirichletTensionQ16 + 10000, 0, Q16_ONE);
      this.statusLog = 'SEALED: ' + room.gateHint;
      return { event: 'BLOCKED' };
    }

    this.statusLog = 'Nothing within reach. Jump onto shelves or inspect portraits and doors.';
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
      this.statusLog = 'Ulyaoth\'s cobalt ward dissolves the Crimson Flesh Seal! Walk right to enter the Gallery.';
      return { outcome: 'UNSEALED' };
    }

    if (room.gateId === 'OBSERVATORY_SEAL' && spellAlign === ALIGN.CHATTURGHA && verbId === 'ANTORBOK') {
      this.unsealedGates.add('OBSERVATORY_SEAL');
      this.dirichletTensionQ16 = 0;
      this.statusLog = 'Chattur\'gha\'s crimson bolt shatters the Emerald Phantasm! The Observatory stairs are open.';
      return { outcome: 'UNSEALED' };
    }

    if (this.currentRoom === 'OBSERVATORY' && spellAlign === ALIGN.MANTOROK && verbId === 'BANKOROK' && nounId === 'REDGORMOR' && pargonCount >= 1) {
      if (room.watcher) room.watcher.alive = false;
      this.dirichletTensionQ16 = 0;
      this.sanityQ16 = Q16_ONE;
      this.statusLog = 'ENDING SEALED: Mantorok\'s amplified binding quiets the 3D Crystal. The ghosts of Roivas Manor are finally at rest.';
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
this.statusLog = 'Struck ' + room.watcher.name + '! (' + room.watcher.hp + ' HP left)';
return { outcome: 'HIT' };
} else {
this.sanityQ16 = q16Clamp(this.sanityQ16 - 8192, 0, Q16_ONE);
this.statusLog = 'INEFFECTIVE! ' + room.watcher.name + ' feeds on that alignment!';
return { outcome: 'BACKFIRE' };
}
}
if (verbId === 'BANKOROK') {
this.sanityQ16 = q16Clamp(this.sanityQ16 + 8192 + pargonCount * 4096, 0, Q16_ONE);
this.statusLog = 'Protective ward cast — Evelyn\'s breathing steadies.';
return { outcome: 'WARD' };
}
this.statusLog = 'Cast ' + alignId + ' + ' + verbId + ' + ' + nounId + '.';
return { outcome: 'FIZZLE' };
}
step(moveDir, tick) {
const room = this.rooms[this.currentRoom];
const p = this.player;
const floorY = 218;
p.moving = moveDir !== 0;
if (p.moving) {
p.facing = moveDir > 0 ? 1 : -1;
p.x = q16Clamp(p.x + moveDir * 3, 28, 452);
}
if (room.crate) {
const c = room.crate;
if (Math.abs(p.y + 32 - (c.y + c.h)) < 12 && Math.abs(p.x - (c.x + (c.w >> 1))) < 22 && p.moving) {
c.x = q16Clamp(c.x + moveDir * 2, 70, 380);
}
}
const prevBottom = p.y + 32;
p.vy = Math.min(10, p.vy + 1);
p.y += p.vy;
p.grounded = false;
if (p.y + 32 >= floorY) {
p.y = floorY - 32;
p.vy = 0;
p.grounded = true;
}
if (room.crate && p.vy >= 0) {
const c = room.crate;
if (p.x >= c.x - 6 && p.x <= c.x + c.w + 6 && prevBottom <= c.y + 4 && p.y + 32 >= c.y) {
p.y = c.y - 32;
p.vy = 0;
p.grounded = true;
}
}
if (p.vy >= 0) {
for (const plat of room.platforms) {
if (p.x >= plat.x - 4 && p.x <= plat.x + plat.w + 4 && prevBottom <= plat.y + 4 && p.y + 32 >= plat.y) {
p.y = plat.y - 32;
p.vy = 0;
p.grounded = true;
}
}
}
p.hidden = false;
for (const sh of room.shadows) {
if (p.x >= sh.x && p.x <= sh.x + sh.w && p.grounded) p.hidden = true;
}
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
this.sanityQ16 = q16Clamp(this.sanityQ16 - 120, 0, Q16_ONE);
this.dirichletTensionQ16 = q16Clamp(this.dirichletTensionQ16 + 80, 0, Q16_ONE);
}
}
return { sanityQ16: this.sanityQ16, dirichletTensionQ16: this.dirichletTensionQ16, spotted };
}
}
