import * as THREE from "three";
import { CONFIG } from "../configs/config";
import { createStarMaterial } from "../materials/starMaterials";
import {
  atmosphereFragmentShader,
  atmosphereVertexShader,
  earthFragmentShader,
  earthVertexShader,
} from "../shaders/earthShaders";

export function setupSceneObjects(
  scene: THREE.Scene,
  uniforms: { [key: string]: any },
  esoSkyMapTexture: THREE.Texture
) {
  // Globe
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(
      CONFIG.globe.radius,
      CONFIG.globe.widthSegments,
      CONFIG.globe.heightSegments
    ),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: earthVertexShader,
      fragmentShader: earthFragmentShader,
    })
  );
  scene.add(globe);

  // Atmosphere
  const atmosphereRadius = CONFIG.globe.radius * 1.027;

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(atmosphereRadius, 128, 128),
    new THREE.ShaderMaterial({
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
    })
  );
  scene.add(atmosphere);

  // Star sphere
  esoSkyMapTexture.wrapS = THREE.RepeatWrapping;
  esoSkyMapTexture.wrapT = THREE.RepeatWrapping;
  esoSkyMapTexture.offset.set(CONFIG.stars.offset.x, CONFIG.stars.offset.y);

  const starSphere = new THREE.Mesh(
    new THREE.SphereGeometry(
      CONFIG.stars.radius,
      CONFIG.stars.widthSegments,
      CONFIG.stars.heightSegments
    ),
    createStarMaterial()
  );
  scene.add(starSphere);

  return { globe, atmosphere, starSphere };
}
