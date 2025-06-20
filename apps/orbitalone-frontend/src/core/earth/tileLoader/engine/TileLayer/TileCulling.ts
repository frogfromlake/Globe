/**
 * @file engine/TileLayer/TileCulling.ts
 * @description Responsible for frustum culling and tile visibility filtering. 
 * Includes directional filtering (dot product), screen distance checks, 
 * and bounding sphere intersection with a computed frustum.
 */

import {
  Frustum,
  Matrix4,
  PerspectiveCamera,
  Scene,
  Sphere,
  Vector3,
} from "three";
import {
  getCameraCenterDirection,
  getCameraLongitude,
} from "../utils/camera/cameraUtils";
import {
  getMinDotThreshold,
  getScreenDistanceCap,
} from "../utils/lod/lodFunctions";
import { latLonToUnitVector } from "../utils/geo/latLonToVector";
import { tileToLatLonBounds } from "../utils/bounds/tileToBounds";
import { getTileBoundingSphere } from "../utils/lod/tileBoundingSphere";

export interface TileCullingContext {
  camera: PerspectiveCamera;
  zoom: number;
  radius: number;
  enableFrustumCulling: boolean;
  enableDotProductFiltering: boolean;
  enableScreenSpacePrioritization: boolean;
  frustum?: Frustum; // optional precomputed frustum
  scene?: Scene; // optional for debugging helpers
}

export interface TileCandidate {
  x: number;
  y: number;
  z: number;
  key: string;
  screenDist: number;
}

/**
 * Computes a frustum based on a temporary expanded FOV camera.
 * Used to widen culling criteria slightly beyond standard camera frustum.
 */
export function computeFrustum(
  camera: PerspectiveCamera,
  fovMultiplier = 1.3
): Frustum {
  const fov = camera.fov * fovMultiplier;
  const tempCamera = new PerspectiveCamera(
    fov,
    camera.aspect,
    camera.near,
    camera.far
  );
  tempCamera.position.copy(camera.position);
  tempCamera.quaternion.copy(camera.quaternion);
  tempCamera.updateMatrixWorld(true);

  const projMatrix = new Matrix4().multiplyMatrices(
    tempCamera.projectionMatrix,
    tempCamera.matrixWorldInverse
  );

  return new Frustum().setFromProjectionMatrix(projMatrix);
}

/**
 * Returns tile visibility status based on frustum, direction, and screen proximity.
 * - Culls tiles already visible.
 * - Applies dot-product filtering based on camera FOV and tile angle.
 * - Applies frustum intersection test using bounding sphere.
 * - Applies screen-space distance culling for overload control.
 */
export function isTileVisible(
  x: number,
  y: number,
  z: number,
  context: TileCullingContext,
  visibleTiles: Set<string>,
  frustum?: Frustum
): { visible: boolean; key: string; screenDist: number } {
  const key = `${z}/${x}/${y}`;
  if (visibleTiles.has(key)) {
    return { visible: false, key, screenDist: Infinity };
  }

  // Skip tiles on far side of globe (>100° from camera center)
  const bounds = tileToLatLonBounds(x, y, z);
  const centerLat = (bounds.latMin + bounds.latMax) / 2;
  const centerLon = (bounds.lonMin + bounds.lonMax) / 2;
  const cameraLon = getCameraLongitude(context.camera);
  const lonDiff = Math.abs(centerLon - cameraLon);
  if (Math.min(lonDiff, 360 - lonDiff) > 100) {
    return { visible: false, key, screenDist: Infinity };
  }

  // Dot-product filter (field-of-view angle filtering)
  const tileDir = latLonToUnitVector(centerLat, centerLon);
  const viewDir = getCameraCenterDirection(context.camera);
  const dot = viewDir.dot(tileDir);
  const minDot = getMinDotThreshold(z, context.camera.fov);
  if (context.enableDotProductFiltering && dot < minDot) {
    return { visible: false, key, screenDist: Infinity };
  }

  // Frustum test (bounding sphere vs camera frustum)
  const cameraDistance = context.camera.position.length();
  const boundingSphere = getTileBoundingSphere(
    x,
    y,
    z,
    context.radius,
    cameraDistance
  );

  if (
    context.enableFrustumCulling &&
    frustum &&
    !frustum.intersectsSphere(boundingSphere)
  ) {
    return { visible: false, key, screenDist: Infinity };
  }

  // Screen-space distance (prioritization + capping)
  const projected = boundingSphere.center.clone().project(context.camera);
  const screenDist = context.enableScreenSpacePrioritization
    ? projected.distanceTo(new Vector3(0, 0, -1))
    : 0;

  if (screenDist > getScreenDistanceCap(z)) {
    return { visible: false, key, screenDist };
  }

  return { visible: true, key, screenDist };
}
