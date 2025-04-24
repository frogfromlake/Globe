import fs from "fs";
import path from "path";
import { geoCentroid, geoArea } from "d3-geo";
import countries from "./countries.json" assert { type: "json" };
import type { FeatureCollection, Feature, Geometry } from "geojson";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Get the current file's directory path for file resolution.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse the countries data from the JSON file.
const countriesData = countries as FeatureCollection<Geometry>;

// Define the output file path for the generated country centers.
const outputFile = path.resolve(__dirname, "../data/countryCenters.ts");

// Initialize an array to store the lines of the TypeScript file.
const lines: string[] = [];
lines.push(
  `export const countryCenters: Record<number, { name: string; lat: number; lon: number }> = {`
);

/**
 * Get the centroid (geographical center) of a country's mainland.
 * Handles both simple polygons and multi-polygons (e.g., island countries).
 *
 * @param feature - The GeoJSON feature representing a country.
 * @returns A tuple of [longitude, latitude] representing the centroid.
 */
const getMainlandCentroid = (feature: Feature): [number, number] => {
  const geom = feature.geometry;

  // For simple polygon geometry, directly compute the centroid.
  if (geom.type === "Polygon") return geoCentroid(feature);

  // For multi-polygon geometries, find the largest polygon and calculate its centroid.
  if (geom.type === "MultiPolygon") {
    const polygons = geom.coordinates.map((coords) => ({
      type: "Polygon" as const,
      coordinates: coords,
    }));

    // Find the polygon with the largest area and compute its centroid.
    const largest = polygons.reduce((a, b) =>
      geoArea(a) > geoArea(b) ? a : b
    );
    return geoCentroid({
      type: "Feature",
      geometry: largest,
      properties: {},
    });
  }

  // Default case: Fallback to calculating the centroid for other geometry types.
  return geoCentroid(feature);
};

// Loop through all countries in the data and extract the name and centroid.
countriesData.features.forEach((feature: Feature<Geometry>, i) => {
  const id = i + 1; // ID is 1-based (starts from 1).

  // Extract the country name, falling back to `Unknown` if not found.
  const name =
    (feature.properties as any).ADMIN ||
    (feature.properties as any).name ||
    `Unknown ${id}`;

  // Get the latitude and longitude of the country's mainland centroid.
  const [lon, lat] = getMainlandCentroid(feature);

  // Push the country's data as a line of TypeScript code.
  lines.push(
    `  ${id}: { name: ${JSON.stringify(name)}, lat: ${lat.toFixed(
      4
    )}, lon: ${lon.toFixed(4)} },`
  );
});

// Close the TypeScript object and write the data to the output file.
lines.push(`};\n`);
fs.writeFileSync(outputFile, lines.join("\n"));

// Log a success message indicating where the file was saved.
console.log(`✅ countryCenters.ts generated at ${outputFile}`);
