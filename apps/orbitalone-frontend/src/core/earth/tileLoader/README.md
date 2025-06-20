# TileLoader Project State (June 2025)

## **Working (Stable or “Good Enough”)**

* [x] Loads tiles from Z3–Z13
* [x] Basic frustum culling works
* [x] Screen-priority spiral tile loading (center outwards)
* [x] Tile queue avoids overload at high Z
* [x] Basic tile cache/proxy backend (Rust) working, with disk+memory caching
* [x] Tile fade-in/fade-out between LODs (basic, not perfect)
* [x] Sticky tile logic (delays parent removal until all 4 children loaded, basic)
* [ ] TilePrewarmer exists, but not really tested
* [ ] Misc small features exist, not systematically tested

## **Usable Features**

* [x] App loads, camera orbits, zooming works across full Z3–Z13 range
* [x] Camera is mostly fluent, even at Z13 (impressive!)
* [x] Tile unload on zoom out (not sure if ideal, needs review)
* [x] Tile fade-in/fade-out between LODs
* [x] Sticky tiles (but see below for caveats)

## **Broken / Glitchy / UX Problems**

* [ ] **No morphing:** Only alpha fade; harsh visual transitions, no true geometry/texture blending
* [ ] **Sticky logic sometimes overcounts:** Parent tile may persist too long or disappear too soon if child tile logic fails at edge cases (e.g., culling, spiral bounds, dot-product border)
* [ ] **Edge tile artefacts:** Fade logic unreliable at spiral/dot product boundary—sometimes outer tiles "stick" visibly, especially over water/oceans
* [ ] **Tile count bloat:** Sticky logic can cause parent/child tiles to overlap for too long, sometimes ballooning total tile count (100–1000+ vs 100–600 before)
* [ ] **Camera stutter at high Z:** Large tile queues or overlapping parents/children can degrade performance
* [ ] **Math/logic “only visually tested”:** No unit tests; edge-case bugs (esp. around culling, sticky logic) are hard to find and fix
* [ ] **TilePrewarmer not tested/verified** (could help, but is a wild card)
* [ ] **Coastline/water artefacts:** Culling/filter math not robust; visible checkerboarding or blank areas especially over oceans
* [ ] **Features/configs interact badly:** Feature flags (fade, sticky, culling, spiral, prewarm, etc) stack up and can interfere in unpredictable ways, making fine-tuning impossible

---

## **Missing / Not Implemented**

* [ ] **True morphing between LODs:** Blend geometry/texture for smooth transitions (not just alpha)
* [ ] **Polished “visual pipeline”:** Ordered, engine-like stages with explicit, modular config and reliable state transitions
* [ ] **Unified config & per-stage control:** Right now, configs are fragmented per-feature; need one clear engine-level config with stage-based toggles/params
* [ ] **Intelligent prefetch/lookahead:** Load tiles in likely camera direction for smooth panning
* [ ] **GPU-side blending/shaders for morphing** (optional, for ultimate polish)
* [ ] **True async texture upload (avoid render stall)**
* [ ] **Debug/test harness for tile math, culling, visibility**
* [ ] **TilePrewarmer validation**
* [ ] **Unit tests/assertions on math/culling/spiral/sticky logic**

---

## **Current Visual Pipeline (as of June 2025)**

- Camera moves/zooms → recompute visible tiles
- **Tile candidate generation:** (spiral order, center outwards)
- **Visibility filtering:** (frustum, dot product, screen dist)
- **Tile queue/prioritization:** (concurrency limit, screen-priority)
- **Tile loading:** (async, with basic fade-in)
- **Sticky tile logic:** (parent stays until all 4 children loaded, then faded out)
- **Cleanup:** (old tile removal on zoom out/distance)
- **Debug UI:** (enables/disables features, but config is fragmented per-feature and not pipeline-based)
- **Problems:** Features often interact/interfere—edge cases (esp. at dot product/frustum bounds) lead to artefacts, sticky tiles not removed, tile bloat

---

## **Next Steps: A Pro Optimization Plan**

### **Step 1: Map the Real Visual Pipeline**

- List **all features** and their order in the update/render pipeline
- Identify what each stage *inputs* and *outputs*
- Design a **modular “pipeline”** (each stage is a class/function, all using a shared engine config/state)

### **Step 2: Quick Visual “Feature Matrix”**

| Feature                  | Status       | Priority   |
| ------------------------ | ------------ | ---------- |
| Z3–Z13 loading           | ✅ Stable     | ---        |
| Frustum culling          | ✅ OK (basic) | Medium     |
| Spiral loading           | ✅ Good       | ---        |
| Fade-in/out (LODs)       | ✅ OK (basic) | **HIGH**   |
| Sticky tiles             | ✅ OK (basic) | **HIGH**   |
| Async upload             | ❌ Partial    | Medium     |
| Prewarm/lookahead        | ❌ Untested   | Low/Medium |
| Artefact fix (coastline) | ❌ Buggy      | Medium     |
| Math correctness         | ❌ Untested   | Medium     |
| TilePrewarmer            | ⚠️ Untested   | Low        |

---

## **How Do We Fix This Without Google’s Budget?**

### **Order of Operations**

1. **Fix baseline bugs that prevent a “good” visual pipeline**
   - Confirm tile “removal” logic (make sure you don’t kill Z3 before Z4 is actually ready)
   - Patch any “black/empty” tile moments
   - On tile load, overlay new tile on old, crossfade alpha, then remove old

2. **Make tiles “sticky” until their replacement is loaded and faded in**
   - Never remove a tile until its child is ready to fully fade in

