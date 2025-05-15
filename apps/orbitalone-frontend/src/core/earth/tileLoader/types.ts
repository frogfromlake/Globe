import { Mesh, Texture, WebGLRenderer } from "three";

/**
 * Options for creating a single tile mesh, common to all tile formats.
 */
export interface TileMeshOptions {
  /** X index of the tile in XYZ format */
  x: number;
  /** Y index of the tile in XYZ format */
  y: number;
  /** Zoom level of the tile */
  z: number;
  /** URL template for loading the tile (e.g. https://.../{z}/{x}/{y}.jpg) */
  urlTemplate: string;
  /** Radius of the sphere surface where this tile will be placed (default: 1) */
  radius?: number;
  /** Optional override for lat/lon bounds (used for polar patches) */
  latOverride?: {
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
  };
  /** Callback to receive the loaded texture (for reuse or debugging) */
  onTextureLoaded?: (texture: Texture) => void;
  /** Renderer instance, required for KTX2 tile decoding */
  renderer?: WebGLRenderer;
}

/**
 * Function signature for any tile mesh generator.
 */
export type CreateTileMeshFn = (options: TileMeshOptions) => Promise<Mesh>;
