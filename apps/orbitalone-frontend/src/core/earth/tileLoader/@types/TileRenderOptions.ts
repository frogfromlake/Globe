/**
 * @file @types/TileRenderOptions.ts
 * @description
*/

import { Mesh, Texture, WebGLRenderer } from "three";

export interface TileRenderOptions {
  x: number;
  y: number;
  z: number;
  urlTemplate: string;
  radius?: number;
  onTextureLoaded?: (texture: Texture) => void;
  renderer?: WebGLRenderer;
}

export type CreateTileMeshFn = (options: TileRenderOptions) => Promise<Mesh>;
