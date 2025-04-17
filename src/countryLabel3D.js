import * as THREE from "three";
import { countryCenters } from "../data/country_centroids.js";

const labelGroup = new THREE.Group();
const labelObjects = new Map(); // countryId -> { sprite, line }

const createTextSprite = async (message) => {
  await document.fonts.ready; // wait for fonts to be available

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const fontSize = 64;
  ctx.font = `${fontSize}px 'Orbitron', sans-serif`;
  const textWidth = ctx.measureText(message).width;

  canvas.width = textWidth;
  canvas.height = fontSize * 3.5;

  ctx.font = `${fontSize}px 'Orbitron', sans-serif`;
  ctx.textBaseline = "top";

  // Optional glow
  ctx.shadowColor = "rgba(0, 140, 255, 0.2)";
  ctx.shadowBlur = 20;

  ctx.fillStyle = "#BFE1FF"; // soft glow blue
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

export function init3DLabels(scene) {
  scene.add(labelGroup);
}

export async function update3DLabel(countryId, rotationY, cameraDistance) {
  const entry = countryCenters[countryId];
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

  const { sprite, line, group } = labelObjects.get(countryId);

  const baseRadius = 1.01;
  const phi = (90 - entry.lat) * (Math.PI / 180);
  const theta = (entry.lon + 90) * (Math.PI / 180);
  const center = new THREE.Vector3().setFromSphericalCoords(
    baseRadius,
    phi,
    theta
  );
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

export function hide3DLabel(countryId) {
  if (labelObjects.has(countryId)) {
    labelObjects.get(countryId).group.visible = false;
  }
}

export function hideAll3DLabelsExcept(idsToKeep = []) {
  for (const [id, { group }] of labelObjects.entries()) {
    group.visible = idsToKeep.includes(id);
  }
}
