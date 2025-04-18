// src/interactions/globeInteractions.ts
import {
  WebGLRenderer,
  Mesh,
  Raycaster,
  Vector2,
  PerspectiveCamera,
  Intersection,
} from "three";

type InteractionOptions = {
  onHover?: (hit: Intersection) => void;
  onClick?: (hit: Intersection) => void;
};

export function setupGlobeInteractions(
  renderer: WebGLRenderer,
  globe: Mesh,
  raycaster: Raycaster,
  pointer: Vector2,
  camera: PerspectiveCamera,
  { onHover, onClick }: InteractionOptions
) {
  renderer.domElement.addEventListener("pointermove", (event: PointerEvent) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(globe)[0];
    if (hit && onHover) onHover(hit);
  });

  let lastClickTime = 0;
  renderer.domElement.addEventListener("click", () => {
    const now = performance.now();
    if (now - lastClickTime < 200) return;
    lastClickTime = now;

    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(globe)[0];
    if (hit && onClick) onClick(hit);
  });
}
