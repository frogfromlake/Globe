/**
 * @file generatePolarPatches.ts
 * @description Generates lat/lon patch definitions for north and south pole ring/cap areas.
 */

import { tileToLatLonBounds } from "./utils/tileToBounds";

export interface PolarPatch {
  name: string;
  x: number;
  y: number;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

/**
 * Generates polar patch definitions for tile rendering to fill in Web Mercator gaps.
 * These are not fan meshes, but quadrilateral tiles based on lat/lon bounds.
 *
 * @param zoom Zoom level (used to determine tile count and segment size)
 * @returns Array of polar patch tile definitions
 */
export function generatePolarPatches(zoom: number): PolarPatch[] {
  const tileCount = 2 ** zoom;
  const polarRingBand = 2.5;
  const polarCapBand = 2.5;
  const segments = tileCount;

  const patches: PolarPatch[] = [];

  for (let i = 0; i < segments; i++) {
    const { lonMin, lonMax } = tileToLatLonBounds(i, 0, zoom); // approximate by base row

    patches.push(
      {
        name: "polar-ring-north",
        x: i,
        y: 0,
        latMin: 90 - polarCapBand - polarRingBand,
        latMax: 90 - polarCapBand,
        lonMin,
        lonMax,
      },
      {
        name: "polar-cap-north",
        x: i,
        y: 0,
        latMin: 90 - polarCapBand,
        latMax: 90,
        lonMin,
        lonMax,
      },
      {
        name: "polar-ring-south",
        x: i,
        y: tileCount - 1,
        latMin: -90 + polarCapBand,
        latMax: -90 + polarCapBand + polarRingBand,
        lonMin,
        lonMax,
      },
      {
        name: "polar-cap-south",
        x: i,
        y: tileCount - 1,
        latMin: -90,
        latMax: -90 + polarCapBand,
        lonMin,
        lonMax,
      }
    );
  }

  return patches;
}
