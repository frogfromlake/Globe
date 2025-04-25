/**
 * @file toggleSelections.ts
 * @description Utilities to toggle selection and interactivity states for countries and oceans on the 3D globe.
 */

import { oceanIdToIndex } from "../utils/oceanIdToIndex";
import { interactionState } from "../state/interactionState";

/**
 * Toggles the selection state of a specific country.
 *
 * @param countryId - The unique ID of the country to toggle.
 * @param selectedCountryIds - A Set of currently selected country IDs.
 * @param selectedFlags - Uint8Array representing country selection flags.
 */
export function toggleCountrySelection(
  countryId: number,
  selectedCountryIds: Set<number>,
  selectedFlags: Uint8Array
): void {
  if (countryId <= 0 || countryId >= selectedFlags.length) return;

  if (selectedCountryIds.has(countryId)) {
    selectedCountryIds.delete(countryId);
    selectedFlags[countryId] = 0;
  } else {
    selectedCountryIds.add(countryId);
    selectedFlags[countryId] = 1;
  }
}

/**
 * Toggles the selection state of a specific ocean region.
 *
 * @param oceanId - The unique ID of the ocean to toggle.
 * @param selectedOceanIds - A Set of currently selected ocean IDs.
 * @param selectedOceanFlags - Uint8Array representing ocean selection flags by index.
 */
export function toggleOceanSelection(
  oceanId: number,
  selectedOceanIds: Set<number>,
  selectedOceanFlags: Uint8Array
): void {
  const index = oceanIdToIndex[oceanId];
  if (index === undefined) return;

  if (selectedOceanIds.has(oceanId)) {
    selectedOceanIds.delete(oceanId);
    selectedOceanFlags[index] = 0;
  } else {
    selectedOceanIds.add(oceanId);
    selectedOceanFlags[index] = 1;
  }
}

/**
 * Toggles the interactivity mode for countries and updates the associated button label.
 *
 * @param button - The HTML button element controlling country interactivity.
 */
export function toggleCountryInteractivity(button: HTMLButtonElement): void {
  interactionState.countryEnabled = !interactionState.countryEnabled;
  button.textContent = interactionState.countryEnabled
    ? "Disable Country Interactivity"
    : "Enable Country Interactivity";
}

/**
 * Toggles the interactivity mode for oceans and updates the associated button label.
 *
 * @param button - The HTML button element controlling ocean interactivity.
 */
export function toggleOceanInteractivity(button: HTMLButtonElement): void {
  interactionState.oceanEnabled = !interactionState.oceanEnabled;
  button.textContent = interactionState.oceanEnabled
    ? "Disable Ocean Interactivity"
    : "Enable Ocean Interactivity";
}
