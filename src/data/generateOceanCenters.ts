// src/data/generateOceanCenters.ts
import fs from "fs";
import path from "path";
import { geoCentroid } from "d3-geo";
import type { FeatureCollection, Feature } from "geojson";
import oceanData from "./oceanLabels.json" assert { type: "json" };
import { fileURLToPath } from "url";
import { dirname } from "path";

// Recreate __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Output
const outputFile = path.resolve(__dirname, "oceanCenters.ts");

// Use only the largest polygon per ocean
function largestPolygon(feature: Feature): Feature {
  if (
    feature.geometry.type === "MultiPolygon" &&
    Array.isArray(feature.geometry.coordinates)
  ) {
    const sorted = feature.geometry.coordinates.sort(
      (a, b) => flatArea(b) - flatArea(a)
    );
    return {
      type: "Feature",
      properties: feature.properties,
      geometry: {
        type: "Polygon",
        coordinates: sorted[0],
      },
    };
  }
  return feature;
}

function flatArea(ring: number[][][]): number {
  return Math.abs(
    ring[0].reduce((acc, [x, y], i, arr) => {
      const [x1, y1] = arr[i === arr.length - 1 ? 0 : i + 1];
      return acc + x * y1 - x1 * y;
    }, 0) / 2
  );
}

const oceans = oceanData as FeatureCollection;
const lines: string[] = [];
lines.push(
  `export const oceanCenters: Record<number, { name: string; lat: number; lon: number }> = {`
);

oceans.features.forEach((feature, i) => {
  const id = i + 10000; // Offset to prevent overlap with countries
  const clean = largestPolygon(feature);
  const [lon, lat] = geoCentroid(clean as Feature);

  const name =
    (feature.properties as any).name ??
    (feature.properties as any).name_en ??
    "Unnamed Ocean";

  lines.push(
    `  ${id}: { name: ${JSON.stringify(name)}, lat: ${lat.toFixed(
      4
    )}, lon: ${lon.toFixed(4)} },`
  );
});

lines.push("};\n");

fs.writeFileSync(outputFile, lines.join("\n"));
console.log("✅ oceanCenters.ts generated with IDs.");
