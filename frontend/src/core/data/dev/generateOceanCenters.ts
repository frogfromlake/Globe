import fs from "fs";
import path from "path";
import { geoCentroid } from "d3-geo";
import type { FeatureCollection, Feature } from "geojson";
import oceanData from '@/oceans.json' assert { type: "json" };
import { fileURLToPath } from "url";
import { dirname } from "path";

// Recreate __dirname for ESM (ECMAScript Modules) compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Output file path where the generated TypeScript file will be saved
const outputFile = path.resolve(__dirname, "../oceanCenters.ts");

/**
 * Extracts the largest polygon from a MultiPolygon feature to ensure that
 * the ocean center is accurately calculated.
 *
 * @param feature - The GeoJSON feature representing an ocean (either a Polygon or MultiPolygon).
 * @returns The largest polygon feature extracted from the MultiPolygon.
 */
function largestPolygon(feature: Feature): Feature {
  if (
    feature.geometry.type === "MultiPolygon" &&
    Array.isArray(feature.geometry.coordinates)
  ) {
    // Sort the polygons by area (largest first)
    const sorted = feature.geometry.coordinates.sort(
      (a, b) => flatArea(b) - flatArea(a)
    );

    // Return the largest polygon
    return {
      type: "Feature",
      properties: feature.properties,
      geometry: {
        type: "Polygon",
        coordinates: sorted[0], // largest polygon
      },
    };
  }

  // Return the original feature if it is already a Polygon
  return feature;
}

/**
 * Calculates the area of a polygon using the Shoelace theorem (for 2D polygons).
 *
 * @param ring - The array of coordinates defining the polygon.
 * @returns The area of the polygon.
 */
function flatArea(ring: number[][][]): number {
  return Math.abs(
    ring[0].reduce((acc, [x, y], i, arr) => {
      const [x1, y1] = arr[i === arr.length - 1 ? 0 : i + 1];
      return acc + x * y1 - x1 * y;
    }, 0) / 2
  );
}

// Parse the ocean data from the JSON file.
const oceans = oceanData as FeatureCollection;

// Prepare an array to store the lines for the TypeScript output file.
const lines: string[] = [];
lines.push(
  `export const oceanCenters: Record<number, { name: string; lat: number; lon: number }> = {`
);

// Iterate through each ocean feature to calculate its centroid and prepare the data.
oceans.features.forEach((feature, i) => {
  const id = i + 10000; // Offset the ID to avoid conflict with country IDs

  // Clean the feature by extracting the largest polygon if needed
  const clean = largestPolygon(feature);

  // Calculate the centroid (latitude, longitude) of the feature
  const [lon, lat] = geoCentroid(clean as Feature);

  // Get the ocean's name, fallback to "Unnamed Ocean" if no name is provided
  const name =
    (feature.properties as any).name ??
    (feature.properties as any).name_en ??
    "Unnamed Ocean";

  // Add the ocean's data to the output lines
  lines.push(
    `  ${id}: { name: ${JSON.stringify(name)}, lat: ${lat.toFixed(
      4
    )}, lon: ${lon.toFixed(4)} },`
  );
});

// Close the TypeScript object and write the data to the output file.
lines.push("};\n");
fs.writeFileSync(outputFile, lines.join("\n"));

// Log a success message with the output file path.
console.log("✅ oceanCenters.ts generated with IDs.");
