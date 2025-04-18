// materials.ts
import * as THREE from "three";
import { earthVertexShader, earthFragmentShader } from "./earthShaders";
import { GlobeUniforms } from "./types/uniforms";

// Define the material types for external use
export const defaultLineMaterial: THREE.MeshBasicMaterial =
  new THREE.MeshBasicMaterial({
    color: 0xcccccc,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

export const hoverLineMaterial: THREE.MeshBasicMaterial =
  new THREE.MeshBasicMaterial({
    color: 0x3399ff,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

// Factory function for globe material to pass in uniforms dynamically
export function createGlobeMaterial(
  uniforms: GlobeUniforms
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: earthVertexShader,
    fragmentShader: earthFragmentShader,
    depthWrite: true,
    transparent: false,
    blending: THREE.NormalBlending,
  });
}
