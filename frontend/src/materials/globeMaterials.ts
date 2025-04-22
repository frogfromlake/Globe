import * as THREE from "three";
import {
  earthVertexShader,
  earthFragmentShader,
} from "../shaders/earthShaders";
import { GlobeUniforms } from "../types/uniforms";
import { CONFIG } from "../configs/config";

export function createGlobeMaterial(
  uniforms: GlobeUniforms
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: earthVertexShader,
    fragmentShader: earthFragmentShader,
    depthWrite: CONFIG.materials.globeMaterial.depthWrite,
    transparent: CONFIG.materials.globeMaterial.transparent,
    blending: CONFIG.materials.globeMaterial.blending,
  });
}
