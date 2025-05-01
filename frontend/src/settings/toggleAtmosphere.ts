import { Mesh } from "three";
import { interactionState } from "../state/interactionState";

/**
 * Toggles cloud visibility on the globe.
 *
 * @param cloudSphere - The Mesh representing the cloud layer.
 */
export function toggleAtmosphere(
  cloudSphere: Mesh,
  auroraMesh: Mesh,
  button: HTMLButtonElement
) {
  if (!cloudSphere || !auroraMesh) return;

  const newVisibility = !cloudSphere.visible;
  cloudSphere.visible = newVisibility;
  auroraMesh.visible = newVisibility;

  interactionState.cloudsEnabled = newVisibility;

  button.textContent = newVisibility ? "Disable Clouds" : "Enable Clouds";
  button.classList.toggle("enabled", !newVisibility);
  button.classList.toggle("disabled", newVisibility);
}
