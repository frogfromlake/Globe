// countryHover.ts
import * as THREE from "three";

let countryIdMapCanvas: HTMLCanvasElement | null = null;
let countryIdCtx: CanvasRenderingContext2D | null = null;
let imageLoaded = false;

export function getCountryIdAtUV(uv: THREE.Vector2): number {
  if (!imageLoaded || !countryIdMapCanvas || !countryIdCtx) return -1;

  const x = Math.floor(uv.x * countryIdMapCanvas.width);
  const y = Math.floor((1.0 - uv.y) * countryIdMapCanvas.height);
  const pixel = countryIdCtx.getImageData(x, y, 1, 1).data;
  return (pixel[0] << 16) | (pixel[1] << 8) | pixel[2];
}

export async function loadCountryIdMapTexture(): Promise<void> {
  await new Promise<void>((resolve) => {
    const image = new Image();
    image.src = "textures/country_id_map_8k_rgb.png";
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

export function updateHoveredCountry(
  raycaster: THREE.Raycaster,
  pointer: THREE.Vector2,
  camera: THREE.Camera,
  globe: THREE.Mesh,
  globeMaterial: THREE.ShaderMaterial
): number | { id: number; position: THREE.Vector3 | null } {
  if (!imageLoaded || !countryIdMapCanvas || !countryIdCtx) {
    return { id: -1, position: null };
  }

  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(globe)[0];
  if (!hit || !hit.uv || !hit.point) return { id: -1, position: null };

  const uv = hit.uv;
  const x = Math.floor(uv.x * countryIdMapCanvas.width);
  const y = Math.floor((1.0 - uv.y) * countryIdMapCanvas.height);
  const pixel = countryIdCtx.getImageData(x, y, 1, 1).data;
  const countryId = (pixel[0] << 16) | (pixel[1] << 8) | pixel[2];

  globeMaterial.uniforms.hoveredCountryId.value = countryId;

  return countryId;
}

export function createSelectionTexture(maxCountries = 2048): THREE.DataTexture {
  const data = new Uint8Array(maxCountries);
  const texture = new THREE.DataTexture(
    data,
    maxCountries,
    1,
    THREE.RedFormat,
    THREE.UnsignedByteType
  );
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}
