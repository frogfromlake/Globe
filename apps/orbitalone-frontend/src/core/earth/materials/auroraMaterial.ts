/**
 * @file createAuroraMaterial.ts
 * @description Provides the ShaderMaterial used to render auroras around the Earth's polar regions.
 */

import {
  AdditiveBlending,
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipMapLinearFilter,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  Vector3,
} from "three";
import {
  auroraVertexShader,
  auroraFragmentShader,
} from "@/core/earth/shaders/earthShaders";
import { CONFIG } from "@/configs/config";
import { latLonToUnitVector } from "@/core/earth/geo/coordinates";

/**
 * Creates a ShaderMaterial for rendering raymarched auroras with dynamic waving bands.
 * This shader simulates polar auroras using noise-based animation and magnetic pole alignment.
 *
 * @param resolution - The current render resolution, used for dithering/noise scaling.
 * @returns A high-quality ShaderMaterial for polar aurora effects.
 */
export function createAuroraMaterial(resolution: Vector2): ShaderMaterial {
  const texture = new TextureLoader().load(CONFIG.textures.auroraNoisePath);
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.minFilter = LinearMipMapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;

  return new ShaderMaterial({
    vertexShader: auroraVertexShader,
    fragmentShader: auroraFragmentShader,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    fog: false,
    lights: false,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0.0 },
      uAuroraMap: { value: texture },
      lightDirection: { value: new Vector3(1, 0, 0) },
      uMagneticNorth: { value: latLonToUnitVector(86.5, -161) },
      uMagneticSouth: { value: latLonToUnitVector(-64.5, 137) },
    },
  });
}
