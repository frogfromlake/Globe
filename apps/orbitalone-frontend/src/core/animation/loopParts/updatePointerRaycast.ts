import {
  Raycaster,
  PerspectiveCamera,
  Vector2,
  Vector3,
  Mesh,
  MathUtils,
} from "three";
import { userHasMovedPointer } from "@/core/earth/controls/pointerTracker";

/**
 * Performs globe raycasting to determine flashlight hit and UV position under pointer.
 *
 * - Flashlight raycast runs every frame to update cursor highlight position.
 * - UV raycast runs throttled (based on interval) to determine hover target.
 * - If UV is not updated this frame, it is left undefined to preserve previous value.
 *
 * @param raycaster - Shared raycaster object.
 * @param pointer - Normalized device coordinates.
 * @param camera - Scene camera.
 * @param globeRaycastMesh - Sphere mesh used for pointer intersection.
 * @param uniforms - Shared shader uniforms (modified in-place).
 * @param now - Current timestamp in ms (from performance.now()).
 * @param lastRaycastTime - Timestamp of last UV raycast.
 * @param raycastInterval - Min delay between UV raycasts in ms.
 * @param pointerActive - Whether the pointer has moved recently.
 * @param targetRotation - Rotation of the globe (used to correct UV).
 * @returns A new UV (if updated), flashlight hit position, and updated raycast timestamp.
 */
export function updatePointerRaycast(
  raycaster: Raycaster,
  pointer: Vector2,
  camera: PerspectiveCamera,
  globeRaycastMesh: Mesh,
  uniforms: { [key: string]: any },
  now: number,
  lastRaycastTime: number,
  raycastInterval: number,
  pointerActive: boolean,
  targetRotation: number
): {
  currentUV: Vector2 | null;
  updatedLastRaycastTime: number;
  flashlightWorldPos: Vector3 | null;
  uvUpdated: boolean;
} {
  let flashlightWorldPos: Vector3 | null = null;
  let updatedLastRaycastTime = lastRaycastTime;
  let currentUV: Vector2 | null = null;
  let uvUpdated = false;

  // 🛑 Skip entirely if user hasn't moved pointer yet
  if (!userHasMovedPointer()) {
    uniforms.uCursorOnGlobe.value = false;
    return {
      currentUV: null,
      updatedLastRaycastTime,
      flashlightWorldPos: null,
      uvUpdated: false,
    };
  }

  // Flashlight raycast (runs every frame)
  raycaster.setFromCamera(pointer, camera);
  const hitForFlashlight = raycaster.intersectObject(globeRaycastMesh, false);
  if (hitForFlashlight.length > 0) {
    flashlightWorldPos = hitForFlashlight[0].point.clone().normalize();
    uniforms.cursorWorldPos.value.copy(flashlightWorldPos);
    uniforms.uCursorOnGlobe.value = true;
  } else {
    uniforms.uCursorOnGlobe.value = false;
  }

  // UV raycast (throttled)
  if (pointerActive && now - lastRaycastTime > raycastInterval) {
    updatedLastRaycastTime = now;

    const hits = raycaster.intersectObject(globeRaycastMesh, false);
    if (hits.length > 0) {
      const hitPoint = hits[0].point.clone().normalize();
      const longitude = Math.atan2(hitPoint.z, hitPoint.x);
      const latitude = Math.asin(hitPoint.y);

      const correctedLongitude = longitude + targetRotation;
      const u = MathUtils.euclideanModulo(
        0.5 - correctedLongitude / (2.0 * Math.PI),
        1.0
      );
      const v = MathUtils.clamp(0.5 + latitude / Math.PI, 0, 1);

      currentUV = new Vector2(u, v);
      uniforms.uCursorOnGlobe.value = true;
      uvUpdated = true;
    } else {
      uniforms.uCursorOnGlobe.value = false;
    }
  }

  return {
    currentUV,
    updatedLastRaycastTime,
    flashlightWorldPos,
    uvUpdated,
  };
}
