import * as THREE from "three";
import { createTextSprite } from "./countryLabels3D";
import { CONFIG } from "../configs/config";
import { latLonToSphericalCoordsGeographic } from "../utils/geo";

type LabelObject = {
  sprite: THREE.Sprite;
  line: THREE.Line;
  group: THREE.Group;
};

const labelObjectsOcean = new Map<string, LabelObject>();
const labelGroup = new THREE.Group();

export function init3DOceanLabels(scene: THREE.Scene): void {
  scene.add(labelGroup);
}

export async function update3DOceanLabel(
  name: string,
  lat: number,
  lon: number,
  rotationY: number,
  camera: THREE.Camera
): Promise<void> {
  if (!labelObjectsOcean.has(name)) {
    const sprite = await createTextSprite(name);

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

    labelObjectsOcean.set(name, { sprite, line, group });
  }

  const { sprite, line, group } = labelObjectsOcean.get(name)!;

  const { phi, theta, radius } = latLonToSphericalCoordsGeographic(
    lat,
    lon,
    CONFIG.labels3D.markerRadius
  );

  const center = new THREE.Vector3().setFromSphericalCoords(radius, phi, theta);
  center.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);

  const cameraDistance = camera.position.length();

  // === Offset logic (stronger lift when zoomed out) ===
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

  // === Label scale logic ===
  const baseScale = CONFIG.labels3D.spriteScale;
  const canvas = sprite.material.map?.image as HTMLCanvasElement;
  const aspect = canvas.width / canvas.height || 2.5;

  const scaleFactor = THREE.MathUtils.mapLinear(
    cameraDistance,
    CONFIG.labels3D.zoomRange.min,
    CONFIG.labels3D.zoomRange.max,
    0.1, // smaller when close
    5.0 // bigger when far
  );

  const scaleX = aspect * baseScale * scaleFactor;
  const scaleY = baseScale * scaleFactor;

  sprite.scale.set(scaleX, scaleY, 1);

  // === Label geometry ===
  sprite.position.copy(labelPos);
  line.geometry.setFromPoints([center, labelPos]);
  line.geometry.attributes.position.needsUpdate = true;

  group.visible = true;
}

export function hideAll3DOceanLabels(): void {
  for (const { group } of labelObjectsOcean.values()) {
    group.visible = false;
  }
}
