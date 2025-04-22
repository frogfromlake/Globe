import fs from "fs";
import path from "path";
import { createCanvas } from "canvas";
import { geoPath, geoEquirectangular } from "d3-geo";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import oceanData from "./oceanLabels.json" assert { type: "json" };
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Output path
const outputFile = path.resolve(
  __dirname,
  "../../public/textures/ocean_id_map_8k_rgb.png"
);

// Canvas setup
const width = 8192;
const height = 4096;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");

// Projection
const projection = geoEquirectangular()
  .scale(width / (2 * Math.PI))
  .translate([width / 2, height / 2]);

const pathGen = geoPath(projection, ctx);

// Clear background
ctx.clearRect(0, 0, width, height);

// Draw oceans with unique RGB using offset
(oceanData as FeatureCollection<Geometry>).features.forEach((feature, i) => {
  const id = i + 10000; // Large offset to prevent overlap with country IDs
  const r = (id >> 16) & 255;
  const g = (id >> 8) & 255;
  const b = id & 255;

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.beginPath();
  pathGen(feature);
  ctx.fill();
});

// Export PNG
const out = fs.createWriteStream(outputFile);
const stream = canvas.createPNGStream();
stream.pipe(out);
out.on("finish", () => {
  console.log(`✅ ocean_id_map_8k_rgb.png generated at ${outputFile}`);
});
