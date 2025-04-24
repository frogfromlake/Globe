/**
 * @file keyboardControls.ts
 * @description Adds WASD/arrow key camera controls to rotate the globe using OrbitControls.
 * Uses smooth damping for inertial movement. Call the returned update function inside your animation loop.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

/**
 * Sets up keyboard-based globe rotation using arrow keys or WASD.
 * Smoothly applies damped azimuth and polar changes to the camera.
 *
 * @param camera - The PerspectiveCamera instance.
 * @param controls - OrbitControls instance for the scene.
 * @returns An update function to call within the render loop.
 */
export function setupKeyboardControls(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls
) {
  const pressed: Record<string, boolean> = {};
  const rotateSpeed = 2.0;
  const dampingFactor = 2.0;

  const velocity = { azimuth: 0, polar: 0 };
  const spherical = new THREE.Spherical();
  const offset = new THREE.Vector3();

  // Track key press state
  window.addEventListener("keydown", (e) => {
    pressed[e.key.toLowerCase()] = true;
  });

  window.addEventListener("keyup", (e) => {
    pressed[e.key.toLowerCase()] = false;
  });

  /**
   * Updates camera rotation based on keyboard input and delta time.
   * Should be called every frame from your main animation loop.
   *
   * @param delta - Time in seconds since the last frame.
   */
  return function updateKeyboard(delta: number) {
    const step = rotateSpeed * delta;

    let targetAzimuth = 0;
    let targetPolar = 0;

    if (pressed["arrowleft"] || pressed["a"]) targetAzimuth -= step;
    if (pressed["arrowright"] || pressed["d"]) targetAzimuth += step;
    if (pressed["arrowup"] || pressed["w"]) targetPolar -= step;
    if (pressed["arrowdown"] || pressed["s"]) targetPolar += step;

    // Apply smooth damping to movement
    velocity.azimuth = THREE.MathUtils.damp(
      velocity.azimuth,
      targetAzimuth,
      dampingFactor,
      delta
    );
    velocity.polar = THREE.MathUtils.damp(
      velocity.polar,
      targetPolar,
      dampingFactor,
      delta
    );

    // Skip update if no motion
    if (velocity.azimuth === 0 && velocity.polar === 0) return;

    // Convert camera position to spherical coordinates
    offset.copy(camera.position).sub(controls.target);
    spherical.setFromVector3(offset);

    // Apply rotation deltas
    spherical.theta += velocity.azimuth;
    spherical.phi += velocity.polar;

    // Clamp polar angle to avoid poles
    const EPS = 0.0001;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi, EPS, Math.PI - EPS);

    // Recalculate camera position
    offset.setFromSpherical(spherical);
    camera.position.copy(controls.target).add(offset);
    camera.lookAt(controls.target);
  };
}
