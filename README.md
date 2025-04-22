# 🌍 Orbitalone

<p align="center">
  <img src="./frontend/assets/preview1.png" alt="Preview 1" width="49%"/>
  <img src="./frontend/assets/preview2.png" alt="Preview 2" width="49%"/>
</p>

>
> 🛰️ **Orbit Alone**  
> *A quiet truth — this tiny blue marble is all we have. There is no backup.  
> We are fragile, yet alive, against the infinite black.*
>
> 🌍 **Orbital One**  
> *A bold vision — to see ourselves as one humanity, one biosphere,  
> moving together, learning together, evolving together.*
>

**Orbitalone** is a real-time 3D Earth visualization app powered by **TypeScript**, **Three.js**, and custom **GLSL shaders**. It blends beauty and function to deliver intuitive, extensible Earth-based data visualizations — including country borders, ocean overlays, news integration, and more.

🚀 Live at: [https://orbitalone.space](https://orbitalone.space)

---

## ✨ Features

- 🧭 Interactive 3D globe with clickable country and ocean regions  
- 🌞 Real-time Earth rotation, lighting, and day/night cycle via custom shaders  
- 🌐 Country + ocean search bar (instantly zoom to any place on Earth)  
- 📰 Daily news articles shown when selecting a country  
- 📍 Geolocation marker using the browser’s location API  
- 🎨 Smooth hover and selection transitions with animated 3D labels  
- ⚙️ Modular TypeScript architecture, shader-driven materials, and centralized config

---

## 🛠 Installation

```bash
git clone https://github.com/frogfromlake/Orbitalone.git
cd Orbitalone/frontend
pnpm install      # or npm install
pnpm dev          # start dev server (http://localhost:5173/)
```

Backend news service lives in `/backend` and runs separately. Setup instructions coming soon.

---

## 🧩 Project Structure

```
frontend/
├── configs/        # Central app configuration
├── core/           # App bootstrap logic
├── data/           # Centroids, borders, ID maps
├── features/       # Feature modules like news panel
├── init/           # Scene, camera, textures, uniforms
├── interactions/   # User input, search, interactivity
├── materials/      # Shader materials
├── shaders/        # GLSL files
├── state/          # Interaction state store
├── systems/        # Hover, selection, label systems
├── types/          # Custom TS types and extensions
└── utils/          # Geo helpers, math, conversions
```

---

## 🧪 Config-Driven Design

All app behavior is configurable via `src/configs/config.ts`.

```ts
export const CONFIG = {
  globe: { radius: 1, widthSegments: 128, heightSegments: 64 },
  camera: { initialPosition: { z: 3 }, ... },
  fade: { highlight: 3.5, selection: 2.5 },
  textures: {
    day: "/textures/earth_day_8k.jpg",
    night: "/textures/earth_night_8k.jpg",
    idMap: "/textures/country_id_map_8k_rgb.png"
  },
  ...
};
```

---

## 🛰️ Under the Hood

- Uses **NASA Blue Marble** (day) and **Black Marble** (night) textures (8K)
- Pixel-perfect hover detection using **RGB-encoded country ID maps**
- Accurate floating labels via **geographic centroids**
- Custom shaders control **lighting**, **glow**, **night lights**, and **interactive outlines**

---

## 🌍 News Backend

The backend is written in **Go** and serves country-specific news via RSS.  
It's a separate service in `/backend`, deployable via Fly.io or locally:

> `GET /api/news?country=DE` → returns JSON articles for Germany

Check out the backend readme for deployment & dev setup.

---

## 📦 Build & Deploy

```bash
pnpm build      # builds production-ready app into /dist
```

Assets and textures live in `/public/textures`.

Deploy via [Vercel](https://vercel.com) or your own static host.  
See: [https://orbitalone.space](https://orbitalone.space)

---

## 👨‍🚀 Author

Created with passion by [@frogfromlake](https://github.com/frogfromlake)  
Made for explorers, thinkers, dreamers — and for Earth.

---

## 🪐 License

**MIT** — Free to use, extend, remix, and share.
