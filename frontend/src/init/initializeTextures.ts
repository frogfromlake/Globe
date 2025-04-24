/**
 * initializeTextures.ts
 * Loads and configures all global textures required by the 3D Earth application,
 * including base maps, country/ocean ID maps, and the sky background.
 */

import * as THREE from "three";
import { CONFIG } from "../configs/config";

/**
 * Loads and returns the required textures used throughout the app.
 * Applies consistent filtering and color space settings.
 *
 * @param renderer - WebGLRenderer instance used to determine max anisotropy.
 * @returns An object containing all initialized textures.
 */
export function initializeTextures(renderer: THREE.WebGLRenderer) {
  const loader = new THREE.TextureLoader();

  const maxAnisotropy = Math.min(
    CONFIG.textures.maxAnisotropy,
    renderer.capabilities.getMaxAnisotropy()
  );

  /**
   * Apply standard filtering and anisotropy to color textures (e.g. day/night maps).
   */
  const applyBaseMapSettings = (texture: THREE.Texture) => {
    texture.minFilter = CONFIG.textures.minFilter;
    texture.magFilter = CONFIG.textures.magFilter;
    texture.anisotropy = maxAnisotropy;
  };

  /**
   * Apply configuration for linear color-space ID maps.
   * Used for selection masks like country and ocean ID maps.
   */
  const applyIdMapSettings = (
    texture: THREE.Texture,
    flipY: boolean = false
  ) => {
    texture.colorSpace = THREE.LinearSRGBColorSpace;
    texture.magFilter = CONFIG.textures.idMagFilter;
    texture.minFilter = CONFIG.textures.idMinFilter;
    texture.generateMipmaps = CONFIG.textures.generateMipmaps;
    texture.flipY = flipY;
    texture.needsUpdate = true;
  };

  const dayTexture = loader.load(
    CONFIG.textures.dayMapPath,
    applyBaseMapSettings
  );

  const nightTexture = loader.load(
    CONFIG.textures.nightMapPath,
    applyBaseMapSettings
  );

  const shouldFlipCountryIdMap = CONFIG.textures.flipY;
  const shouldFlipOceanIdMap = true;

  const countryIdMapTexture = loader.load(
    CONFIG.textures.countryIdMapPath,
    (tex) => applyIdMapSettings(tex, shouldFlipCountryIdMap)
  );

  const oceanIdMapTexture = loader.load(CONFIG.textures.oceanIdMapPath, (tex) =>
    applyIdMapSettings(tex, shouldFlipOceanIdMap)
  );

  const esoSkyMapTexture = loader.load(CONFIG.textures.esoSkyMapPath, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
  });

  return {
    dayTexture,
    nightTexture,
    countryIdMapTexture,
    oceanIdMapTexture,
    esoSkyMapTexture,
  };
}
