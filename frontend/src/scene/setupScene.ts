/**
 * @file setupScene.ts
 * @description Defines and adds the globe, atmosphere, and star background objects to the Three.js scene.
 */

import * as THREE from "three";
import { CONFIG } from "../configs/config";
import { createStarMaterial } from "../materials/starMaterials";
import {
  atmosphereFragmentShader,
  atmosphereVertexShader,
  earthFragmentShader,
  earthVertexShader,
} from "../shaders/earthShaders";

/**
 * Initializes and adds the main 3D globe, its atmosphere layer, and the surrounding star background to the scene.
 *
 * @param scene - The Three.js scene to which objects will be added.
 * @param uniforms - Uniforms shared between shaders and the rendering pipeline (used for the globe).
 * @param esoSkyMapTexture - High-res star map texture for the star sphere background.
 * @returns An object containing the created globe, atmosphere, and star sphere meshes.
 */
export function setupSceneObjects(
  scene: THREE.Scene,
  uniforms: { [key: string]: any },
  esoSkyMapTexture: THREE.Texture
): {
  globe: THREE.Mesh;
  atmosphere: THREE.Mesh;
  starSphere: THREE.Mesh;
} {
  // === Globe (Earth) ===
  const globeGeometry = new THREE.SphereGeometry(
    CONFIG.globe.radius,
    CONFIG.globe.widthSegments,
    CONFIG.globe.heightSegments
  );

  const globeMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: earthVertexShader,
    fragmentShader: earthFragmentShader,
  });

  const globe = new THREE.Mesh(globeGeometry, globeMaterial);
  scene.add(globe);

  // === Atmosphere ===
  const atmosphereRadius = CONFIG.globe.radius * 1.027;

  const atmosphereGeometry = new THREE.SphereGeometry(
    atmosphereRadius,
    128,
    128
  );
  const atmosphereMaterial = new THREE.ShaderMaterial({
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uCameraDistance: { value: 5.0 },
      uLightDirection: { value: new THREE.Vector3(1, 0, 0) },
    },
  });

  const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
  scene.add(atmosphere);

  // === Star Sphere ===
  esoSkyMapTexture.wrapS = THREE.RepeatWrapping;
  esoSkyMapTexture.wrapT = THREE.RepeatWrapping;
  esoSkyMapTexture.offset.set(CONFIG.stars.offset.x, CONFIG.stars.offset.y);

  const starSphereGeometry = new THREE.SphereGeometry(
    CONFIG.stars.radius,
    CONFIG.stars.widthSegments,
    CONFIG.stars.heightSegments
  );

  const starMaterial = createStarMaterial(esoSkyMapTexture, uniforms);
  
  const starSphere = new THREE.Mesh(starSphereGeometry, starMaterial);

  // Explicit render order
  starSphere.renderOrder = -1;
  atmosphere.renderOrder = 0;
  globe.renderOrder = 1;

  scene.add(starSphere);

  return { globe, atmosphere, starSphere };
}
