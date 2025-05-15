// generateCountryIdMapGray.ts
import fs from "fs";
import path from "path";
import { createCanvas } from "canvas";
import { geoPath, geoEquirectangular } from "d3-geo";
import countriesData from '@/countries.json' assert { type: "json" };
import { fileURLToPath } from "url";
import { dirname } from "path";

// Recreate __dirname for ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const countries = countriesData as GeoJSON.FeatureCollection;

// Output path
const outputFile = path.resolve(
  __dirname,
  "../../../public/textures/country_id_map_8k_gray.png"
);

// Canvas setup
const width = 8192;
const height = 4096;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");

// Optional: improve drawing speed and sharpness
(ctx as any).patternQuality = "fast";
(ctx as any).antialias = "none";
(ctx as any).filter = "nearest";

// Background: fill with black (ID 0 = no country)
ctx.fillStyle = "rgb(0,0,0)";
ctx.fillRect(0, 0, width, height);

// Projection
const projection = geoEquirectangular()
  .scale(width / (2 * Math.PI))
  .translate([width / 2, height / 2]);
const pathGen = geoPath(projection, ctx);

// Draw countries
countries.features.forEach((feature, i) => {
  const id = i + 1; // Assign ID (1–255)

  if (id > 255) {
    throw new Error(`Too many countries for packed map (id=${id})`);
  }

  ctx.fillStyle = `rgb(${id},0,0)`; // ID stored in Red channel
  ctx.beginPath();
  pathGen(feature);
  ctx.fill();
});

// Export PNG
const out = fs.createWriteStream(outputFile);
const stream = canvas.createPNGStream();
stream.pipe(out);

out.on("finish", () => {
  console.log(`✅ country_id_map_8k_gray.png generated at ${outputFile}`);
});
