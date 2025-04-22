import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

import { createTextSprite } from "./countryLabels3D";
import { CONFIG } from "../configs/config";
import { latLonToSphericalCoordsGeographic } from "../utils/geo";

type LabelObject = {
  sprite: THREE.Sprite;
  line: Line2;
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
  camera: THREE.Camera,
  fade: number
): Promise<void> {
  if (!labelObjectsOcean.has(name)) {
    const sprite = await createTextSprite(name);

    const geometry = new LineGeometry();
    geometry.setPositions([0, 0, 0, 0, 0, 0]);

    const material = new LineMaterial({
      color: CONFIG.labels3D.lineColor,
      linewidth: CONFIG.labels3D.lineWidth,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });

    const line = new Line2(geometry, material);
    line.computeLineDistances();

    const group = new THREE.Group();
    group.add(sprite);
    group.add(line as unknown as THREE.Object3D); // 👈 workaround for TS compatibility
    labelGroup.add(group);

    // ensure sprite is transparent
    sprite.material.transparent = true;
    sprite.material.opacity = 0;

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

  // === Label scale ===
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

  sprite.scale.set(
    aspect * baseScale * scaleFactor,
    baseScale * scaleFactor,
    1
  );
  sprite.position.copy(labelPos);

  // === Apply fade + resolution update ===
  const mat = line.material as LineMaterial;
  mat.opacity = fade;
  mat.resolution.set(window.innerWidth, window.innerHeight);

  // === Geometry update ===
  (line.geometry as LineGeometry).setPositions([
    center.x,
    center.y,
    center.z,
    labelPos.x,
    labelPos.y,
    labelPos.z,
  ]);
  line.computeLineDistances();

  sprite.material.opacity = fade;
  group.visible = fade > 0.01;
}

export function hideAll3DOceanLabels(): void {
  for (const { group } of labelObjectsOcean.values()) {
    group.visible = false;
  }
}
