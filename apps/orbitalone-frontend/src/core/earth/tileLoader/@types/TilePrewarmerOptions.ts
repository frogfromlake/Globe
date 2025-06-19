/**
 * @file @types//TilePrewarmerOptions.ts
 * @description
 */

import { WebGLRenderer } from "three";
import { TileMeshCache } from "../engine/TileLayer/TileMeshCache";
import { CreateTileMeshFn } from "./TileRenderOptions";

export interface TilePrewarmOptions {
  cache: TileMeshCache;
  urlTemplate: string;
  renderer: WebGLRenderer;
  radius: number;
  createTileMesh: CreateTileMeshFn;
}
