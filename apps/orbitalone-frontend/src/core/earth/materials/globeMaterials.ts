import { ShaderMaterial } from "three";
import {
  earthVertexShader,
  earthFragmentShader,
} from "@/core/earth/shaders/earthShaders";
import type { GlobeUniforms } from "@/core/earth/shaders/uniforms";
import { CONFIG } from "@/configs/config";

/**
 * Creates the custom Earth shader material with all globe uniforms.
 */
export function createGlobeMaterial(uniforms: GlobeUniforms): ShaderMaterial {
  return new ShaderMaterial({
    uniforms,
    vertexShader: earthVertexShader,
    fragmentShader: earthFragmentShader,
    depthWrite: CONFIG.materials.globeMaterial.depthWrite,
    transparent: CONFIG.materials.globeMaterial.transparent,
    blending: CONFIG.materials.globeMaterial.blending,

    // Safe performance-related flags
    fog: false, // Not used in shaders
    lights: false, // Not needed: Using custom directional light logic
    toneMapped: false, // Not needed: Manually controlling brightness and tone in the shader
    // precision: "mediump", // Optional: lower quality
  });
}
