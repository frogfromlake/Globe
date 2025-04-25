/**
 * oceanHover.ts
 * Provides ocean hover detection, ocean ID retrieval via RGB-encoded ID textures,
 * and setup for GLSL-compatible selection texture used in ocean highlighting.
 */

import {
  Vector2,
  Raycaster,
  Camera,
  Mesh,
  Vector3,
  DataTexture,
  RedFormat,
  UnsignedByteType,
} from "three";
import { CONFIG } from "../configs/config";

// Internal state for ocean ID map decoding via canvas
let oceanIdMapCanvas: HTMLCanvasElement | null = null;
let oceanIdCtx: CanvasRenderingContext2D | null = null;
let oceanImageLoaded = false;

/**
 * Loads the ocean ID map image into an offscreen canvas for pixel decoding.
 */
export async function loadOceanIdMapTexture(): Promise<void> {
  await new Promise<void>((resolve) => {
    const image = new Image();
    image.src = CONFIG.textures.oceanIdMapPath;
    image.onload = () => {
      oceanIdMapCanvas = document.createElement("canvas");
      oceanIdMapCanvas.width = image.width;
      oceanIdMapCanvas.height = image.height;
      oceanIdCtx = oceanIdMapCanvas.getContext("2d");
      oceanIdCtx?.drawImage(image, 0, 0);
      oceanImageLoaded = true;
      resolve();
    };
  });
}

/**
 * Retrieves an ocean ID from a given UV coordinate on the loaded ocean ID map.
 * Returns -1 if the map is not yet loaded or invalid.
 *
 * @param uv - UV coordinates of the pointer on the globe
 * @returns The 24-bit ocean ID derived from RGB values
 */
export function getOceanIdAtUV(uv: Vector2): number {
  if (!oceanImageLoaded || !oceanIdMapCanvas || !oceanIdCtx) return -1;

  const x = Math.floor(uv.x * oceanIdMapCanvas.width);
  const y = Math.floor((1.0 - uv.y) * oceanIdMapCanvas.height);
  const pixel = oceanIdCtx.getImageData(x, y, 1, 1).data;

  return (pixel[0] << 16) | (pixel[1] << 8) | pixel[2];
}

/**
 * Performs a raycast against the globe to determine the hovered ocean region.
 *
 * @param raycaster - The active Three.js raycaster
 * @param pointer - Normalized pointer coordinates
 * @param camera - The active camera
 * @param globe - The globe mesh to test for intersection
 * @returns Object containing the hovered ocean ID and hit point
 */
export function updateHoveredOcean(
  raycaster: Raycaster,
  pointer: Vector2,
  camera: Camera,
  globe: Mesh
): { id: number; position: Vector3 | null } {
  if (!oceanImageLoaded || !oceanIdMapCanvas || !oceanIdCtx) {
    return { id: -1, position: null };
  }

  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(globe)[0];
  if (!hit || !hit.uv || !hit.point) return { id: -1, position: null };

  const id = getOceanIdAtUV(hit.uv);
  return { id, position: hit.point.clone() };
}

/**
 * Creates and returns a 1D selection texture for ocean IDs.
 * Each texel maps to an ocean ID and is used for selection highlighting in shaders.
 *
 * @returns A configured DataTexture for GLSL use
 */
export function createSelectionOceanTexture(): DataTexture {
  const data = new Uint8Array(CONFIG.oceanHover.maxOceanCount);
  const texture = new DataTexture(
    data,
    CONFIG.oceanHover.maxOceanCount,
    1,
    RedFormat,
    UnsignedByteType
  );

  texture.minFilter = CONFIG.oceanHover.selectionTexture.minFilter;
  texture.magFilter = CONFIG.oceanHover.selectionTexture.magFilter;
  texture.wrapS = CONFIG.oceanHover.selectionTexture.wrapS;
  texture.wrapT = CONFIG.oceanHover.selectionTexture.wrapT;
  texture.needsUpdate = true;

  return texture;
}
