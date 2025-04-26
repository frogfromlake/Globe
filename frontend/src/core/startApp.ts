/**
 * startApp.ts
 * Initializes the full OrbitalOne application including 3D scene, user interactions,
 * data-driven highlights, and global UI panels. This is the main orchestration entrypoint
 * for setting up the Earth visualization.
 */

import {
  DataTexture,
  RGBAFormat,
  NearestFilter,
  Raycaster,
  Vector2,
  Texture,
  ShaderMaterial,
} from "three";

import { initializeCamera } from "../init/initializeCamera";
import { initializeRenderer } from "../init/initializeRenderer";
import { initializeScene } from "../init/initializeScene";
import { initializeUniforms } from "../init/initializeUniforms";

import { loadCountryIdMapTexture } from "../hoverLabel/countryHover";
import { loadOceanIdMapTexture } from "../hoverLabel/oceanHover";
import { setupGlobePointerEvents } from "../interactions/globePointerEvents";
import { setupPointerMoveTracking } from "../interactions/pointerTracker";
import { handleGlobeClick } from "../interactions/handleGlobeClick";

import { setupSceneObjects } from "../scene/setupScene";
import { createAnimateLoop } from "../scene/createAnimateLoop";
import {
  loadingMessages,
  runWithLoadingMessage,
} from "../scene/showLoadingScreen";
import {
  loadCoreTextures,
  loadVisualTextures,
} from "../init/initializeTextures";

// === Fallback texture: flat gray ===
const fallbackTexture = new DataTexture(
  new Uint8Array([0, 0, 0, 255]),
  1,
  1,
  RGBAFormat
);
fallbackTexture.generateMipmaps = false;
fallbackTexture.minFilter = NearestFilter;
fallbackTexture.magFilter = NearestFilter;
fallbackTexture.needsUpdate = true;

// Hover interactivity is disabled until RGB ID maps are ready
let hoverReady = false;

/**
 * Bootstraps the entire OrbitalOne app with full 3D scene, interactivity,
 * and feature initialization.
 *
 * @param updateSubtitle - Callback for updating the loading screen subtitle
 * @returns Animation loop starter and a deferred hover activation function
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

  // === Function references for dynamic features
  let updateKeyboard: (delta: number) => void = () => undefined;

  // === Pointer & Raycasting ===
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  setupPointerMoveTracking();

  // === Core Three.js Setup ===
  const camera = initializeCamera();
  const renderer = initializeRenderer(camera);
  const { scene, controls } = await initializeScene(camera, renderer);

  // === Load UI element reference
  const locationSearchInput = document.getElementById(
    "country-search"
  ) as HTMLInputElement;

  // === Load Core (Lightweight) Textures ===
  const { countryIdMapTexture, oceanIdMapTexture } = await loadCoreTextures();

  // === Initialize Uniforms with temporary placeholder maps ===
  const {
    uniforms,
    selectedData,
    selectedFadeIn,
    selectedFlags,
    selectedOceanData,
    selectedOceanFadeIn,
    selectedOceanFlags,
  } = initializeUniforms(
    fallbackTexture,
    fallbackTexture,
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

  // === Populate Scene with Core Meshes (temporary placeholder sky texture) ===
  const { globe, atmosphere, starSphere } = setupSceneObjects(
    scene,
    uniforms,
    new Texture()
  );
  starSphere.visible = false; // Hidden until esoSkyMap is ready

  // === Set Up Pointer Events ===
  setupGlobePointerEvents(renderer, globe, raycaster, pointer, camera, {
    onHover: (hit) => {
      if (!hoverReady) return;
      uniforms.cursorWorldPos.value.copy(hit.point.clone().normalize());
    },
    onClick: (hit) => {
      if (!hoverReady) return;
      handleGlobeClick(
        hit,
        selection.countryIds,
        selection.countryFlags,
        selection.oceanIds,
        selection.oceanFlags
      );
    },
  });

  // === Load Settings Panel early
  const { setupSettingsPanel } = await import("../settings/setupSettings");
  const { getBackgroundMode } = await setupSettingsPanel(
    uniforms,
    selectedFlags,
    selectedOceanFlags,
    selection.countryIds,
    selection.oceanIds,
    globe,
    locationSearchInput,
    camera,
    controls
  );

  // === Launch Render Loop Immediately ===
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

  // === Deferred Loading for Heavy Features ===
  setTimeout(async () => {
    // === Load Visual Textures (day/night/sky)
    loadVisualTextures(renderer).then(
      ({ dayTexture, nightTexture, esoSkyMapTexture }) => {
        uniforms.dayTexture.value = dayTexture;
        uniforms.nightTexture.value = nightTexture;

        if (globe.material) {
          if (Array.isArray(globe.material)) {
            globe.material.forEach((mat) => (mat.needsUpdate = true));
          } else {
            globe.material.needsUpdate = true;
          }
        }

        if (starSphere.material instanceof ShaderMaterial) {
          const starMaterial = starSphere.material;
          starMaterial.uniforms.uStarMap.value = esoSkyMapTexture;
          starMaterial.needsUpdate = true;

          setTimeout(() => {
            starSphere.visible = true;
            let starFade = 0;
            let lastStarTime = performance.now();
            const fadeInStarSphere = (now = performance.now()) => {
              const delta = (now - lastStarTime) / 1000;
              lastStarTime = now;
              starFade += delta * 0.1;
              starMaterial.uniforms.uStarFade.value = Math.min(starFade, 1);
              starMaterial.needsUpdate = true;
              if (starFade < 1) requestAnimationFrame(fadeInStarSphere);
            };
            fadeInStarSphere();
          }, 1500);
        }

        let fade = 0;
        let last = performance.now();
        const fadeInTextures = (now = performance.now()) => {
          const delta = (now - last) / 1000;
          last = now;
          fade += delta * 0.4;
          uniforms.uTextureFade.value = Math.min(fade, 1);
          if (fade < 1) requestAnimationFrame(fadeInTextures);
        };
        fadeInTextures();
      }
    );

    // === Load 3D Labels
    const { init3DLabels } = await import("../hoverLabel/countryLabels3D");
    const { init3DOceanLabels } = await import("../hoverLabel/oceanLabel3D");
    init3DLabels(scene);
    init3DOceanLabels(scene);

    // === Load News Panel
    const { initNewsPanel } = await import("../features/news/handleNewsPanel");
    initNewsPanel(selection.countryIds, selection.countryFlags);

    // === Load Keyboard Controls
    const { setupKeyboardControls } = await import(
      "../interactions/keyboardControls"
    );
    updateKeyboard = setupKeyboardControls(camera, controls);

    // === Load Admin Panel only in development
    if (import.meta.env.DEV) {
      const { setupAdminPanel } = await import(
        "../features/news/setupAdminPanel"
      );
      setupAdminPanel();
    }
  }, 0); // after one tick

  // === Expose startHoverSystem for main.ts to call after loading screen
  const startHoverSystem = async () => {
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
    hoverReady = true;
  };

  return { animate, startHoverSystem };
}

/**
 * Typing helper for consumers of the startApp boot process
 */
export type StartAppContext = Awaited<ReturnType<typeof startApp>>;
