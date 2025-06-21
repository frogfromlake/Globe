// engine/TileLayer/TilePipeline/TileRemover.ts

import type { TilePipelineState } from "./TilePipelineStore";
import { fadeOutTileMesh } from "./TileFading";

export class TileRemover {
  private pendingRemoval = new Map<string, number>();
  private framesTillRemove: number;
  private removalsThisFrame: number;
  private fringeTiles: Set<string> = new Set();

  constructor(
    private state: TilePipelineState,
    framesTillRemove = 24,
    removalsPerFrame = 4
  ) {
    this.framesTillRemove = framesTillRemove;
    this.removalsThisFrame = removalsPerFrame;
  }

  /** Runtime adjustment (eg. zoom-out: increase delay, decrease removals per frame) */
  setParams(frames: number, removals: number) {
    this.framesTillRemove = frames;
    this.removalsThisFrame = removals;
  }

  /** Tiles that are just outside frustum but not ready to evict yet */
  setFringeTiles(tiles: Set<string>) {
    this.fringeTiles = tiles;
  }

  markPending(key: string) {
    // Don't mark if in fringe (buffer region)
    if (this.fringeTiles.has(key)) return;
    if (!this.pendingRemoval.has(key)) {
      this.pendingRemoval.set(key, this.framesTillRemove);
    }
  }

  cancelPending(key: string) {
    this.pendingRemoval.delete(key);
  }

  isPending(key: string): boolean {
    return this.pendingRemoval.has(key);
  }

  /** Mark all for removal (eg. on zoom-out of upper LODs), except those in fringe */
  markAllForRemoval() {
    for (const key of this.state.visibleTiles) {
      if (!this.fringeTiles.has(key)) this.markPending(key);
    }
  }

  process() {
    let removed = 0;
    const next = new Map<string, number>();

    for (const [key, framesLeft] of this.pendingRemoval.entries()) {
      if (this.state.visibleTiles.has(key)) continue;

      if (framesLeft <= 1 && removed < this.removalsThisFrame) {
        const mesh = this.state.tileCache.get(key);
        if (mesh) {
          if ((window as any).enableTileFade) {
            fadeOutTileMesh(mesh, 350, () => {
              this.state.tileGroup.remove(mesh);
              this.state.visibleTiles.delete(key);
              this.state.tileCache.delete(key);
            });
          } else {
            this.state.tileGroup.remove(mesh);
            this.state.visibleTiles.delete(key);
            this.state.tileCache.delete(key);
          }
        } else {
          this.state.visibleTiles.delete(key);
          this.state.tileCache.delete(key);
        }
        removed++;
      } else {
        next.set(key, framesLeft - 1);
      }
      if (removed >= this.removalsThisFrame) break;
    }
    for (const [key, framesLeft] of this.pendingRemoval.entries()) {
      if (!next.has(key) && !this.state.visibleTiles.has(key)) {
        next.set(key, framesLeft - 1);
      }
    }
    this.pendingRemoval = next;
  }

  clear() {
    this.pendingRemoval.clear();
  }
}
