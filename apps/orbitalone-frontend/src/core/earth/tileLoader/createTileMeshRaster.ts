/**
 * Tile mesh generator for standard image-based raster tiles (e.g. JPEG, PNG).
 * Suitable for traditional XYZ tile services such as MapTiler or OpenStreetMap.
 */

import {
  BufferGeometry,
  BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  TextureLoader,
  DoubleSide,
  LinearMipMapLinearFilter,
  LinearFilter,
  FrontSide,
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
  const {
    x,
    y,
    z,
    urlTemplate,
    radius = 1,
    latOverride,
    onTextureLoaded,
  } = options;
  // console.log(`📦 Creating tile ${z}/${x}/${y}`);

  const bounds = latOverride ?? tileToLatLonBounds(x, y, z);
  const { latMin, latMax, lonMin, lonMax } = bounds;

  const subdivisions = 12;
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

  const texture = await new TextureLoader().loadAsync(url).catch((err) => {
    console.warn(`❌ Failed to load texture from ${url}`, err);
    return null;
  });

  if (!texture) {
    throw new Error(`Texture loading failed for tile ${z}/${x}/${y}`);
  }

  texture.generateMipmaps = true;
  texture.minFilter = LinearMipMapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;

  if (onTextureLoaded) onTextureLoaded(texture);

  const isHighRes = z > 2;

  const material = new MeshBasicMaterial({
    map: texture,
    side: FrontSide,
    transparent: isHighRes, // Only high-res tiles need transparency
    opacity: isHighRes ? 1 : 0, // Start high-res at 0 for fade-in, fallback fully visible
    depthWrite: !isHighRes, // Fix for overdraw issues when mixing transparent/opaque
  });
  
  material.map = texture;
  material.needsUpdate = true;
  texture.needsUpdate = true;
  
  
    // console.log(
    //   `🎨 Material for tile ${z}/${x}/${y}: opacity=${material.opacity}, transparent=${material.transparent}, depthWrite=${material.depthWrite}`
    // );

    const mesh = new Mesh(geometry, material);

    // console.log(
    //   `🧱 Mesh created for tile ${z}/${x}/${y}: visible=${mesh.visible}, vertices=${geometry.getAttribute('position').count}`
    // );
    
  mesh.visible = true;

  return mesh;
}
