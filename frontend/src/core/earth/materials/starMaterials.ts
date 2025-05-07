/**
 * @file starMaterials.ts
 * @description Provides the ShaderMaterial used for rendering the background star sphere around the Earth.
 */

import {
  Texture,
  ShaderMaterial,
  BackSide,
  SRGBColorSpace,
  IUniform,
} from "three";
import { CONFIG } from "@/configs/config";
import {
  starsVertexShader,
  starsFragmentShader,
} from "@/core/earth/shaders/earthShaders";

/**
 * Creates a ShaderMaterial for the star background sphere.
 * This uses an HDR-tinted ESO sky texture and supports dynamic fading via uniforms.
 *
 * @param esoSkyMapTexture - The starfield texture to be used as a sky dome.
 * @param sharedUniforms - Shared app-wide uniforms (used if `uStarFade` is animated globally).
 * @returns A configured ShaderMaterial for the star sphere.
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
      uStarFade: sharedUniforms.uStarFade ?? { value: 0 },
      uStarOpacity: { value: CONFIG.stars.opacity },
    },
    side: BackSide,
    transparent: true,
    depthWrite: false,
  });
}
