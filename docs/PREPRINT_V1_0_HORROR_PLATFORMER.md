# Preprint: From Campy Cosmic Word-Salad to a Playable `Q16.16` 2.5D Horror Platformer — Sub-Pixel Kinematics, Stealth Sheaves, and Open-World Spatial Scaling in *Roivas Manor: 2026* (`v1.0.0-alpha`)

**Author:** Borealis Serenity Hedling 
**Date:** November 23, 2026  
**Repository:** `://github.com`  
**Status:** Exploratory Proof-of-Concept Preprint (`v1.0.0-alpha`)

---

## Abstract

***Roivas Manor: 2026* (`v1.0.0-alpha`)** documents our transition from abstract fixed-point cosmology sandboxes (*Tome of Eternal Holonomy*) to an actual playable 2.5D psychological horror platformer inspired by *Little Nightmares* (Tarsier Studios, 2017), *LittleBigPlanet* (Media Molecule, 2008), and *Eternal Darkness: Sanity's Requiem* (Silicon Knights, 2002). Built on a deterministic `Q16.16` fixed-point simulation core paired with a `480×272` `CLUT8` Bayer-dithered framebuffer and a 32-bar WebAudio bowed-cello and FM bone-marimba soundtrack, the prototype successfully unifies sub-pixel platforming, pushable crate physics, shadow-alcove stealth, Watcher searchlight AI, Sanity-coupled visual/audio distortion, and coherent ghost-story narration. Candidly, we also record what broke—most notably our multi-stroke `$P` Celestial Brush recognizer, which remains unreliable under noisy mobile touch input—and joke about scrubbing our earlier *"phenomenologically incoherent yet campy"* prose (*"a topological cyst digesting scar tissue in a yawning cavern"*) to establish a legible narrative mystery. Finally, we outline concrete mechanical and mathematical upgrades—ranging from fail-state "Shattered Mind" game-over loops and contraption puzzles to **chunked spatial hashing, A\* navigation meshes, and localized sheaf cohomology** required to scale from contained 4-room mysteries to seamless open-world exploration.

---

## 1. De-Campifying the Narrative: Scrubbing Phenomenological Word-Salad

In earlier iterations of *Roivas Manor: 2026*, our attempt to evoke Lovecraftian cosmic dread inadvertently generated peak unintentional comedy—producing lines such as *"sentience is a brief fever dream in a yawning cavern of bone"* and *"a topological cyst growing around a sunken crystal."* While memorable as high-grade camp, pseudo-academic word-salad actively sabotaged player comprehension: players could not tell whether a passage was a puzzle clue or a hallucination.

