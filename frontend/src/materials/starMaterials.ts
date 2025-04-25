/**
 * @file starMaterials.ts
 * @description Provides the material used for rendering the background star sphere around the Earth.
 */

import * as THREE from "three";
import { CONFIG } from "../configs/config";
import {
  starsVertexShader,
  starsFragmentShader,
} from "../shaders/earthShaders";

/**
 * Creates a `MeshBasicMaterial` for the star sphere using the provided ESO sky texture.
 * Applies a color tint and opacity defined in the configuration.
 *
 * @returns A Three.js material for rendering the star background.
 */
export function createStarMaterial(
  esoSkyMapTexture: THREE.Texture,
  sharedUniforms: Record<string, THREE.IUniform>
): THREE.ShaderMaterial {
  esoSkyMapTexture.colorSpace = THREE.SRGBColorSpace;

  return new THREE.ShaderMaterial({
    vertexShader: starsVertexShader,
    fragmentShader: starsFragmentShader,
    uniforms: {
      uStarMap: { value: esoSkyMapTexture },
      uStarFade: { value: 0 },
      uTimeStars: sharedUniforms.uTime,
      uStarOpacity: { value: CONFIG.stars.opacity },
    },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });
}  