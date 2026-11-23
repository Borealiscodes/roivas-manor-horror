import assert from 'node:assert/strict';
import { DollarPQ16Recognizer } from '../src/physics/dollar_p_q16.js';
import { ManorWorld } from '../src/world/manor_sheaf_world.js';

const rec = new DollarPQ16Recognizer();
const diamond = rec.recognizeStrokes(
  Array.of(Array.of({ x: 50, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 100 }, { x: 0, y: 50 }, { x: 50, y: 0 }))
);
assert.equal(diamond.runeId, 'ULYAOTH');

const world = new ManorWorld();
assert.equal(world.castFullSpell('ULYAOTH', 'BANKOROK', 'REDGORMOR', 0).outcome, 'UNSEALED');
world.player.x = 420;
assert.equal(world.interact().event, 'DOOR');
assert.equal(world.currentRoom, 'GALLERY');

console.log('✓ Little Nightmares × LBP 2.5D Side-Scroller & Cello Suite Verified:', {
  diamond: diamond.runeId,
  enteredRoom: world.currentRoom
});
