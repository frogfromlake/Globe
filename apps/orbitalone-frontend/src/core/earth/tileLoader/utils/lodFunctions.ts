// utils/lodFunctions.ts (Refactored from live TileManager + DynamicTileManager)

import { PerspectiveCamera, Sphere } from "three";

/**
 * Returns minimum acceptable dot product between tile direction and camera direction
 * to keep tile visible in high zoom levels.
 */
export function getMinDotThreshold(z: number, cameraFovDeg: number): number {
  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max);

  const zFactor = clamp((z - 3) / 10, 0, 1); // Z3=0, Z13=1
  const minDot = 0.25; // ✅ match observed tile values
  const maxDot = 0.90;

  return clamp(minDot + (maxDot - minDot) * Math.pow(zFactor, 1.6), 0, 0.94);
}

/**
 * Radius multiplier for bounding sphere used in frustum culling.
 */
export function getBoundingSphereMultiplier(z: number): number {
  if (z <= 8) return 1.0;
  const extra = z - 8;
  return 1.0 + 3.0 * Math.pow(extra, 1.5); // aggressive inflation for high-Z
}

/**
 * Max number of tiles to load concurrently depending on zoom level.
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
  return 16; // Z3 and below
}

/**
 * How far from screen center a tile can be and still be prioritized
 */
export function getMinTileScreenDistance(z: number): number {
  return 0.1 / Math.pow(2, z - 8);
}

/**
 * Minimum bounding sphere radius for tile (prevents vanishing tiles).
 */
export function getMinTileRadius(z: number): number {
  return z <= 10 ? 0.03 : z === 11 ? 0.06 : z === 12 ? 0.09 : 0.12; // Z13+
}

export function getTileInflation(z: number, dist: number): number {
  if (dist < 1.004 && z >= 11) return 1.07 + (1.004 - dist) * 60;
  return 1.0;
}

/**
 * Zoom level estimation based on camera distance and hysteresis thresholds.
 */
export function estimateZoomLevel(camera: PerspectiveCamera): number {
  const dist = camera.position.length();

  const zoomRanges = [
    { min: 2.5, max: Infinity, zoom: 3 },
    { min: 1.5, max: 2.5, zoom: 4 },
    { min: 1.25, max: 1.5, zoom: 5 },
    { min: 1.12, max: 1.25, zoom: 6 },
    { min: 1.06, max: 1.12, zoom: 7 },
    { min: 1.04, max: 1.06, zoom: 8 },
    { min: 1.02, max: 1.04, zoom: 9 },
    { min: 1.005, max: 1.02, zoom: 10 },
    { min: 1.0025, max: 1.005, zoom: 11 },
    { min: 1.0015, max: 1.0025, zoom: 12 },
    { min: 1.0001, max: 1.0015, zoom: 13 },
  ];

  for (const range of zoomRanges) {
    if (dist >= range.min && dist < range.max) {
      return range.zoom;
    }
  }

  return 4; // fallback default
}

/**
 * Opacity threshold beyond which fallback tile can be hidden.
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

export function getConcurrencyLimit(z: number): number {
  if (z >= 13) return 1;
  if (z === 12) return 2;
  if (z === 11) return 3;
  if (z >= 9) return 4;
  if (z === 8) return 6;
  return 8; // for z <= 7
}

export function getTileSearchRadius(z: number): number {
  if (z <= 4) return 2;
  if (z <= 6) return 4;
  if (z <= 8) return 6;
  if (z === 9) return 8;
  if (z === 10) return 16;
  if (z === 11) return 18;
  if (z === 12) return 24;
  return 32; // Z13
}

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
