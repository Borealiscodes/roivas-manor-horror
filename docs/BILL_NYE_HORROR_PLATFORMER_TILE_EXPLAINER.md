# 🧪 BILL NYE'S SCIENCE OF 2.5D SHADOW STEALTH, BONE MARIMBAS & OPEN-WORLD TOPOLOGY!

> *"Consider the following... How do you turn a campy geometry experiment into a real haunted mansion platformer—and what math do you need when four spooky rooms grow into an entire open-world town?!"*

Welcome to **`roivas-manor-horror` (`v1.0.0-alpha`)**! We scrubbed out our hilarious accidental word-salad (*"a topological cyst in a yawning cavern"*—rest in peace, peak camp!), fixed the jump physics, added stealth shadow alcoves, and scored it with a **32-bar bowed cello and bone-marimba soundtrack**!

Let’s step into the lab and examine the **SIX SCIENCE TILES** behind this playable horror platformer and its open-world future!

---

## 🏃 TILE 1: Sub-Pixel `Q16.16` Jump Physics (Goodbye, Jittery Ledges!)
* **The Old Bug:** Moving in raw whole pixels (`y += vy`, `vy += 1`) made Evelyn jump like a pogo stick and miss the second clockwork shelf!
* **The Science:** We sliced every screen pixel into **`65,536` sub-pixel micro-steps (`Q16.16`)**! Evelyn launches at `-4.15 px/frame` (`-272000`), arcs smoothly under `+0.205 px/frame²` gravity (`+13400`), and gets a **6-frame "coyote-time" grace window** after stepping off a ledge—making crate pushing and multi-shelf jumps feel silky smooth!

---

## 🕯️ TILE 2: Volumetric Lantern Cone & Shadow-Alcove Stealth!
* **How It Works:** Every pixel on our `480×272` screen calculates its squared distance $d^2 = (x - x_L)^2 + (y - y_L)^2$ from Evelyn’s oil lantern, shading the room with a **`4×4` Bayer dithering checkerboard** across **256 retro colors (`CLUT8`)**!
* **Hide-and-Seek Physics:** Step inside a **dark velvet curtain alcove**, and Evelyn dims her lantern (`R = 42 px`). When a towering **Watcher** sweeps its `115 px` searchlight cone across the hall, it walks right past you—unless you step out into the open, where its gaze drains your Sanity and makes the walls bleed crimson pixels!

---

## 🎻 TILE 3: 32-Bar Bowed Cello & 4:1 FM Bone-Marimba OST!
* **Zero `.mp3` Files, Zero Static:** Instead of harsh white-noise hiss, WebAudio synthesizes an entire gothic chamber ensemble from pure math:
  1. **Dual-Oscillator Bowed Cello:** A lowpass-filtered (`360 Hz`) sawtooth + triangle fifth playing a 32-bar D-minor mourning progression.
  2. **Sharp Bone-Marimba Percussion:** Frequency Modulation (`FM`) strikes where a `3.98×` overtone modulator snaps down in `45 milliseconds`—sounding like hollow wooden mallets echoing in a stone cathedral!
  3. **Sanity Detuning:** When a Watcher spots you, the cello bends upward toward a creepy **microtonal tritone**!

---

## 🖌️ TILE 4: Why the Celestial Brush Still Needs a Brain Upgrade!
* **The Honest Admission:** Right now, our **`$P` Point-Cloud Recognizer** treats your finger sketch like an unordered cloud of 32 dots. On a mobile touchscreen, fast curves and lifted strokes still get confused—so our **Tome Quick-Sigil Bar** does the heavy lifting!
* **The Future Fix:** Replace raw point clouds with **turning-angle histograms** (measuring how sharply your finger bends at each corner) or a tiny **2D stroke-feature neural classifier** so freehand runes snap in effortlessly!

---

## 💀 TILE 5: Real Stakes — Game-Over Screens & Contraption Puzzles!
* **What’s Next for Contained Mysteries:**
  * **Shattered Mind Game-Over Loop:** Hitting `0%` Sanity shouldn't just flash a warning banner—it should trigger a dramatic **"Consumed by the Manor"** fail screen and reload from your last Case Journal entry!
  * **Contraption Puzzles (*LittleBigPlanet* × *Resident Evil*):** Add **counterweight pulley elevators**, **1:00 AM clockwork gear puzzles**, and **angled mirror beams** that burn away shadow barriers!

---

## 🗺️ TILE 6: The Math of Scaling from 4 Rooms to an Open World!
* **Why Current Math Doesn't Scale:** Checking every platform and enemy one-by-one works great in 4 rooms, but across a 500-room haunted town it would slow to a crawl!
* **Four Mathematical Upgrades for Open-World Horror:**
  1. **Spatial Hash Grids / Quadtrees:** Chop the world into `Q16.16` grid buckets so collision checks stay **$O(1)$ instant** no matter how huge the map gets!
  2. **`A*` NavMeshes & Sound Heatmaps:** Let Watchers climb stairs, jump gaps, and hunt toward the sound of your footsteps!
  3. **2D Raycast Visibility Polygons:** Make stone walls and closed doors cast **true pitch-black shadows** that block monster sightlines dynamically!
  4. **Local $k$-Hop Cellular Sheaves:** Compute topological tension only within **2 rooms of the player**, keeping the cosmos bit-exact without simulating the whole county every frame!

---

> *"From sub-pixel jump arcs to local cellular sheaves—mathematics turns spooky ideas into playable worlds! Now go hide in a shadow alcove and cast some responsible geometry!"* — **Science Rules!** 🧪🕯️
