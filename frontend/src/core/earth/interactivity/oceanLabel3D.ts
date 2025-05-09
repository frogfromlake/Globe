import {
  Sprite,
  Group,
  Vector3,
  Camera,
  MathUtils,
  Object3D,
  Vector2,
} from "three";
import { createTextSprite } from "@/core/earth/interactivity/countryLabels3D";
import { CONFIG } from "@/configs/config";
import { createLabelLineMaterial } from "@/core/earth/materials/labelMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { latLonToSphericalCoordsGeographic } from "@/core/earth/geo/coordinates";
import { oceanCenters } from "@/core/data/oceanCenters";

/** Group containing all 3D ocean label objects. */
export const oceanLabelGroup = new Group();

/** Internal reusable vector. */
const tmpResolution = new Vector2();

/** Label object structure for sprite + connector line. */
type LabelObject = {
  sprite: Sprite;
  line: Line2;
  group: Group;
  lastFade: number;
  lastCameraDist: number;
};

const labelObjectsOcean = new Map<number, LabelObject>();

/**
 * Lazily initializes a 3D label for a given ocean if it doesn't exist.
 */
function ensureOceanLabelExists(oceanId: number, name: string): LabelObject {
  if (labelObjectsOcean.has(oceanId)) return labelObjectsOcean.get(oceanId)!;

  const sprite = createTextSprite(name, true);
  const geometry = new LineGeometry().setPositions([0, 0, 0, 0, 0, 0]);
  const line = new Line2(geometry, createLabelLineMaterial(true));
  line.computeLineDistances();

  const group = new Group();
  group.add(sprite, line as Object3D);
  line.renderOrder = 0;
  sprite.renderOrder = 3;

  oceanLabelGroup.add(group);
  const obj: LabelObject = {
    sprite,
    line,
    group,
    lastFade: -1,
    lastCameraDist: -1,
  };
  labelObjectsOcean.set(oceanId, obj);
  return obj;
}

/**
 * Initializes all ocean labels using idle chunks.
 */
export function init3DOceanLabelsDeferred(camera: Camera): void {
  const ids = Object.keys(oceanCenters).map(Number);
  let i = 0;

  function chunkedInit(deadline: IdleDeadline) {
    while (i < ids.length && deadline.timeRemaining() > 4) {
      const id = ids[i];
      const ocean = oceanCenters[id];
      if (ocean) {
        update3DOceanLabel(id, ocean.name, ocean.lat, ocean.lon, camera, 0);
      }
      i++;
    }

    if (i < ids.length) {
      requestIdleCallback(chunkedInit);
    }
  }

  requestIdleCallback(chunkedInit);
}

/**
 * Updates or creates a 3D label for an ocean with position, scaling, and fade.
 */
export function update3DOceanLabel(
  oceanId: number,
  name: string,
  lat: number,
  lon: number,
  camera: Camera,
  fade: number
): void {
  const obj = ensureOceanLabelExists(oceanId, name);
  const { sprite, line, group } = obj;

  const { phi, theta, radius } = latLonToSphericalCoordsGeographic(
    lat,
    lon,
    CONFIG.labels3D.markerRadius
  );

  const center = new Vector3().setFromSphericalCoords(radius, phi, theta);
  const direction = center.clone().normalize();
  const cameraDistance = camera.position.length();

  // Avoid redundant updates
  const fadeDelta = Math.abs(obj.lastFade - fade);
  const distDelta = Math.abs(obj.lastCameraDist - cameraDistance);
  if (fadeDelta < 0.01 && distDelta < 0.5) return;

  obj.lastFade = fade;
  obj.lastCameraDist = cameraDistance;

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

  const aspect = (sprite as any).__aspect || 2.5;

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
  mat.resolution.copy(tmpResolution.set(window.innerWidth, window.innerHeight));

  group.visible = fade > 0.01;
}

/**
 * Hides all 3D ocean labels from the scene.
 */
export function hideAll3DOceanLabels(): void {
  for (const { group, sprite, line } of labelObjectsOcean.values()) {
    group.visible = false;
    sprite.material.opacity = 0;
    (line.material as any).opacity = 0;
  }
}

/**
 * Shows only labels for the specified ocean IDs.
 */
export function hideAll3DOceanLabelsExcept(idsToKeep: number[] = []): void {
  for (const [id, { group }] of labelObjectsOcean.entries()) {
    group.visible = idsToKeep.includes(id);
  }
}
