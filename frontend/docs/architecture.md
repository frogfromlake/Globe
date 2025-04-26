# OrbitalOne Boot Architecture Overview

This document outlines the structured multi-phase boot process that ensures fast, responsive startup while supporting high-resolution visuals and rich interactivity.

---

## Core Design Philosophy

- **Prioritize First Render** — Get the globe interactive as early as possible
- **Defer Heavy Visuals** — Load day/night/sky maps after the scene is visible
- **Modular Loading** — Separate concerns for clarity and maintainability
- **Staged Interactivity** — Only enable hover after ID maps and canvases are fully ready
- **User Feedback** — Communicate progress using loading subtitles with humor
- **Visual Polish** — Fade in final textures and background sky for a cinematic experience

---

### Boot Flow Breakdown

```mermaid
graph TD
  A[main.ts] --> B[startApp()]
  B --> C[Load Core ID Textures (country & ocean)]
  C --> D[Initialize Scene, Uniforms, Raycasting, UI]
  D --> E[Load Labels & Panels with loading messages]
  E --> F[Create Meshes: Globe, Atmosphere, Stars]
  F --> G[Return { animate, startHoverSystem }]
  G --> H[main.ts waits for loading screen fade]
  H --> I[startHoverSystem()]
  I --> J[Load canvas-based RGB ID maps]
  J --> K[Enable hover interaction (hoverReady = true)]
  K --> L[Call animate()]
  D --> M[loadVisualTextures() in parallel]
  M --> N[Assign day/night/sky to uniforms]
  N --> O[Begin day/night texture fade-in]
  N --> P[Begin delayed star background fade-in]
```

---

### Boot Phases

| Phase | Task | Details |
|-------|------|---------|
| **0** | `main.ts` entry | Begins boot process, sets up loading UI |
| **1** | `startApp()` | Sets up all base systems and returns `animate`, `startHoverSystem` |
| **2** | `loadCoreTextures()` | Loads low-weight ID textures (country + ocean) |
| **3** | `initializeUniforms()` | Initializes shaders with fallback textures and selection data |
| **4** | `runWithLoadingMessage()` steps | Labels → Atmosphere → NewsPanel |
| **5** | `setupSceneObjects()` | Adds globe, glow atmosphere, and background star sphere with shader |
| **6** | `loadVisualTextures()` (async) | Loads high-res day, night, and star textures in background |
| **7** | `assign uniforms + fadeInTextures()` | Day/night textures assigned and fade-in started |
| **8** | `delay star fade` | Star texture appears only after short delay and fades in via `uStarFade` |
| **9** | `main.ts` fade transition | Hides loader, makes app visible |
| **10** | `startHoverSystem()` | Loads offscreen canvas-based RGB ID maps |
| **11** | `hoverReady = true` | Activates interactivity |
| **12** | `animate()` begins | Starts render loop with stable state |

---

### Benefits of This Architecture

- **Fast First Paint** (fallback textures + deferred loading)
- **Cinematic Visual Entry** (stars fade in subtly, globe fades from black)
- **Stable Hover System** (ID map logic isolated and only activated when ready)
- **High Interactivity + Performance** (nothing blocks user feedback or responsiveness)
- **Highly Maintainable** (each phase is modular and independently testable)
- **Future-Proof** (easy to slot in overlays, space weather, network effects, etc.)

---
