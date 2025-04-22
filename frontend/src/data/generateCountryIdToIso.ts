import { countryCenters } from "./countryCenters";
import countries from "i18n-iso-countries";
import fs from "fs";
import path from "path";
import enLocale from "i18n-iso-countries/langs/en.json" assert { type: "json" };

countries.registerLocale(enLocale);

// 🛠 Manual fallback map for names that ISO doesn't match
const overrides: Record<string, string> = {
  Vatican: "VA",
  "Federated States of Micronesia": "FM",
  "United States Virgin Islands": "VI",
  "South Georgia and the Islands": "GS",
  "Falkland Islands": "FK",
  "British Virgin Islands": "VG",
  "East Timor": "TL",
  Syria: "SY",
  Somaliland: "SO", // unofficial; fallback to Somalia
  "Republic of Serbia": "RS",
  "São Tomé and Principe": "ST",
  Moldova: "MD",
  Laos: "LA",
  "Saint Martin": "MF",
  "Saint Barthelemy": "BL",
  "French Southern and Antarctic Lands": "TF",
  Aland: "AX",
  "Northern Cyprus": "CY", // disputed, fallback to Cyprus
  "Macao S.A.R": "MO",
  "Hong Kong S.A.R.": "HK",
  "Cabo Verde": "CV",
  Brunei: "BN",
  "The Bahamas": "BS",
  "Indian Ocean Territories": "IO",
  "Ashmore and Cartier Islands": "AU", // fallback to Australia
  "Siachen Glacier": "IN", // fallback to India
  "Sint Maarten": "SX",
};

const output: string[] = [];
output.push("export const countryIdToIso: Record<number, string> = {");

for (const [idStr, info] of Object.entries(countryCenters)) {
  const id = parseInt(idStr, 10);
  let iso = countries.getAlpha2Code(info.name, "en");

  if (!iso && overrides[info.name]) {
    iso = overrides[info.name];
    console.log(`🛠 Using override for: ${info.name} → ${iso}`);
  }

  if (!iso) {
    console.warn(`⚠️ No ISO code found for: ${info.name}`);
    continue;
  }

  output.push(`  ${id}: "${iso}", // ${info.name}`);
}

output.push("};\n");

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const outputPath = path.resolve(__dirname, "countryIdToIso.ts");

fs.writeFileSync(outputPath, output.join("\n"));

console.log("✅ countryIdToIso.ts generated at", outputPath);
