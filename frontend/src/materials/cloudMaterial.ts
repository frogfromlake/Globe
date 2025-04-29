/**
 * @file cloudMaterial.ts
 * @description Provides the material used for rendering the thin cloud layer around the Earth.
 */

import { ShaderMaterial, Texture, Vector2, Vector3 } from "three";
import {
  cloudsVertexShader,
  cloudsFragmentShader,
} from "../shaders/earthShaders";

/**
 * Creates a ShaderMaterial for the cloud sphere with soft cloud edges.
 *
 * @param cloudTexture - (Optional) Placeholder or actual cloud texture.
 * @returns A ShaderMaterial ready for the cloud layer.
 */
export function createCloudMaterial(cloudTexture?: Texture) {
  return new ShaderMaterial({
    vertexShader: cloudsVertexShader,
    fragmentShader: cloudsFragmentShader,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uCloudMap: { value: cloudTexture || null },
      uCloudFade: { value: 0.0 },
      uCloudTime: { value: 0.0 },
      uLightDirection: { value: new Vector3(1, 0, 0) },
      uCloudDrift: { value: new Vector2(1, 0) },
      uBaseDriftSpeed: { value: 0.4 },
    },
  });
}
