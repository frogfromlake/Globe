// /animation/loopParts/updateAurora.ts

import { Mesh, ShaderMaterial, Vector3 } from "three";
import { latLonToUnitVector } from "@/core/earth/geo/coordinates";

/**
 * Updates the aurora shader material with time and light/magnetic direction.
 *
 * @param auroraMesh - The mesh representing aurora effects (should use a ShaderMaterial).
 * @param lightDirection - The current light direction in world space (copied from globe uniforms).
 * @param nowInSeconds - Time in seconds used for animation progression.
 */
export function updateAurora(
  auroraMesh: Mesh,
  lightDirection: Vector3,
  nowInSeconds: number
): void {
  const material = auroraMesh.material;
  if (!(material instanceof ShaderMaterial)) return;

  material.uniforms.uTime.value = nowInSeconds * 0.015;

  // Copy current light direction from globe shader uniforms
  material.uniforms.lightDirection.value.copy(lightDirection);

  // Set magnetic poles (hardcoded based on empirical geomagnetic model)
  material.uniforms.uMagneticNorth.value.copy(latLonToUnitVector(86.5, -161));
  material.uniforms.uMagneticSouth.value.copy(latLonToUnitVector(-64.5, 137));
}
