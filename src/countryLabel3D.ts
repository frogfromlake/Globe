// countryLabel3D.ts
import * as THREE from "three";
import { countryCenters } from "./data/country_centroids.js";
import { latLonToSphericalCoordsGeographic } from "./utils/geo.js";

// Types
type CountryCenter = { lat: number; lon: number; name: string };
type LabelObject = {
  sprite: THREE.Sprite;
  line: THREE.Line;
  group: THREE.Group;
};

// Label group and storage
const labelGroup = new THREE.Group();
const labelObjects = new Map<number, LabelObject>();

// Create text label as sprite
const createTextSprite = async (message: string): Promise<THREE.Sprite> => {
  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const fontSize = 64;
  ctx.font = `${fontSize}px 'Orbitron', sans-serif`;
  const textWidth = ctx.measureText(message).width;

  canvas.width = textWidth;
  canvas.height = fontSize * 3.5;

  ctx.font = `${fontSize}px 'Orbitron', sans-serif`;
  ctx.textBaseline = "top";

  // Glow
  ctx.shadowColor = "rgba(0, 140, 255, 0.2)";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "#BFE1FF";
  ctx.fillText(message, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({ map: texture, depthTest: true });
  const sprite = new THREE.Sprite(material);
  const scale = 0.2;
  sprite.scale.set(scale * (canvas.width / canvas.height), scale, 1);

  return sprite;
};

// Initialize label group in scene
export function init3DLabels(scene: THREE.Scene): void {
  scene.add(labelGroup);
}

// Create/update a label for given country
export async function update3DLabel(
  countryId: number,
  rotationY: number,
  cameraDistance: number
): Promise<void> {
  const entry: CountryCenter | undefined = countryCenters[countryId];
  if (!entry) return;

  if (!labelObjects.has(countryId)) {
    const sprite = await createTextSprite(entry.name);

    const material = new THREE.LineBasicMaterial({ color: 0x3399ff });
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
    1.01
  );

  const center = new THREE.Vector3().setFromSphericalCoords(radius, phi, theta);
  center.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);

  const zoomFactor = THREE.MathUtils.clamp(
    (cameraDistance - 1.1) / (10 - 1.1),
    0,
    1
  );
  const offset = THREE.MathUtils.lerp(0.15, 0.6, Math.sqrt(zoomFactor));
  const labelPos = center
    .clone()
    .add(center.clone().normalize().multiplyScalar(offset));

  sprite.position.copy(labelPos);

  const points = [center, labelPos];
  line.geometry.setFromPoints(points);
  line.geometry.attributes.position.needsUpdate = true;
  group.visible = true;
}

// Hide label for specific country
export function hide3DLabel(countryId: number): void {
  const label = labelObjects.get(countryId);
  if (label) label.group.visible = false;
}

// Hide all labels except those in the provided list
export function hideAll3DLabelsExcept(idsToKeep: number[] = []): void {
  for (const [id, { group }] of labelObjects.entries()) {
    group.visible = idsToKeep.includes(id);
  }
}
