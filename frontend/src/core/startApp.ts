/**
 * startApp.ts
 * Initializes the full OrbitalOne application including 3D scene, user interactions,
 * data-driven highlights, and global UI panels. This is the main orchestration entrypoint
 * for setting up the Earth visualization.
 */

import * as THREE from "three";
import { initializeCamera } from "../init/initializeCamera";
import { initializeRenderer } from "../init/initializeRenderer";
import { initializeScene } from "../init/initializeScene";
import { initializeTextures } from "../init/initializeTextures";
import { initializeUniforms } from "../init/initializeUniforms";

import { loadCountryIdMapTexture } from "../hoverLabel/countryHover";
import { loadOceanIdMapTexture } from "../hoverLabel/oceanHover";
import { init3DLabels } from "../hoverLabel/countryLabels3D";
import { init3DOceanLabels } from "../hoverLabel/oceanLabel3D";

import { setupGlobePointerEvents } from "../interactions/globePointerEvents";
import { setupKeyboardControls } from "../interactions/keyboardControls";
import { setupPointerMoveTracking } from "../interactions/pointerTracker";
import { handleGlobeClick } from "../interactions/handleGlobeClick";

import { setupSceneObjects } from "../scene/setupScene";
import { createAnimateLoop } from "../scene/createAnimateLoop";
import {
  loadingMessages,
  runWithLoadingMessage,
  showLoadingScreen,
} from "../scene/showLoadingScreen";

import { setupSettingsPanel } from "../settings/setupSettings";
import { initNewsPanel } from "../features/news/handleNewsPanel";
import { setupAdminPanel } from "../features/news/setupAdminPanel";

/**
 * Bootstraps the entire OrbitalOne app with full 3D scene, interactivity,
 * and feature initialization.
 *
 * @param updateSubtitle - Callback for updating the loading screen subtitle
 * @returns Animation loop starter
 */
export async function startApp(updateSubtitle: (text: string) => void) {
  // === State Stores for Country/Ocean Selection ===
  const selection = {
    countryIds: new Set<number>(),
    oceanIds: new Set<number>(),
    countryFlags: new Uint8Array(),
    oceanFlags: new Uint8Array(),
    countryFadeIn: new Float32Array(),
    oceanFadeIn: new Float32Array(),
    countryData: new Uint8Array(),
    oceanData: new Uint8Array(),
  };

  // === Pointer & Raycasting ===
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  setupPointerMoveTracking();

  // === Core Three.js Setup ===
  const camera = initializeCamera();
  const renderer = initializeRenderer(camera);
  const { scene, controls } = initializeScene(camera, renderer);

  // === Load Textures & Initialize Shader Uniforms ===
  const locationSearchInput = document.getElementById(
    "country-search"
  ) as HTMLInputElement;

  const {
    dayTexture,
    nightTexture,
    countryIdMapTexture,
    oceanIdMapTexture,
    esoSkyMapTexture,
  } = initializeTextures(renderer);

  const {
    uniforms,
    selectedData,
    selectedFadeIn,
    selectedFlags,
    selectedOceanData,
    selectedOceanFadeIn,
    selectedOceanFlags,
  } = initializeUniforms(
    dayTexture,
    nightTexture,
    countryIdMapTexture,
    oceanIdMapTexture
  );

  Object.assign(selection, {
    countryFlags: selectedFlags,
    oceanFlags: selectedOceanFlags,
    countryFadeIn: selectedFadeIn,
    oceanFadeIn: selectedOceanFadeIn,
    countryData: selectedData,
    oceanData: selectedOceanData,
  });

  // === Loading Steps ===
  await runWithLoadingMessage(
    loadingMessages.countryTextures,
    updateSubtitle,
    loadCountryIdMapTexture
  );
  await runWithLoadingMessage(
    loadingMessages.oceanTextures,
    updateSubtitle,
    loadOceanIdMapTexture
  );
  await runWithLoadingMessage(loadingMessages.labels, updateSubtitle, () => {
    init3DLabels(scene);
    init3DOceanLabels(scene);
  });
  await runWithLoadingMessage(
    loadingMessages.atmosphere,
    updateSubtitle,
    initNewsPanel
  );
  runWithLoadingMessage(loadingMessages.final, updateSubtitle, () => {});

  // === Populate Scene with Core Meshes ===
  const { globe, atmosphere, starSphere } = setupSceneObjects(
    scene,
    uniforms,
    esoSkyMapTexture
  );

  // === Set Up UI & Interactions ===
  const { getBackgroundMode } = setupSettingsPanel(
    uniforms,
    selectedFlags,
    selectedOceanFlags,
    selection.countryIds,
    selection.oceanIds,
    scene,
    globe,
    locationSearchInput,
    camera,
    controls
  );

  const updateKeyboard = setupKeyboardControls(camera, controls);

  setupGlobePointerEvents(renderer, globe, raycaster, pointer, camera, {
    onHover: (hit) => {
      uniforms.cursorWorldPos.value.copy(hit.point.clone().normalize());
    },
    onClick: (hit) => {
      handleGlobeClick(
        hit,
        selection.countryIds,
        selection.countryFlags,
        selection.oceanIds,
        selection.oceanFlags
      );
    },
  });

  // === Boot Other Features ===
  setupAdminPanel();
  showLoadingScreen();

  // === Launch Render Loop ===
  const animate = createAnimateLoop({
    globe,
    atmosphere,
    starSphere,
    uniforms,
    camera,
    controls,
    renderer,
    scene,
    raycaster,
    pointer,
    selectedFlags,
    selectedOceanFlags,
    selectedFadeIn,
    selectedOceanFadeIn,
    selectedData,
    selectedOceanData,
    getBackgroundMode,
    updateKeyboard,
    selectedCountryIds: selection.countryIds,
    selectedOceanIds: selection.oceanIds,
  });

  return { animate };
}

/**
 * Typing helper for consumers of the startApp boot process
 */
export type StartAppContext = Awaited<ReturnType<typeof startApp>>;
