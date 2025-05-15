import fs from "fs";
import path from "path";
import { createCanvas } from "canvas";
import { geoPath, geoEquirectangular } from "d3-geo";
import countriesData from '@/countries.json' assert { type: "json" };
import type { FeatureCollection, Feature, Geometry } from "geojson";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Recreate __dirname for ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Type the `countriesData` as a `FeatureCollection<Geometry>`
const countries = countriesData as FeatureCollection<Geometry>;

// Output path for the generated map
const outputFile = path.resolve(
  __dirname,
  "../../../public/textures/country_id_map_8k_rgb.png"
);

// Set canvas dimensions and create canvas
const width = 8192;
const height = 4096;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");

// Prepare the geographic projection
const projection = geoEquirectangular()
  .scale(width / (2 * Math.PI))
  .translate([width / 2, height / 2]);

const pathGen = geoPath(projection, ctx);

// Clear the canvas (transparent background)
ctx.clearRect(0, 0, width, height);

// Loop through each country and draw it with a unique RGB color
countries.features.forEach((feature: Feature<Geometry>, i: number) => {
  const id = i + 1; // Generate a unique ID for each country
  const r = (id >> 16) & 255; // Extract the red component from the ID
  const g = (id >> 8) & 255; // Extract the green component from the ID
  const b = id & 255; // Extract the blue component from the ID

  // Set the fill color using the generated RGB values
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.beginPath();
  pathGen(feature); // Generate the path for the current country
  ctx.fill(); // Fill the country path with the corresponding color
});

// Export the generated map as a PNG file
const out = fs.createWriteStream(outputFile);
const stream = canvas.createPNGStream();
stream.pipe(out);

// Log a success message after the file is written
out.on("finish", () => {
  console.log(`✅ country_id_map_8k_rgb.png generated at ${outputFile}`);
});
