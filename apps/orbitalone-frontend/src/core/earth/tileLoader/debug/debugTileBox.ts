/**
 * @file debug/debugTileBox.ts
 * @description Renders a colored Box3Helper for a tile, useful for debugging visibility, culling, and positioning. 
 * Color is based on zoom level (Z10–Z13). 
 * Call this function with a tile’s lat/lon bounds and a scene reference to visualize it.
 */

import { Box3, Box3Helper, Scene, Vector3 } from "three";
import { latLonToUnitVector } from "../utils/geo/latLonToVector";

export function debugShowTileBox(
  bounds: { latMin: number; latMax: number; lonMin: number; lonMax: number },
  scene: Scene,
  z: number
) {
  const centerLat = (bounds.latMin + bounds.latMax) / 2;
  const centerLon = (bounds.lonMin + bounds.lonMax) / 2;
  const center = latLonToUnitVector(centerLat, centerLon).multiplyScalar(1.0);

  const box = new Box3().setFromCenterAndSize(
    center,
    new Vector3(0.005, 0.005, 0.005)
  );
  const colors = {
    10: 0xffff00,
    11: 0xffaa00,
    12: 0xff5500,
    13: 0xff0000,
  };
  const helper = new Box3Helper(
    box,
    colors[z as keyof typeof colors] ?? 0x888888
  );

  scene.add(helper);
}
