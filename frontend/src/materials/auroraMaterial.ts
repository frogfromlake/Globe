/**
 * @file createAuroraMaterial.ts
 * @description Provides the ShaderMaterial used to render auroras around the Earth's polar regions.
 */

import {
  AdditiveBlending,
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipMapLinearFilter,
  RepeatWrapping,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  Vector3,
} from "three";
import {
  auroraVertexShader,
  auroraFragmentShader,
} from "../shaders/earthShaders";
import { CONFIG } from "../configs/config";
import { latLonToUnitVector } from "../globe/geo";

/**
 * Creates a ShaderMaterial for rendering volumetric auroras using raymarching techniques.
 * The shader computes dynamic, shimmering curtains based on view rays and time.
 *
 * @param resolution - The current render resolution (used for dithering and noise).
 * @returns A ShaderMaterial ready for use on a polar aurora mesh.
 */
export function createAuroraMaterial(resolution: Vector2) {
  const texture = new TextureLoader().load(CONFIG.textures.auroraNoisePath);
  texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
  texture.minFilter = LinearMipMapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;

  return new ShaderMaterial({
    vertexShader: auroraVertexShader,
    fragmentShader: auroraFragmentShader,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0.0 },
      uAuroraMap: { value: texture },
      lightDirection: { value: new Vector3(1, 0, 0) },
      uMagneticNorth: { value: latLonToUnitVector(86.5, -161) },
      uMagneticSouth: { value: latLonToUnitVector(-64.5, 137) },
    },
  });
}
