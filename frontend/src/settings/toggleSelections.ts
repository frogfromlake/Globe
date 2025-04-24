import { oceanIdToIndex } from "../data/oceanIdToIndex";
import { interactionState } from "../state/interactionState";

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

export function toggleCountryInteractivity(button: HTMLButtonElement) {
  interactionState.countryEnabled = !interactionState.countryEnabled;
  button.textContent = interactionState.countryEnabled
    ? "Disable Country Interactivity"
    : "Enable Country Interactivity";
}

export function toggleOceanInteractivity(button: HTMLButtonElement) {
  interactionState.oceanEnabled = !interactionState.oceanEnabled;
  button.textContent = interactionState.oceanEnabled
    ? "Disable Ocean Interactivity"
    : "Enable Ocean Interactivity";
}
