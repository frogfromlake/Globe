import {
  ShaderMaterial,
  Texture,
  Vector2,
  Vector3,
  RepeatWrapping,
} from "three";
import {
  cloudsVertexShader,
  cloudsFragmentShader,
} from "../shaders/earthShaders";

/**
 * Creates a ShaderMaterial for the cloud sphere with soft cloud edges and drifting.
 *
 * @param cloudTexture - Optional placeholder or loaded cloud texture.
 * @returns A ShaderMaterial configured for the animated cloud layer.
 */
export function createCloudMaterial(cloudTexture?: Texture) {
  const MAX_FLASHES = 100; // Same as in shader

  if (cloudTexture) {
    cloudTexture.wrapS = RepeatWrapping;
    cloudTexture.wrapT = RepeatWrapping;
  }

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
      uFlashPoints: {
        value: Array.from({ length: MAX_FLASHES }, () => new Vector2(0, 0)),
      },
      uFlashStrengths: { value: new Array(MAX_FLASHES).fill(0) },
      uNumFlashes: { value: MAX_FLASHES },
    },
  });
}
