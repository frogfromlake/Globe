import {
  Sprite,
  Group,
  CanvasTexture,
  Vector3,
  Camera,
  MathUtils,
  PerspectiveCamera,
  LinearFilter,
  Object3D,
  Vector2,
} from "three";
import { countryMeta } from "@/core/data/countryMeta";
import { CONFIG } from "@/configs/config";
import {
  createLabelLineMaterial,
  createLabelSpriteMaterial,
} from "@/core/earth/materials/labelMaterial";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { latLonToSphericalCoordsGeographic } from "@/core/earth/geo/coordinates";

type LabelObject = {
  sprite: Sprite;
  line: Line2;
  group: Group;
};

export const countryLabelGroup = new Group();
const labelObjects = new Map<number, LabelObject>();

export function init3DCountryLabelsDeferred(camera: Camera): void {
  const ids = Object.keys(countryMeta).map(Number);

  function chunkedInit(i = 0) {
    if (i >= ids.length) return;
    const batch = ids.slice(i, i + 5);
    for (const id of batch) update3DLabel(id, camera, 0);
    requestIdleCallback(() => chunkedInit(i + 5));
  }

  chunkedInit();
}

/**
 * Creates a styled canvas-based sprite used to display country names in 3D space.
 * The sprite includes shadow glow and proper scaling based on text dimensions.
 *
 * @param message - The country name text to render as a label.
 * @param isOcean - Boolean flag to distinguish between ocean and country labels
 * @returns A Promise that resolves to a THREE.Sprite with custom styling.
 */
export function createTextSprite(message: string, isOcean: boolean): Sprite {
  const { canvasFontSize, fontFamily, glow, spriteScale } = CONFIG.labels3D;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = `${canvasFontSize}px '${fontFamily}', sans-serif`;

  const textWidth = ctx.measureText(message).width || 1;
  const height = canvasFontSize * 3.5;

  canvas.width = Math.max(2, textWidth);
  canvas.height = Math.max(2, height);

  ctx.font = `${canvasFontSize}px '${fontFamily}', sans-serif`;
  ctx.textBaseline = "top";
  ctx.shadowColor = glow.shadowColor;
  ctx.shadowBlur = glow.shadowBlur;
  ctx.lineWidth = 35;
  ctx.strokeStyle = "black";
  ctx.strokeText(message, 0, 0);
  ctx.fillStyle = glow.fillStyle;
  ctx.fillText(message, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;

  const material = createLabelSpriteMaterial(texture, isOcean);
  const sprite = new Sprite(material);
  const aspect = canvas.width / canvas.height || 2.5;

  sprite.scale.set(aspect * spriteScale, spriteScale, 1);
  return sprite;
}

/**
 * Updates or creates a 3D label for the given country using camera-aware scale and position.
 *
 * @param countryId - ISO-based country ID from countryMeta
 * @param camera - Current camera (for zoom-based sizing)
 * @param fade - Opacity from 0.0 to 1.0
 * @param resolution - Optional screen resolution (used for line material)
 */
export function update3DLabel(
  countryId: number,
  camera: Camera,
  fade: number,
  resolution: Vector2 = new Vector2(window.innerWidth, window.innerHeight)
): void {
  const entry = countryMeta[countryId];
  if (!entry) return;

  if (!labelObjects.has(countryId)) {
    const sprite = createTextSprite(entry.name, false);
    const geometry = new LineGeometry().setPositions([0, 0, 0, 0, 0, 0]);
    const line = new Line2(geometry, createLabelLineMaterial(false));
    line.computeLineDistances();

    const group = new Group();
    group.add(sprite, line as Object3D);
    line.renderOrder = 0;
    sprite.renderOrder = 3;

    countryLabelGroup.add(group);
    labelObjects.set(countryId, { sprite, line, group });
  }

  const { sprite, line, group } = labelObjects.get(countryId)!;
  const { phi, theta, radius } = latLonToSphericalCoordsGeographic(
    entry.lat,
    entry.lon,
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
  mat.resolution.copy(resolution);

  group.visible = fade > 0.01;
}

/** Hides all 3D country labels from the scene. */
export function hideAll3DLabels(): void {
  for (const { group, sprite, line } of labelObjects.values()) {
    group.visible = false;
    sprite.material.opacity = 0;
    (line.material as any).opacity = 0;
  }
}

/**
 * Hides all country labels except those in the given list.
 */
export function hideAll3DLabelsExcept(idsToKeep: number[] = []): void {
  for (const [id, { group }] of labelObjects.entries()) {
    const shouldShow = idsToKeep.includes(id);
    if (group.visible !== shouldShow) group.visible = shouldShow;
  }
}
