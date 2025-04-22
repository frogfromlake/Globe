import * as THREE from "three";
import { CONFIG } from "../configs/config";

export function initializeRenderer(
  camera: THREE.PerspectiveCamera
): THREE.WebGLRenderer {
  const canvas = document.getElementById(
    CONFIG.renderer.canvasId
  ) as HTMLCanvasElement;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: CONFIG.renderer.antialias,
  });

  renderer.debug.checkShaderErrors = CONFIG.renderer.checkShaderErrors;
  renderer.outputColorSpace = CONFIG.renderer.outputColorSpace;

  renderer.setSize(window.innerWidth, window.innerHeight);
  const pixelRatio =
    CONFIG.renderer.pixelRatio === "device"
      ? window.devicePixelRatio
      : CONFIG.renderer.pixelRatio;
  renderer.setPixelRatio(pixelRatio);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return renderer;
}
