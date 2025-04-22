import * as THREE from "three";
import {
  earthVertexShader,
  earthFragmentShader,
} from "../shaders/earthShaders";
import { GlobeUniforms } from "../types/uniforms";
import { CONFIG } from "../configs/config";

export const defaultLineMaterial: THREE.MeshBasicMaterial =
  new THREE.MeshBasicMaterial({
    color: CONFIG.materials.borderLineDefault.color,
    transparent: true,
    opacity: CONFIG.materials.borderLineDefault.opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

export const hoverLineMaterial: THREE.MeshBasicMaterial =
  new THREE.MeshBasicMaterial({
    color: CONFIG.materials.borderLineHover.color,
    transparent: true,
    opacity: CONFIG.materials.borderLineHover.opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

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