import {
  Sprite,
  Group,
  CanvasTexture,
  Vector3,
  Camera,
  MathUtils,
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

/** Group containing all country label 3D objects. */
export const countryLabelGroup = new Group();

/** Label object structure for sprite + connector line. */
type LabelObject = {
  sprite: Sprite;
  line: Line2;
  group: Group;
  lastFade: number;
  lastCameraDist: number;
};

/** Canvas reuse pool. */
const canvasPool: HTMLCanvasElement[] = [];
const labelObjects = new Map<number, LabelObject>();

const tmpResolution = new Vector2();

/**
 * Lazily initializes a 3D label for a given country if it doesn't exist.
 * Called only on demand.
 */
function ensureCountryLabelExists(countryId: number): LabelObject | null {
  const entry = countryMeta[countryId];
  if (!entry) return null;
  if (labelObjects.has(countryId)) return labelObjects.get(countryId)!;

  const sprite = createTextSprite(entry.name, false);
  const geometry = new LineGeometry().setPositions([0, 0, 0, 0, 0, 0]);
  const line = new Line2(geometry, createLabelLineMaterial(false));
  line.computeLineDistances();

  const group = new Group();
  group.add(sprite, line as Object3D);
  line.renderOrder = 0;
  sprite.renderOrder = 3;

  countryLabelGroup.add(group);
  const obj: LabelObject = {
    sprite,
    line,
    group,
    lastFade: -1,
    lastCameraDist: -1,
  };
  labelObjects.set(countryId, obj);
  return obj;
}

/**
 * Creates a styled canvas-based sprite used to display country names in 3D space.
 */
export function createTextSprite(message: string, isOcean: boolean): Sprite {
  const { canvasFontSize, fontFamily, glow, spriteScale } = CONFIG.labels3D;

  const canvas = canvasPool.pop() || document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // 1. Measure using font
  ctx.font = `${canvasFontSize}px '${fontFamily}', sans-serif`;
  const textWidth = ctx.measureText(message).width || 1;
  const height = canvasFontSize * 3.5;

  // 2. Resize canvas
  canvas.width = Math.ceil(textWidth);
  canvas.height = Math.ceil(height);

  // 3. Re-apply all styles (they're wiped by canvas resize)
  ctx.font = `${canvasFontSize}px '${fontFamily}', sans-serif`;
  ctx.textBaseline = "top";
  ctx.shadowColor = glow.shadowColor;
  ctx.shadowBlur = glow.shadowBlur;
  ctx.lineWidth = 35;
  ctx.strokeStyle = "black";
  ctx.fillStyle = glow.fillStyle;

  // 4. Draw text
  ctx.strokeText(message, 0, 0);
  ctx.fillText(message, 0, 0);

  // 5. Create sprite
  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;

  const material = createLabelSpriteMaterial(texture, isOcean);
  const sprite = new Sprite(material);

  const aspect = canvas.width / canvas.height || 2.5;
  sprite.scale.set(aspect * spriteScale, spriteScale, 1);

  texture.onUpdate = () => canvasPool.push(canvas);

  (sprite as any).__aspect = aspect; // Save it
  return sprite;
}

/**
 * Updates or creates a 3D label for the given country with position, scaling, and fade.
 */
export function update3DLabel(
  countryId: number,
  camera: Camera,
  fade: number,
  resolution: Vector2 = tmpResolution.set(window.innerWidth, window.innerHeight)
): void {
  const entry = countryMeta[countryId];
  if (!entry) return;

  const obj = ensureCountryLabelExists(countryId);
  if (!obj) return;

  const { sprite, line, group } = obj;
  const { phi, theta, radius } = latLonToSphericalCoordsGeographic(
    entry.lat,
    entry.lon,
    CONFIG.labels3D.markerRadius
  );

  const center = new Vector3().setFromSphericalCoords(radius, phi, theta);
  const direction = center.clone().normalize();
  const cameraDistance = camera.position.length();

  // Avoid re-updating unless fade or camera distance meaningfully changes
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
  mat.resolution.copy(resolution);

  group.visible = fade > 0.01;
}

/**
 * Hides all 3D country labels from the scene.
 */
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
    group.visible = idsToKeep.includes(id);
  }
}
