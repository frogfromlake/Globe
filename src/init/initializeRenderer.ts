import * as THREE from "three";

export function initializeRenderer(camera: THREE.PerspectiveCamera): THREE.WebGLRenderer {
  const canvas = document.getElementById("globe") as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.debug.checkShaderErrors = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return renderer;
}
