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
    this.depth = 20; // 0 = entrance, 50 = mid-room relic, 90 = far threshold door
    this.sanityQ16 = Q16_ONE;
    this.dirichletTensionQ16 = 0;
    this.inventory = new Set();
    this.unsealedGates = new Set();
    this.activeSpellAlign = ALIGN.ULYAOTH;
    this.statusLog = 'FOYER: A pulsating Crimson Flesh Seal blocks the far arch. Hint: Cast ULYAOTH + BANKOROK + REDGORMOR (Blue Ward Field) to dissolve it!';

    this.rooms = {
      FOYER: {
        name: 'Grandfather Foyer (2026)',
        ambienceAlign: ALIGN.ULYAOTH,
        backRoom: null,
        nextRoom: 'HALLWAY',
        gateId: 'FOYER_FLESH_DOOR',
        gateHint: 'Crimson Flesh Seal blocks the far door. Cast ULYAOTH (Blue) + BANKOROK (Ward) + REDGORMOR (Area) to dissolve it.',
        prop: { depth: 50, name: 'Grandfather Clock', item: 'BRASS_KEY', text: 'You open the stopped pendulum case and take the tarnished BRASS KEY.' },
        horror: null
      },
      HALLWAY: {
        name: 'Portrait Gallery',
        ambienceAlign: ALIGN.CHATTURGHA,
        backRoom: 'FOYER',
        nextRoom: 'LIBRARY',
        gateId: 'LIBRARY_OAK_DOOR',
        gateHint: 'The Heavy Oak Door is locked. Inspect at the door while carrying the BRASS KEY.',
        prop: { depth: 45, name: 'Weeping Portrait', item: 'TOME_PAGE', text: 'Behind the portrait you find a TORN TOME PAGE: "Red Chattur\'gha devours Green Xel\'lotath."' },
        horror: { alive: true, depth: 75, align: ALIGN.XELLOTATH, name: 'Xel\'lotath Mind-Leach', hp: 1 }
      },
      LIBRARY: {
        name: 'Forbidden Library',
        ambienceAlign: ALIGN.XELLOTATH,
        backRoom: 'HALLWAY',
        nextRoom: 'CELLAR',
        gateId: 'CELLAR_PHANTASM',
        gateHint: 'An Emerald Mind Phantasm seals the cellar stairs. Cast CHATTURGHA (Red) + ANTORBOK (Attack) + ARETAK (Creature).',
        prop: { depth: 55, name: 'Obsidian Lectern', item: 'GLADIUS_RELIC', text: 'You claim Alexandra\'s ENCHANTED GLADIUS from the lectern.' },
        horror: { alive: true, depth: 78, align: ALIGN.ULYAOTH, name: 'Ulyaoth Trapper', hp: 1 }
      },
      CELLAR: {
        name: 'Flooded Wine Cellar',
        ambienceAlign: ALIGN.CHATTURGHA,
        backRoom: 'LIBRARY',
        nextRoom: 'OBSERVATORY',
        gateId: 'IRON_RELIC_GATE',
        gateHint: 'Rusted Iron Gate bars the Observatory. Inspect the gate with the ENCHANTED GLADIUS to pry it open.',
        prop: { depth: 50, name: 'Ashen Urn', item: 'MANTOROK_SIGIL', text: 'Inside the urn lies the purple MANTOROK BINDING SIGIL.' },
        horror: { alive: true, depth: 80, align: ALIGN.CHATTURGHA, name: 'Chattur\'gha Bonethief', hp: 2 }
      },
      OBSERVATORY: {
        name: 'Sub-Basement Observatory',
        ambienceAlign: ALIGN.MANTOROK,
        backRoom: 'CELLAR',
        nextRoom: null,
        gateId: null,
        gateHint: '',
        prop: { depth: 65, name: 'Fractured 3D Crystal', item: 'ALTAR', text: 'Cast MANTOROK + BANKOROK + REDGORMOR + PARGON to bind the 3D Crystal forever!' },
        horror: { alive: true, depth: 75, align: ALIGN.XELLOTATH, name: 'Crystal Avatar', hp: 2 }
      }
    };
  }

  stepForward(delta) {
    this.depth = q16Clamp(this.depth + delta, 10, 95);
    const room = this.rooms[this.currentRoom];
    if (Math.abs(this.depth - room.prop.depth) < 12) {
      this.statusLog = 'Near ' + room.prop.name + ' — tap [Inspect / Use] to examine.';
    } else if (this.depth >= 82 && room.nextRoom) {
      const locked = room.gateId && !this.unsealedGates.has(room.gateId);
      this.statusLog = locked ? ('THRESHOLD SEALED: ' + room.gateHint) : ('Threshold open! Tap [Inspect / Use] to enter ' + this.rooms[room.nextRoom].name + '.');
    }
  }

  interact() {
    const room = this.rooms[this.currentRoom];

    // 1. Retreat through rear doorway (depth <= 18)
    if (this.depth <= 18 && room.backRoom) {
      this.currentRoom = room.backRoom;
      this.depth = 80;
      this.statusLog = 'Stepped back into ' + this.rooms[this.currentRoom].name + '.';
      return { event: 'DOOR' };
    }

    // 2. Inspect mid-room prop
    if (Math.abs(this.depth - room.prop.depth) <= 16) {
      if (room.prop.item && room.prop.item !== 'ALTAR' && !this.inventory.has(room.prop.item)) {
        this.inventory.add(room.prop.item);
      }
      this.statusLog = room.prop.text;
      return { event: 'INSPECT' };
    }

    // 3. Advance through forward threshold (depth >= 78)
    if (this.depth >= 78 && room.nextRoom) {
      const gate = room.gateId;
      if (!gate || this.unsealedGates.has(gate)) {
        this.currentRoom = room.nextRoom;
        this.depth = 20;
        this.statusLog = 'Entered ' + this.rooms[this.currentRoom].name + '.';
        return { event: 'DOOR' };
      }
      if (gate === 'LIBRARY_OAK_DOOR' && this.inventory.has('BRASS_KEY')) {
        this.unsealedGates.add(gate);
        this.statusLog = 'Unlocked the Oak Door with the BRASS KEY! Tap [Inspect / Use] again to enter.';
        return { event: 'UNLOCK' };
      }
      if (gate === 'IRON_RELIC_GATE' && this.inventory.has('GLADIUS_RELIC')) {
        this.unsealedGates.add(gate);
        this.statusLog = 'Pried open the Iron Gate with the ENCHANTED GLADIUS! Tap [Inspect / Use] to enter.';
        return { event: 'UNLOCK' };
      }
      this.dirichletTensionQ16 = q16Clamp(this.dirichletTensionQ16 + 10000, 0, Q16_ONE);
      this.statusLog = 'SEALED: ' + room.gateHint;
      return { event: 'BLOCKED' };
    }

    this.statusLog = 'Walk closer to the center relic or far doorway to interact.';
    return { event: 'NONE' };
  }

  castFullSpell(alignId, verbId, nounId, pargonCount = 0) {
    const map = { CHATTURGHA: ALIGN.CHATTURGHA, ULYAOTH: ALIGN.ULYAOTH, XELLOTATH: ALIGN.XELLOTATH, MANTOROK: ALIGN.MANTOROK };
    const spellAlign = map[alignId] ?? ALIGN.MANTOROK;
    this.activeSpellAlign = spellAlign;
    const room = this.rooms[this.currentRoom];

    // 1. Unseal Foyer Flesh Door (Ulyaoth + Bankorok + Redgormor)
    if (room.gateId === 'FOYER_FLESH_DOOR' && spellAlign === ALIGN.ULYAOTH && verbId === 'BANKOROK' && nounId === 'REDGORMOR') {
      this.unsealedGates.add('FOYER_FLESH_DOOR');
      this.dirichletTensionQ16 = 0;
      this.statusLog = 'The Crimson Flesh Seal dissolves into ash! Walk forward to the door and tap [Inspect / Use].';
      return { outcome: 'UNSEALED' };
    }

    // 2. Unseal Library Cellar Phantasm (Chattur'gha + Antorbok + Aretak)
    if (room.gateId === 'CELLAR_PHANTASM' && spellAlign === ALIGN.CHATTURGHA && verbId === 'ANTORBOK') {
      this.unsealedGates.add('CELLAR_PHANTASM');
      this.dirichletTensionQ16 = 0;
      this.statusLog = 'Chattur\'gha\'s crimson bolt shatters the Emerald Phantasm! The cellar stairs are open.';
      return { outcome: 'UNSEALED' };
    }

    // 3. Final Observatory Crystal Seal (Mantorok + Bankorok + Redgormor + 1+ Pargon)
    if (this.currentRoom === 'OBSERVATORY' && spellAlign === ALIGN.MANTOROK && verbId === 'BANKOROK' && nounId === 'REDGORMOR' && pargonCount >= 1) {
      if (room.horror) room.horror.alive = false;
      this.dirichletTensionQ16 = 0;
      this.sanityQ16 = Q16_ONE;
      this.statusLog = 'VICTORY! Mantorok\'s amplified binding seals the 3D Crystal. Roivas Manor is saved!';
      return { outcome: 'VICTORY' };
    }

    // 4. Combat against Stalking Horror (Antorbok)
    if (room.horror && room.horror.alive && verbId === 'ANTORBOK') {
      if (countersAlignment(spellAlign, room.horror.align)) {
        room.horror.hp -= (1 + pargonCount);
        this.dirichletTensionQ16 = Math.max(0, this.dirichletTensionQ16 - 18000);
        if (room.horror.hp <= 0) {
          room.horror.alive = false;
          this.statusLog = 'Banished ' + room.horror.name + ' back into the abyss!';
          return { outcome: 'BANISHED' };
        }
        this.statusLog = 'Struck ' + room.horror.name + '! (' + room.horror.hp + ' HP remaining)';
        return { outcome: 'HIT' };
      } else {
        this.dirichletTensionQ16 = q16Clamp(this.dirichletTensionQ16 + 16000, 0, Q16_ONE);
        this.sanityQ16 = q16Clamp(this.sanityQ16 - 8192, 0, Q16_ONE);
        this.statusLog = 'INEFFECTIVE! ' + room.horror.name + ' resists that alignment and drains your Sanity!';
        return { outcome: 'BACKFIRE' };
      }
    }

    // 5. Ward / Heal (Bankorok)
    if (verbId === 'BANKOROK') {
      this.sanityQ16 = q16Clamp(this.sanityQ16 + 8192 + pargonCount * 4096, 0, Q16_ONE);
      this.statusLog = 'Protective ward cast — Sanity restored.';
      return { outcome: 'WARD' };
    }

    this.statusLog = 'Spell cast (' + alignId + ' + ' + verbId + ' + ' + nounId + '), but no target reacted here.';
    return { outcome: 'FIZZLE' };
  }

  step(tick) {
    const room = this.rooms[this.currentRoom];
    if (room.horror && room.horror.alive) {
      if (tick % 4 === 0 && room.horror.depth > this.depth + 12) room.horror.depth -= 1;
      if (Math.abs(room.horror.depth - this.depth) <= 14) {
        this.sanityQ16 = q16Clamp(this.sanityQ16 - 110, 0, Q16_ONE);
        this.dirichletTensionQ16 = q16Clamp(this.dirichletTensionQ16 + 70, 0, Q16_ONE);
      }
    }
    return { sanityQ16: this.sanityQ16, dirichletTensionQ16: this.dirichletTensionQ16 };
  }
}
