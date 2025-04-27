import {
  Vector2,
  Raycaster,
  Camera,
  Mesh,
  Vector3,
  DataTexture,
  RedFormat,
  UnsignedByteType,
  Intersection,
} from "three";
import { CONFIG } from "../configs/config";

// Internal state for ocean ID map decoding via canvas
let oceanIdMapCanvas: HTMLCanvasElement | null = null;
let oceanIdCtx: CanvasRenderingContext2D | null = null;
let oceanIdPixelData: Uint8ClampedArray | null = null;
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
      oceanIdCtx = oceanIdMapCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      oceanIdCtx?.drawImage(image, 0, 0);

      // Grab pixel data once
      const imageData = oceanIdCtx?.getImageData(
        0,
        0,
        oceanIdMapCanvas.width,
        oceanIdMapCanvas.height
      );
      if (imageData) {
        oceanIdPixelData = imageData.data;
      }

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
  if (!oceanImageLoaded || !oceanIdMapCanvas || !oceanIdPixelData) return -1;

  const x = Math.floor(uv.x * oceanIdMapCanvas.width);
  const y = Math.floor((1.0 - uv.y) * oceanIdMapCanvas.height);

  const index = (y * oceanIdMapCanvas.width + x) * 4; // 4 bytes per pixel (RGBA)

  // Read RGB and reconstruct the 24-bit ID
  const r = oceanIdPixelData[index];
  const g = oceanIdPixelData[index + 1];
  const b = oceanIdPixelData[index + 2];

  return (r << 16) | (g << 8) | b;
}

/**
 * Determines the currently hovered ocean based on UV coordinates.
 *
 * @param uv - The UV coordinates from the globe surface.
 * @returns The hovered ocean ID and null for position (not used).
 */
export function updateHoveredOcean(uv: Vector2): {
  id: number;
  position: Vector3 | null;
} {
  if (!oceanImageLoaded || !oceanIdMapCanvas || !oceanIdPixelData) {
    return { id: -1, position: null };
  }

  const id = getOceanIdAtUV(uv);
  return { id, position: null };
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
