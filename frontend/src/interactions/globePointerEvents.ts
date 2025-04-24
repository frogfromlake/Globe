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

  canvas.addEventListener("pointerdown", (e: PointerEvent) => {
    pointerDown = true;
    downPos.set(e.clientX, e.clientY);
  });

  canvas.addEventListener("pointerup", (e: PointerEvent) => {
    if (!pointerDown) return;
    pointerDown = false;

    const upPos = new Vector2(e.clientX, e.clientY);
    const moved = downPos.distanceTo(upPos);
    if (moved < 5) {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(globe)[0];
      if (hit && onClick) onClick(hit);
    }
  });

  canvas.addEventListener("pointermove", (event: PointerEvent) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(globe)[0];
    if (hit && onHover) onHover(hit);
  });
}
