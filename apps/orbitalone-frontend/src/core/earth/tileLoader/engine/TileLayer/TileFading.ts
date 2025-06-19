// tileLoader/engine/TileLayer/TileFading.ts
import { Mesh } from "three";

export function fadeInTileMesh(
  mesh: Mesh,
  duration: number = 500,
  callback?: () => void
) {
  // Only fade if mesh/material is transparent-capable
  if (!mesh.material || !("opacity" in mesh.material)) {
    mesh.visible = true;
    if (callback) callback();
    return;
  }
  mesh.visible = true;
  (mesh.material as any).transparent = true;
  (mesh.material as any).opacity = 0;

  const start = performance.now();
  function animate(now: number) {
    const t = Math.min(1, (now - start) / duration);
    (mesh.material as any).opacity = t;
    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      (mesh.material as any).opacity = 1;
      if (callback) callback();
    }
  }
  requestAnimationFrame(animate);
}

export function fadeOutTileMesh(
  mesh: Mesh,
  duration: number = 400,
  callback?: () => void
) {
  if (!mesh.material || !("opacity" in mesh.material)) {
    if (mesh.parent) mesh.parent.remove(mesh);
    if (callback) callback();
    return;
  }
  (mesh.material as any).transparent = true;
  (mesh.material as any).opacity = 1;

  const start = performance.now();
  function animate(now: number) {
    const t = Math.min(1, (now - start) / duration);
    (mesh.material as any).opacity = 1 - t;
    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      (mesh.material as any).opacity = 0;
      // Remove from scene after fade
      if (mesh.parent) mesh.parent.remove(mesh);
      if (callback) callback();
    }
  }
  requestAnimationFrame(animate);
}
