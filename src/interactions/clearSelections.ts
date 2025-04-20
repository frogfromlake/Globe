export function clearAllSelections(
  selectedFlags: Uint8Array,
  selectedOceanFlags: Uint8Array,
  selectedCountryIds: Set<number>,
  selectedOceanIds: Set<number>
): void {
  selectedCountryIds.clear();
  selectedOceanIds.clear();

  for (let i = 0; i < selectedFlags.length; i++) {
    selectedFlags[i] = 0;
  }
  for (let i = 0; i < selectedOceanFlags.length; i++) {
    selectedOceanFlags[i] = 0;
  }
}
