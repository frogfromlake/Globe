/**
 * @file createPoleCapMesh.ts
 * @description Creates a polar triangle fan mesh to fill the Mercator projection gap at the north or south pole.
 * @author
 */

import {
  BufferGeometry,
  BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  Texture,
  DoubleSide,
} from "three";
import { latLonToUnitVector } from "./utils/latLonToVector";

/**
 * Creates a circular triangle fan mesh to visually cap the polar region.
 * This is used to fill the hole in the Web Mercator projection near the poles.
 *
 * @param isNorth Whether to cap the north pole (`true`) or the south pole (`false`)
 * @param segments Number of segments around the circle (recommended: 32+)
 * @param radius Radius of the globe the cap attaches to
 * @param texture Optional texture sampled from the closest adjacent tile
 * @param uvYOffset Vertical UV offset for texture mapping (0 = bottom, 1 = top)
 * @returns A `THREE.Mesh` that fills the polar gap
 */
export function createPoleCapMesh(
  isNorth: boolean,
  segments: number,
  radius: number,
  texture?: Texture,
  uvYOffset: number = isNorth ? 1 : 0
): Mesh {
  const centerLat = isNorth ? 90 : -90;
  const edgeLat = isNorth ? 85.0511 : -85.0511;

  const centerVec = latLonToUnitVector(centerLat, 0).multiplyScalar(radius);

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Add center vertex (fan pivot)
  positions.push(...centerVec.toArray());
  uvs.push(0.5, uvYOffset); // approximate center in UV space

  // Add ring of edge vertices around the polar circle
  for (let i = 0; i <= segments; i++) {
    const lon = (i / segments) * 360 - 180;
    const edgeVec = latLonToUnitVector(edgeLat, lon).multiplyScalar(radius);
    positions.push(...edgeVec.toArray());
    uvs.push(i / segments, uvYOffset); // stretch UV horizontally
  }

  // Create triangle fan indices
  for (let i = 1; i <= segments; i++) {
    indices.push(0, i, i + 1);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3)
  );
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new MeshBasicMaterial({
    map: texture,
    side: DoubleSide,
    transparent: !!texture,
  });

  const mesh = new Mesh(geometry, material);
  mesh.name = isNorth ? "north-pole-cap" : "south-pole-cap";

  return mesh;
}
