/**
 * @file globePointerEvents.ts
 * @description Sets up pointer interactions for the 3D globe.
 * Handles hover and click events using raycasting and pointer tracking.
 */

import {
  WebGLRenderer,
  Mesh,
  Raycaster,
  Vector2,
  PerspectiveCamera,
  Intersection,
} from "three";

type InteractionOptions = {
  /**
   * Callback fired when the globe is hovered.
   * Receives the first intersection point if hit, or undefined if no hit.
   */
  onHover?: (hit: Intersection | undefined) => void;
  
  /**
   * Callback fired when the globe is clicked.
   * Receives the first intersection point if hit, or undefined if no hit.
   */
  onClick?: (hit: Intersection | undefined) => void;
};

/**
 * Attaches pointer event listeners to handle globe interactivity.
 * Detects clicks and hovers using a Raycaster.
 *
 * @param renderer - The WebGLRenderer used to render the globe.
 * @param globe - The main globe mesh to interact with.
 * @param raycaster - A shared raycaster for pointer calculations.
 * @param pointer - The normalized pointer vector updated on pointer events.
 * @param camera - The perspective camera used in the scene.
 * @param options - Callbacks for hover and click interactions.
 */
export function setupGlobePointerEvents(
  renderer: WebGLRenderer,
  globe: Mesh,
  raycaster: Raycaster,
  pointer: Vector2,
  camera: PerspectiveCamera,
  { onHover, onClick }: InteractionOptions
) {
  const canvas = renderer.domElement;

  let pointerDown = false;
  const downPos = new Vector2();

  // Track pointer down to distinguish clicks from drags
  canvas.addEventListener("pointerdown", (e: PointerEvent) => {
    pointerDown = true;
    downPos.set(e.clientX, e.clientY);
  });

  // On pointer up, detect if the pointer moved slightly (treat as click)
  canvas.addEventListener("pointerup", (e: PointerEvent) => {
    if (!pointerDown) return;
    pointerDown = false;

    const upPos = new Vector2(e.clientX, e.clientY);
    const moved = downPos.distanceTo(upPos);

    if (moved < 5) {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(globe, true)[0];
      if (onClick) onClick(hit);
    }
  });

  // On pointer move, update ray and call hover handler
  canvas.addEventListener("pointermove", (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(globe, true)[0];

    if (onHover) onHover(hit); // Will be undefined if nothing is hit
  });
}
