import { PerspectiveCamera, ShaderMaterial, MathUtils } from "three";
import { CONFIG } from "@/configs/config";

/**
 * Updates camera controls and atmosphere/lighting uniforms based on zoom level.
 *
 * - Dynamically adjusts rotateSpeed and zoomSpeed based on distance.
 * - Updates atmosphere shader with current camera distance and light direction.
 *
 * @param camera - The Three.js perspective camera.
 * @param controls - OrbitControls or equivalent.
 * @param atmosphereMaterial - Atmosphere shader material.
 * @param uniforms - Shared globe shader uniforms.
 */
export function updateCameraControls(
  camera: PerspectiveCamera,
  controls: any,
  atmosphereMaterial: ShaderMaterial,
  uniforms: { [key: string]: any }
): void {
  const distance = camera.position.distanceTo(controls.target);
  const zoomRange = CONFIG.zoom.max - CONFIG.zoom.min;
  const normalizedZoom = (distance - CONFIG.zoom.min) / zoomRange;

  controls.rotateSpeed = MathUtils.clamp(
    CONFIG.interaction.rotateSpeed.base +
      normalizedZoom * CONFIG.interaction.rotateSpeed.scale,
    CONFIG.interaction.rotateSpeed.min,
    CONFIG.interaction.rotateSpeed.max
  );

  controls.zoomSpeed = MathUtils.clamp(
    CONFIG.interaction.zoomSpeed.base +
      normalizedZoom * CONFIG.interaction.zoomSpeed.scale,
    CONFIG.interaction.zoomSpeed.min,
    CONFIG.interaction.zoomSpeed.max
  );

  atmosphereMaterial.uniforms.uCameraDistance.value = distance;
  atmosphereMaterial.uniforms.uLightDirection.value.copy(
    uniforms.lightDirection.value
  );
}
