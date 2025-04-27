import {
  Vector2,
  Raycaster,
  Camera,
  Mesh,
  ShaderMaterial,
  Vector3,
  DataTexture,
  RedFormat,
  UnsignedByteType,
  Intersection,
} from "three";
import { CONFIG } from "../configs/config";

// Internal state for the RGB country ID map loaded into a canvas
let countryIdMapCanvas: HTMLCanvasElement | null = null;
let countryIdCtx: CanvasRenderingContext2D | null = null;
let countryIdPixelData: Uint8ClampedArray | null = null;
let imageLoaded = false;

/**
 * Reads a country ID from the UV coordinates on the loaded country ID map.
 * Returns -1 if no data is available or the texture is not yet loaded.
 *
 * @param uv - The UV coordinates of the pointer
 * @returns A 24-bit country ID derived from the RGB pixel
 */
export function getCountryIdAtUV(uv: Vector2): number {
  if (!imageLoaded || !countryIdMapCanvas || !countryIdPixelData) return -1;

  const x = Math.floor(uv.x * countryIdMapCanvas.width);
  const y = Math.floor((1.0 - uv.y) * countryIdMapCanvas.height);

  const index = (y * countryIdMapCanvas.width + x) * 4; // RGBA, 4 bytes per pixel
  const id = countryIdPixelData[index]; // Use red channel only

  return id;
}

/**
 * Loads the country ID map image and prepares it for pixel access via an offscreen canvas.
 */
export async function loadCountryIdMapTexture(): Promise<void> {
  await new Promise<void>((resolve) => {
    const image = new Image();
    image.src = CONFIG.textures.countryIdMapPath;
    image.onload = () => {
      countryIdMapCanvas = document.createElement("canvas");
      countryIdMapCanvas.width = image.width;
      countryIdMapCanvas.height = image.height;
      countryIdCtx = countryIdMapCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      countryIdCtx?.drawImage(image, 0, 0);

      // Grab pixel data once
      const imageData = countryIdCtx?.getImageData(
        0,
        0,
        countryIdMapCanvas.width,
        countryIdMapCanvas.height
      );
      if (imageData) {
        countryIdPixelData = imageData.data;
      }

      imageLoaded = true;
      resolve();
    };
  });
}

/**
 * Determines the currently hovered country based on UV coordinates.
 * Also updates the hoveredCountryId uniform in the globe shader material.
 *
 * @param uv - The UV coordinates from the globe surface.
 * @param globeMaterial - The globe's shader material containing the hoveredCountryId uniform.
 * @returns The hovered country ID and null for position (not used).
 */
export function updateHoveredCountry(
  uv: Vector2,
  globeMaterial: ShaderMaterial
): { id: number; position: Vector3 | null } {
  if (!imageLoaded || !countryIdMapCanvas || !countryIdPixelData) {
    return { id: -1, position: null };
  }

  const id = getCountryIdAtUV(uv);
  globeMaterial.uniforms.hoveredCountryId.value = id;

  return { id, position: null };
}

/**
 * Creates and returns a DataTexture used for per-country selection highlighting.
 * The texture is 1D with each texel representing a country's selection state.
 *
 * @returns The initialized DataTexture for selected country IDs
 */
export function createSelectionTexture(): DataTexture {
  const data = new Uint8Array(CONFIG.countryHover.maxCountryCount);
  const texture = new DataTexture(
    data,
    CONFIG.countryHover.maxCountryCount,
    1,
    RedFormat,
    UnsignedByteType
  );

  texture.minFilter = CONFIG.countryHover.selectionTexture.minFilter;
  texture.magFilter = CONFIG.countryHover.selectionTexture.magFilter;
  texture.wrapS = CONFIG.countryHover.selectionTexture.wrapS;
  texture.wrapT = CONFIG.countryHover.selectionTexture.wrapT;
  texture.needsUpdate = true;

  return texture;
}
