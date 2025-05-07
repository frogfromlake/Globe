# OrbitalOne Boot Architecture Overview

This document outlines the structured multi-phase boot process that prioritizes perceptual performance, ensuring users see and feel progress early — from initial render to full interactivity and high-resolution visuals.

---

## Core Design Philosophy

* **First Paint First** — Render something meaningful (even low-res) as fast as possible
* **Progressive Enhancement** — Refine visuals and features step by step
* **Chunked Execution** — Break up long tasks to reduce main-thread blocking
* **Modular Loading** — Each phase handles a distinct task to aid maintainability
* **Deferred Interactivity** — Activate hover/click only after ID maps and canvases are ready
* **Lazy Visual Load** — Defer high-res visuals and atmospheric effects to idle time
* **Cinematic Transition** — Visual textures and backgrounds fade in smoothly
* **Clear User Feedback** — Communicate loading stages via subtitle messages

---

## Boot Flow Breakdown

```mermaid
graph TD
  A[main.ts] --> B[startApp()]
  B --> C[Initialize Camera, Renderer, Fallback Globe]
  C --> D[setupSceneObjects()]
  D --> E[Render Once for First Paint]
  E --> F[loadCoreTextures() (ID Maps)]
  F --> G[initializeUniforms()]
  G --> H[runWithLoadingMessage() → Labels, Panels]
  H --> I[idleCallback: loadAtmosphere + News Panel]
  I --> J[idleCallback: loadVisualTextures() (day/night/cloud/sky)]
  J --> K[idleCallback: assign uniforms + fadeInTextures()]
  K --> L[idleCallback: fade in star background]
  L --> M[idleCallback: startHoverSystem()]
  M --> N[idleCallback: Load RGB ID canvas maps]
  N --> O[Enable hover (hoverReady = true)]
  O --> P[Call animate()]
```

---

## Boot Phases

| Phase  | Task                              | Purpose                                                              |
| ------ | --------------------------------- | -------------------------------------------------------------------- |
| **0**  | `main.ts` entry                   | Mount canvas, show minimal loading screen                            |
| **1**  | `startApp()`                      | Setup renderer, camera, fallback globe                               |
| **2**  | `setupSceneObjects()`             | Add globe mesh, atmosphere shell (deferred), star sphere             |
| **3**  | `renderOnce()`                    | Immediate first paint — fallback globe (gray/black)                  |
| **4**  | `loadCoreTextures()`              | Load lightweight country & ocean ID maps                             |
| **5**  | `initializeUniforms()`            | Setup selection shaders and buffers (non-blocking)                   |
| **6**  | `runWithLoadingMessage()`         | Load essential UI: 3D label scaffolds, base panels                   |
| **7**  | *(idle)* `loadAtmosphere()`       | Load and apply atmosphere shader only when thread is idle            |
| **8**  | *(idle)* `loadVisualTextures()`   | Fetch high-res textures (day/night/cloud/sky) without blocking paint |
| **9**  | *(idle)* `fadeInTextures()`       | Gradual visual blend-in, async assignments                           |
| **10** | *(idle)* `fadeInStarBackground()` | Soft star sphere fade after globe is stable                          |
| **11** | *(idle)* `startHoverSystem()`     | Load raycasting logic and large RGB ID canvas maps                   |
| **12** | *(idle)* `hoverReady = true`      | Enable user interactivity (hover/select)                             |
| **13** | `animate()`                       | Begin render loop once all systems are ready                         |

---

## Benefits of This Architecture

* **Ultra-Fast First Paint** — Minimal blocking until fallback globe is visible
* **Decreased Blocking Time** — Core features are split and deferred using `requestIdleCallback`
* **Smooth Visual Progression** — Visual and interactive elements fade in organically
* **Deferred Interactivity** — Complex systems load only after perceptual readiness
* **Chunked Logic** — Long main-thread tasks are broken across idle frames
* **Tiny Initial Footprint** — No high-res visuals or shaders before first paint
* **Scalable** — Ready for future overlays (e.g. data maps, real-time telemetry)
