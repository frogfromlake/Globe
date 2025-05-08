/**
 * @file oceanLabel3D.ts
 * @description Manages ocean label creation, scaling, and visibility using 3D sprites and connector lines.
 */

import { Sprite, Group, Vector3, Camera, MathUtils, Object3D } from "three";
import { createTextSprite } from "@/core/earth/interactivity/countryLabels3D";
import { CONFIG } from "@/configs/config";
import { createLabelLineMaterial } from "@/core/earth/materials/labelMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { latLonToSphericalCoordsGeographic } from "@/core/earth/geo/coordinates";
import { oceanCenters } from "@/core/data/oceanCenters";

type LabelObject = {
  sprite: Sprite;
  line: Line2;
  group: Group;
};

export const oceanLabelGroup = new Group();
const labelObjectsOcean = new Map<number, LabelObject>();

/**
 * Initializes ocean labels in small idle chunks to avoid blocking the main thread.
 */
export function init3DOceanLabelsDeferred(camera: Camera): void {
  const ids = Object.keys(oceanCenters).map(Number);

  function chunkedInit(i = 0) {
    if (i >= ids.length) return;
    const batch = ids.slice(i, i + 5);

    for (const id of batch) {
      const ocean = oceanCenters[id];
      if (ocean) {
        update3DOceanLabel(id, ocean.name, ocean.lat, ocean.lon, camera, 0);
      }
    }

    requestIdleCallback(() => chunkedInit(i + 5));
  }

  chunkedInit();
}

/**
 * Updates or creates a 3D label for the given ocean using camera-aware scale and position.
 *
 * @param oceanId - Unique RGB-derived ocean ID
 * @param name - Display name for the label
 * @param lat - Latitude in degrees
 * @param lon - Longitude in degrees
 * @param camera - Current camera (for zoom-based sizing)
 * @param fade - Opacity from 0.0 to 1.0
 */
export function update3DOceanLabel(
  oceanId: number,
  name: string,
  lat: number,
  lon: number,
  camera: Camera,
  fade: number
): void {
  if (!labelObjectsOcean.has(oceanId)) {
    const sprite = createTextSprite(name, true);
    const geometry = new LineGeometry().setPositions([0, 0, 0, 0, 0, 0]);
    const line = new Line2(geometry, createLabelLineMaterial(true));
    line.computeLineDistances();

    const group = new Group();
    group.add(sprite, line as Object3D);
    line.renderOrder = 0;
    sprite.renderOrder = 3;

    oceanLabelGroup.add(group);
    labelObjectsOcean.set(oceanId, { sprite, line, group });
  }

  const { sprite, line, group } = labelObjectsOcean.get(oceanId)!;
  const { phi, theta, radius } = latLonToSphericalCoordsGeographic(
    lat,
    lon,
    CONFIG.labels3D.markerRadius
  );
  const center = new Vector3().setFromSphericalCoords(radius, phi, theta);
  const direction = center.clone().normalize();

  const cameraDistance = camera.position.length();
  const offset = MathUtils.mapLinear(
    cameraDistance,
    CONFIG.labels3D.zoomRange.min,
    CONFIG.labels3D.zoomRange.max,
    CONFIG.labels3D.offsetRange.min,
    CONFIG.labels3D.offsetRange.max
  );

  const labelPos = center.clone().add(direction.multiplyScalar(offset));
  sprite.position.copy(labelPos);
  sprite.material.opacity = fade;

  const canvas = sprite.material.map?.image as HTMLCanvasElement;
  const aspect = canvas?.width / canvas?.height || 2.5;
  const scaleFactor = MathUtils.mapLinear(
    cameraDistance,
    CONFIG.labels3D.zoomRange.min,
    CONFIG.labels3D.zoomRange.max,
    0.1,
    5.0
  );

  const baseScale = CONFIG.labels3D.spriteScale;
  sprite.scale.set(
    aspect * baseScale * scaleFactor,
    baseScale * scaleFactor,
    1
  );
  sprite.lookAt(camera.position);
  group.rotation.set(0, 0, 0);
  group.quaternion.identity();

  (line.geometry as LineGeometry).setPositions([
    center.x,
    center.y,
    center.z,
    labelPos.x,
    labelPos.y,
    labelPos.z,
  ]);
  line.computeLineDistances();

  const mat = line.material as any;
  mat.opacity = fade;
  mat.resolution.set(window.innerWidth, window.innerHeight);

  group.visible = fade > 0.01;
}

/** Hides all 3D ocean labels from the scene. */
export function hideAll3DOceanLabels(): void {
  for (const { group, sprite, line } of labelObjectsOcean.values()) {
    group.visible = false;
    sprite.material.opacity = 0;
    (line.material as any).opacity = 0;
  }
}

/**
 * Shows only labels for the specified ocean IDs.
 * @param idsToKeep - Array of ocean IDs to remain visible.
 */
export function hideAll3DOceanLabelsExcept(idsToKeep: number[] = []): void {
  for (const [id, { group }] of labelObjectsOcean.entries()) {
    group.visible = idsToKeep.includes(id);
  }
}
