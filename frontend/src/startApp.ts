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
  Mesh,
} from "three";

import { initializeCamera } from "@/core/earth/init/initializeCamera";
import { initializeRenderer } from "@/core/earth/init/initializeRenderer";
import { initializeScene } from "@/core/earth/init/initializeScene";
import { initializeUniforms } from "@/core/earth/init/initializeUniforms";

import { loadCountryIdMapTexture } from "@/core/earth/interactivity/countryHover";
import { loadOceanIdMapTexture } from "@/core/earth/interactivity/oceanHover";
import { setupGlobePointerEvents } from "@/core/earth/controls/globePointerEvents";
import {
  setupPointerMoveTracking,
  userHasMovedPointer,
} from "@/core/earth/controls/pointerTracker";
import { handleGlobeClick } from "@/core/earth/controls/handleGlobeClick";
import { createAnimateLoop } from "@/core/animation/createAnimateLoop";
import {
  loadingMessages,
  runWithLoadingMessage,
} from "@/core/loadingScreen/showLoadingScreen";
import { loadCoreTextures } from "@/core/earth/init/initializeTextures";
import { enhanceSceneObjects } from "./core/scene/enhanceSceneObjects";
import { setupCoreSceneObjects } from "./core/scene/setupCoreSceneObjects";
import { disposeMaterial } from "./core/earth/materials/disposeMaterial";

if (typeof window.requestIdleCallback !== "function") {
  window.requestIdleCallback = function (
    callback: IdleRequestCallback,
    _options?: IdleRequestOptions
  ): number {
    return window.setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50),
      });
    }, 1);
  };
}

