// /animation/loopParts/updateCloudsAndLightning.ts

import { ShaderMaterial, Mesh, MathUtils, Vector2 } from "three";
import { CONFIG } from "@/configs/config";

/**
 * Updates cloud drift, speed variation, and lightning flashes.
 *
 * @param cloudSphere - The mesh using a cloud ShaderMaterial
 * @param uniforms - Shared uniforms (includes lightDirection)
 * @param now - current time (ms)
 * @param delta - frame delta (seconds)
 * @param driftState - drift & lightning state (mutable)
 */
export function updateCloudsAndLightning(
  cloudSphere: Mesh,
  uniforms: { [key: string]: any },
  now: number,
  delta: number,
  driftState: {
    cloudElapsedTime: number;
    currentDrift: Vector2;
    targetDrift: Vector2;
    lastDriftChange: number;
    cloudDriftBaseSpeed: number;
    cloudSpeedVariation: number;
    cloudTargetVariation: number;
    lastSpeedVariationChange: number;
    flashPoints: Vector2[];
    flashStrengths: number[];
    stormCenters: Vector2[];
  }
): void {
  // === Drift Direction Update ===
  if (now - driftState.lastDriftChange > 30000) {
    const maxAngleOffset = MathUtils.degToRad(10);
    const angleOffset = MathUtils.randFloatSpread(maxAngleOffset);
    const eastward = new Vector2(1, 0);
    driftState.targetDrift = eastward
      .clone()
      .rotateAround(new Vector2(0, 0), angleOffset);
    driftState.lastDriftChange = now;
  }

  driftState.currentDrift.lerp(driftState.targetDrift, delta * 0.015);
  driftState.currentDrift.normalize();

  // === Speed Variation Update ===
  if (now - driftState.lastSpeedVariationChange > 20000) {
    driftState.cloudTargetVariation = (Math.random() * 2 - 1) * 0.00001;
    driftState.lastSpeedVariationChange = now;
  }

  driftState.cloudSpeedVariation = MathUtils.lerp(
    driftState.cloudSpeedVariation,
    driftState.cloudTargetVariation,
    delta * 0.04
  );

  if (!isFinite(driftState.cloudSpeedVariation)) {
    driftState.cloudSpeedVariation = 0;
  }

  const totalSpeed = MathUtils.clamp(
    driftState.cloudDriftBaseSpeed + driftState.cloudSpeedVariation,
    0.00001,
    0.0001
  );

  // === Shader Uniform Updates ===
  const mat = cloudSphere.material;
  if (!(mat instanceof ShaderMaterial)) return;

  mat.uniforms.uCloudTime.value = (now % 60000) / 1000;
  mat.uniforms.uCloudDrift.value.copy(driftState.currentDrift);
  mat.uniforms.uLightDirection.value.copy(uniforms.lightDirection.value);
  mat.uniforms.uBaseDriftSpeed.value = totalSpeed;

  // === Storm Center Drift ===
  for (const center of driftState.stormCenters) {
    center.x += MathUtils.randFloatSpread(0.00002);
    center.y += MathUtils.randFloatSpread(0.00002);
    center.x = (center.x + 1) % 1;
    center.y = (center.y + 1) % 1;
  }

  // === Lightning Flashes ===
  for (let i = 0; i < driftState.flashPoints.length; i++) {
    const flashChance = 0.02 * MathUtils.randFloat(0.7, 1.3);
    if (Math.random() < flashChance) {
      const center =
        driftState.stormCenters[
          Math.floor(Math.random() * driftState.stormCenters.length)
        ];
      const jitter = new Vector2(
        MathUtils.randFloatSpread(0.05),
        MathUtils.randFloatSpread(0.05)
      );
      driftState.flashPoints[i].copy(center).add(jitter);
      driftState.flashStrengths[i] = Math.random() < 0.05 ? 2.0 : 1.0;
    }

    driftState.flashStrengths[i] *= 0.8;
  }

  mat.uniforms.uFlashPoints.value = driftState.flashPoints;
  mat.uniforms.uFlashStrengths.value = driftState.flashStrengths;
  mat.uniforms.uNumFlashes.value = driftState.flashPoints.length;
}
