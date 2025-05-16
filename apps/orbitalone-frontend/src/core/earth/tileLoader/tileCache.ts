// tileLoader/tileCache.ts
import type { Mesh } from "three";

/**
 * Simple LRU-style cache for tile meshes.
 */
export class TileCache {
  private maxSize: number;
  private cache = new Map<string, Mesh>();

  constructor(maxSize: number = 256) {
    this.maxSize = maxSize;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  get(key: string): Mesh | undefined {
    const mesh = this.cache.get(key);
    if (mesh) {
      // Refresh recently used
      this.cache.delete(key);
      this.cache.set(key, mesh);
    }
    return mesh;
  }

  set(key: string, mesh: Mesh): void {
    if (this.cache.has(key)) {
      this.cache.delete(key); // refresh order
    }
    this.cache.set(key, mesh);

    if (this.cache.size > this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      const oldestMesh = oldestKey ? this.cache.get(oldestKey) : undefined;
      if (oldestMesh?.parent) {
        oldestMesh.parent.remove(oldestMesh);
      }
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
  }

  delete(key: string): void {
    const mesh = this.cache.get(key);
    if (mesh?.parent) {
      mesh.parent.remove(mesh);
    }
    this.cache.delete(key);
  }

  clear(): void {
    for (const mesh of this.cache.values()) {
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
    }
    this.cache.clear();
  }

  keys(): IterableIterator<string> {
    return this.cache.keys();
  }
}
