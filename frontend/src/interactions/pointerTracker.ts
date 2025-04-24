/**
 * pointerTracker.ts
 * Tracks whether the user has interacted with the globe using pointer or touch.
 * Useful for delaying hover/interaction effects until active input is detected.
 */

let hasMovedPointer = false;

/**
 * Sets up global event listeners to track when the user first moves the pointer
 * or touches the screen. This flag can be used to prevent automatic interactions
 * until the user has demonstrated intent.
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
 * Returns whether the user has moved their pointer or touched the screen.
 * Typically used to gate initial hover/interaction logic.
 */
export function userHasMovedPointer(): boolean {
  return hasMovedPointer;
}
