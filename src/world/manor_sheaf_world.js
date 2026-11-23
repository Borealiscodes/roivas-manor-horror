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
    this.player = {
      x: 62, y: 186,
      xQ16: 62 << 16, yQ16: 186 << 16,
      vxQ16: 0, vyQ16: 0,
      grounded: true, coyoteFrames: 0, facing: 1, hidden: false, moving: false
    };
    this.sanityQ16 = Q16_ONE;
    this.dirichletTensionQ16 = 8192;
    this.inventory = new Set();
    this.unsealedGates = new Set();
    this.activeSpellAlign = ALIGN.ULYAOTH;
    this.journal = Array.of(
      'I. October 14, 2026: My great-aunt Alexandra left me the Rhode Island estate on one condition—that I spend a single night inside before the lawyers unseal her vault.'
    );
    this.statusLog = 'THE FOYER: The front deadbolt snapped shut on its own. Climb the clock shelves for the Brass Key, and cast Ulyaoth + Bankorok + Redgormor to clear the East Arch.';

    this.rooms = {
      FOYER: {
        name: 'I. The Cold Foyer',
        ambienceAlign: ALIGN.ULYAOTH,
        backRoom: null,
        nextRoom: 'GALLERY',
        gateId: 'FOYER_FLESH_DOOR',
        gateHint: 'A pulsing Crimson Seal covers the East Arch. Cast ULYAOTH (Blue) + BANKOROK (Ward) + REDGORMOR (Area) to dissolve it.',
        platforms: Array.of(
          { x: 145, y: 178, w: 84, h: 9 },
          { x: 248, y: 148, w: 92, h: 9 }
        ),
        crate: { x: 108, y: 194, w: 24, h: 24 },
        shadows: Array.of({ x: 356, w: 46 }),
        props: Array.of(
          {
            id: 'JOURNAL_PROP', x: 182, y: 166, name: 'Alexandra\'s Notebook', item: null,
            journalEntry: 'II. The First Warning: Alexandra\'s notebook lies open on the shelf. "If the red barrier returns on the East Door, answer it with Blue Ulyaoth, Bankorok, and Redgormor."',
            text: 'ALEXANDRA\'S NOTE: "If the red barrier seals the East Door again, answer it with Blue Ulyaoth, Bankorok, and Redgormor."'
          },
          {
            id: 'KEY_PROP', x: 294, y: 136, name: 'Tarnished Brass Key', item: 'BRASS_KEY',
            journalEntry: 'III. Inside the Clock: Found the tarnished Brass Key resting beside a pendulum frozen at 1:00 AM.',
            text: 'Picked up the TARNISHED BRASS KEY from the upper clock ledge!'
          }
        ),
        watcher: null
      },
      GALLERY: {
        name: 'II. The Portrait Gallery',
        ambienceAlign: ALIGN.CHATTURGHA,
        backRoom: 'FOYER',
        nextRoom: 'LIBRARY',
        gateId: 'LIBRARY_OAK_DOOR',
        gateHint: 'The heavy Oak Library Door is locked. Press [Grab / Door] at the door with the BRASS KEY.',
        platforms: Array.of(
          { x: 132, y: 176, w: 92, h: 9 },
          { x: 262, y: 150, w: 94, h: 9 }
        ),
        crate: null,
        shadows: Array.of({ x: 152, w: 54 }, { x: 304, w: 54 }),
        props: Array.of(
          {
            id: 'PORTRAIT_PROP', x: 172, y: 164, name: 'Maximilian\'s Portrait', item: null,
            journalEntry: 'IV. The 1760 Portrait: Scratched into the frame of Dr. Maximilian Roivas: "Step into the dark curtain alcoves when the Green Watcher turns its lamp toward you."',
            text: 'CARVED INTO THE FRAME: "Step into the dark curtain alcoves when the Watcher turns its gaze, or strike Green with Red Chattur\'gha!"'
          },
          {
            id: 'TOME_PAGE_PROP', x: 308, y: 138, name: 'Torn Ledger Page', item: 'TOME_PAGE',
            journalEntry: 'V. The Three-Way Rule: Red beats Green; Green beats Blue; Blue beats Red. Purple Mantorok binds all three.',
            text: 'Found the TORN LEDGER PAGE detailing the three-color counter cycle!'
          }
        ),
        watcher: { alive: true, x: 375, dir: -1, minX: 110, maxX: 410, align: ALIGN.XELLOTATH, name: 'Gallery Watcher (Green)', hp: 1 }
      },
      LIBRARY: {
        name: 'III. The East Library',
        ambienceAlign: ALIGN.XELLOTATH,
        backRoom: 'GALLERY',
        nextRoom: 'OBSERVATORY',
        gateId: 'OBSERVATORY_SEAL',
        gateHint: 'An Emerald Ward blocks the cellar stairs! Cast CHATTURGHA (Red) + ANTORBOK (Attack) + ARETAK (Creature).',
        platforms: Array.of(
          { x: 105, y: 178, w: 80, h: 9 },
          { x: 208, y: 150, w: 86, h: 9 },
          { x: 314, y: 178, w: 80, h: 9 }
        ),
        crate: { x: 176, y: 194, w: 24, h: 24 },
        shadows: Array.of({ x: 226, w: 50 }),
        props: Array.of(
          {
            id: 'NOTE_PROP', x: 142, y: 166, name: 'Edward\'s Letter', item: null,
            journalEntry: 'VI. Grandfather Edward\'s Letter (1952): "We never built a cellar under the East Wing—yet the stone stair leads down to a suspended crystal chamber."',
            text: 'EDWARD\'S LETTER (1952): "We never dug a cellar under the East Wing, yet the stair descends to a suspended crystal chamber."'
          },
          {
            id: 'GLADIUS_PROP', x: 250, y: 138, name: 'Bronze Gladius', item: 'GLADIUS_RELIC',
            journalEntry: 'VII. The Bronze Gladius: Taken from the study lectern. Its cold blade steadies my hands in the dark.',
            text: 'Claimed Alexandra\'s BRONZE GLADIUS from the upper study catwalk!'
          }
        ),
        watcher: { alive: true, x: 355, dir: -1, minX: 115, maxX: 405, align: ALIGN.ULYAOTH, name: 'Archive Warden (Blue)', hp: 1 }
      },
      OBSERVATORY: {
        name: 'IV. The Sub-Basement Vault',
        ambienceAlign: ALIGN.MANTOROK,
        backRoom: 'LIBRARY',
        nextRoom: null,
        gateId: null,
        gateHint: '',
        platforms: Array.of(
          { x: 115, y: 174, w: 84, h: 9 },
          { x: 280, y: 174, w: 84, h: 9 }
        ),
        crate: null,
        shadows: Array.of({ x: 85, w: 46 }, { x: 348, w: 46 }),
        props: Array.of(
          {
            id: 'ECHO_PROP', x: 155, y: 162, name: 'Alexandra\'s Final Note', item: null,
            journalEntry: 'VIII. The Vault Seal: "Evelyn, cast Purple Mantorok + Bankorok + Redgormor + Pargon to lock the crystal and walk out before dawn."',
            text: 'ALEXANDRA\'S FINAL NOTE: "Cast MANTOROK + BANKOROK + REDGORMOR + PARGON to lock the crystal and walk out before dawn."'
          },
          {
            id: 'ALTAR_PROP', x: 240, y: 198, name: 'The Floating Octahedron', item: 'ALTAR',
            journalEntry: null,
            text: 'The 3D Crystal hums above the stone altar. Cast MANTOROK + BANKOROK + REDGORMOR + PARGON to seal it!'
          }
        ),
        watcher: { alive: true, x: 340, dir: -1, minX: 110, maxX: 395, align: ALIGN.CHATTURGHA, name: 'Vault Guardian (Red)', hp: 2 }
      }
    };
  }

  jump() {
    if (this.player.grounded || this.player.coyoteFrames > 0) {
      this.player.vyQ16 = -272000;
      this.player.grounded = false;
      this.player.coyoteFrames = 0;
    }
  }

  interact() {
    const room = this.rooms[this.currentRoom];
    const p = this.player;

    if (p.x < 68 && room.backRoom) {
      this.currentRoom = room.backRoom;
      p.x = 400; p.y = 186; p.xQ16 = 400 << 16; p.yQ16 = 186 << 16;
      this.statusLog = 'Stepped back into ' + this.rooms[this.currentRoom].name + '.';
      return { event: 'DOOR' };
    }

    for (const prop of room.props) {
      if (Math.hypot(p.x - prop.x, (p.y + 16) - prop.y) < 42) {
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
        p.x = 68; p.y = 186; p.xQ16 = 68 << 16; p.yQ16 = 186 << 16;
        this.statusLog = 'Entered ' + this.rooms[this.currentRoom].name + '.';
        return { event: 'DOOR' };
      }
      if (gate === 'LIBRARY_OAK_DOOR' && this.inventory.has('BRASS_KEY')) {
        this.unsealedGates.add(gate);
        this.statusLog = 'Unlocked the Oak Door with the Brass Key! Press [Grab / Door] again to enter.';
        return { event: 'UNLOCK' };
      }
      this.dirichletTensionQ16 = q16Clamp(this.dirichletTensionQ16 + 10000, 0, Q16_ONE);
      this.statusLog = 'LOCKED: ' + room.gateHint;
      return { event: 'BLOCKED' };
    }

    this.statusLog = 'Nothing within reach. Jump onto shelves or approach notes and doors.';
    return { event: 'NONE' };
  }

  castFullSpell(alignId, verbId, nounId, pargonCount = 0) {
    const map = { CHATTURGHA: ALIGN.CHATTURGHA, ULYAOTH: ALIGN.ULYAOTH, XELLOTATH: ALIGN.XELLOTATH, MANTOROK: ALIGN.MANTOROK };
    const spellAlign = map[alignId] ?? ALIGN.MANTOROK;
    this.activeSpellAlign = spellAlign;
    const room = this.rooms[this.currentRoom];

    if (room.gateId === 'FOYER_FLESH_DOOR' && spellAlign === ALIGN.ULYAOTH && verbId === 'BANKOROK' && nounId === 'REDGORMOR') {
      this.unsealedGates.add('FOYER_FLESH_DOOR');
      this.dirichletTensionQ16 = 4096;
      this.statusLog = 'Blue Ulyaoth dissolves the Crimson Seal! Walk right to enter the Portrait Gallery.';
      return { outcome: 'UNSEALED' };
    }

    if (room.gateId === 'OBSERVATORY_SEAL' && spellAlign === ALIGN.CHATTURGHA && verbId === 'ANTORBOK') {
      this.unsealedGates.add('OBSERVATORY_SEAL');
      this.dirichletTensionQ16 = 4096;

this.statusLog = 'Red Chattur'gha shatters the Emerald Ward! The cellar stairs are open.';
return { outcome: 'UNSEALED' };
}
if (this.currentRoom === 'OBSERVATORY' && spellAlign === ALIGN.MANTOROK && verbId === 'BANKOROK' && nounId === 'REDGORMOR' && pargonCount >= 1) {
if (room.watcher) room.watcher.alive = false;
this.dirichletTensionQ16 = 0;
this.sanityQ16 = Q16_ONE;
this.statusLog = 'VAULT SEALED: Purple Mantorok locks the 3D Crystal. The front doors unbolt—you survived the night!';
return { outcome: 'VICTORY' };
}
if (room.watcher && room.watcher.alive && verbId === 'ANTORBOK') {
if (countersAlignment(spellAlign, room.watcher.align)) {
room.watcher.hp -= (1 + pargonCount);
this.dirichletTensionQ16 = Math.max(4096, this.dirichletTensionQ16 - 18000);
if (room.watcher.hp <= 0) {
room.watcher.alive = false;
this.statusLog = 'Banished ' + room.watcher.name + '!';
return { outcome: 'BANISHED' };
}
this.statusLog = 'Hit ' + room.watcher.name + '! (' + room.watcher.hp + ' HP left)';
return { outcome: 'HIT' };
} else {
this.sanityQ16 = q16Clamp(this.sanityQ16 - 8192, 0, Q16_ONE);
this.statusLog = 'INEFFECTIVE! ' + room.watcher.name + ' resists that alignment!';
return { outcome: 'BACKFIRE' };
}
}
if (verbId === 'BANKOROK') {
this.sanityQ16 = q16Clamp(this.sanityQ16 + 8192 + pargonCount * 4096, 0, Q16_ONE);
this.statusLog = 'Protective ward cast — Sanity steadied.';
return { outcome: 'WARD' };
}
this.statusLog = 'Cast ' + alignId + ' + ' + verbId + ' + ' + nounId + '.';
return { outcome: 'FIZZLE' };
}
step(moveDir, tick) {
const room = this.rooms[this.currentRoom];
const p = this.player;
const floorYQ16 = (218 - 32) << 16;
const targetVxQ16 = moveDir * 175000;
p.vxQ16 += ((targetVxQ16 - p.vxQ16) >> 2);
p.moving = Math.abs(moveDir) > 0 || Math.abs(p.vxQ16) > 22000;
if (moveDir !== 0) p.facing = moveDir > 0 ? 1 : -1;
p.xQ16 = q16Clamp(p.xQ16 + p.vxQ16, 28 << 16, 452 << 16);
p.x = p.xQ16 >> 16;
if (room.crate) {
const c = room.crate;
if (Math.abs(p.y + 32 - (c.y + c.h)) < 12 && Math.abs(p.x - (c.x + (c.w >> 1))) < 22 && moveDir !== 0) {
c.x = q16Clamp(c.x + moveDir * 2, 70, 380);
}
}
const prevBottom = p.y + 32;
p.vyQ16 = Math.min(480000, p.vyQ16 + 13400);
p.yQ16 += p.vyQ16;
p.y = p.yQ16 >> 16;
if (p.grounded) p.coyoteFrames = 6;
else if (p.coyoteFrames > 0) p.coyoteFrames--;
p.grounded = false;
if (p.yQ16 >= floorYQ16) {
p.yQ16 = floorYQ16;
p.y = 186;
p.vyQ16 = 0;
p.grounded = true;
}
if (room.crate && p.vyQ16 >= 0) {
const c = room.crate;
if (p.x >= c.x - 6 && p.x <= c.x + c.w + 6 && prevBottom <= c.y + 5 && p.y + 32 >= c.y) {
p.y = c.y - 32;
p.yQ16 = p.y << 16;
p.vyQ16 = 0;
p.grounded = true;
}
}
if (p.vyQ16 >= 0) {
for (const plat of room.platforms) {
if (p.x >= plat.x - 5 && p.x <= plat.x + plat.w + 5 && prevBottom <= plat.y + 5 && p.y + 32 >= plat.y) {
p.y = plat.y - 32;
p.yQ16 = p.y << 16;
p.vyQ16 = 0;
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
