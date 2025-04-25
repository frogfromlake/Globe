/**
 * @file pointerTracker.ts
 * @description Tracks whether the user has interacted with the globe via pointer or touch.
 */

let hasMovedPointer = false;

/**
 * Initializes global event listeners to detect user interaction.
 * Sets a flag when the user moves the pointer or touches the screen.
 */
export function setupPointerMoveTracking(): void {
  hasMovedPointer = false;

  window.addEventListener("pointermove", () => {
    hasMovedPointer = true;
  });

  window.addEventListener("touchstart", () => {
    hasMovedPointer = true;
  });
}

/**
 * Returns whether the user has interacted with the globe.
 *
 * @returns True if user moved the pointer or touched the screen.
 */
export function userHasMovedPointer(): boolean {
  return hasMovedPointer;
}
