/**
 * initializeTextures.ts
 * Loads and configures textures used by the OrbitalOne application.
 * Split into two phases: core (ID maps) and visual (day/night/sky maps).
 */

import * as THREE from "three";
import { CONFIG } from "../configs/config";

/**
 * Apply standard filtering and anisotropy to base map textures.
 * Used for visuals like day and night Earth textures.
 */
const applyBaseMapSettings = (
  texture: THREE.Texture,
  renderer: THREE.WebGLRenderer
) => {
  texture.minFilter = CONFIG.textures.minFilter;
  texture.magFilter = CONFIG.textures.magFilter;
  texture.anisotropy = Math.min(
    CONFIG.textures.maxAnisotropy,
    renderer.capabilities.getMaxAnisotropy()
  );
};

/**
 * Apply configuration for linear color-space ID maps.
 * Used for selection masks like country and ocean ID maps.
 */
const applyIdMapSettings = (texture: THREE.Texture, flipY: boolean = false) => {
  texture.colorSpace = THREE.LinearSRGBColorSpace;
  texture.magFilter = CONFIG.textures.idMagFilter;
  texture.minFilter = CONFIG.textures.idMinFilter;
  texture.generateMipmaps = CONFIG.textures.generateMipmaps;
  texture.flipY = flipY;
  texture.needsUpdate = true;
};

/**
 * Loads lightweight ID map textures for early interactivity.
 * These should be ready before the first render.
 */
export async function loadCoreTextures() {
  const loader = new THREE.TextureLoader();
  const startTime = performance.now();

  const countryIdMapTexture = await loader
    .loadAsync(CONFIG.textures.countryIdMapPath)
    .then((t) => {
      applyIdMapSettings(t, CONFIG.textures.flipY);
      return t;
    });

  const oceanIdMapTexture = await loader
    .loadAsync(CONFIG.textures.oceanIdMapPath)
    .then((t) => {
      applyIdMapSettings(t, true);
      return t;
    });

  return {
    countryIdMapTexture,
    oceanIdMapTexture,
  };
}

/**
 * Loads high-resolution visual textures (day, night, sky) in the background.
 * Should be called after first frame to avoid blocking FCP and TBT.
 */
export async function loadVisualTextures(renderer: THREE.WebGLRenderer) {
  const loader = new THREE.TextureLoader();
  const startTime = performance.now();

  const [dayTexture, nightTexture, esoSkyMapTexture] = await Promise.all([
    loader.loadAsync(CONFIG.textures.dayMapPath).then((t) => {
      applyBaseMapSettings(t, renderer);
      return t;
    }),
    loader.loadAsync(CONFIG.textures.nightMapPath).then((t) => {
      applyBaseMapSettings(t, renderer);
      return t;
    }),
    loader.loadAsync(CONFIG.textures.esoSkyMapPath).then((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }),
  ]);

  return {
    dayTexture,
    nightTexture,
    esoSkyMapTexture,
  };
}
