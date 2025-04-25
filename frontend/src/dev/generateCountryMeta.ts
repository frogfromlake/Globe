// scripts/generateCountryMeta.ts
import fs from "fs";
import path from "path";
import { geoCentroid, geoArea } from "d3-geo";
import countries from "./countries.json" assert { type: "json" };
import enLocale from "i18n-iso-countries/langs/en.json" assert { type: "json" };
import isoCountries from "i18n-iso-countries";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

isoCountries.registerLocale(enLocale);

const overrides: Record<string, string> = {
  Vatican: "VA",
  "Federated States of Micronesia": "FM",
  "United States Virgin Islands": "VI",
  "South Georgia and the Islands": "GS",
  "Falkland Islands": "FK",
  "British Virgin Islands": "VG",
  "East Timor": "TL",
  Syria: "SY",
  Somaliland: "SO",
  "Republic of Serbia": "RS",
  "São Tomé and Principe": "ST",
  Moldova: "MD",
  Laos: "LA",
  "Saint Martin": "MF",
  "Saint Barthelemy": "BL",
  "French Southern and Antarctic Lands": "TF",
  Aland: "AX",
  "Northern Cyprus": "CY",
  "Macao S.A.R": "MO",
  "Hong Kong S.A.R.": "HK",
  "Cabo Verde": "CV",
  Brunei: "BN",
  "The Bahamas": "BS",
  "Indian Ocean Territories": "IO",
  "Ashmore and Cartier Islands": "AU",
  "Siachen Glacier": "IN",
  "Sint Maarten": "SX",
};

const output: string[] = [];
output.push(
  "export const countryMeta: Record<number, { iso: string; name: string; lat: number; lon: number }> = {"
);

const geoData = countries as FeatureCollection<Geometry>;

geoData.features.forEach((feature, i) => {
  const id = i + 1;
  const name =
    (feature.properties as any).ADMIN ||
    (feature.properties as any).name ||
    `Unknown ${id}`;
  const [lon, lat] = getMainlandCentroid(feature);
  let iso = isoCountries.getAlpha2Code(name, "en");

  if (!iso && overrides[name]) {
    iso = overrides[name];
    console.log(`🛠 Override used for: ${name} → ${iso}`);
  }

  if (!iso) {
    console.warn(`⚠️ No ISO2 code found for: ${name}`);
    return;
  }

  output.push(
    `  ${id}: { iso: "${iso}", name: ${JSON.stringify(
      name
    )}, lat: ${lat.toFixed(4)}, lon: ${lon.toFixed(4)} },`
  );
});

output.push("};\n");

const outputFile = path.resolve(__dirname, "../data/countryMeta.ts");
fs.writeFileSync(outputFile, output.join("\n"));
console.log(`✅ countryMeta.ts generated at ${outputFile}`);

// Utility
function getMainlandCentroid(feature: Feature): [number, number] {
  const geom = feature.geometry;
  if (geom.type === "Polygon") return geoCentroid(feature);
  if (geom.type === "MultiPolygon") {
    const polygons = geom.coordinates.map((coords) => ({
      type: "Polygon" as const,
      coordinates: coords,
    }));
    const largest = polygons.reduce((a, b) =>
      geoArea(a) > geoArea(b) ? a : b
    );
    return geoCentroid({ type: "Feature", geometry: largest, properties: {} });
  }
  return geoCentroid(feature);
}
