/**
 * @file starMaterials.ts
 * @description Provides the material used for rendering the background star sphere around the Earth.
 */

import * as THREE from "three";
import { CONFIG } from "../configs/config";

/**
 * Creates a `MeshBasicMaterial` for the star sphere using the provided ESO sky texture.
 * Applies a color tint and opacity defined in the configuration.
 *
 * @returns A Three.js material for rendering the star background.
 */
export function createStarMaterial(): THREE.MeshBasicMaterial {
  const starTexture = new THREE.TextureLoader().load(
    CONFIG.textures.esoSkyMapPath,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
  );

  return new THREE.MeshBasicMaterial({
    map: starTexture,
    side: THREE.BackSide,
    depthWrite: false,
    transparent: true,
    opacity: CONFIG.stars.opacity,
    color: new THREE.Color(...CONFIG.stars.tint), // RGB array in 0–1
  });
}