if (typeof window.cancelIdleCallback !== "function") {
  window.cancelIdleCallback = function (id: number): void {
    clearTimeout(id);
  };
}

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
  requestIdleCallback(function setupPointerTrackingIdle() {
    setupPointerMoveTracking();
    performance.mark("pointer-tracking-ready");
  });

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

  let animate = () => {};

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
  const { globe, globeRaycastMesh, tiltGroup } = setupCoreSceneObjects(
    scene,
    uniforms
  );

  // === Enhance Scene and Load Settings ===
  const { atmosphere, cloudSphere, starSphere, auroraMesh, subsolarMarker } =
    enhanceSceneObjects(scene, uniforms, tiltGroup, new Texture());

  const { setupSettingsPanel } = await import("./sidebar/setupSidebar");
  const { getBackgroundMode } = await setupSettingsPanel(
    uniforms,
    selectedFlags,
    selectedOceanFlags,
    selection.countryIds,
    selection.oceanIds,
    tiltGroup,
    cloudSphere,
    auroraMesh,
    locationSearchInput,
    camera,
    controls,
    selectedFadeIn,
    selectedOceanFadeIn
  );

  const updateKeyboardRef = { fn: (delta: number) => {} };

  animate = createAnimateLoop({
    globe,
    cloudSphere,
    atmosphere,
    auroraMesh,
    starSphere,
    globeRaycastMesh,
    tiltGroup,
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
    updateKeyboardRef,
    selectedCountryIds: selection.countryIds,
    selectedOceanIds: selection.oceanIds,
    subsolarMarker,
  });

  requestAnimationFrame(animate);

  starSphere.visible = false;
  cloudSphere.visible = false;

  // === Set Up Pointer Events ===
  setupGlobePointerEvents(
    renderer,
    globeRaycastMesh,
    raycaster,
    pointer,
    camera,
    {
      onHover: undefined,
      onClick: (hit) => {
        if (!hoverReady) return;
        if (!userHasMovedPointer()) return;
        if (hit) {
          handleGlobeClick(
            hit,
            selection.countryIds,
            selection.countryFlags,
            selection.oceanIds,
            selection.oceanFlags
          );
        }
      },
    }
  );

  // === Schedule heavy loading work in idle phases
  // === High Priority Idle Tasks (Visuals & Interactivity) ===
  requestIdleCallback(async () => {
    performance.mark("idle-load-visual-textures-start");

    const texMod = await import("@/core/earth/init/initializeTextures");

    // Load Day Texture
    requestIdleCallback(async () => {
      uniforms.dayTexture.value = await texMod.loadDayTexture(renderer);
      if (globe.material) {
        if (Array.isArray(globe.material)) {
          globe.material.forEach((mat) => (mat.needsUpdate = true));
        } else {
          globe.material.needsUpdate = true;
        }
      }
    });

    // Load Night Texture
    requestIdleCallback(async () => {
      uniforms.nightTexture.value = await texMod.loadNightTexture(renderer);
    });

    // Load Topography
    requestIdleCallback(async () => {
      uniforms.topographyMap.value = await texMod.loadTopographyTexture(
        renderer
      );
    });

    // Load Sky Map and fade it in
    requestIdleCallback(async () => {
      const esoSkyMapTexture = await texMod.loadSkyMapTexture();
      if (starSphere.material instanceof ShaderMaterial) {
        const starMaterial = starSphere.material;
        starMaterial.uniforms.uStarMap.value = esoSkyMapTexture;
        starMaterial.needsUpdate = true;

        requestIdleCallback(function fadeInStarSphere() {
          starSphere.visible = true;
          let starFade = 0;
          let lastStarTime = performance.now();
          const fade = (now = performance.now()) => {
            const delta = (now - lastStarTime) / 1000;
            lastStarTime = now;
            starFade += delta * 0.1;
            starMaterial.uniforms.uStarFade.value = Math.min(starFade, 1);
            starMaterial.needsUpdate = true;
            if (starFade < 1) requestAnimationFrame(fade);
          };
          fade();
        });
      }
    });

    // Load Clouds and fade them in
    requestIdleCallback(async () => {
      const cloudTexture = await texMod.loadCloudTexture(renderer);
      if (cloudTexture && cloudSphere.material instanceof ShaderMaterial) {
        cloudSphere.material.uniforms.uCloudMap.value = cloudTexture;
        cloudSphere.material.needsUpdate = true;
        cloudSphere.visible = true;
      }

      let fade = 0;
      let last = performance.now();
      const fadeInTextures = (now = performance.now()) => {
        const delta = (now - last) / 1000;
        last = now;
        fade += delta * 0.2;
        uniforms.uTextureFade.value = Math.min(fade, 1);
        if (cloudSphere.material instanceof ShaderMaterial) {
          cloudSphere.material.uniforms.uCloudFade.value = Math.min(fade, 1);
        }
        if (fade < 1) requestAnimationFrame(fadeInTextures);
      };
      fadeInTextures();
    });
  });

  // === Schedule each feature module during idle time
  requestIdleCallback(async function load3DLabelsIdle() {
    const { init3DCountryLabels } = await import(
      "./core/earth/interactivity/countryLabels3D"
    );
    const { init3DOceanLabels } = await import(
      "./core/earth/interactivity/oceanLabel3D"
    );
    init3DCountryLabels(camera);
    init3DOceanLabels(camera);
  });

  // === Medium Priority Idle Tasks (News, Controls) ===
  requestIdleCallback(async function loadNewsPanel() {
    const { initNewsPanel } = await import(
      "./features/panels/news/handleNewsPanel"
    );
    initNewsPanel(selection.countryIds, selection.countryFlags);
  });

  requestIdleCallback(async function loadKeyboardControls() {
    const { setupKeyboardControls } = await import(
      "./core/earth/controls/keyboardControls"
    );
    updateKeyboardRef.fn = setupKeyboardControls(camera, controls);
  });

  // === Low Priority Idle Tasks (Dev Tools Only) ===
  requestIdleCallback(async function loadAdminPanel() {
    if (import.meta.env.DEV) {
      const modules = import.meta.glob("../features/news/setupAdminPanel.ts");
      const load = modules["../features/news/setupAdminPanel.ts"];
      if (load) {
        try {
          const mod = (await load()) as { setupAdminPanel: () => void };
          mod.setupAdminPanel();
        } catch (err) {
          console.warn("🛠 Admin panel failed to load:", err);
        }
      }
    }
  });

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

  // === Defer hover activation to next idle frame
  requestIdleCallback(function setHoverReady() {
    hoverReady = true;
    performance.mark("hover-ready-activated");
  });

  return { animate };
}

/**
 * Typing helper for consumers of the startApp boot process
 */
export type StartAppContext = Awaited<ReturnType<typeof startApp>>;
