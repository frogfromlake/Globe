import { Mesh } from "three";
import { appState } from '@/state/appState';

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

  appState.cloudsEnabled = newVisibility;

  button.textContent = newVisibility ? "Disable Clouds" : "Enable Clouds";
  button.classList.toggle("enabled", !newVisibility);
  button.classList.toggle("disabled", newVisibility);
}
