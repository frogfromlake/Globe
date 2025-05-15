/**
 * initializeScene.ts
 * Configures and returns the main Scene and OrbitControls for the 3D globe application.
 */

import {
  Scene,
  DirectionalLight,
  PerspectiveCamera,
  WebGLRenderer,
} from "three";

import { CONFIG } from "@/configs/config";

/**
 * Initializes the Three.js scene and camera controls.
 *
 * @param camera - The main perspective camera used for rendering the scene.
 * @param renderer - The WebGLRenderer instance used to attach controls.
 * @returns A Promise resolving to an object containing the configured scene and OrbitControls.
 */
export async function initializeScene(
  camera: PerspectiveCamera,
  renderer: WebGLRenderer
) {
  // Lazy-load OrbitControls to reduce upfront bundle size
  const { OrbitControls } = await import(
    "three/examples/jsm/controls/OrbitControls"
  );

  // === Create and configure scene ===
  const scene = new Scene();
  scene.name = "OrbitalOneRootScene";

  // === Directional sunlight ===
  const { color, intensity, position } = CONFIG.lighting.directionalLight;
  const light = new DirectionalLight(color, intensity);
  light.position.set(position.x, position.y, position.z);
  scene.add(light);

  // === OrbitControls for user camera manipulation ===
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = true;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = CONFIG.speed.dampingFactor;

  controls.minPolarAngle = CONFIG.polarLimits.min;
  controls.maxPolarAngle = CONFIG.polarLimits.max;
  controls.minDistance = CONFIG.zoom.min;
  controls.maxDistance = CONFIG.zoom.max;

  controls.update(); // Ensure initial sync with camera

  return { scene, controls };
}
