import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { CONFIG } from "../configs/config";

export function initializeScene(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
) {
  const scene = new THREE.Scene();

  const light = new THREE.DirectionalLight(
    CONFIG.lighting.directionalLight.color,
    CONFIG.lighting.directionalLight.intensity
  );
  const { x, y, z } = CONFIG.lighting.directionalLight.position;
  light.position.set(x, y, z);
  scene.add(light);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = true;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = CONFIG.speed.dampingFactor;
  controls.minPolarAngle = CONFIG.polarLimits.min;
  controls.maxPolarAngle = CONFIG.polarLimits.max;
  controls.minDistance = CONFIG.zoom.min;
  controls.maxDistance = CONFIG.zoom.max;
  controls.update();

  return { scene, controls };
}