In `v1.0.0-alpha`, we purged the incoherent prose in favor of **grounded gothic mystery mechanics** modeled on *The Haunting of Hill House* (Jackson, 1959) and *Eternal Darkness*:
* **Legible Investigation Logs:** Evelyn Roivas's 8-entry Case Journal ties each room's physical artifacts (*Alexandra's Notebook*, *Tarnished Brass Key*, *Maximilian's 1760 Portrait*, *Edward's 1952 Letter*, and the *Bronze Gladius*) directly to actionable threshold rules.
* **The Three-Way Dominance Cycle:** Red (**Chattur'gha**) counters Green (**Xel'lotath**); Green counters Blue (**Ulyaoth**); Blue counters Red; and Purple (**Mantorok**) binds the vault crystal.

---

## 2. Mathematical & Computational Architecture (`v1.0.0-alpha`)

### 2.1 Sub-Pixel `Q16.16` Platforming & Tactile Crate Kinematics
Early prototypes updated player position in raw integer screen pixels ($y_{t+1} = y_t + v_y$, $v_{y,t+1} = v_{y,t} + 1$), producing harsh vertical snapping and unreachable ledges. `v1.0.0-alpha` promotes all horizontal and vertical kinematics into signed 32-bit fixed-point space (`Q16.16`, where $1.0 \equiv 2^{16} = 65,536$):

$$v_{x,t+1} = v_{x,t} + \left\lfloor \frac{v_{\text{target}} - v_{x,t}}{4} \right\rfloor, \quad v_{\text{target}} = d \cdot 175000 \;\;(\approx \pm 2.67\text{ px/frame})$$

$$y_{t+1} = y_t + v_{y,t}, \quad v_{y,t+1} = \min\!\left(480000,\; v_{y,t} + 13400\right), \quad v_{y,\text{jump}} = -272000 \;\;(\approx -4.15\text{ px/frame})$$

Combined with a 6-frame **coyote-time grace window** after stepping off a ledge and AABB top-surface landing checks against pushable wooden crates, Evelyn achieves smooth parabolic jump arcs capable of clearing multi-tier clockwork shelves.

### 2.2 Volumetric Lantern Falloff & `CLUT8` Bayer Dithering
The `480×272` framebuffer computes per-pixel squared Euclidean distance $d^2 = (x - x_L)^2 + (y - y_L)^2$ from Evelyn's swinging oil lantern, modulating illumination radius $R_L(\text{Sanity})$ dynamically as Sanity drops:

$$R_L = R_{\text{base}} + \left\lfloor \frac{85 \cdot \text{Sanity}_{Q16}}{65536} \right\rfloor, \quad R_{\text{base}} = \begin{cases} 42\text{ px} & \text{if hidden in shadow alcove} \\ 95\text{ px} & \text{if exposed} \end{cases}$$

Lighting intensity is quantized into four 64-shade alignment banks (`CLUT8`) and smoothed across $4 \times 4$ blocks via Bayer ordered dithering (Bayer, 1973), while low Sanity (`sanityQ16 < 38000`) injects downward crimson wall-bleed streaks and viewport tilt in `Ledger 2`.

### 2.3 Watcher Searchlight Ray-Gaze & Cellular Sheaf Tension
Each patrolling Watcher projects a forward gaze frustum of length $115\text{ px}$. When Evelyn enters the frustum outside a dark curtain alcove (`p.hidden == false`), Sanity drains at $120\text{ LSBs/frame}$ ($\approx 11\%/\text{sec}$ at 60 FPS) while coboundary Dirichlet tension $\mathcal{E}$ rises—driving the 3D rotating octahedron crystal's angular velocity $\omega_Y = 1400 + (\mathcal{E} \gg 7)$ and detuning the WebAudio bowed cello's second oscillator toward a microtonal tritone.

### 2.4 32-Bar Bowed Cello & 4:1 FM Bone-Marimba Synthesis
Replacing harsh LFSR white-noise static, the audio engine synthesizes a continuous D-minor / Phrygian score via a lowpass-filtered (`360–600 Hz`) dual-oscillator bowed cello (`sawtooth` + fifth-detuned `triangle`) paired with syncopated wooden **FM bone-marimba** strikes ($f_{\text{mod}} = 3.98 f_c$, modulation index $I(t) = 2.4 f_c e^{-t/0.045}$) fed into a `420 ms` stereo cathedral delay line.

---

## 3. Candid Post-Mortem: What Works vs. What Remains Broken

* **What Works Well:** Sub-pixel platforming and crate pushing feel responsive; stealth shadow alcoves and Watcher searchlights create genuine tension; the 3D rotating crystal and custom gothic artifact silhouettes (*Brass Key*, *Open Ledger*, *Gladius*) read clearly; `en-GB` TTS narration and the 32-bar cello + bone-marimba OST establish strong atmosphere.
* **What Is Still Broken (`$P` Celestial Brush):** Our freehand multi-stroke `$P` point-cloud recognizer (Vatavu et al., 2012) remains frustratingly inaccurate on mobile touchscreens. Because greedy bidirectional point-cloud matching ignores stroke direction and aspect-ratio invariants, curved or multi-line finger sketches frequently misclassify—making the **Tome Quick-Sigil Bar** mandatory for reliable progression. Fixing freehand spellcasting requires replacing raw point clouds with **stroke-order-invariant angular/turning-function histograms** or a lightweight **2D convolutional / stroke-feature classifier** trained on noisy touch samples (Rubine, 1991).

---

## 4. Roadmap for Richer Gameplay & Scaling to Open-World Horror

### 4.1 Better Puzzles & Fail-State Loops (Contained Mysteries)
1. **Consequential Game-Over & Sanity-Break States:** Currently, reaching `0%` Sanity only triggers a warning banner. True survival horror requires irreversible stakes: hitting `0%` Sanity should trigger a diegetic **"Mind Shattered / Consumed by the Manor"** fail screen (with checkpoint reload from the last journal entry), while mid-Sanity thresholds (`< 50%`) spawn *Eternal Darkness*–style false-death hallucinations before snapping back to reality.
2. **Multi-Step Environmental Contraptions (*LittleBigPlanet* / *Resident Evil*):** Expand beyond single-crate jumps to **counterweight pulley elevators**, **pendulum clockwork gear puzzles** (requiring players to set the Foyer clock hands to `1:00 AM` to open secret passages), and **mirror-reflection light puzzles** where Evelyn's lantern beam must be angled across tarnished mirrors to burn away shadow barriers.
3. **Tactile Combat & Dodging:** Give the *Bronze Gladius* an active melee parry/slash action so players aren't solely reliant on menu-selected runes when cornered by a Watcher.

### 4.2 Mathematical Requirements: Contained Mysteries vs. Open-World Exploration
Scaling *Roivas Manor* from a 4-room linear mystery to a sprawling, interconnected open-world estate (or haunted New England town) requires fundamentally upgrading our underlying mathematics:

| Architectural Layer | Contained Mystery (`v1.0.0-alpha`) | Open-World Horror Scaling |
| :--- | :--- | :--- |
| **Spatial Partitioning** | Fixed `480×272` single-room arrays ($O(N)$ prop/platform checks). | **2D Spatial Hash Grids / Quadtrees** in `Q16.16` ($O(1)$ broadphase queries) with seamless chunk streaming so distant wings sleep without CPU cost (Ericson, 2004). |
| **Enemy Pathfinding** | 1D horizontal patrol bounds (`minX` to `maxX`). | **Hierarchical Navigation Meshes (NavMesh) + `A*` / Dijkstra Graph Search** with vertical jump-link edges and sound-propagation heatmaps (LaValle, 2006). |
| **Sheaf Topology** | Global 4-room state (`ManorWorld`) updated every frame. | **Compactly Supported Local Sheaves:** Restrict coboundary energy $\mathcal{E}$ to an active $k$-hop neighborhood ($k \le 2$ rooms) around the player so global cohomology remains $O(1)$ per frame (Hansen & Ghrist, 2019). |
| **Lighting & Occlusion** | Single radial distance check ($d^2 < R_L^2$) ignoring walls. | **2D Raycast Visibility Polygons / Shadow-Casting Volumes** (Asano, 1985) so stone walls, closed doors, and crates cast true pitch-black shadows that block Watcher sightlines dynamically. |
| **Deterministic Save State** | Ephemeral in-memory `Set()` flags. | **Merkle-Hashed Delta State Ledgers** serializing room diffs, inventory bitmasks, and RNG seeds into `< 8 KB` verifiable save receipts. |

---

## References (APA 7th Edition)


* Asano, T. (1985). An efficient algorithm for finding the visibility polygon for a polygonal region with holes. Transactions of the Institute of Electronics and Communication Engineers of Japan, E68(9), 557–559.
* Bayer, B. E. (1973). An optimum method for two-level rendition of continuous-tone pictures. IEEE International Conference on Communications, 1, 26-11–26-15.
* Ericson, C. (2004). Real-time collision detection. Morgan Kaufmann.
* Hansen, J., & Ghrist, R. (2019). Toward a spectral theory of cellular sheaves. Journal of Applied and Computational Topology, 3(4), 315–358. doi.org
* Jackson, S. (1959). The haunting of Hill House. Viking Press.
* LaValle, S. M. (2006). Planning algorithms. Cambridge University Press. doi.org
* Media Molecule. (2008). LittleBigPlanet [Video game]. Sony Computer Entertainment.
* Rubine, D. (1991). Specifying gestures by example. ACM SIGGRAPH Computer Graphics, 25(4), 329–337. doi.org
* Silicon Knights. (2002). Eternal Darkness: Sanity's Requiem [Video game]. Nintendo.
* Tarsier Studios. (2017). Little Nightmares [Video game]. Bandai Namco Entertainment.
* Vatavu, R.-D., Anthony, L., & Wobbrock, J. O. (2012). Gestures as point clouds: A $P recognizer for user interface prototypes. Proceedings of the 14th ACM International Conference on Multimodal Interaction (ICMI '12), 273–280. doi.org

