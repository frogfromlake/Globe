import { Mesh } from "three";

// Read fade duration from a global (default 400ms)
function getFadeDuration(defaultMs: number) {
  if (typeof window !== "undefined" && (window as any).tileFadeDuration)
    return (window as any).tileFadeDuration;
  return defaultMs;
}

export function fadeInTileMesh(
  mesh: Mesh,
  duration: number = getFadeDuration(400),
  callback?: () => void
) {
  if (!mesh.material || !("opacity" in mesh.material)) {
    mesh.visible = true;
    callback?.();
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
      callback?.();
    }
  }
  requestAnimationFrame(animate);
}

export function fadeOutTileMesh(
  mesh: Mesh,
  duration: number = getFadeDuration(400),
  callback?: () => void
) {
  if (!mesh.material || !("opacity" in mesh.material)) {
    if (mesh.parent) mesh.parent.remove(mesh);
    callback?.();
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
      if (mesh.parent) mesh.parent.remove(mesh);
      callback?.();
    }
  }
  requestAnimationFrame(animate);
}
