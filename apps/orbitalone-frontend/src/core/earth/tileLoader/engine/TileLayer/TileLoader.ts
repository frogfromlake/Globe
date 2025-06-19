/**
 * @file engine/TileLayer/TileLoader.ts
 * @description Handles asynchronous loading and insertion of a single tile mesh into the scene.
 * Applies runtime safety checks (zoom/revision) before committing tile load.
 */

import type { CreateTileMeshFn } from "../../@types";
import type { WebGLRenderer, Group, Mesh } from "three";
import type { TileMeshCache } from "./TileMeshCache";
import { getParentTileKey } from "../utils/tiles/tileOverlaps";

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

    // 1. Attach the key for removal management
    (mesh as any).userData.key = key;

    const fadeEnabled = (window as any).enableTileFade;
    let parentMesh: Mesh | undefined = undefined;

    if (fadeEnabled) {
      // Find parent key (lower Z)
      const parentKey = getParentTileKey(z, x, y);
      if (parentKey && context.cache.has(parentKey)) {
        parentMesh = context.cache.get(parentKey);
      }

      // Add and fade in
      mesh.visible = true;
      (mesh.material as any).opacity = 0;
      context.group.add(mesh);

      // Fade in, then remove parent
      import("./TileFading").then(({ fadeInTileMesh }) => {
        fadeInTileMesh(mesh, 500, () => {
          if (parentMesh) {
            if (parentMesh.parent) parentMesh.parent.remove(parentMesh);
            context.visibleTiles.delete((parentMesh as any).userData.key);
          }
        });
      });
    } else {
      mesh.visible = true;
      context.group.add(mesh);

      // Instantly remove parent if present
      const parentKey = getParentTileKey(z, x, y);
      if (parentKey && context.cache.has(parentKey)) {
        parentMesh = context.cache.get(parentKey);
        if (parentMesh && parentMesh.parent)
          parentMesh.parent.remove(parentMesh);
        context.visibleTiles.delete(parentKey);
      }
    }

    context.cache.set(key, mesh);
    context.visibleTiles.add(key);
  } catch (err) {
    console.warn(`❌ Failed to load tile ${key}`, err);
  }
}
