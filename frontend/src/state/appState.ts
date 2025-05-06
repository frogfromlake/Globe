/**
 * @file appState.ts
 * @description
 * Centralized state management for user interaction features on the 3D globe.
 * This state controls interactive behaviors such as country/ocean selection, flashlight effects,
 * and visual toggles like cloud rendering. It is shared across modules to ensure consistent interactivity.
 */

/**
 * Interface representing the structure of the interaction state.
 */
export interface appState {
  /**
   * Indicates whether user interaction with countries is enabled.
   * When true, users can hover over or select countries on the globe.
   */
  countryInteractivity: boolean;

  /**
   * Indicates whether user interaction with oceans is enabled.
   * When true, users can hover over or select oceans on the globe.
   */
  oceanInteractivity: boolean;

  /**
   * Controls whether the "flashlight" spotlight effect is active.
   * When enabled, a visual focus effect follows the pointer on the night side of the globe.
   */
  flashlightEnabled: boolean;

  /**
   * Stores the ID of the most recently opened (selected) country, if any.
   * Used to manage country-specific UI such as news panels.
   */
  lastOpenedCountryId: number | null;

  /**
   * Controls whether the animated cloud layer is visible on the globe.
   */
  cloudsEnabled: boolean;
}

/**
 * Shared interaction state used throughout the application.
 */
export const appState: appState = {
  countryInteractivity: true,
  oceanInteractivity: true,
  flashlightEnabled: true,
  lastOpenedCountryId: null,
  cloudsEnabled: true,
};
