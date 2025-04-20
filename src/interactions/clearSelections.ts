import { selectedCountryIds, selectedOceanIds } from "../core/startApp";

export function clearAllSelections(
  selectedFlags: Uint8Array,
  selectedOceanFlags: Uint8Array
): void {
  const locationBtn = document.getElementById(
    "clear-selection"
  ) as HTMLButtonElement;

  locationBtn.addEventListener("click", () => {
    selectedCountryIds.clear();
    selectedOceanIds.clear();

    for (let i = 0; i < selectedFlags.length; i++) {
      selectedFlags[i] = 0;
    }
    for (let i = 0; i < selectedOceanFlags.length; i++) {
      selectedOceanFlags[i] = 0;
    }
  });
}
