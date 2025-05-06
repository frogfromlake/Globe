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

import { initializeCamera } from '@/core/earth/init/initializeCamera';
import { initializeRenderer } from '@/core/earth/init/initializeRenderer';
import { initializeScene } from '@/core/earth/init/initializeScene';
import { initializeUniforms } from '@/core/earth/init/initializeUniforms';

import { loadCountryIdMapTexture } from '@/core/earth/interactivity/countryHover';
import { loadOceanIdMapTexture } from '@/core/earth/interactivity/oceanHover';
import { setupGlobePointerEvents } from '@/core/earth/controls/globePointerEvents';
import {
  setupPointerMoveTracking,
  userHasMovedPointer,
} from '@/core/earth/controls/pointerTracker';
import { handleGlobeClick } from '@/core/earth/controls/handleGlobeClick';

import { setupSceneObjects } from '@/core/scene/setupScene';
import { createAnimateLoop } from '@/core/animation/createAnimateLoop';
import {
  loadingMessages,
  runWithLoadingMessage,
} from '@/core/loadingScreen/showLoadingScreen';
import {
  loadCoreTextures,
  loadVisualTextures,
} from '@/core/earth/init/initializeTextures';

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
  const {
    globe,
    cloudSphere,
    atmosphere,
    auroraMesh,
    starSphere,
    globeRaycastMesh,
    tiltGroup,
    subsolarMarker,
  } = setupSceneObjects(scene, uniforms, new Texture());

  starSphere.visible = false; // Hidden until esoSkyMap is ready
  cloudSphere.visible = false; // Hidden until cloud texture is ready

  // === Set Up Pointer Events ===
  setupGlobePointerEvents(
    renderer,
    globeRaycastMesh,
    raycaster,
    pointer,
    camera,
    {
      onHover: undefined, // Let animate() handle hover logic
      onClick: (hit) => {
        if (!hoverReady) return;
        if (!userHasMovedPointer()) return; // Prevents selection on load
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

  // === Load Settings Panel early
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
  // === Launch Render Loop Immediately ===
  const animate = createAnimateLoop({
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

  // === Deferred Loading for Heavy Features ===
  setTimeout(async () => {
    // === Load Visual Textures (day/night/sky)
    loadVisualTextures(renderer).then(
      async ({
        dayTexture,
        nightTexture,
        esoSkyMapTexture,
        cloudTexture,
        topographyTexture,
      }) => {
        // === Assign Earth Day/Night Textures
        uniforms.dayTexture.value = dayTexture;
        uniforms.nightTexture.value = nightTexture;

        // === Assign Topography Texture (for bump mapping)
        uniforms.topographyMap.value = topographyTexture;

        // === Force globe material(s) to update
        if (globe.material) {
          if (Array.isArray(globe.material)) {
            globe.material.forEach((mat) => (mat.needsUpdate = true));
          } else {
            globe.material.needsUpdate = true;
          }
        }

        // === Handle Star Background
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
          }, 300);
        }

        // === Handle Cloud Sphere (assign texture to custom cloud material)
        if (cloudTexture) {
          if (cloudSphere.material instanceof ShaderMaterial) {
            const cloudMat = cloudSphere.material;
            cloudMat.uniforms.uCloudMap.value = cloudTexture;
            cloudMat.needsUpdate = true;
          }
          cloudSphere.visible = true;
        }

        // === Unified Fade-in for Earth + Clouds
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
      }
    );

    // === Load 3D Labels
    const { init3DCountryLabels } = await import(
      "./core/earth/interactivity/countryLabels3D"
    );
    const { init3DOceanLabels } = await import("./core/earth/interactivity/oceanLabel3D");
    init3DCountryLabels(camera);
    init3DOceanLabels(camera);

    // === Load News Panel
    const { initNewsPanel } = await import("./features/panels/news/handleNewsPanel");
    initNewsPanel(selection.countryIds, selection.countryFlags);

    // === Load Keyboard Controls
    const { setupKeyboardControls } = await import(
      "./core/earth/controls/keyboardControls"
    );
    updateKeyboardRef.fn = setupKeyboardControls(camera, controls);

    if (import.meta.env.DEV) {
      const modules = import.meta.glob("../features/news/setupAdminPanel.ts");
      const load = modules["../features/news/setupAdminPanel.ts"];
      if (load) {
        load()
          .then((module) => {
            const { setupAdminPanel } = module as { setupAdminPanel: any };
            setupAdminPanel();
          })
          .catch((err) => {
            console.warn("🛠 Admin panel failed to load:", err);
          });
      }
    }
  }, 0); // after one tick

  // === Load Country & Ocean ID Maps (triggers subtitle updates)
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
  return { animate };
}

/**
 * Typing helper for consumers of the startApp boot process
 */
export type StartAppContext = Awaited<ReturnType<typeof startApp>>;
