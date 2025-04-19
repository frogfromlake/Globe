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
  cameraDistance: number
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

  const zoomFactor = THREE.MathUtils.clamp(
    (cameraDistance - CONFIG.labels3D.zoomRange.min) /
      (CONFIG.labels3D.zoomRange.max - CONFIG.labels3D.zoomRange.min),
    0,
    1
  );
  const offset = THREE.MathUtils.lerp(
    CONFIG.labels3D.offsetRange.min,
    CONFIG.labels3D.offsetRange.max,
    Math.sqrt(zoomFactor)
  );

  const labelPos = center
    .clone()
    .add(center.clone().normalize().multiplyScalar(offset));

  sprite.position.copy(labelPos);
  const points = [center, labelPos];
  line.geometry.setFromPoints(points);
  line.geometry.attributes.position.needsUpdate = true;

  group.visible = true;
}

export function hideAll3DOceanLabels(): void {
  for (const { group } of labelObjectsOcean.values()) {
    group.visible = false;
  }
}
