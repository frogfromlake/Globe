// /animation/loopParts/updateSolarLighting.ts

import { Group, Mesh, ShaderMaterial, MathUtils, Vector3 } from "three";
import { CONFIG } from "@/configs/config";
import { formatUTCFull } from "@/utils/formatClockUtc";
import {
  getSolarRotationY,
  getSunDirectionWorld,
} from "@/core/earth/lighting/sunDirection";
import { updateSubsolarMarkerPosition } from "@/utils/debugMarkers";

/**
 * Updates simulation clock, globe rotation, sunlight direction, and subsolar marker.
 *
 * - Advances the simulation time using the configured simulation speed.
 * - Updates the displayed UTC clock in the DOM.
 * - Computes the subsolar point and rotates the globe (`tiltGroup`) so the sun-facing side is aligned.
 * - Updates light direction uniforms for all shaders using the simulated date.
 * - Returns the current target Y-rotation of the globe (used for UV-to-longitude correction).
 *
 * @param uniforms - Shader uniform object shared across globe materials.
 * @param nowInSeconds - High-resolution timestamp in seconds (performance.now() / 1000).
 * @param delta - Frame delta time in seconds.
 * @param simulation - Mutable object with a `.time` field in milliseconds (simulation clock).
 * @param simClockEl - DOM element used to show the simulated UTC time string.
 * @param subsolarMarker - Mesh used to visually mark the subsolar point (if visible).
 * @param tiltGroup - The group that applies Earth tilt and receives Y-axis rotation per frame.
 * @returns The computed globe Y-rotation angle (in radians) needed to center the subsolar point.
 */

export function updateSolarLighting(
  uniforms: { [key: string]: any },
  nowInSeconds: number,
  delta: number,
  simulation: { time: number },
  subsolarMarker: Mesh,
  tiltGroup: Group
): number {
  const simClockEl = document.getElementById("sim-clock") as HTMLDivElement;
  simulation.time += delta * 1000 * CONFIG.time.simulationSpeed;
  const simulatedDate = new Date(simulation.time);

  simClockEl.textContent = formatUTCFull(simulatedDate);
  updateSubsolarMarkerPosition(subsolarMarker, simulatedDate);

  const targetRotation = getSolarRotationY(simulatedDate);
  tiltGroup.rotation.y = targetRotation;

  uniforms.uTime.value = nowInSeconds;

  const sunDirWorld = getSunDirectionWorld(simulatedDate);
  const sunDirWithTilt = sunDirWorld
    .clone()
    .applyQuaternion(tiltGroup.quaternion);
  uniforms.lightDirection.value.copy(sunDirWithTilt);

  return targetRotation;
}
