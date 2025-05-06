/**
 * @file globeMaterials.ts
 * @description Provides reusable factory functions for all materials used in the 3D globe rendering system.
 */

import { ShaderMaterial } from "three";
import {
  earthVertexShader,
  earthFragmentShader,
} from '@/core/earth/shaders/earthShaders';
import type { GlobeUniforms } from '@/core/earth/shaders/uniforms';
import { CONFIG } from '@/configs/config';

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
  });
}
