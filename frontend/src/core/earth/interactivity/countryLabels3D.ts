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
  SpriteMaterial,
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

let fontLoaded = false;
async function loadFontIfNeeded(): Promise<void> {
  if (!fontLoaded) {
    await document.fonts.ready;
    await document.fonts.load(
      `normal 400 ${CONFIG.labels3D.canvasFontSize}px '${CONFIG.labels3D.fontFamily}'`
    );
    fontLoaded = true;
  }
}

export function init3DCountryLabels(camera: PerspectiveCamera): void {
  // === Pre-create all country labels ===
  for (const id of Object.keys(countryMeta)) {
    const countryId = parseInt(id);
    if (countryId > 0) {
      update3DLabel(countryId, camera, 0); // No rotation, invisible (fade=0)
    }
  }
}

/**
 * Creates a styled canvas-based sprite used to display country names in 3D space.
 * The sprite includes shadow glow and proper scaling based on text dimensions.
 *
 * @param message - The country name text to render as a label.
 * @param isOcean - Boolean flag to distinguish between ocean and country labels
 * @returns A Promise that resolves to a THREE.Sprite with custom styling.
 */
export async function createTextSprite(
  message: string,
  isOcean: boolean
): Promise<Sprite> {
  const { canvasFontSize, fontFamily, glow, spriteScale } = CONFIG.labels3D;

  // --- Ensure font is fully available before measuring ---
  await document.fonts.ready;
  await document.fonts.load(`normal 400 ${canvasFontSize}px '${fontFamily}'`);
  await new Promise(requestAnimationFrame); // sync w/ layout
  await new Promise(requestAnimationFrame); // extra frame ensures stability on Chromium

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = `${canvasFontSize}px '${fontFamily}', sans-serif`;

  // --- Measure text and apply a fallback minimum size ---
  const textWidth = ctx.measureText(message).width || 1;
  const height = canvasFontSize * 3.5;

  canvas.width = Math.max(2, textWidth);
  canvas.height = Math.max(2, height);

  // Reapply styles *after* sizing to avoid clearing
  ctx.font = `${canvasFontSize}px '${fontFamily}', sans-serif`;
  ctx.textBaseline = "top";
  ctx.shadowColor = glow.shadowColor;
  ctx.shadowBlur = glow.shadowBlur;
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
 * Creates or updates the label for a given country.
 */
export async function update3DLabel(
  countryId: number,
  camera: Camera,
  fade: number,
  resolution: Vector2 = new Vector2(window.innerWidth, window.innerHeight)
): Promise<void> {
  const entry = countryMeta[countryId];
  if (!entry) return;

  if (!labelObjects.has(countryId)) {
    const sprite = await createTextSprite(entry.name, false);
    const geometry = new LineGeometry();
    geometry.setPositions([0, 0, 0, 0, 0, 0]);

    const lineMaterial = createLabelLineMaterial(false);
    const line = new Line2(geometry, lineMaterial);
    line.computeLineDistances();

    const group = new Group();
    group.add(sprite);
    group.add(line as unknown as Object3D);
    line.renderOrder = 0;
    sprite.renderOrder = 1;

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

  sprite.position.copy(labelPos);
  sprite.material.opacity = fade;

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
  sprite.lookAt(camera.position); // Ensures label always faces camera
  group.rotation.set(0, 0, 0);
  group.quaternion.identity(); // Prevent any inherited rotation

  const top = labelPos;
  const bottom = center;

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
  mat.resolution.copy(resolution);

  const shouldBeVisible = fade > 0.01;
  if (group.visible !== shouldBeVisible) {
    group.visible = shouldBeVisible;
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
