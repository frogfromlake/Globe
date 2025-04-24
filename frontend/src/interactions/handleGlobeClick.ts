import { Intersection } from "three";
import { interactionState } from "../state/interactionState";
import { getCountryIdAtUV } from "../systems/countryHover";
import { getOceanIdAtUV } from "../systems/oceanHover";
import { oceanIdToIndex } from "../data/oceanIdToIndex";
import { countryIdToIso } from "../data/countryIdToIso";
import { showNewsPanel, hideNewsPanel } from "../features/news/handleNewsPanel";

let lastOpenedCountryId: number | null = null;

export function handleGlobeClick(
  hit: Intersection,
  selectedCountryIds: Set<number>,
  selectedFlags: Uint8Array,
  selectedOceanIds: Set<number>,
  selectedOceanFlags: Uint8Array
) {
  if (!hit.uv) return;

  const clickedCountryId = interactionState.countryEnabled
    ? getCountryIdAtUV(hit.uv)
    : -1;

  const clickedOceanId = interactionState.oceanEnabled
    ? getOceanIdAtUV(hit.uv)
    : -1;

  // === Country click logic ===
  if (clickedCountryId > 0 && clickedCountryId < selectedFlags.length) {
    const isAlreadySelected = selectedCountryIds.has(clickedCountryId);

    if (isAlreadySelected) {
      selectedCountryIds.delete(clickedCountryId);
      selectedFlags[clickedCountryId] = 0;

      if (lastOpenedCountryId === clickedCountryId) {
        hideNewsPanel();
        lastOpenedCountryId = null;
      }
      return; // ✅ prevent re-showing on deselect
    }

    // New selection
    selectedCountryIds.add(clickedCountryId);
    selectedFlags[clickedCountryId] = 1;

    const isoCode = countryIdToIso[clickedCountryId];
    if (isoCode) {
      showNewsPanel(isoCode);
      lastOpenedCountryId = clickedCountryId;
    } else {
      console.warn(`No ISO code found for country ID: ${clickedCountryId}`);
    }
  }

  // === Ocean click logic ===
  const oceanIndex = oceanIdToIndex[clickedOceanId];
  if (oceanIndex === undefined) return;

  if (selectedOceanIds.has(clickedOceanId)) {
    selectedOceanIds.delete(clickedOceanId);
    selectedOceanFlags[oceanIndex] = 0;
  } else {
    selectedOceanIds.add(clickedOceanId);
    selectedOceanFlags[oceanIndex] = 1;
  }
}
