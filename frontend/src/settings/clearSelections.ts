/**
 * @file clearSelections.ts
 * @description Provides a utility to reset all current selections for both countries and oceans.
 */

/**
 * Clears all selected countries and oceans by resetting selection flags and ID sets.
 *
 * @param selectedFlags - Uint8Array representing selected country flags (1 = selected, 0 = unselected).
 * @param selectedOceanFlags - Uint8Array representing selected ocean flags.
 * @param selectedCountryIds - Set of currently selected country IDs.
 * @param selectedOceanIds - Set of currently selected ocean IDs.
 */
export function clearAllSelections(
  selectedFlags: Uint8Array,
  selectedOceanFlags: Uint8Array,
  selectedCountryIds: Set<number>,
  selectedOceanIds: Set<number>
): void {
  // Clear ID sets
  selectedCountryIds.clear();
  selectedOceanIds.clear();

  // Reset flags efficiently
  selectedFlags.fill(0);
  selectedOceanFlags.fill(0);
}
