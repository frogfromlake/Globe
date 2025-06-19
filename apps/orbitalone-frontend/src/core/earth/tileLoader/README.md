## **TileLoader Project State (June 2025)**

### **Working (Stable or “Good Enough”)**

* [x] Loads tiles from Z3–Z13
* [x] Basic frustum culling works
* [x] Screen-priority spiral tile loading (center outwards)
* [x] Tile queue avoids overload at high Z
* [x] Basic tile cache/proxy backend (Rust) working, with disk+memory caching
* [x] Tile fade-in/fade-out between LODs
* [ ] TilePrewarmer exists, but not really tested
* [ ] Misc small features exist, not systematically tested

### **Usable Features**

* [x] App loads, camera orbits, zooming works across full Z3–Z13 range
* [x] Camera is mostly fluent, even at Z13 (impressive!)
* [x] Tile unload on zoom out (not sure if ideal, needs review)
* [x] Tile fade-in/fade-out between LODs

### **Broken / Glitchy / UX Problems**

* [ ] **No fade/morphing:** No smooth transition between LODs, just harsh pops
* [ ] **No “sticky”/delayed tile removal:** Lower-res tiles disappear instantly, before high-res is ready
* [ ] **Camera stutter under load:** Especially at high Z when many tiles queue up
* [ ] **Tile artefacts/ugly patterns:** Around uncullable areas (water/coastlines look bad)
* [ ] **Math/logic “only visually tested”**: No unit tests, hard to guarantee math correctness
* [ ] **TilePrewarmer not tested/verified** (could help, or not)

---

## **Missing / Not Implemented**

* [ ] **Tile “stickiness”:** Lower Z tile stays until higher Z is fully loaded/faded in
* [ ] **Intelligent prefetch/lookahead:** Preloading tiles in likely camera direction
* [ ] **GPU-side blending/shaders for morphing** (optional, but ultimate polish)
* [ ] **True async texture upload (no render stall on image arrival)**
* [ ] **Debug/test harness for tile math, culling, visibility (unit tests or at least assert-based)**
* [ ] **Polished “visual pipeline”:** Reliable transitions, no artefacts, always a “good-enough” preview

---

## **Current Visual Pipeline**

* Loads tiles in a spiral
* Pops them in as they arrive (bad for UX)
* Removes old tiles *before* new ones ready (causes visible checkerboard/black/pixelation)
* Sometimes over-queues and stutters
* Math is “eyeballed,” not verified

---

## **Next Steps: A Pro Optimization Plan**

### **Step 1: Quick Visual “Feature Matrix”**

| Feature                  | Status       | Priority   |
| ------------------------ | ------------ | ---------- |
| Z3–Z13 loading           | ✅ Stable     | ---        |
| Frustum culling          | ✅ OK (basic) | Medium     |
| Spiral loading           | ✅ Good       | ---        |
| Fade-in/out (LODs)       | ✅ OK (basic) | **HIGH**   |
| Sticky tiles             | ❌ Missing    | **HIGH**   |
| Async upload             | ❌ Partial    | Medium     |
| Prewarm/lookahead        | ❌ Untested   | Low/Medium |
| Artefact fix (coastline) | ❌ Buggy      | Medium     |
| Math correctness         | ❌ Untested   | Medium     |
| TilePrewarmer            | ⚠️ Untested   | Low        |

---

## **How Do We Fix This Without Google’s Budget?**

### **Order of Operations**

1. **Fix baseline bugs that prevent a “good” visual pipeline**

   * Confirm tile “removal” logic (make sure you don’t kill Z3 before Z4 is actually ready)
   * Patch any “black/empty” tile moments
   * On tile load, overlay new tile on old, crossfade alpha, then remove old
2. **Make tiles “sticky” until their replacement is loaded and faded in**
   * Never remove a tile until its child is ready to fully fade in
3. **Polish spiral loading to always do “center first” at every LOD**
   * Double-check spiral logic—if bug, patch
6. **Optional: Prewarm/lookahead** (only if visual pipeline is now *good*)
7. **Investigate/patch culling artefacts at coastline (could be a math fix)**
8. **(Later) Add unit tests for tile bounds/math**

---

## **How We’ll Work (Best Practice):**

* For each major feature, you’ll paste the key code chunk/file (not all at once!)
* We’ll review, refactor/patch, and *test in isolation*
* We mark it “done” and go to the next item
