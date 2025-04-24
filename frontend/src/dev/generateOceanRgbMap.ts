import fs from "fs";
import path from "path";
import { createCanvas } from "canvas";
import { geoPath, geoEquirectangular } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import oceanData from "./oceans.json" assert { type: "json" };
import { fileURLToPath } from "url";
import { dirname } from "path";

// Recreate __dirname for ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Output path for the generated ocean ID map
const outputFile = path.resolve(
  __dirname,
  "../../public/textures/ocean_id_map_8k_rgb.png"
);

// Canvas setup for drawing the ocean map
const width = 8192; // Width of the output image
const height = 4096; // Height of the output image
const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");

// Projection setup for equirectangular projection
const projection = geoEquirectangular()
  .scale(width / (2 * Math.PI)) // Scale based on canvas width
  .translate([width / 2, height / 2]); // Translate to center of canvas

const pathGen = geoPath(projection, ctx); // Path generator for drawing the polygons

// Clear the canvas (transparent background)
ctx.clearRect(0, 0, width, height);

// Iterate over ocean features and draw each with a unique RGB value
(oceanData as FeatureCollection<Geometry>).features.forEach((feature, i) => {
  const id = i + 10000; // Add an offset to avoid ID overlap with countries
  const r = (id >> 16) & 255; // Extract the red component from the ID
  const g = (id >> 8) & 255; // Extract the green component from the ID
  const b = id & 255; // Extract the blue component from the ID

  // Set the fill color using the generated RGB values
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.beginPath();
  pathGen(feature); // Generate the path for the current ocean
  ctx.fill(); // Fill the ocean path with the corresponding color
});

// Export the generated ocean map as a PNG file
const out = fs.createWriteStream(outputFile);
const stream = canvas.createPNGStream();
stream.pipe(out);

// Log a success message when the file is saved
out.on("finish", () => {
  console.log(`✅ ocean_id_map_8k_rgb.png generated at ${outputFile}`);
});
