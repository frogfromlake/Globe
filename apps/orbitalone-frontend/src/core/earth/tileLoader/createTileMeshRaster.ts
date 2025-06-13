import {
  BufferGeometry,
  BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  DoubleSide,
  LinearMipMapLinearFilter,
  LinearFilter,
  FrontSide,
  CanvasTexture,
  ImageBitmapLoader,
  Texture,
} from "three";
import { tileToLatLonBounds } from "./utils/tileToBounds";
import { latLonToUnitVector } from "./utils/latLonToVector";
import { TileMeshOptions } from "./types";

/**
 * Creates a mesh for a single raster tile using traditional image formats.
 * @param options TileMeshOptions including x/y/z and URL template
 * @returns Promise resolving to a Three.js Mesh
 */
export async function createTileMeshRaster(
  options: TileMeshOptions
): Promise<Mesh> {
  const { x, y, z, urlTemplate, radius = 1, onTextureLoaded } = options;

  const bounds = tileToLatLonBounds(x, y, z);
  const { latMin, latMax, lonMin, lonMax } = bounds;

  // 🔧 Adjust subdivisions by zoom level
  const subdivisions = z <= 8 ? 12 : z === 9 ? 8 : 6;
  const latStep = (latMax - latMin) / subdivisions;
  const lonStep = (lonMax - lonMin) / subdivisions;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= subdivisions; i++) {
    const lat = latMax - i * latStep;
    for (let j = 0; j <= subdivisions; j++) {
      const lon = lonMin + j * lonStep;
      const v = latLonToUnitVector(lat, lon).multiplyScalar(radius);
      positions.push(v.x, v.y, v.z);
      uvs.push(j / subdivisions, 1 - i / subdivisions);
    }
  }

  for (let i = 0; i < subdivisions; i++) {
    for (let j = 0; j < subdivisions; j++) {
      const a = i * (subdivisions + 1) + j;
      const b = a + subdivisions + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3)
  );
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const url = urlTemplate
    .replace("{z}", z.toString())
    .replace("{x}", x.toString())
    .replace("{y}", y.toString());

  const start = performance.now();
  const response = await fetch(url);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob, { imageOrientation: "flipY" });

  const texture = new CanvasTexture(bitmap);

  texture.generateMipmaps = true;
  texture.minFilter = LinearMipMapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;

  if (onTextureLoaded) onTextureLoaded(texture);

  const isHighRes = z > 2;

  const material = new MeshBasicMaterial({
    map: texture,
    side: FrontSide,
    transparent: isHighRes,
    opacity: isHighRes ? 1 : 1,
    depthWrite: isHighRes ? false : true,
  });

  const mesh = new Mesh(geometry, material);
  mesh.renderOrder = isHighRes ? 1 : 1;

  // 🕐 Delay visibility to avoid layout jank
  mesh.visible = false;
  setTimeout(() => {
    mesh.visible = true;
  }, 50); // ~1 frame delay

  return mesh;
}
