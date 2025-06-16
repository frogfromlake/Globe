// engine/TilePrewarmer.ts
//
// Handles speculative tile loading for near-future visibility.
// Prewarmed tiles are cached but not added to the scene.

import { Mesh } from "three";
import { TilePrewarmOptions } from "../../@types";

/**
 * Loads and caches a tile mesh without rendering it immediately.
 *
 * Useful for directional lookahead and prefetching strategies.
 * Skips loading if the tile is already cached.
 *
 * @param x - Tile X coordinate
 * @param y - Tile Y coordinate
 * @param z - Tile zoom level
 * @param key - Unique cache key (e.g. "z/x/y")
 * @param options - Prewarm configuration (renderer, cache, etc.)
 * @returns Mesh if loaded successfully, otherwise undefined
 */
export async function prewarmTile(
  x: number,
  y: number,
  z: number,
  key: string,
  options: TilePrewarmOptions
): Promise<Mesh | undefined> {
  const { cache, urlTemplate, renderer, radius, createTileMesh } = options;

  // Skip if tile is already cached
  if (cache.has(key)) return undefined;

  try {
    const mesh = await createTileMesh({
      x,
      y,
      z,
      urlTemplate,
      radius,
      renderer,
    });

    // Do not render prewarmed tiles yet
    mesh.visible = false;

    // Store in memory cache only
    cache.set(key, mesh);
    return mesh;
  } catch (err) {
    console.warn(`Failed to prewarm tile ${key}`, err);
    return undefined;
  }
}
