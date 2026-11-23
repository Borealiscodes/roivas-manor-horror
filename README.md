# 🕯️ Roivas Manor: 2026 (`Q16.16` 2.5D Psychological Horror Platformer)

> 👁️ **PLAYABLE ALPHA (`v1.0.0-alpha`)** 👁️  
> *2.5D stealth-platforming and runic horror evolution of [`tome-of-eternal-holonomy`](https://github.com) & [`roivas-manor-2026`](https://github.com), inspired by **Little Nightmares**, **LittleBigPlanet**, and **Eternal Darkness: Sanity's Requiem**.*

October 14, 2026. Evelyn Roivas returns to her great-aunt Alexandra's Rhode Island estate—only for the front deadbolt to snap shut behind her and the grandfather clock pendulum to freeze at 1:00 AM.

Built on a **zero-dependency `Q16.16` fixed-point simulation core**, *Roivas Manor: 2026* combines sub-pixel platforming, pushable wooden crate physics, shadow-alcove stealth, Watcher searchlight AI, a `480×272` `CLUT8` Bayer-dithered framebuffer, `en-GB` TTS narration, and a 32-bar WebAudio bowed-cello and FM bone-marimba soundtrack.

---

## 🎮 Core Gameplay & Architecture (`v1.0.0-alpha`)

### 1. Sub-Pixel `Q16.16` Platforming & Tactile Physics (`src/world/manor_sheaf_world.js`)
* **Smooth Parabolic Jump Arcs:** All horizontal acceleration, gravity (`+13400` `Q16.16`), jump impulses (`-272000` `Q16.16`), and 6-frame **coyote-time** ledge forgiveness execute in signed 32-bit fixed-point arithmetic.
* **Pushable Crate & Shelf Traversal:** Push wooden crates across the floorboards to scale multi-tier clockwork ledges and reach upper-gallery relics.

### 2. Volumetric Lantern Lighting & Shadow-Alcove Stealth (`src/render/horror_renderer.js`)
* **Dynamic `CLUT8` Bayer Lighting:** Per-pixel squared-distance falloff around Evelyn's oil lantern illuminates gothic lancet windows, a hovering **3D rotating octahedron crystal**, and custom artifact silhouettes (*Open Notebook*, *Tarnished Brass Key*, *Weeping Portrait*, *Torn Ledger Page*, and *Bronze Gladius*).
* **Stealth Curtain Alcoves:** Stepping into dark vertical alcoves dims Evelyn's lantern (`R = 42 px`) and conceals her (`[HIDDEN IN SHADOW]`) from patrolling **Watchers** sweeping `115 px` searchlight gaze cones across the corridor.
* **Sanity Distortion (`Ledger 2`):** Being spotted drains `sanityQ16`, shrinking your lantern radius, tilting the viewport, and bleeding crimson pixels down the walls.

### 3. 12-Rune Counter-Alignment Spellcasting & Case Journal
* **Three-Way Dominance Cycle:** Red (**Chattur'gha**) counters Green (**Xel'lotath**); Green counters Blue (**Ulyaoth**); Blue counters Red; and Purple (**Mantorok**) binds the Sub-Basement Vault crystal.
* **Hybrid Input:** Includes both a **Tome Quick-Sigil Selector** (`[Alignment + Verb + Noun + Pargon]`) and an experimental `$P` freehand brush canvas, paired with an 8-entry **Evelyn Roivas Case Journal** and `en-GB` speech narration.

### 4. 32-Bar Bowed Cello & FM Bone-Marimba Soundtrack (`src/audio/horror_synth.js`)
* **Zero-Asset WebAudio Ensemble:** Synthesizes a 32-bar D-minor / Phrygian mourning progression using a lowpass-filtered dual-oscillator bowed cello, syncopated `4:1` FM wooden bone-marimba off-beats, and a `420 ms` stereo cathedral delay that detunes into microtonal dissonance when Watchers spot you.

---

## 🎭 Candid Post-Mortem & Open-World Roadmap

As documented in [`docs/PREPRINT_V1_0_HORROR_PLATFORMER.md`](docs/PREPRINT_V1_0_HORROR_PLATFORMER.md), `v1.0.0-alpha` replaces our earlier campy cosmic word-salad with a grounded ghost-story mystery while candidly noting current limitations:
* **Celestial Brush Friction:** Mobile touch noise still causes misclassifications in the raw `$P` point-cloud recognizer (`src/physics/dollar_p_q16.js`), making the **Tome Quick-Sigil Bar** the recommended casting method until upgraded to turning-angle histograms or a lightweight stroke-feature classifier.
* **Future Upgrades (`v1.1.0` → Open World):** Adding consequential `"Shattered Mind"` game-over screens, *LittleBigPlanet*-style pulley/clockwork contraption puzzles, **2D spatial hash grids**, **`A*` NavMeshes**, **2D raycast visibility shadow volumes**, and **compactly supported k-hop cellular sheaves** for open-world exploration.

---

## 🗂️ Repository Structure

```text
roivas-manor-horror/
├── README.md
├── package.json
├── index.html                                           # 480x272 2.5D horror platformer & Case Journal UI
├── docs/
│   ├── PREPRINT_V1_0_HORROR_PLATFORMER.md               # Self-aware preprint, post-mortem & open-world math
│   └── BILL_NYE_HORROR_PLATFORMER_TILE_EXPLAINER.md     # Accessible 6-tile visual science explainer
├── src/
│   ├── core/
│   │   └── q16.js                                       # Q16.16 fixed-point arithmetic, Bhaskara trig & LFSR
│   ├── physics/
│   │   └── dollar_p_q16.js                              # Experimental 32-point \$P multi-stroke rune recognizer
│   ├── world/
│   │   └── manor_sheaf_world.js                         # 4-room platforming physics, stealth, AI & story log
│   ├── render/
│   │   └── horror_renderer.js                           # 480x272 CLUT8 Bayer lantern cone, 3D crystal & sprites
│   └── audio/
│       └── horror_synth.js                              # 32-bar bowed cello & 4:1 FM bone-marimba WebAudio OST
└── tests/
    └── horror_suite_test.js                             # Automated verification of rune matching & room unsealing
```

---

## 🚀 Quick Start

```bash
# Run deterministic test suite (Node.js >= 20)
npm test

# Serve playable game locally
python3 -m http.server 8080 --bind 127.0.0.1
```

Open `http://127.0.0.1:8080`, tap **🎻 Cello + Marimba**, climb the Foyer ledges for the **Brass Key**, and cast **Ulyaoth + Bankorok + Redgormor** to unseal the Portrait Gallery.
