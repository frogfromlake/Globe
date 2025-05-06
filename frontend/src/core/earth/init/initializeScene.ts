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

import { CONFIG } from '@/configs/config';

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
  // Dynamically import OrbitControls only when needed
  const { OrbitControls } = await import(
    "three/examples/jsm/controls/OrbitControls"
  );

  // Create the main scene
  const scene = new Scene();

  // Add directional lighting to the scene
  const light = new DirectionalLight(
    CONFIG.lighting.directionalLight.color,
    CONFIG.lighting.directionalLight.intensity
  );
  const { x, y, z } = CONFIG.lighting.directionalLight.position;
  light.position.set(x, y, z);
  scene.add(light);

  // Configure orbit-style camera controls
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
