/**
 * @file handleGlobeClick.ts
 * @description Handles click interactions on the globe, determining whether a country or ocean was clicked
 * and updating selection states and the news panel accordingly.
 */

import { Intersection } from "three";
import { interactionState } from "../state/interactionState";
import { getCountryIdAtUV } from "../hoverLabel/countryHover";
import { getOceanIdAtUV } from "../hoverLabel/oceanHover";
import { oceanIdToIndex } from "../utils/oceanIdToIndex";
import { countryMeta } from "../data/countryMeta";
import { showNewsPanel, hideNewsPanel } from "../features/news/handleNewsPanel";

let lastOpenedCountryId: number | null = null;

/**
 * Handles a click event on the globe, determining whether a country or ocean was selected.
 * Toggles selection state and updates the news panel accordingly.
 *
 * @param hit - The intersection result from a globe click raycast.
 * @param selectedCountryIds - A set of currently selected country IDs.
 * @param selectedFlags - Selection flag array for countries (used by shader).
 * @param selectedOceanIds - A set of currently selected ocean IDs.
 * @param selectedOceanFlags - Selection flag array for oceans (used by shader).
 */
export function handleGlobeClick(
  hit: Intersection,
  selectedCountryIds: Set<number>,
  selectedFlags: Uint8Array,
  selectedOceanIds: Set<number>,
  selectedOceanFlags: Uint8Array
): void {
  if (!hit.uv) return;

  // Determine clicked country and ocean IDs (if interactivity is enabled)
  const clickedCountryId = interactionState.countryEnabled
    ? getCountryIdAtUV(hit.uv)
    : -1;

  const clickedOceanId = interactionState.oceanEnabled
    ? getOceanIdAtUV(hit.uv)
    : -1;

  // === Country selection logic ===
  if (clickedCountryId > 0 && clickedCountryId < selectedFlags.length) {
    const isAlreadySelected = selectedCountryIds.has(clickedCountryId);

    if (isAlreadySelected) {
      selectedCountryIds.delete(clickedCountryId);
      selectedFlags[clickedCountryId] = 0;

      if (lastOpenedCountryId === clickedCountryId) {
        hideNewsPanel();
        lastOpenedCountryId = null;
      }

      return; // Prevent re-showing on deselect
    }

    // New country selection
    selectedCountryIds.add(clickedCountryId);
    selectedFlags[clickedCountryId] = 1;

    const isoCode = countryMeta[clickedCountryId]?.iso;
    if (isoCode) {
      showNewsPanel(isoCode);
      lastOpenedCountryId = clickedCountryId;
    } else {
      console.warn(`No ISO code found for country ID: ${clickedCountryId}`);
    }
  }

  // === Ocean selection logic ===
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
