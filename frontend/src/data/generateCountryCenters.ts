import fs from "fs";
import path from "path";
import { geoCentroid, geoArea } from "d3-geo";
import countries from "./countries.json" assert { type: "json" };
import type { FeatureCollection, Feature, Geometry } from "geojson";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const countriesData = countries as FeatureCollection<Geometry>;
const outputFile = path.resolve(__dirname, "countryCenters.ts");

const lines: string[] = [];
lines.push(
  `export const countryCenters: Record<number, { name: string; lat: number; lon: number }> = {`
);

const getMainlandCentroid = (feature: Feature): [number, number] => {
  const geom = feature.geometry;

  // Use full feature for simple Polygon
  if (geom.type === "Polygon") return geoCentroid(feature);

  // Extract largest Polygon from MultiPolygon
  if (geom.type === "MultiPolygon") {
    const polygons = geom.coordinates.map((coords) => ({
      type: "Polygon" as const,
      coordinates: coords,
    }));

    const largest = polygons.reduce((a, b) =>
      geoArea(a) > geoArea(b) ? a : b
    );

    return geoCentroid({
      type: "Feature",
      geometry: largest,
      properties: {},
    });
  }

  // Fallback to default
  return geoCentroid(feature);
};

countriesData.features.forEach((feature: Feature<Geometry>, i) => {
  const id = i + 1;
  const name =
    (feature.properties as any).ADMIN ||
    (feature.properties as any).name ||
    `Unknown ${id}`;
  const [lon, lat] = getMainlandCentroid(feature);

  lines.push(
    `  ${id}: { name: ${JSON.stringify(name)}, lat: ${lat.toFixed(
      4
    )}, lon: ${lon.toFixed(4)} },`
  );
});

lines.push(`};\n`);

fs.writeFileSync(outputFile, lines.join("\n"));
console.log(`✅ countryCenters.ts generated at ${outputFile}`);
