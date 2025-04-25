/**
 * @file setupSettings.ts
 * @description Sets up the interactive UI controls panel, enabling toggles for features
 * such as flashlight mode, country/ocean interactivity, label clearing, and star background modes.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { interactionState } from "../state/interactionState";
import { clearAllSelections } from "./clearSelections";
import {
  toggleCountryInteractivity,
  toggleOceanInteractivity,
} from "./toggleSelections";
import { setupUserLocation } from "./showUserLocation";
import { setupLocationSearch } from "./locationSearch";
import { hideAll3DLabelsExcept } from "../hoverLabel/countryLabels3D";
import { hideAll3DOceanLabels } from "../hoverLabel/oceanLabel3D";

/**
 * Initializes all interactive settings buttons and handlers for the user settings panel.
 *
 * @param uniforms - Shared shader uniforms (e.g. uFlashlightEnabled).
 * @param selectedFlags - Byte array for currently selected countries.
 * @param selectedOceanFlags - Byte array for currently selected oceans.
 * @param selectedCountryIds - Set of selected country IDs.
 * @param selectedOceanIds - Set of selected ocean IDs.
 * @param scene - The main Three.js scene.
 * @param globe - The globe mesh object.
 * @param locationSearchInput - Input element for search field.
 * @param camera - Main camera instance.
 * @param controls - OrbitControls instance.
 * @returns An object with a `getBackgroundMode()` function to query background state.
 */
export function setupSettingsPanel(
  uniforms: { [key: string]: any },
  selectedFlags: Uint8Array,
  selectedOceanFlags: Uint8Array,
  selectedCountryIds: Set<number>,
  selectedOceanIds: Set<number>,
  scene: THREE.Scene,
  globe: THREE.Mesh,
  locationSearchInput: HTMLInputElement,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls
) {
  let useFixedBackground = false;

  // Initial scene setup
  setupUserLocation(globe);
  hideAll3DLabelsExcept();
  hideAll3DOceanLabels();
  setupLocationSearch(
    locationSearchInput,
    camera,
    controls,
    selectedCountryIds,
    selectedOceanIds,
    selectedFlags,
    selectedOceanFlags
  );

  /**
   * Updates the visual state of a toggle button based on enabled/disabled status.
   */
  function updateButtonState(button: HTMLButtonElement, enabled: boolean) {
    button.classList.toggle("enabled", enabled);
    button.classList.toggle("disabled", !enabled);
  }

  const countryBtn = document.getElementById(
    "toggle-country"
  ) as HTMLButtonElement;
  const oceanBtn = document.getElementById("toggle-ocean") as HTMLButtonElement;
  const flashlightBtn = document.getElementById(
    "toggle-flashlight"
  ) as HTMLButtonElement;
  const clearBtn = document.getElementById(
    "clear-selection"
  ) as HTMLButtonElement;
  const starBtn = document.getElementById(
    "toggle-star-mode"
  ) as HTMLButtonElement;

  // === Bind actions ===

  clearBtn?.addEventListener("click", () => {
    clearAllSelections(
      selectedFlags,
      selectedOceanFlags,
      selectedCountryIds,
      selectedOceanIds
    );
  });

  countryBtn?.addEventListener("click", () => {
    toggleCountryInteractivity(countryBtn);
    countryBtn.textContent = interactionState.countryEnabled
      ? "Disable Country Interactivity"
      : "Enable Country Interactivity";
    updateButtonState(countryBtn, interactionState.countryEnabled);
  });

  oceanBtn?.addEventListener("click", () => {
    toggleOceanInteractivity(oceanBtn);
    oceanBtn.textContent = interactionState.oceanEnabled
      ? "Disable Ocean Interactivity"
      : "Enable Ocean Interactivity";
    updateButtonState(oceanBtn, interactionState.oceanEnabled);
  });

  flashlightBtn?.addEventListener("click", () => {
    interactionState.flashlightEnabled = !interactionState.flashlightEnabled;
    uniforms.uFlashlightEnabled.value = interactionState.flashlightEnabled;
    flashlightBtn.textContent = interactionState.flashlightEnabled
      ? "Disable Flashlight"
      : "Enable Flashlight";
    updateButtonState(flashlightBtn, interactionState.flashlightEnabled);
  });

  starBtn?.addEventListener("click", () => {
    useFixedBackground = !useFixedBackground;
    starBtn.textContent = useFixedBackground
      ? "Background: Infinite"
      : "Background: Realistic";
    updateButtonState(starBtn, useFixedBackground);
  });

  // === Initial states ===
  updateButtonState(countryBtn, interactionState.countryEnabled);
  updateButtonState(oceanBtn, interactionState.oceanEnabled);
  updateButtonState(flashlightBtn, interactionState.flashlightEnabled);
  updateButtonState(starBtn, useFixedBackground);

  // Sidebar toggle
  const sidebar = document.getElementById("sidebar")!;
  const toggle = document.getElementById("sidebar-toggle")!;
  toggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });

  return {
    getBackgroundMode: () => useFixedBackground,
  };
}
