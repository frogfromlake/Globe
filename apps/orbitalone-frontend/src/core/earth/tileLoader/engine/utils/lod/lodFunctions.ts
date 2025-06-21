/**
 * @file utils/lod/lodFunctions.ts
 * @description
 */

import { PerspectiveCamera } from "three";

/**
 * Returns the minimum dot product required between a tile's center direction
 * and the camera direction for the tile to be considered visible.
 *
 * Dynamically tightens visibility cone at high zoom levels (Z13 ≈ 0.9).
 */
export function getMinDotThreshold(z: number, cameraFovDeg: number): number {
  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max);

  const zFactor = clamp((z - 3) / 10, 0, 1); // Normalized [0–1] scale for Z3 to Z13
  const minDot = 0.25; // Visible from side at low zoom
  const maxDot = 0.9; // Strict forward cone at high zoom

  return clamp(minDot + (maxDot - minDot) * Math.pow(zFactor, 1.6), 0, 0.94);
}

/**
 * Returns a multiplier to inflate the bounding sphere used in frustum culling.
 * Prevents premature tile exclusion at high zoom levels.
 */
export function getBoundingSphereMultiplier(z: number): number {
  if (z <= 8) return 1.0;
  const extra = z - 8;
  return 1.0 + 3.0 * Math.pow(extra, 1.0); // progressively inflate beyond Z8
}

/**
 * Maximum number of tiles to load in one update pass depending on zoom level.
 * Keeps tile load burst manageable for each zoom level.
 */
export function getMaxTilesToLoad(z: number): number {
  if (z >= 13) return 112;
  if (z === 12) return 112;
  if (z === 11) return 96;
  if (z === 10) return 80;
  if (z === 9) return 72;
  if (z === 8) return 64;
  if (z === 7) return 64;
  if (z === 6) return 64;
  if (z === 5) return 48;
  if (z === 4) return 32;
  return 16; // Very low zoom
}

/**
 * Minimum screen distance at which a tile is still considered "near center".
 * Used to bias loading priority.
 */
export function getMinTileScreenDistance(z: number): number {
  return 0.1 / Math.pow(2, z - 8); // Tighter screen bias at higher zooms
}

/**
 * Minimum radius for a tile’s bounding sphere.
 * Ensures tiles don’t vanish due to subpixel bounding errors.
 */
export function getMinTileRadius(z: number): number {
  return z <= 10 ? 0.03 : z === 11 ? 0.06 : z === 12 ? 0.09 : 0.12;
}

/**
 * Dynamically inflates tile bounding volume for near-screen tiles at high zoom.
 * Improves tile stability during camera transitions.
 */
export function getTileInflation(z: number, dist: number): number {
  if (dist < 1.004 && z >= 11) return 1.07 + (1.004 - dist) * 60;
  return 1.0;
}

/**
 * Estimates the appropriate zoom level for the current camera position.
 * Uses tight hysteresis windows at high zoom to prevent flicker.
 */
export function estimateZoomLevel(camera: PerspectiveCamera): number {
  const dist = camera.position.length();

  const zoomRanges = [
    { min: 1.8, max: Infinity, zoom: 3 }, // far away
    { min: 1.5, max: 1.8, zoom: 4 },
    { min: 1.35, max: 1.5, zoom: 5 },
    { min: 1.2, max: 1.35, zoom: 6 },
    { min: 1.1, max: 1.2, zoom: 7 },
    { min: 1.04, max: 1.1, zoom: 8 },
    { min: 1.02, max: 1.04, zoom: 9 },
    { min: 1.01, max: 1.02, zoom: 10 },
    { min: 1.004, max: 1.01, zoom: 11 },
    { min: 1.0015, max: 1.004, zoom: 12 },
    { min: 1.00028, max: 1.0015, zoom: 13 },
  ];

  for (const range of zoomRanges) {
    if (dist >= range.min && dist < range.max) {
      return range.zoom;
    }
  }

  return 4; // Default fallback
}

/**
 * Opacity threshold used to determine when a fallback tile can be hidden.
 * Higher zooms require lower opacity for replacement.
 */
export function getFallbackHideOpacityThreshold(zoom: number): number {
  return zoom <= 9
    ? 0.6
    : zoom === 10
    ? 0.55
    : zoom === 11
    ? 0.5
    : zoom === 12
    ? 0.45
    : 0.4; // Z13+
}

/**
 * Limits concurrent tile loads based on zoom level.
 * Higher zoom levels load fewer tiles to reduce strain.
 */
export function getConcurrencyLimit(z: number): number {
  if (z >= 13) return 1;
  if (z === 12) return 2;
  if (z === 11) return 3;
  if (z >= 9) return 4;
  if (z === 8) return 6;
  return 8;
}

/**
 * Controls spiral search radius for tile candidates per zoom level.
 * Determines how far from center to check for visible tiles.
 */
export function getTileSearchRadius(z: number): number {
  if (z <= 4) return 2;
  if (z <= 6) return 4;
  if (z <= 8) return 6;
  if (z === 9) return 8;
  if (z === 10) return 6; // tuned down from 20
  if (z === 11) return 28;
  if (z === 12) return 36;
  return 48; // Z13
}

/**
 * Returns a hard cap for screen-space visibility of tiles at each zoom level.
 * Used to discard stale or far-off high-Z tiles for performance.
 */
export function getScreenDistanceCap(z: number): number {
  if (z === 3) return 3.5;
  if (z === 4) return 2.4;
  if (z === 5) return 2.55;
  if (z === 6) return 3.1;
  if (z === 7) return 3.6;
  if (z === 8) return 4.5;
  if (z === 9) return 4.1;
  if (z === 10) return 3.95;
  if (z === 11) return 2.2;
  if (z === 12) return 2.04;
  if (z === 13) return 2.02;
  return 1.0;
}
