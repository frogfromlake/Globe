let hasMovedPointer = false;

export function setupPointerMoveTracking() {
  hasMovedPointer = false;
  window.addEventListener("pointermove", () => {
    hasMovedPointer = true;
  });
  window.addEventListener("touchstart", () => {
    hasMovedPointer = true;
  });
}

export function userHasMovedPointer() {
  return hasMovedPointer;
}
