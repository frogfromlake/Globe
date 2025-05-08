import { DataTexture, MathUtils } from "three";
import { CONFIG } from "@/configs/config";

/**
 * Updates selection fade values and applies them to a DataTexture.
 */
function updateSelectionTexture(
  fadeInArray: Float32Array,
  flagsArray: Uint8Array,
  dataArray: Uint8Array,
  texture: DataTexture,
  delta: number
): void {
  for (let i = 0, len = dataArray.length; i < len; i++) {
    const isSelected = flagsArray[i] === 1;
    fadeInArray[i] += delta * CONFIG.fade.selection * (isSelected ? 1 : -1);
    fadeInArray[i] = MathUtils.clamp(fadeInArray[i], 0, 1);
    dataArray[i] = Math.floor(
      fadeInArray[i] * CONFIG.selectionTexture.fadeMaxValue
    );
  }
  texture.needsUpdate = true;
}

/**
 * Updates both country and ocean selection textures for visual feedback.
 */
export function updateSelectionTextures(
  selectedFadeIn: Float32Array,
  selectedFlags: Uint8Array,
  selectedData: Uint8Array,
  selectedMask: DataTexture,
  selectedOceanFadeIn: Float32Array,
  selectedOceanFlags: Uint8Array,
  selectedOceanData: Uint8Array,
  selectedOceanMask: DataTexture,
  delta: number
): void {
  updateSelectionTexture(
    selectedFadeIn,
    selectedFlags,
    selectedData,
    selectedMask,
    delta
  );
  updateSelectionTexture(
    selectedOceanFadeIn,
    selectedOceanFlags,
    selectedOceanData,
    selectedOceanMask,
    delta
  );
}
