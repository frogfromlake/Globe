/**
 * @file engine/TileLayer/TileLoader.ts
 * @description Handles asynchronous loading and insertion of a single tile mesh into the scene.
 * Applies runtime safety checks (zoom/revision) before committing tile load.
 */

import type { CreateTileMeshFn } from "../../@types";
import type { WebGLRenderer, Group } from "three";
import type { TileMeshCache } from "./TileMeshCache";

export interface TileLoaderContext {
  urlTemplate: string;
  radius: number;
  renderer: WebGLRenderer;
  group: Group;
  cache: TileMeshCache;
  visibleTiles: Set<string>;
  createTileMesh: CreateTileMeshFn;
  zoom: number;
  revision: number;
}

/**
 * Loads and inserts a single tile mesh at (x, y, z) into the scene.
 *
 * Only proceeds if tile zoom matches current layer zoom.
 * Adds tile to group, cache, and visible set.
 * Gracefully logs and skips failed tiles.
 */
export async function loadTile(
  x: number,
  y: number,
  z: number,
  key: string,
  context: TileLoaderContext
): Promise<void> {
  // Skip outdated tasks (e.g. old revision or zoom mismatch)
  if (z !== context.zoom) {
    console.log(
      `⏩ Skipping stale tile ${key} (was Z${z}, now Z${context.zoom})`
    );
    return;
  }

  try {
    // Build mesh using provided creation strategy
    const mesh = await context.createTileMesh({
      x,
      y,
      z,
      urlTemplate: context.urlTemplate,
      radius: context.radius,
      renderer: context.renderer,
    });

    mesh.visible = true;
    context.group.add(mesh); // Add to scene
    context.cache.set(key, mesh); // Store in tile cache
    context.visibleTiles.add(key); // Track as visible
  } catch (err) {
    console.warn(`❌ Failed to load tile ${key}`, err);
  }
}
