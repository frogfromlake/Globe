/**
 * countryHover.ts
 * Handles country hover detection and country ID retrieval via UV-mapped RGB ID textures.
 * Also provides initialization and creation of the selection texture used in GLSL highlighting.
 */

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
} from "three";
import { CONFIG } from "../configs/config";

// Internal state for the RGB country ID map loaded into a canvas
let countryIdMapCanvas: HTMLCanvasElement | null = null;
let countryIdCtx: CanvasRenderingContext2D | null = null;
let imageLoaded = false;

/**
 * Reads a country ID from the UV coordinates on the loaded country ID map.
 * Returns -1 if no data is available or the texture is not yet loaded.
 *
 * @param uv - The UV coordinates of the pointer
 * @returns A 24-bit country ID derived from the RGB pixel
 */
export function getCountryIdAtUV(uv: Vector2): number {
  if (!imageLoaded || !countryIdMapCanvas || !countryIdCtx) return -1;

  const x = Math.floor(uv.x * countryIdMapCanvas.width);
  const y = Math.floor((1.0 - uv.y) * countryIdMapCanvas.height);
  const pixel = countryIdCtx.getImageData(x, y, 1, 1).data;

  return (pixel[0] << 16) | (pixel[1] << 8) | pixel[2];
}

/**
 * Loads the country ID map image and prepares it for pixel access via an offscreen canvas.
 */
export async function loadCountryIdMapTexture(): Promise<void> {
  await new Promise<void>((resolve) => {
    const image = new Image();
    image.src = CONFIG.countryHover.idMapPath;
    image.onload = () => {
      countryIdMapCanvas = document.createElement("canvas");
      countryIdMapCanvas.width = image.width;
      countryIdMapCanvas.height = image.height;
      countryIdCtx = countryIdMapCanvas.getContext("2d");
      countryIdCtx?.drawImage(image, 0, 0);
      imageLoaded = true;
      resolve();
    };
  });
}

/**
 * Performs raycasting to determine the currently hovered country based on the globe intersection.
 * Also updates the corresponding uniform used in the GLSL shader.
 *
 * @param raycaster - Three.js raycaster instance
 * @param pointer - Current normalized pointer position
 * @param camera - The active scene camera
 * @param globe - The globe mesh to test intersections against
 * @param globeMaterial - The globe's shader material containing the hoveredCountryId uniform
 * @returns The hovered country ID and the intersection point in world space
 */
export function updateHoveredCountry(
  raycaster: Raycaster,
  pointer: Vector2,
  camera: Camera,
  globe: Mesh,
  globeMaterial: ShaderMaterial
): { id: number; position: Vector3 | null } {
  if (!imageLoaded || !countryIdMapCanvas || !countryIdCtx) {
    return { id: -1, position: null };
  }

  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(globe)[0];
  if (!hit || !hit.uv || !hit.point) return { id: -1, position: null };

  const id = getCountryIdAtUV(hit.uv);
  globeMaterial.uniforms.hoveredCountryId.value = id;

  return { id, position: hit.point.clone() };
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
