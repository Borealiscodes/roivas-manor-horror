import assert from 'node:assert/strict';
import { DollarPQ16Recognizer } from '../src/physics/dollar_p_q16.js';
import { ManorWorld } from '../src/world/manor_sheaf_world.js';

// 1. Verify multi-stroke $P recognizes a 2-stroke X Cross as MANTOROK
const rec = new DollarPQ16Recognizer();
const crossMatch = rec.recognizeStrokes(
  Array.of(
    Array.of({ x: 10, y: 10 }, { x: 90, y: 90 }),
    Array.of({ x: 90, y: 10 }, { x: 10, y: 90 })
  )
);
assert.equal(crossMatch.runeId, 'MANTOROK');

// 2. Verify Putt-Putt / Eternal Darkness threshold gating across rooms
const world = new ManorWorld();
world.playerX = 420;
assert.equal(world.interact().event, 'BLOCKED'); // Blocked by Foyer Crimson Ward

// Cast Ulyaoth + Bankorok to unseal Foyer gate
assert.equal(world.castSpell('ULYAOTH', 'BANKOROK', 0).outcome, 'UNSEALED');
assert.equal(world.interact().event, 'DOOR');
assert.equal(world.currentRoom, 'HALLWAY');

console.log('✓ Multi-Stroke $P & Roivas Manor Survival Horror Suite Verified:', {
  twoStrokeCross: crossMatch.runeId,
  roomUnlocked: world.currentRoom
});
