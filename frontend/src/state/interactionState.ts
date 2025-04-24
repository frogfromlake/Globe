/**
 * @file interactionState.ts
 * @description Holds the state for the interaction controls, including enabling/disabling features
 * like country and ocean interactivity, and flashlight functionality.
 * This state is shared across the application to manage and control user interactions.
 */

export const interactionState = {
  /**
   * @property {boolean} countryEnabled - Indicates if country interactivity is enabled.
   * When enabled, users can interact with countries on the globe (e.g., select, hover).
   */
  countryEnabled: true,

  /**
   * @property {boolean} oceanEnabled - Indicates if ocean interactivity is enabled.
   * When enabled, users can interact with oceans on the globe (e.g., select, hover).
   */
  oceanEnabled: true,

  /**
   * @property {boolean} flashlightEnabled - Indicates if the flashlight effect is enabled.
   * When enabled, it simulates a flashlight-like effect on the globe, emphasizing the area of the globe
   * that the user is focused on.
   */
  flashlightEnabled: true,
};
