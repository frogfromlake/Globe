/**
 * @file oceanLabel3D.ts
 * @description Manages creation, updates, and visibility of 3D ocean labels and their connecting lines.
 * Labels appear as glowing sprites with connectors, dynamically positioned and scaled based on camera distance.
 */

import {
  Sprite,
  Group,
  Vector3,
  Camera,
  MathUtils,
  Object3D,
  Scene,
  PerspectiveCamera,
} from "three";
import { createTextSprite } from "./countryLabels3D";
import { CONFIG } from "../configs/config";
import { latLonToSphericalCoordsGeographic } from "../astronomy/geo";
import { createLabelLineMaterial } from "../materials/globeMaterials";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { Line2 } from "three/examples/jsm/lines/Line2.js";

type LabelObject = {
  sprite: Sprite;
  line: Line2;
  group: Group;
};

export const oceanLabelGroup = new Group();
const labelObjectsOcean = new Map<number, LabelObject>();

export function init3DOceanLabels(camera: PerspectiveCamera): void {
  // === Pre-create all ocean labels ===
  for (const idStr of Object.keys(CONFIG.oceanHover.oceanCenters)) {
    const id = parseInt(idStr);
    const ocean = CONFIG.oceanHover.oceanCenters[id];
    if (ocean) {
      update3DOceanLabel(id, ocean.name, ocean.lat, ocean.lon, camera, 0);
    }
  }
}

/**
 * Updates or creates a 3D label for an ocean, positioned above the surface with a connector line.
 * Automatically handles dynamic scaling, placement, and opacity fading based on camera zoom and visibility.
 *
 * @param name - Ocean name, used as a unique label key.
 * @param lat - Latitude of the ocean label anchor point.
 * @param lon - Longitude of the ocean label anchor point.
 * @param rotationY - Y-axis rotation of the globe.
 * @param camera - The active Three.js camera (used for zoom-based scaling).
 * @param fade - Alpha fade (0 to 1) for the label and its connector line.
 */
export async function update3DOceanLabel(
  oceanId: number,
  name: string,
  lat: number,
  lon: number,
  camera: Camera,
  fade: number
): Promise<void> {
  if (!labelObjectsOcean.has(oceanId)) {
    const sprite = await createTextSprite(name, true);

    const geometry = new LineGeometry();
    geometry.setPositions([0, 0, 0, 0, 0, 0]);

    const lineMaterial = createLabelLineMaterial(true);
    const line = new Line2(geometry, lineMaterial);
    line.computeLineDistances();

    const group = new Group();
    group.add(sprite);
    group.add(line as unknown as Object3D);

    line.renderOrder = 0;
    sprite.renderOrder = 1;

    oceanLabelGroup.add(group);
    labelObjectsOcean.set(oceanId, { sprite, line, group });
  }

  const { sprite, line, group } = labelObjectsOcean.get(oceanId)!;

  const { phi, theta, radius } = latLonToSphericalCoordsGeographic(
    lat,
    lon,
    CONFIG.labels3D.markerRadius
  );

  // Calculate position from lat/lon
  let center = new Vector3().setFromSphericalCoords(radius, phi, theta);

  const cameraDistance = camera.position.length();
  const offset = MathUtils.mapLinear(
    cameraDistance,
    CONFIG.labels3D.zoomRange.min,
    CONFIG.labels3D.zoomRange.max,
    CONFIG.labels3D.offsetRange.min,
    CONFIG.labels3D.offsetRange.max
  );

  const direction = center.clone().normalize();
  const labelPos = center.clone().add(direction.multiplyScalar(offset));

  // === Sprite positioning ===
  sprite.position.copy(labelPos);
  sprite.material.opacity = fade;

  // === Sprite scale based on camera zoom ===
  const baseScale = CONFIG.labels3D.spriteScale;
  const canvas = sprite.material.map?.image as HTMLCanvasElement;
  const aspect = canvas.width / canvas.height || 2.5;
  const scaleFactor = MathUtils.mapLinear(
    cameraDistance,
    CONFIG.labels3D.zoomRange.min,
    CONFIG.labels3D.zoomRange.max,
    0.1,
    5.0
  );

  sprite.scale.set(
    aspect * baseScale * scaleFactor,
    baseScale * scaleFactor,
    1
  );

  // === Line direction: always from center to label ===
  const dir = labelPos.clone().sub(center);
  const labelIsAbove = dir.dot(labelPos.clone().normalize()) > 0;

  const top = labelIsAbove ? labelPos : center;
  const bottom = labelIsAbove ? center : labelPos;

  (line.geometry as LineGeometry).setPositions([
    bottom.x,
    bottom.y,
    bottom.z,
    top.x,
    top.y,
    top.z,
  ]);
  line.computeLineDistances();

  const mat = line.material as any;
  mat.opacity = fade;
  mat.resolution.set(window.innerWidth, window.innerHeight);

  group.visible = fade > 0.01;
}

/**
 * Hides all currently rendered ocean labels from the scene.
 * Typically called when resetting or deselecting oceans.
 */
export function hideAll3DOceanLabels(): void {
  for (const { group } of labelObjectsOcean.values()) {
    group.visible = false;
  }
}

export function hideAll3DOceanLabelsExcept(idsToKeep: number[] = []) {
  for (const [id, { group }] of labelObjectsOcean.entries()) {
    group.visible = idsToKeep.includes(id);
  }
}
