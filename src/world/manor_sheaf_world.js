import { Q16_ONE, Q16_HALF, q16Mul, q16Clamp } from '../core/q16.js';

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
    // Sub-pixel Q16.16 kinematics for silky smooth Little Nightmares jump arcs
    this.player = {
      x: 62, y: 186,
      xQ16: 62 << 16, yQ16: 186 << 16,
      vxQ16: 0, vyQ16: 0,
      grounded: true, coyoteFrames: 0, facing: 1, hidden: false, moving: false
    };
    this.sanityQ16 = Q16_ONE;
    this.dirichletTensionQ16 = 0;
    this.inventory = new Set();
    this.unsealedGates = new Set();
    this.activeSpellAlign = ALIGN.ULYAOTH;
    this.journal = Array.of(
      'I. Threshold of Dust (Oct 2026): The front doors did not lock behind me; the oak frame simply forgot it ever possessed hinges. This house does not shelter space—it hoards memory like scar tissue.'
    );
    this.statusLog = 'THE BREATHING FOYER: Rain needles the lancet glass. Ascend the grandfather clockwork ledges to claim the Brass Key, then weave Ulyaoth + Bankorok + Redgormor against the weeping flesh barrier.';

    this.rooms = {
      FOYER: {
        name: 'I. The Breathing Foyer',
        ambienceAlign: ALIGN.ULYAOTH,
        backRoom: null,
        nextRoom: 'GALLERY',
        gateId: 'FOYER_FLESH_DOOR',
        gateHint: 'Sinew and calcified cartilage knit the East Arch shut. Cast ULYAOTH + BANKOROK + REDGORMOR to unmake the flesh.',
        platforms: Array.of(
          { x: 145, y: 178, w: 84, h: 9 },
          { x: 248, y: 148, w: 92, h: 9 }
        ),
        crate: { x: 108, y: 194, w: 24, h: 24 },
        shadows: Array.of({ x: 356, w: 46 }),
        props: Array.of(
          {
            id: 'JOURNAL_PROP', x: 182, y: 166, name: 'Alexandra\'s Vellum Ledger', item: null,
            journalEntry: 'II. The Architecture of Appetite: Aunt Alexandra wrote that consciousness is merely a shallow tide lapping against cold geometry. Four ancient predicates pull at the floorboards.',
            text: 'ALEXANDRA\'S LEDGER: "Consciousness is a frail lantern held over an abyss of indifferent geometry. Cast Ulyaoth + Bankorok + Redgormor to part the crimson tissue."'
          },
          {
            id: 'KEY_PROP', x: 294, y: 136, name: 'Tarnished Brass Key', item: 'BRASS_KEY',
            journalEntry: 'III. The Stopped Pendulum: Within the clock\'s throat lay a Brass Key—warm to the touch, as though someone had been clenching it seconds before I arrived.',
            text: 'Recovered the TARNISHED BRASS KEY from the upper clockwork shelf!'
          }
        ),
        watcher: null
      },
      GALLERY: {
        name: 'II. Gallery of Weeping Portraits',
        ambienceAlign: ALIGN.CHATTURGHA,
        backRoom: 'FOYER',
        nextRoom: 'LIBRARY',
        gateId: 'LIBRARY_OAK_DOOR',
        gateHint: 'The iron-banded Oak Door refuses to yield. Press [Grab / Door] at the threshold with the BRASS KEY.',
        platforms: Array.of(
          { x: 132, y: 176, w: 92, h: 9 },
          { x: 262, y: 150, w: 94, h: 9 }
        ),
        crate: null,
        shadows: Array.of({ x: 152, w: 54 }, { x: 304, w: 54 }),
        props: Array.of(
          {
            id: 'PORTRAIT_PROP', x: 172, y: 164, name: 'Maximilian\'s Oil Portrait', item: null,
            journalEntry: 'IV. Maximilian\'s Delirium (1760): His painted pupils dilate as my lantern passes. "Sentience is a fever dream in a yawning cavern; Green Xel\'lotath drinks doubt until the mind hollows out."',
            text: 'WHISPER FROM THE CANVAS: "Sentience is a brief fever in a yawning cavern of bone. Hide in the velvet alcoves, or sear Green Xel\'lotath with Red Chattur\'gha!"'
          },
          {
            id: 'TOME_PAGE_PROP', x: 308, y: 138, name: 'Torn Skin-Vellum Page', item: 'TOME_PAGE',
            journalEntry: 'V. The Tri-Fold Predation: Flesh devours Thought; Thought unravels Plane; Plane starves Flesh. None are sovereign—only bound in mutual hunger.',
            text: 'Claimed the TORN TOME PAGE from the upper reliquary ledge!'
          }
        ),
        watcher: { alive: true, x: 375, dir: -1, minX: 110, maxX: 410, align: ALIGN.XELLOTATH, name: 'Xel\'lotath Thought-Leach', hp: 1 }
      },
      LIBRARY: {
        name: 'III. The Sunken Archive',
        ambienceAlign: ALIGN.XELLOTATH,
        backRoom: 'GALLERY',
        nextRoom: 'OBSERVATORY',
        gateId: 'OBSERVATORY_SEAL',
        gateHint: 'A shimmering Emerald Phantasm occludes the cellar stair! Cast CHATTURGHA + ANTORBOK + ARETAK.',
        platforms: Array.of(
          { x: 105, y: 178, w: 80, h: 9 },
          { x: 208, y: 150, w: 86, h: 9 },
          { x: 314, y: 178, w: 80, h: 9 }
        ),
        crate: { x: 176, y: 194, w: 24, h: 24 },
        shadows: Array.of({ x: 226, w: 50 }),
        props: Array.of(
          {
            id: 'NOTE_PROP', x: 142, y: 166, name: 'Edward\'s Autopsy Folio', item: null,
            journalEntry: 'VI. Edward\'s Dissection (1952): Grandfather Edward measured the cellar walls and found the interior wider than the exterior by four inches—a topological cyst growing around a sunken crystal.',
            text: 'EDWARD\'S FOLIO: "The manor\'s interior exceeds its exterior by four inches—a topological cyst feeding on our lineage. Only violet Mantorok can suture the wound."'
          },
          {
            id: 'GLADIUS_PROP', x: 250, y: 138, name: 'Enchanted Gladius', item: 'GLADIUS_RELIC',
            journalEntry: 'VII. The Bronze Gladius: Balanced for a Roman centurion, yet cold as deep ocean basalt. It hums when pointed toward the cellar.',
            text: 'Lifted Alexandra\'s ENCHANTED GLADIUS from the obsidian lectern!'
          }
        ),
        watcher: { alive: true, x: 355, dir: -1, minX: 115, maxX: 405, align: ALIGN.ULYAOTH, name: 'Ulyaoth Plane-Warden', hp: 1 }
      },
      OBSERVATORY: {
        name: 'IV. Heart of the Octahedron',
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
            id: 'ECHO_PROP', x: 155, y: 162, name: 'Alexandra\'s Echo', item: null,
            journalEntry: 'VIII. The Corpse-God\'s Equilibrium: "Speak the binding—Mantorok, Bankorok, Redgormor, amplified by Pargon—so the angles cease their feeding."',
            text: 'ALEXANDRA\'S ECHO: "Speak the binding—MANTOROK + BANKOROK + REDGORMOR + PARGON—before our bloodline becomes mortar!"'
          },
          {
            id: 'ALTAR_PROP', x: 240, y: 198, name: 'The 3D Octahedron', item: 'ALTAR',
            journalEntry: null,
            text: 'Eight rotating facets refract centuries of Roivas grief. Cast MANTOROK + BANKOROK + REDGORMOR + PARGON!'
          }
        ),
        watcher: { alive: true, x: 340, dir: -1, minX: 110, maxX: 395, align: ALIGN.CHATTURGHA, name: 'Manor Flesh-Avatar', hp: 2 }
      }
    };
  }

  jump() {
    if (this.player.grounded || this.player.coyoteFrames > 0) {
      // Smooth -4.15 px/frame impulse in Q16.16 (~43px arc height, zero jitter)
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
        this.statusLog = 'Crossed the threshold into ' + this.rooms[this.currentRoom].name + '.';
        return { event: 'DOOR' };
      }
      if (gate === 'LIBRARY_OAK_DOOR' && this.inventory.has('BRASS_KEY')) {
        this.unsealedGates.add(gate);
        this.statusLog = 'The Brass Key turns inside the rusted tumblers. Press [Grab / Door] again to enter.';
        return { event: 'UNLOCK' };
      }
      this.dirichletTensionQ16 = q16Clamp(this.dirichletTensionQ16 + 10000, 0, Q16_ONE);
      this.statusLog = 'THRESHOLD SEALED: ' + room.gateHint;
      return { event: 'BLOCKED' };
    }

    this.statusLog = 'Only cold drafts stir here. Ascend the ledges or approach portraits and doors.';
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
this.statusLog = 'Ulyaoth\'s cobalt geometry unravels the weeping sinew! Walk right to enter the Gallery.';
return { outcome: 'UNSEALED' };
}
if (room.gateId === 'OBSERVATORY_SEAL' && spellAlign === ALIGN.CHATTURGHA && verbId === 'ANTORBOK') {
this.unsealedGates.add('OBSERVATORY_SEAL');
this.dirichletTensionQ16 = 0;
this.statusLog = 'Chattur\'gha\'s crimson lance pierces the Emerald Phantasm! The Observatory stairs lie open.';
return { outcome: 'UNSEALED' };
}
if (this.currentRoom === 'OBSERVATORY' && spellAlign === ALIGN.MANTOROK && verbId === 'BANKOROK' && nounId === 'REDGORMOR' && pargonCount >= 1) {
if (room.watcher) room.watcher.alive = false;
this.dirichletTensionQ16 = 0;
this.sanityQ16 = Q16_ONE;
this.statusLog = 'ENDING SEALED: Mantorok\'s amplified binding locks the 3D Crystal. Roivas Manor exhales its last stolen breath.';
return { outcome: 'VICTORY' };
}
if (room.watcher && room.watcher.alive && verbId === 'ANTORBOK') {
if (countersAlignment(spellAlign, room.watcher.align)) {
room.watcher.hp -= (1 + pargonCount);
this.dirichletTensionQ16 = Math.max(0, this.dirichletTensionQ16 - 18000);
if (room.watcher.hp <= 0) {
room.watcher.alive = false;
this.statusLog = 'Unmade ' +  + ' back into inert geometry!';
return { outcome: 'BANISHED' };
}
this.statusLog = 'Struck ' +  + '! (' + room.watcher.hp + ' HP remaining)';
return { outcome: 'HIT' };
} else {
this.sanityQ16 = q16Clamp(this.sanityQ16 - 8192, 0, Q16_ONE);
this.statusLog = 'DISSONANCE! ' +  + ' drinks that alignment and fractures your perception!';
return { outcome: 'BACKFIRE' };
}
}
if (verbId === 'BANKOROK') {
this.sanityQ16 = q16Clamp(this.sanityQ16 + 8192 + pargonCount * 4096, 0, Q16_ONE);
this.statusLog = 'A quiet geometric ward steadies Evelyn\'s pulse.';
return { outcome: 'WARD' };
}
this.statusLog = 'Invoked ' + alignId + ' + ' + verbId + ' + ' + nounId + '.';
return { outcome: 'FIZZLE' };
}
step(moveDir, tick) {
const room = this.rooms[this.currentRoom];
const p = this.player;
const floorYQ16 = (218 - 32) << 16;
// Smooth Q16.16 horizontal acceleration & damping
const targetVxQ16 = moveDir * 175000; // ~2.67 px/frame
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
// Smooth Q16.16 gravity (+0.205 px/frame^2)
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
