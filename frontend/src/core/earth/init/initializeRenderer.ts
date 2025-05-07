/**
 * @file initializeRenderer.ts
 * @description Sets up the WebGL renderer with performance-conscious defaults and resize behavior.
 */

import { WebGLRenderer, PerspectiveCamera, NoToneMapping } from "three";
import { CONFIG } from "@/configs/config";

/**
 * Initializes a WebGLRenderer with adaptive pixel ratio and resize handling.
 *
 * @param camera - Perspective camera to sync with viewport aspect.
 * @returns Configured WebGLRenderer instance.
 */
export function initializeRenderer(camera: PerspectiveCamera): WebGLRenderer {
  const canvas = document.getElementById(
    CONFIG.renderer.canvasId
  ) as HTMLCanvasElement;

  const renderer = new WebGLRenderer({
    canvas,
    antialias: CONFIG.renderer.antialias,
    powerPreference: "high-performance", // Hints to use GPU where possible
    alpha: false, // Unless you explicitly need canvas transparency
    stencil: false, // Disable unless you're using advanced masking
    depth: true, // Keep if needed for 3D depth (true by default)
    preserveDrawingBuffer: false, // Only needed for screenshots
  });

  // Disable dev-only checks in production
  renderer.debug.checkShaderErrors = !!CONFIG.renderer.checkShaderErrors;

  // Color space handling (sRGB correct output)
  renderer.outputColorSpace = CONFIG.renderer.outputColorSpace;

  // Disable tone mapping unless you need HDR
  renderer.toneMapping = NoToneMapping;

  // Configure resolution
  const pixelRatio =
    CONFIG.renderer.pixelRatio === "device"
      ? Math.min(window.devicePixelRatio, CONFIG.renderer.maxPixelRatio || 2)
      : CONFIG.renderer.pixelRatio;
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Resize logic
  window.addEventListener("resize", () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });

  return renderer;
}