3. **Polish spiral loading to always do “center first” at every LOD**
   - Double-check spiral logic—if bug, patch

4. **Optional: Prewarm/lookahead** (only if visual pipeline is now *good*)

5. **Investigate/patch culling artefacts at coastline (could be a math fix)**

6. **(Later) Add unit tests for tile bounds/math**

---

## **How We’ll Work (Best Practice):**

* For each major feature, paste the key code chunk/file (not all at once!)
* Review, refactor/patch, and *test in isolation*
* Mark it “done” and go to the next item

---

## **THE PLAN: Move to a Real Modular Visual Pipeline**

- **Goal:** Build a true “pipeline” engine model (like Cesium/Google Earth)
- **How:**  
   - Explicit stages for candidate generation, filtering, prioritization, queueing, loading, visual transitions, cleanup  
   - Each stage has clear input/output, shared pipeline config/state
   - Debug UI reflects *pipeline stages*, not “random feature toggles”
   - Each feature can be tuned, tested, and swapped in/out without interference
- **Why:**  
   - Avoids feature/config “interference hell”
   - Easier to debug, test, and extend
   - Enables polished, reliable UX with no artefacts or black tiles

---

*Once pipeline stages are mapped and core pipeline structure is in place, this README will be updated with the new architecture overview and docs!*


## **How the Old Pipeline Works: Extraction and Flow**

### **Core Data Flow and Responsibilities**

1. **Tile Candidate Generation & Filtering**

   * **Spiral candidate generation** centered on camera (in `TileLayer`).
   * For each tile:

     * **Already visible?** (skip)
     * **Longitude test**: skip tiles more than 100° from camera
     * **Dot-product FOV test** (angle from camera, minDot threshold per zoom/FOV)
     * **Frustum intersection** (uses a *widened* frustum by default)
     * **Screen distance check** (for overload control)
   * Output: a list of candidate tiles with screen distance

2. **Tile Prioritization**

   * Candidates are **sorted by screenDist** (distance from screen center)
   * Load cap per frame/zoom is enforced
   * **Extra prewarm candidates** (lookahead, speculative, not rendered yet)

3. **Tile Loading and Insertion**

   * Uses a **queue processor** (`TileQueueProcessor`) for concurrency & frame budgeting
   * Each queued tile triggers:

     * **Async mesh creation** (KTX2/raster)
     * Fade-in (if enabled)
     * Add mesh to group, cache, and visible set

4. **Sticky/Parent-Fade Logic**

   * When a tile is loaded, its parent is determined.
   * If sticky mode is enabled:

     * **Fade out parent only when all 4 children loaded**
   * If not sticky, fade/remove parent immediately on child load

5. **Prewarming/Prefetching**

   * Extra “nearby” tiles are prewarmed (download & cache, not rendered)
   * Managed via a dedicated helper

6. **Cache Management**

   * **LRU tile mesh cache** per layer, eviction on overflow
   * On eviction, mesh is removed from scene

7. **Cleanup/Tile Eviction**

   * High-Z tiles are aggressively cleaned if far from screen center
   * Old meshes are removed if too far off-screen

8. **Debug and Control**

   * Frustum, dot, and screen-space prioritization can be enabled/disabled at runtime
   * Debug overlays (bounding spheres, wireframes) possible
   * Window-accessible tile managers for inspection

9. **Event Flow**

   * **On camera movement:** triggers tile candidate recalculation and loading
   * **On animation loop:** controls rendering and control speeds

---

## **Key Interactions / Sequence (Old Approach)**

* **On scene init**: Fallback Z3 loads, then dynamic engine for Z4–Z13 attaches.
* **On controls/camera move**:

  1. Candidates generated (culling, dot, frustum, etc)
  2. Sorted and capped, prioritized by screenDist
  3. Tiles queued for load (mesh built, fade-in, etc)
  4. Parent/child “sticky” logic managed
  5. Cache and visible sets updated
  6. Debug info/logging overlays as needed

---

## **Feature List for Parity/Testing**

1. **Candidate selection (spiral, screen-centered, LOD-aware)**
2. **Dot product filtering (angle-to-camera)**
3. **Frustum culling (bounding sphere intersection, with FOV inflation)**
4. **Screen distance prioritization/cap (to prevent overload)**
5. **Prewarming/lookahead tiles**
6. **Tile queueing and frame-time budgeting**
7. **Fade-in/fade-out transitions**
8. **Sticky parent/child tile removal**
9. **LRU mesh caching and eviction (with scene cleanup)**
10. **High-Z aggressive cleanup based on screen dist**
11. **Debug toggles and overlays**
12. **Runtime feature enable/disable (via window vars/UI)**
13. **API for full Z3 fallback and dynamic Z4+**
14. **Async safety for zoom/revision changes**
15. **Parent removal logic (immediate vs sticky)**
16. **Scene graph and mesh group management**
17. **Camera-based update triggering and debounce**
18. **Window debug access to tile state/manager**
19. **Error handling/logging on tile load failures**
20. **Prefill all-tiles for fallback layers**

---

## **How Everything Fits Together**

* All helpers (`TileCulling`, `TileFading`, `TileLoader`, `TileMeshCache`, `TilePrewarmer`, `TileQueueProcessor`, `TileStickyManager`) are **orchestrated by each `TileLayer` instance** (one per zoom).
* The **`GlobeTileEngine`** sits above, managing all zoom-level layers and the fallback base layer, coordinating updates and attach/detach to the scene.

---
