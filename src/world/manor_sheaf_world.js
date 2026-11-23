import { Q16_ONE, q16Clamp } from '../core/q16.js';

export const ALIGN = { CHATTURGHA: 0, ULYAOTH: 1, XELLOTATH: 2, MANTOROK: 3 };

// Counter-alignment dominance: Chattur'gha(0) beats Xel'lotath(2), Xel'lotath(2) beats Ulyaoth(1), Ulyaoth(1) beats Chattur'gha(0)
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
    this.playerX = 120;
    this.sanityQ16 = Q16_ONE;
    this.dirichletTensionQ16 = 0;
    this.inventory = new Set();
    this.unsealedGates = new Set();
    this.activeSpellAlign = ALIGN.MANTOROK;
    this.chargedPargons = 0;
    this.statusLog = 'Rain lashes the Foyer windows. The grandfather clock is frozen at 13:00.';

    this.rooms = {
      FOYER: {
        name: 'Grandfather Foyer',
        ambienceAlign: ALIGN.ULYAOTH,
        leftDoor: null,
        rightDoor: { target: 'HALLWAY', gateId: 'FOYER_CLOCK_WARD', reqText: 'Crimson Flesh Seal blocks the East Door (Cast ULYAOTH + BANKOROK).' },
        props: Array.of(
          { id: 'CLOCK', x: 240, label: 'Grandfather Clock', item: 'BRASS_KEY', desc: 'Inside the stopped pendulum case you find a tarnished BRASS KEY.' }
        ),
        horror: null
      },
      HALLWAY: {
        name: 'Portrait Corridor',
        ambienceAlign: ALIGN.CHATTURGHA,
        leftDoor: { target: 'FOYER', gateId: null },
        rightDoor: { target: 'LIBRARY', gateId: 'LIBRARY_KEY_LOCK', reqText: 'Heavy Oak Door is locked (Requires BRASS KEY from Foyer Clock).' },
        props: Array.of(
          { id: 'PORTRAIT', x: 210, label: 'Weeping Portrait', item: 'TOME_PAGE', desc: 'Behind the bleeding canvas is a TORN TOME PAGE: "Red Flesh devours Green Mind."' }
        ),
        horror: { alive: true, x: 380, align: ALIGN.XELLOTATH, name: 'Xel\'lotath Parasite', hp: 1 }
      },
      LIBRARY: {
        name: 'Forbidden Library',
        ambienceAlign: ALIGN.XELLOTATH,
        leftDoor: { target: 'HALLWAY', gateId: null },
        rightDoor: { target: 'CELLAR', gateId: 'CELLAR_STAIR_SEAL', reqText: 'Emerald Mind Phantasm blocks the Cellar Stairs (Cast CHATTURGHA + ANTORBOK).' },
        props: Array.of(
          { id: 'LECTERN', x: 260, label: 'Obsidian Lectern', item: 'GLADIUS_RELIC', desc: 'Resting on the lectern is Alexandra\'s ENCHANTED GLADIUS.' }
        ),
        horror: { alive: true, x: 370, align: ALIGN.ULYAOTH, name: 'Ulyaoth Trapper', hp: 1 }
      },
      CELLAR: {
        name: 'Flooded Wine Cellar',
        ambienceAlign: ALIGN.CHATTURGHA,
        leftDoor: { target: 'LIBRARY', gateId: null },
        rightDoor: { target: 'OBSERVATORY', gateId: 'OBSERVATORY_GATE', reqText: 'Iron Relic Gate requires the ENCHANTED GLADIUS to pry open.' },
        props: Array.of(
          { id: 'ALTAR_URN', x: 220, label: 'Ashen Urn', item: 'MANTOROK_SIGIL', desc: 'You recover the purple MANTOROK BINDING SIGIL from the ash.' }
        ),
        horror: { alive: true, x: 390, align: ALIGN.CHATTURGHA, name: 'Chattur\'gha Bonethief', hp: 2 }
      },
      OBSERVATORY: {
        name: 'Sub-Basement Observatory',
        ambienceAlign: ALIGN.MANTOROK,
        leftDoor: { target: 'CELLAR', gateId: null },
        rightDoor: null,
        props: Array.of(
          { id: 'CRYSTAL_ALTAR', x: 240, label: 'Fractured Octahedron', item: 'VICTORY_PENDING', desc: 'The 3D Crystal screams! Cast MANTOROK + BANKOROK with 1+ PARGON to seal the manor!' }
        ),
        horror: { alive: true, x: 360, align: ALIGN.XELLOTATH, name: 'Crystal Avatar', hp: 2 }
      }
    };
  }

  movePlayer(dx) {
    this.playerX = q16Clamp(this.playerX + dx, 36, 444);
  }

  /** Attempt to interact with nearby prop or cross a gated cellular sheaf doorway */
  interact() {
    const room = this.rooms[this.currentRoom];

    // 1. Check Left Doorway (x < 75)
    if (this.playerX < 80 && room.leftDoor) {
      this.currentRoom = room.leftDoor.target;
      this.playerX = 395;
      this.statusLog = 'Entered ' + this.rooms[this.currentRoom].name + '.';
      return { event: 'DOOR' };
    }

    // 2. Check Right Doorway (x > 400) -> Sheaf Restriction Gate
    if (this.playerX > 400 && room.rightDoor) {
      const gate = room.rightDoor.gateId;
      if (!gate || this.unsealedGates.has(gate)) {
        this.currentRoom = room.rightDoor.target;
        this.playerX = 85;
        this.statusLog = 'Crossed threshold into ' + this.rooms[this.currentRoom].name + '.';
        return { event: 'DOOR' };
      }
      // Check item-based sheaf gates
      if (gate === 'LIBRARY_KEY_LOCK' && this.inventory.has('BRASS_KEY')) {
        this.unsealedGates.add(gate);
        this.statusLog = 'The BRASS KEY turns with a heavy clunk. Library unlocked!';
        return { event: 'UNLOCK' };
      }
      if (gate === 'OBSERVATORY_GATE' && this.inventory.has('GLADIUS_RELIC')) {
        this.unsealedGates.add(gate);
        this.statusLog = 'You wedge the ENCHANTED GLADIUS into the iron seal—the Observatory opens!';
        return { event: 'UNLOCK' };
      }
      // Gate still locked -> Dirichlet tension spike!
      this.dirichletTensionQ16 = q16Clamp(this.dirichletTensionQ16 + 12000, 0, Q16_ONE);
      this.statusLog = 'GATE BLOCKED: ' + room.rightDoor.reqText;
      return { event: 'BLOCKED' };
    }

    // 3. Check Interactive Room Props
    for (const prop of room.props) {
      if (Math.abs(this.playerX - prop.x) < 42) {
        if (prop.item && prop.item !== 'VICTORY_PENDING' && !this.inventory.has(prop.item)) {
          this.inventory.add(prop.item);
        }
        this.statusLog = prop.desc;
        return { event: 'INSPECT', prop };
      }
    }

    this.statusLog = 'Shadows shift along the floorboards. Nothing within reach.';
    return { event: 'NONE' };
  }

  /** Resolve a cast spell (Alignment + Action + Pargon count) against room gates & horrors */
  castSpell(alignId, actionId, pargonCount = 0) {
    const alignMap = { CHATTURGHA: ALIGN.CHATTURGHA, ULYAOTH: ALIGN.ULYAOTH, XELLOTATH: ALIGN.XELLOTATH, MANTOROK: ALIGN.MANTOROK };
    const spellAlign = alignMap[alignId] ?? ALIGN.MANTOROK;
    this.activeSpellAlign = spellAlign;
    const room = this.rooms[this.currentRoom];

    // 1. Check if spell unseals the current room's doorway gate
    if (room.rightDoor && room.rightDoor.gateId) {
      const g = room.rightDoor.gateId;
      if (g === 'FOYER_CLOCK_WARD' && spellAlign === ALIGN.ULYAOTH && actionId === 'BANKOROK') {
        this.unsealedGates.add(g);
        this.dirichletTensionQ16 = Math.max(0, this.dirichletTensionQ16 - 16384);
        this.statusLog = 'Ulyaoth\'s cobalt ward dissolves the crimson flesh barrier!';
        return { outcome: 'UNSEALED' };
      }
      if (g === 'CELLAR_STAIR_SEAL' && spellAlign === ALIGN.CHATTURGHA && actionId === 'ANTORBOK') {
        this.unsealedGates.add(g);
        this.dirichletTensionQ16 = Math.max(0, this.dirichletTensionQ16 - 16384);
        this.statusLog = 'Chattur\'gha\'s spear shatters the emerald phantasm on the Cellar stairs!';
        return { outcome: 'UNSEALED' };
      }
    }

    // 2. Check Final Boss Seal in Observatory
    if (this.currentRoom === 'OBSERVATORY' && spellAlign === ALIGN.MANTOROK && actionId === 'BANKOROK' && pargonCount >= 1) {
      if (room.horror) room.horror.alive = false;
      this.dirichletTensionQ16 = 0;
      this.sanityQ16 = Q16_ONE;
      this.statusLog = 'VICTORY! Mantorok\'s amplified binding locks the 3D Octahedron Crystal. Roivas Manor is saved!';
      return { outcome: 'VICTORY' };
    }

    // 3. Check Combat against Stalking Horror in current room
    if (room.horror && room.horror.alive && actionId === 'ANTORBOK') {
      if (countersAlignment(spellAlign, room.horror.align)) {
        const dmg = 1 + pargonCount;
        room.horror.hp -= dmg;
        this.dirichletTensionQ16 = Math.max(0, this.dirichletTensionQ16 - 20000);
        if (room.horror.hp <= 0) {
          room.horror.alive = false;
          this.statusLog = 'Banished ' + room.horror.name + ' back into the void!';
          return { outcome: 'BANISHED' };
        }
        this.statusLog = 'Direct hit on ' + room.horror.name + '! (' + room.horror.hp + ' HP left)';
        return { outcome: 'HIT' };
      } else {
        // Wrong alignment feeds the horror!
        this.dirichletTensionQ16 = q16Clamp(this.dirichletTensionQ16 + 18000, 0, Q16_ONE);
        this.sanityQ16 = q16Clamp(this.sanityQ16 - 8192, 0, Q16_ONE);
        this.statusLog = 'WRONG ALIGNMENT! ' + room.horror.name + ' absorbs your magick and drains your Sanity!';
        return { outcome: 'BACKFIRE' };
      }
    }

    // 4. Defensive Bankorok Heal / Sanity Stabilize
    if (actionId === 'BANKOROK') {
      const restore = 6553 + (pargonCount * 4096);
      this.sanityQ16 = q16Clamp(this.sanityQ16 + restore, 0, Q16_ONE);
      this.dirichletTensionQ16 = Math.max(0, this.dirichletTensionQ16 - 8192);
      this.statusLog = 'A protective ward steadies your breathing and restores Sanity.';
      return { outcome: 'WARD' };
    }

    this.statusLog = 'Your incantation echoes harmlessly off the cold stone walls.';
    return { outcome: 'FIZZLE' };
  }

  /** Advance stalking horror AI & Sanity drain per tick */
  step(tick) {
    const room = this.rooms[this.currentRoom];
    if (room.horror && room.horror.alive) {
      // Stalk slowly toward player every 3 frames
      if (tick % 3 === 0) {
        if (room.horror.x > this.playerX + 24) room.horror.x -= 1;
        else if (room.horror.x < this.playerX - 24) room.horror.x += 1;
      }
      // Proximity dread & attack
if (Math.abs(room.horror.x - this.playerX) <= 28) {
this.sanityQ16 = q16Clamp(this.sanityQ16 - 140, 0, Q16_ONE);
this.dirichletTensionQ16 = q16Clamp(this.dirichletTensionQ16 + 90, 0, Q16_ONE);
}
} else {
this.dirichletTensionQ16 = Math.max(0, this.dirichletTensionQ16 - 16);
}
return {
sanityQ16: this.sanityQ16,
dirichletTensionQ16: this.dirichletTensionQ16
};
}
}
