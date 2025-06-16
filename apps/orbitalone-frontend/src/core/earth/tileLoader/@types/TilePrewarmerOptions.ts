import { WebGLRenderer } from "three";
import { TileMeshCache } from "../cache/TileMeshCache";
import { CreateTileMeshFn } from "./TileRenderOptions";

export interface TilePrewarmOptions {
  cache: TileMeshCache;
  urlTemplate: string;
  renderer: WebGLRenderer;
  radius: number;
  createTileMesh: CreateTileMeshFn;
}
