// src/settings/toggleClouds.ts
import { Mesh } from "three";
import { interactionState } from "../state/interactionState";

/**
 * Toggles cloud visibility on the globe.
 *
 * @param cloudSphere - The Mesh representing the cloud layer.
 */
export function toggleClouds(
  cloudSphere: Mesh,
  button: HTMLButtonElement
) {
  if (!cloudSphere) return;

  cloudSphere.visible = !cloudSphere.visible;
  interactionState.cloudsEnabled = cloudSphere.visible;

  button.textContent = cloudSphere.visible ? "Disable Clouds" : "Enable Clouds";

  button.classList.toggle("enabled", !cloudSphere.visible);
  button.classList.toggle("disabled", cloudSphere.visible);
}
