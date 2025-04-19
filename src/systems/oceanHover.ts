import * as THREE from "three";
import { CONFIG } from "../configs/config";

let oceanIdMapCanvas: HTMLCanvasElement | null = null;
let oceanIdCtx: CanvasRenderingContext2D | null = null;
let oceanImageLoaded = false;

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

export function getOceanIdAtUV(uv: THREE.Vector2): number {
  if (!oceanImageLoaded || !oceanIdMapCanvas || !oceanIdCtx) return -1;

  const x = Math.floor(uv.x * oceanIdMapCanvas.width);
  const y = Math.floor((1.0 - uv.y) * oceanIdMapCanvas.height);
  const pixel = oceanIdCtx.getImageData(x, y, 1, 1).data;
  return (pixel[0] << 16) | (pixel[1] << 8) | pixel[2];
}

export function updateHoveredOcean(
  raycaster: THREE.Raycaster,
  pointer: THREE.Vector2,
  camera: THREE.Camera,
  globe: THREE.Mesh
): { id: number; position: THREE.Vector3 | null } {
  if (!oceanImageLoaded || !oceanIdMapCanvas || !oceanIdCtx) {
    return { id: -1, position: null };
  }

  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(globe)[0];
  if (!hit || !hit.uv || !hit.point) return { id: -1, position: null };

  const uv = hit.uv;
  const x = Math.floor(uv.x * oceanIdMapCanvas.width);
  const y = Math.floor((1.0 - uv.y) * oceanIdMapCanvas.height);
  const pixel = oceanIdCtx.getImageData(x, y, 1, 1).data;
  const oceanId = (pixel[0] << 16) | (pixel[1] << 8) | pixel[2];

  return { id: oceanId, position: hit.point.clone() };
}

export function createSelectionOceanTexture(): THREE.DataTexture {
  const data = new Uint8Array(CONFIG.oceanHover.maxOceanCount);
  const texture = new THREE.DataTexture(
    data,
    CONFIG.oceanHover.maxOceanCount,
    1,
    THREE.RedFormat,
    THREE.UnsignedByteType
  );
  texture.minFilter = CONFIG.oceanHover.selectionTexture.minFilter;
  texture.magFilter = CONFIG.oceanHover.selectionTexture.magFilter;
  texture.wrapS = CONFIG.oceanHover.selectionTexture.wrapS;
  texture.wrapT = CONFIG.oceanHover.selectionTexture.wrapT;
  texture.needsUpdate = true;
  return texture;
}
