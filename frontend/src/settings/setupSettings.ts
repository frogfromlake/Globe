import * as THREE from "three";
import { interactionState } from "../state/interactionState";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { clearAllSelections } from "./clearSelections";
import {
  toggleCountryInteractivity,
  toggleOceanInteractivity,
} from "./toggleSelections";
import { setupUserLocation } from "./showUserLocation";
import { hideAll3DLabelsExcept } from "../systems/countryLabels3D";
import { hideAll3DOceanLabels } from "../systems/oceanLabel3D";
import { setupLocationSearch } from "./locationSearch";

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

  // === Setup interactive features ===
  setupUserLocation(scene, globe);
  hideAll3DLabelsExcept([]);
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

  updateButtonState(countryBtn, interactionState.countryEnabled);
  updateButtonState(oceanBtn, interactionState.oceanEnabled);
  updateButtonState(flashlightBtn, interactionState.flashlightEnabled);
  updateButtonState(starBtn, useFixedBackground);

  const sidebar = document.getElementById("sidebar")!;
  const toggle = document.getElementById("sidebar-toggle")!;

  toggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });

  return {
    getBackgroundMode: () => useFixedBackground,
  };
}
