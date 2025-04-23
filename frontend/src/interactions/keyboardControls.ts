import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

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

  window.addEventListener("keydown", (e) => {
    pressed[e.key.toLowerCase()] = true;
  });

  window.addEventListener("keyup", (e) => {
    pressed[e.key.toLowerCase()] = false;
  });

  return function updateKeyboard(delta: number) {
    const step = rotateSpeed * delta;

    let targetAzimuth = 0;
    let targetPolar = 0;

    if (pressed["arrowleft"] || pressed["a"]) targetAzimuth -= step;
    if (pressed["arrowright"] || pressed["d"]) targetAzimuth += step;
    if (pressed["arrowup"] || pressed["w"]) targetPolar -= step;
    if (pressed["arrowdown"] || pressed["s"]) targetPolar += step;

    // Apply damping (inertia)
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

    if (velocity.azimuth === 0 && velocity.polar === 0) return;

    offset.copy(camera.position).sub(controls.target);
    spherical.setFromVector3(offset);

    spherical.theta += velocity.azimuth;
    spherical.phi += velocity.polar;

    const EPS = 0.0001;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi, EPS, Math.PI - EPS);

    offset.setFromSpherical(spherical);
    camera.position.copy(controls.target).add(offset);
    camera.lookAt(controls.target);
  };
}
