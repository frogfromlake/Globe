/**
 * @file createAuroraMaterial.ts
 * @description Provides the ShaderMaterial used to render auroras around the Earth's polar regions.
 */

import { ShaderMaterial, Vector2, Vector3 } from "three";
import {
  auroraVertexShader,
  auroraFragmentShader,
} from "../shaders/earthShaders";

/**
 * Creates a ShaderMaterial for rendering volumetric auroras using raymarching techniques.
 * The shader computes dynamic, shimmering curtains based on view rays and time.
 *
 * @param resolution - The current render resolution (used for dithering and noise).
 * @returns A ShaderMaterial ready for use on a polar aurora mesh.
 */
export function createAuroraMaterial(resolution: Vector2): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: auroraVertexShader,
    fragmentShader: auroraFragmentShader,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0.0 },
      uResolution: { value: resolution.clone() },
      lightDirection: { value: new Vector3(1, 0, 0) },
    },
  });
}
