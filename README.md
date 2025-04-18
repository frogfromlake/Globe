# 🌍 Globe

**Globe** is a real-time 3D Earth visualization app built with **TypeScript** and **Three.js**, featuring dynamic country highlighting, smooth interactions, real-world lighting, and modular, configurable architecture. Custom **GLSL shaders** drive realistic visuals like day/night cycles and glowing effects.
Designed for clarity and extensibility—ideal as a foundation for educational, geopolitical, or scientific visualizations.

## Features

- Interactive 3D globe with real country borders
- Dynamic lighting and real-time Earth rotation using custom shaders
- Country hover + multi-select with smooth fade transitions
- Geolocation marker support using the browser's location API
- Clean architecture with centralized configuration (`config.ts`)
- Fully modular TypeScript codebase


## Installation

```bash
git clone https://github.com/frogfromlake/Globe.git
cd Globe
pnpm install    # or npm install
pnpm dev        # or npm run dev
```

Runs a local development server (typically on `http://localhost:5173/` if using Vite).

## Configuration

All application behavior is defined in one central file: **src/configs/config.ts**

There you'll find:

- `globe`: Geometry resolution and radius
- `camera`: FOV, clipping planes, and initial position
- `interaction`: Speed clamps for rotation/zoom
- `fade`: Hover/selection transition speeds
- `userLocation`: Geolocation marker appearance
- `materials`: Shader material settings and appearance
- `geo`: Astronomy and geographic constants (e.g. J2000, obliquity)
- `textures`: Paths and filtering for globe maps and ID maps

Everything is documented inline for clarity and maintainability.

## Project Structure

```
src/
├── configs/          # Central configuration
├── data/             # Country centroids & ID maps
├── init/             # Scene/camera/renderer setup
├── interactions/     # User input and geolocation
├── shaders/          # GLSL shader files (vertex & fragment)
├── systems/          # Country hover, labels, selection logic
├── types/            # TypeScript types/interfaces
└── utils/            # Geospatial math and helpers
```

## Development Notes

- Uses NASA maps (Blue marbel next generation and black marble) as texture overlay in 8k.
- Utilizes **RGB-encoded country ID maps** generated from a geojson *countries.json* containing the worlds countries for precise pixel-based selection.
- Uses a country ID map and coordinates for every country on the planet as a lookup table which is also generated from the countries.json
- Provides generators in src/data to regenerate those maps from countries.json (theoretically it is possible to use your own maps as overlays with a couple of tweaks depending on the used map).
- Built using **Three.js v0.175+** with **TypeScript**, **GLSL**, and **pnpm**.

---

## Author

Created by [@frogfromlake](https://github.com/frogfromlake)  

---

## 📄 License

MIT — free to use, modify, and share.
```
