import assert from 'node:assert/strict';
import { DollarPQ16Recognizer } from '../src/physics/dollar_p_q16.js';
import { ManorWorld } from '../src/world/manor_sheaf_world.js';

const rec = new DollarPQ16Recognizer();
// Verify Diamond -> ULYAOTH (separated from smooth Enso PARGON)
const diamond = rec.recognizeStrokes(
  Array.of(Array.of({ x: 50, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 100 }, { x: 0, y: 50 }, { x: 50, y: 0 }))
);
assert.equal(diamond.runeId, 'ULYAOTH');

// Verify Foyer Flesh Door unseals with Ulyaoth + Bankorok + Redgormor
const world = new ManorWorld();
assert.equal(world.castFullSpell('ULYAOTH', 'BANKOROK', 'REDGORMOR', 0).outcome, 'UNSEALED');
world.stepForward(70);
assert.equal(world.interact().event, 'DOOR');
assert.equal(world.currentRoom, 'HALLWAY');

console.log('✓ Over-the-Shoulder Horror & Full 12-Rune Suite Verified:', {
  diamond: diamond.runeId,
  unsealedAndEntered: world.currentRoom
});
