import * as THREE from "three";
import { countryCenters } from "../data/countryCenters";
import { latLonToSphericalCoordsGeographic } from "../utils/geo";
import { CONFIG } from "../configs/config";

type LabelObject = {
  sprite: THREE.Sprite;
  line: THREE.Line;
  group: THREE.Group;
};

const labelGroup = new THREE.Group();
const labelObjects = new Map<number, LabelObject>();

export const createTextSprite = async (
  message: string
): Promise<THREE.Sprite> => {
  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const fontSize = CONFIG.labels3D.canvasFontSize;
  ctx.font = `${fontSize}px 'Orbitron', sans-serif`;
  const textWidth = ctx.measureText(message).width;

  canvas.width = textWidth;
  canvas.height = fontSize * 3.5;

  ctx.font = `${fontSize}px 'Orbitron', sans-serif`;
  ctx.textBaseline = "top";

  ctx.shadowColor = CONFIG.labels3D.glow.shadowColor;
  ctx.shadowBlur = CONFIG.labels3D.glow.shadowBlur;
  ctx.fillStyle = CONFIG.labels3D.glow.fillStyle;
  ctx.fillText(message, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({ map: texture, depthTest: true });
  const sprite = new THREE.Sprite(material);

  const aspect = canvas.width / canvas.height;
  const baseScale = CONFIG.labels3D.spriteScale;
  sprite.scale.set(aspect * baseScale, baseScale, 1);

  return sprite;
};

export function init3DLabels(scene: THREE.Scene): void {
  scene.add(labelGroup);
}

export async function update3DLabel(
  countryId: number,
  rotationY: number,
  camera: THREE.Camera
): Promise<void> {
  const entry = countryCenters[countryId];
  if (!entry) return;

  if (!labelObjects.has(countryId)) {
    const sprite = await createTextSprite(entry.name);

    const material = new THREE.LineBasicMaterial({
      color: CONFIG.labels3D.lineColor,
    });
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const line = new THREE.Line(geometry, material);

    const group = new THREE.Group();
    group.add(sprite);
    group.add(line);
    labelGroup.add(group);

    labelObjects.set(countryId, { sprite, line, group });
  }

  const { sprite, line, group } = labelObjects.get(countryId)!;
  const { phi, theta, radius } = latLonToSphericalCoordsGeographic(
    entry.lat,
    entry.lon,
    CONFIG.labels3D.markerRadius
  );

  const center = new THREE.Vector3().setFromSphericalCoords(radius, phi, theta);
  center.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);

  const cameraDistance = camera.position.length();

  const offset = THREE.MathUtils.mapLinear(
    cameraDistance,
    CONFIG.labels3D.zoomRange.min,
    CONFIG.labels3D.zoomRange.max,
    CONFIG.labels3D.offsetRange.min,
    CONFIG.labels3D.offsetRange.max
  );

  const labelPos = center
    .clone()
    .add(center.clone().normalize().multiplyScalar(offset));

  const baseScale = CONFIG.labels3D.spriteScale;
  const canvas = sprite.material.map?.image as HTMLCanvasElement;
  const aspect = canvas.width / canvas.height || 2.5;

  const scaleFactor = THREE.MathUtils.mapLinear(
    cameraDistance,
    CONFIG.labels3D.zoomRange.min,
    CONFIG.labels3D.zoomRange.max,
    0.1,
    5.0
  );

  const scaleX = aspect * baseScale * scaleFactor;
  const scaleY = baseScale * scaleFactor;

  sprite.scale.set(scaleX, scaleY, 1);
  sprite.position.copy(labelPos);

  line.geometry.setFromPoints([center, labelPos]);
  line.geometry.attributes.position.needsUpdate = true;

  group.visible = true;
}

export function hide3DLabel(countryId: number): void {
  const label = labelObjects.get(countryId);
  if (label) label.group.visible = false;
}

export function hideAll3DLabelsExcept(idsToKeep: number[] = []): void {
  for (const [id, { group }] of labelObjects.entries()) {
    group.visible = idsToKeep.includes(id);
  }
}
