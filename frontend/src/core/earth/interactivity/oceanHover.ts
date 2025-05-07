/**
 * @file oceanHover.ts
 * @description Handles pixel-precise hover detection for oceans using an offscreen canvas and RGB ID map.
 */

import {
  Vector2,
  Vector3,
  DataTexture,
  RedFormat,
  UnsignedByteType,
} from "three";
import { CONFIG } from "@/configs/config";

// === Internal state for offscreen ocean ID decoding ===
let oceanIdCanvas: HTMLCanvasElement | null = null;
let oceanIdCtx: CanvasRenderingContext2D | null = null;
let oceanIdData: Uint8ClampedArray | null = null;
let oceanImageLoaded = false;

/**
 * Loads the ocean ID map image into an offscreen canvas and caches pixel data for fast lookup.
 */
export async function loadOceanIdMapTexture(): Promise<void> {
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.src = CONFIG.textures.oceanIdMapPath;
    img.onload = () => {
      oceanIdCanvas = document.createElement("canvas");
      oceanIdCanvas.width = img.width;
      oceanIdCanvas.height = img.height;

      oceanIdCtx = oceanIdCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      if (!oceanIdCtx) return;

      oceanIdCtx.drawImage(img, 0, 0);
      const imageData = oceanIdCtx.getImageData(0, 0, img.width, img.height);
      oceanIdData = imageData.data;

      oceanImageLoaded = true;
      resolve();
    };
  });
}

/**
 * Decodes a 24-bit ocean ID from the given UV coordinate.
 *
 * @param uv - UV coordinate on the globe's surface.
 * @returns The decoded 24-bit ocean ID, or -1 if not available.
 */
export function getOceanIdAtUV(uv: Vector2): number {
  if (!oceanImageLoaded || !oceanIdCanvas || !oceanIdData) return -1;

  const x = Math.floor(uv.x * oceanIdCanvas.width);
  const y = Math.floor((1.0 - uv.y) * oceanIdCanvas.height);

  if (x < 0 || x >= oceanIdCanvas.width || y < 0 || y >= oceanIdCanvas.height)
    return -1;

  const idx = (y * oceanIdCanvas.width + x) * 4;
  const r = oceanIdData[idx];
  const g = oceanIdData[idx + 1];
  const b = oceanIdData[idx + 2];

  return (r << 16) | (g << 8) | b;
}

/**
 * Returns the currently hovered ocean based on the UV coordinate.
 *
 * @param uv - UV coordinate on the globe.
 * @returns An object containing the ocean ID and a null position placeholder.
 */
export function updateHoveredOcean(uv: Vector2): {
  id: number;
  position: Vector3 | null;
} {
  return {
    id: getOceanIdAtUV(uv),
    position: null,
  };
}

/**
 * Creates a 1D selection texture for ocean highlights.
 * Used in shaders to render selected ocean highlights.
 *
 * @returns A new DataTexture to be passed as a shader uniform.
 */
export function createSelectionOceanTexture(): DataTexture {
  const width = CONFIG.oceanHover.maxOceanCount;
  const data = new Uint8Array(width);
  const texture = new DataTexture(data, width, 1, RedFormat, UnsignedByteType);

  const { minFilter, magFilter, wrapS, wrapT } =
    CONFIG.oceanHover.selectionTexture;
  texture.minFilter = minFilter;
  texture.magFilter = magFilter;
  texture.wrapS = wrapS;
  texture.wrapT = wrapT;
  texture.needsUpdate = true;

  return texture;
}
