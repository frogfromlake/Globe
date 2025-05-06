/**
 * @file countryLabels3D.ts
 * @description Manages creation, updates, and visibility for 3D country labels and their connector lines.
 * Labels are rendered as glowing sprites with dynamically scaled lines based on camera distance.
 */

import {
  Sprite,
  Group,
  SpriteMaterial,
  CanvasTexture,
  Scene,
  Vector3,
  Camera,
  MathUtils,
  Color,
  LinearFilter,
  Object3D,
  PerspectiveCamera,
} from "three";
import { countryMeta } from "../data/countryMeta";
import { CONFIG } from "../configs/config";
import { createLabelLineMaterial, createLabelSpriteMaterial } from "../materials/globeMaterials";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { latLonToSphericalCoordsGeographic } from "../geo/coordinates";

type LabelObject = {
  sprite: Sprite;
  line: Line2;
  group: Group;
};

export const countryLabelGroup = new Group();
const labelObjects = new Map<number, LabelObject>();

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

  // Ensure font is loaded and ready before rendering to canvas
  await document.fonts.ready;
  await document.fonts.load(`normal 400 ${canvasFontSize}px '${fontFamily}'`);
  await new Promise(requestAnimationFrame); // Important for Chromium timing

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  ctx.font = `${canvasFontSize}px '${fontFamily}', sans-serif`;
  const textWidth = ctx.measureText(message).width;
  canvas.width = textWidth;
  canvas.height = canvasFontSize * 3.5;

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
  const aspect = canvas.width / canvas.height;
  sprite.scale.set(aspect * spriteScale, spriteScale, 1);

  return sprite;
}

/**
 * Creates or updates a 3D label for a given country ID.
 * Handles label positioning, scaling, and opacity based on globe rotation and camera distance.
 *
 * @param countryId - The numeric country ID associated with the label.
 * @param rotationY - Current Y-axis rotation of the globe (used to rotate label position).
 * @param camera - The active Three.js camera for distance-based scaling.
 * @param fade - Alpha fade value (0 to 1) controlling label opacity.
 */
export async function update3DLabel(
  countryId: number,
  camera: Camera,
  fade: number
): Promise<void> {
  const entry = countryMeta[countryId];
  if (!entry) return;

  // Create the label if it doesn't exist
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

    // Enforce correct render order
    line.renderOrder = 0;
    sprite.renderOrder = 1;

    countryLabelGroup.add(group);
    labelObjects.set(countryId, { sprite, line, group });
  }

  const { sprite, line, group } = labelObjects.get(countryId)!;

  // Compute center on globe surface
  const { phi, theta, radius } = latLonToSphericalCoordsGeographic(
    entry.lat,
    entry.lon,
    CONFIG.labels3D.markerRadius
  );
  // Calculate position from lat/lon
  let center = new Vector3().setFromSphericalCoords(radius, phi, theta);

  // Compute zoom-dependent offset and final label position
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

  // Apply position to sprite and make sure it's at the end of the line
  sprite.position.copy(labelPos);
  sprite.material.opacity = fade;

  // Update sprite scale based on zoom
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

  // Update the line to go from center to the label position
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

  // Set material resolution and fade
  const mat = line.material as any;
  mat.opacity = fade;
  mat.resolution.set(window.innerWidth, window.innerHeight);

  group.visible = fade > 0.01;
}

/**
 * Hides all country labels except those in the specified list of IDs.
 *
 * @param idsToKeep - An array of country IDs whose labels should remain visible.
 */
export function hideAll3DLabelsExcept(idsToKeep: number[] = []): void {
  for (const [id, { group }] of labelObjects.entries()) {
    group.visible = idsToKeep.includes(id);
  }
}
