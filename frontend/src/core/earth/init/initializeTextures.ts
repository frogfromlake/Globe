/**
 * initializeTextures.ts
 * Loads and configures textures used by the OrbitalOne application.
 * Now split into prioritized chunks for better startup performance.
 */

import {
  Texture,
  WebGLRenderer,
  TextureLoader,
  LinearSRGBColorSpace,
  SRGBColorSpace,
  ClampToEdgeWrapping,
  RepeatWrapping,
} from "three";

import { CONFIG } from "@/configs/config";

const loader = new TextureLoader();

/**
 * Apply standard filtering and anisotropy to base map textures.
 */
const applyBaseMapSettings = (texture: Texture, renderer: WebGLRenderer) => {
  texture.minFilter = CONFIG.textures.minFilter;
  texture.magFilter = CONFIG.textures.magFilter;
  texture.anisotropy = Math.min(
    CONFIG.textures.maxAnisotropy,
    renderer.capabilities.getMaxAnisotropy()
  );
};

/**
 * Apply configuration for linear color-space ID maps.
 */
const applyIdMapSettings = (texture: Texture, flipY: boolean = false) => {
  texture.colorSpace = LinearSRGBColorSpace;
  texture.magFilter = CONFIG.textures.idMagFilter;
  texture.minFilter = CONFIG.textures.idMinFilter;
  texture.generateMipmaps = CONFIG.textures.generateMipmaps;
  texture.flipY = flipY;
  texture.needsUpdate = true;
};

/**
 * Loads lightweight ID map textures for early interactivity.
 */
export async function loadCoreTextures() {
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

export async function loadDayTexture(renderer: WebGLRenderer) {
  const t = await loader.loadAsync(CONFIG.textures.dayMapPath);
  applyBaseMapSettings(t, renderer);
  return t;
}

export async function loadNightTexture(renderer: WebGLRenderer) {
  const t = await loader.loadAsync(CONFIG.textures.nightMapPath);
  applyBaseMapSettings(t, renderer);
  return t;
}

export async function loadSkyMapTexture() {
  const t = await loader.loadAsync(CONFIG.textures.esoSkyMapPath);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export async function loadCloudTexture(renderer: WebGLRenderer) {
  const t = await loader.loadAsync(CONFIG.textures.cloudsMapPath);
  applyBaseMapSettings(t, renderer);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = RepeatWrapping;
  t.wrapT = ClampToEdgeWrapping;
  return t;
}
