import { MathUtils, Spherical, Vector3, PerspectiveCamera } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

/**
 * Sets up WASD/Arrow key globe rotation.
 * Ignores key inputs while typing into inputs.
 *
 * @param camera - Perspective camera.
 * @param controls - OrbitControls instance.
 * @returns Per-frame update function.
 */
export function setupKeyboardControls(
  camera: PerspectiveCamera,
  controls: OrbitControls
) {
  const pressed: Record<string, boolean> = {};
  const rotateSpeed = 2.0;
  const dampingFactor = 2.0;

  const velocity = { azimuth: 0, polar: 0 };
  const spherical = new Spherical();
  const offset = new Vector3();

  // Track key press state globally
  window.addEventListener("keydown", (e) => {
    pressed[e.key.toLowerCase()] = true;
  });

  window.addEventListener("keyup", (e) => {
    pressed[e.key.toLowerCase()] = false;
  });

  return function updateKeyboard(delta: number) {
    const activeElement = document.activeElement;
    const isTyping =
      activeElement &&
      (activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA");

    const step = rotateSpeed * delta;
    let targetAzimuth = 0;
    let targetPolar = 0;

    // Only process movement if user is NOT typing
    if (!isTyping) {
      if (pressed["arrowleft"] || pressed["a"]) targetAzimuth -= step;
      if (pressed["arrowright"] || pressed["d"]) targetAzimuth += step;
      if (pressed["arrowup"] || pressed["w"]) targetPolar -= step;
      if (pressed["arrowdown"] || pressed["s"]) targetPolar += step;
    }

    velocity.azimuth = MathUtils.damp(
      velocity.azimuth,
      targetAzimuth,
      dampingFactor,
      delta
    );
    velocity.polar = MathUtils.damp(
      velocity.polar,
      targetPolar,
      dampingFactor,
      delta
    );

    if (velocity.azimuth === 0 && velocity.polar === 0) return;

    // Apply rotation
    offset.copy(camera.position).sub(controls.target);
    spherical.setFromVector3(offset);

    spherical.theta += velocity.azimuth;
    spherical.phi += velocity.polar;

    const EPS = 0.0001;
    spherical.phi = MathUtils.clamp(spherical.phi, EPS, Math.PI - EPS);

    offset.setFromSpherical(spherical);
    camera.position.copy(controls.target).add(offset);
    camera.lookAt(controls.target);
  };
}
