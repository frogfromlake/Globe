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
    fallbackTexture, // Fallback day texture
    fallbackTexture, // Fallback night texture
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

  // === Load 3D Labels and Panels ===
  await runWithLoadingMessage(loadingMessages.labels, updateSubtitle, () => {
    init3DLabels(scene);
    init3DOceanLabels(scene);
  });
  await runWithLoadingMessage(
    loadingMessages.atmosphere,
    updateSubtitle,
    async () =>
      (
        await import("../features/news/handleNewsPanel")
      ).initNewsPanel(selection.countryIds, selection.countryFlags)
  );

  runWithLoadingMessage(loadingMessages.final, updateSubtitle, () => {});

  // === Populate Scene with Core Meshes (temporary placeholder sky texture) ===
  const { globe, atmosphere, starSphere } = setupSceneObjects(
    scene,
    uniforms,
    new Texture() // Placeholder texture
  );
  starSphere.visible = false; // Hidden until esoSkyMap is ready

  // === Set Up UI & Interactions ===
  const { getBackgroundMode } = await (
    await import("../settings/setupSettings")
  ).setupSettingsPanel(
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

  const updateKeyboard = setupKeyboardControls(camera, controls);

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

  // === Boot Other Features ===
  (await import("../features/news/setupAdminPanel")).setupAdminPanel();

  // === Defer loading of heavy textures and assign to uniforms ===
  loadVisualTextures(renderer).then(
    ({ dayTexture, nightTexture, esoSkyMapTexture }) => {
      // Replace the fallback day and night textures with the real ones
      uniforms.dayTexture.value = dayTexture;
      uniforms.nightTexture.value = nightTexture;

      // Ensure globe material is updated after textures are loaded
      if (globe.material) {
        if (Array.isArray(globe.material)) {
          globe.material.forEach((mat) => (mat.needsUpdate = true));
        } else {
          globe.material.needsUpdate = true;
        }
      }

      // Update the star sphere material with the sky texture
      if (
        starSphere.material &&
        starSphere.material instanceof ShaderMaterial
      ) {
        const starMaterial = starSphere.material;
        starMaterial.uniforms.uStarMap.value = esoSkyMapTexture;
        starMaterial.needsUpdate = true;
      }

      const starMaterial = starSphere.material as ShaderMaterial;
      if (starMaterial) {
        let starFade = 0;
        let lastStarTime = performance.now();

        setTimeout(() => {
          starSphere.visible = true;

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

      // === Smoothly fade in day/night textures using uTextureFade ===
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
