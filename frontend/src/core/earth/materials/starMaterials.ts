/**
 * @file starMaterials.ts
 * @description Provides the material used for rendering the background star sphere around the Earth.
 */

import {
  Texture,
  ShaderMaterial,
  BackSide,
  SRGBColorSpace,
  IUniform,
} from "three";
import { CONFIG } from '@/configs/config';
import {
  starsVertexShader,
  starsFragmentShader,
} from '@/core/earth/shaders/earthShaders';

/**
 * Creates a `MeshBasicMaterial` for the star sphere using the provided ESO sky texture.
 * Applies a color tint and opacity defined in the configuration.
 *
 * @returns A Three.js material for rendering the star background.
 */
export function createStarMaterial(
  esoSkyMapTexture: Texture,
  sharedUniforms: Record<string, IUniform>
): ShaderMaterial {
  esoSkyMapTexture.colorSpace = SRGBColorSpace;

  return new ShaderMaterial({
    vertexShader: starsVertexShader,
    fragmentShader: starsFragmentShader,
    uniforms: {
      uStarMap: { value: esoSkyMapTexture },
      uStarFade: { value: 0 },
      uStarOpacity: { value: CONFIG.stars.opacity },
    },
    side: BackSide,
    transparent: true,
    depthWrite: false,
  });
}
