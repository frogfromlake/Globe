import * as THREE from "three";
import { setupGlobePointerEvents } from "../interactions/globePointerEvents";
import { loadCountryIdMapTexture } from "../systems/countryHover";
import { init3DLabels } from "../systems/countryLabels3D";
import { initializeCamera } from "../init/initializeCamera";
import { initializeRenderer } from "../init/initializeRenderer";
import { initializeTextures } from "../init/initializeTextures";
import { initializeUniforms } from "../init/initializeUniforms";
import { initializeScene } from "../init/initializeScene";
import { loadOceanIdMapTexture } from "../systems/oceanHover";
import { init3DOceanLabels } from "../systems/oceanLabel3D";
import { initNewsPanel } from "../features/news/handleNewsPanel";
import { setupKeyboardControls } from "../interactions/keyboardControls";
import { setupAdminPanel } from "../features/news/setupAdminPanel";
import { setupSceneObjects } from "../scene/setupScene";
import { setupSettingsPanel } from "../settings/setupSettings";
import {
  loadingMessages,
  runWithLoadingMessage,
  showLoadingScreen,
} from "../scene/showLoadingScreen";
import { createAnimateLoop } from "../scene/createAnimateLoop";
import { handleGlobeClick } from "../interactions/handleGlobeClick";
import { setupPointerMoveTracking } from "../interactions/pointerTracker";

export async function startApp(updateSubtitle: (text: string) => void) {
  // === Selection State ===
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

  // === Pointer + Raycasting ===
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  setupPointerMoveTracking();

  // === Camera + Renderer + Scene ===
  const camera = initializeCamera();
  const renderer = initializeRenderer(camera);
  const { scene, controls } = initializeScene(camera, renderer);

  // === Textures & Uniforms ===
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

  // === Loading Phases ===
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
    () => {
      initNewsPanel();
    }
  );
  runWithLoadingMessage(loadingMessages.final, updateSubtitle, () => {});

  // === Scene Objects ===
  const { globe, atmosphere, starSphere } = setupSceneObjects(
    scene,
    uniforms,
    esoSkyMapTexture
  );

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

  // === Controls & Interactions ===
  const updateKeyboard = setupKeyboardControls(camera, controls);
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

  showLoadingScreen();
  setupAdminPanel();

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

  return { animate };
}

export type StartAppContext = Awaited<ReturnType<typeof startApp>>;
