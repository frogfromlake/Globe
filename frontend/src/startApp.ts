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

import { initializeCamera } from "@/core/earth/init/initializeCamera";
import { initializeRenderer } from "@/core/earth/init/initializeRenderer";
import { initializeScene } from "@/core/earth/init/initializeScene";
import { initializeUniforms } from "@/core/earth/init/initializeUniforms";

import { loadCountryIdMapTexture } from "@/core/earth/interactivity/countryHover";
import { loadOceanIdMapTexture } from "@/core/earth/interactivity/oceanHover";
import { setupGlobePointerEvents } from "@/core/earth/controls/globePointerEvents";
import {
  onPointerInteraction,
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
import { CONFIG } from "./configs/config";

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
const hoverReadyRef = { current: false };

// Inside startApp function
let resolveEssentialTextures: () => void;
const waitForEssentialTextures = new Promise<void>((resolve) => {
  resolveEssentialTextures = resolve;
});

/**
 * Bootstraps the entire OrbitalOne app with full 3D scene, interactivity,
 * and feature initialization.
 *
 * @param updateSubtitle - Callback for updating the loading screen subtitle
 * @returns Animation loop starter and a deferred hover activation function
 */
export async function startApp(updateSubtitle: (text: string) => void) {
  // === Wait for fonts to load and stabilize ===
  await document.fonts.ready;
  await document.fonts.load(
    `normal 400 ${CONFIG.labels3D.canvasFontSize}px '${CONFIG.labels3D.fontFamily}'`
  );

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
    hoverReadyRef,
  });

  // Ensure no initial hover or selection state
  uniforms.hoveredCountryId.value = 0;
  uniforms.hoveredOceanId.value = 0;
  uniforms.previousHoveredId.value = 0;
  uniforms.previousHoveredOceanId.value = 0;
  uniforms.highlightFadeIn.value = 0;
  uniforms.highlightFadeOut.value = 0;
  uniforms.uCursorOnGlobe.value = false;
  uniforms.cursorWorldPos.value.set(0, 0, 0);

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
        if (!hoverReadyRef.current) return;
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

    // Load essential textures FIRST, then resolve startup
    const day = texMod.loadDayTexture(renderer);
    const night = texMod.loadNightTexture(renderer);

    uniforms.dayTexture.value = await day;
    uniforms.nightTexture.value = await night;

    if (globe.material) {
      const updateMat = (mat: any) => {
        mat.needsUpdate = true;
      };
      Array.isArray(globe.material)
        ? globe.material.forEach(updateMat)
        : updateMat(globe.material);
    }

    // Load star map and fade in
    const esoSkyMapTexture = await texMod.loadSkyMapTexture();
    if (starSphere.material instanceof ShaderMaterial) {
      const starMaterial = starSphere.material;
      starMaterial.uniforms.uStarMap.value = esoSkyMapTexture;
      starMaterial.needsUpdate = true;

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
    }

    // Load clouds and fade in
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
    resolveEssentialTextures(); // Startup is visually ready now
    setTimeout(() => {
      renderer.setAnimationLoop(animate);
      renderer.render;
    }, 0);
  });

  // === Schedule label creation AFTER fonts have settled and layout has stabilized
  requestIdleCallback(() => {
    requestIdleCallback(async () => {
      const { init3DCountryLabelsDeferred } = await import(
        "@/core/earth/interactivity/countryLabels3D"
      );
      const { init3DOceanLabelsDeferred } = await import(
        "@/core/earth/interactivity/oceanLabel3D"
      );

      init3DCountryLabelsDeferred(camera); // uses chunked idle loops
      init3DOceanLabelsDeferred(camera);
    });
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

  // === Defer hover activation until user interacts
  onPointerInteraction(() => {
    hoverReadyRef.current = true;
    uniforms.uHoverEnabled.value = true;
    performance.mark("hover-ready-activated");
  });

  // Zero out selection masks
  selection.countryFlags.fill(0);
  selection.countryFadeIn.fill(0);
  selection.countryData.fill(0);
  selection.oceanFlags.fill(0);
  selection.oceanFadeIn.fill(0);
  selection.oceanData.fill(0);

  return { animate, waitForEssentialTextures };
}

/**
 * Typing helper for consumers of the startApp boot process
 */
export type StartAppContext = Awaited<ReturnType<typeof startApp>>;
