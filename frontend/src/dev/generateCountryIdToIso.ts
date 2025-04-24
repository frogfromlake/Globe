import { countryCenters } from "../data/countryCenters";
import countries from "i18n-iso-countries";
import fs from "fs";
import path from "path";
import enLocale from "i18n-iso-countries/langs/en.json" assert { type: "json" };

// Register the English locale for country ISO lookups
countries.registerLocale(enLocale);

// Fallback map for country names that don't match ISO standards
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

// Initialize an array to collect the output lines
const output: string[] = [];
output.push("export const countryIdToIso: Record<number, string> = {");

// Iterate through each country in the countryCenters data and match it with ISO codes
for (const [idStr, info] of Object.entries(countryCenters)) {
  const id = parseInt(idStr, 10); // Parse the country ID from the string
  let iso = countries.getAlpha2Code(info.name, "en"); // Get ISO2 code for country name

  // Apply manual overrides for countries with special cases
  if (!iso && overrides[info.name]) {
    iso = overrides[info.name];
    console.log(`🛠 Using override for: ${info.name} → ${iso}`);
  }

  // Log a warning if no ISO code was found
  if (!iso) {
    console.warn(`⚠️ No ISO code found for: ${info.name}`);
    continue; // Skip countries without a valid ISO code
  }

  // Add the country ISO mapping to the output array
  output.push(`  ${id}: "${iso}", // ${info.name}`);
}

// Close the TypeScript object and prepare for file writing
output.push("};\n");

// Resolve the output file path based on the current module's directory
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const outputPath = path.resolve(__dirname, "../data/countryIdToIso.ts");

// Write the output to the file
fs.writeFileSync(outputPath, output.join("\n"));

// Log a success message with the output file path
console.log("✅ countryIdToIso.ts generated at", outputPath);
