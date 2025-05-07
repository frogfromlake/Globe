let hasMovedPointer = false;
let onFirstPointerMove: (() => void) | null = null;

/**
 * Initializes tracking for first pointer/touch interaction.
 */
export function setupPointerMoveTracking(): void {
  hasMovedPointer = false;

  const markMoved = () => {
    if (!hasMovedPointer) {
      hasMovedPointer = true;
      if (onFirstPointerMove) onFirstPointerMove();
    }
  };

  window.addEventListener("pointermove", markMoved, { once: true });
  window.addEventListener("touchstart", markMoved, { once: true });
}

/**
 * Registers a callback that fires once the user moves or touches.
 */
export function onPointerInteraction(callback: () => void): void {
  if (hasMovedPointer) {
    callback();
  } else {
    onFirstPointerMove = callback;
  }
}

export function userHasMovedPointer(): boolean {
  return hasMovedPointer;
}
