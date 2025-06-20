/**
 * @file engine/TileLayer/TileSticky.ts
 * @description Handles "sticky parent" tile logic and triggers fade-out/removal only after all 4 children loaded.
 */

import { Mesh } from "three";
import { getParentTileKey } from "../utils/geo/tileIndexing";
import { fadeOutTileMesh } from "./TileFading";

type StickyCallbacks = {
  onParentRemoval?: (parentKey: string, mesh: Mesh) => void;
};

export class TileStickyManager {
  private parentToChildren = new Map<string, Set<string>>();
  private childToParent = new Map<string, string>();

  constructor(
    private cache: any,
    private visibleTiles: Set<string>,
    private opts: StickyCallbacks = {}
  ) {}

  /** Called whenever a child tile finishes loading/fading in. */
  onTileLoaded(childKey: string, z: number, x: number, y: number) {
    const parentKey = getParentTileKey(z, x, y);
    if (!parentKey) return;

    this.childToParent.set(childKey, parentKey);

    let loadedChildren = this.parentToChildren.get(parentKey);
    if (!loadedChildren) {
      loadedChildren = new Set();
      this.parentToChildren.set(parentKey, loadedChildren);
    }
    loadedChildren.add(childKey);

    // Find the 4 canonical children of this parent tile
    const [pz, px, py] = parentKey.split("/").map(Number);
    const cz = pz + 1;
    const childKeys = [
      `${cz}/${px * 2}/${py * 2}`,
      `${cz}/${px * 2 + 1}/${py * 2}`,
      `${cz}/${px * 2}/${py * 2 + 1}`,
      `${cz}/${px * 2 + 1}/${py * 2 + 1}`,
    ];

    // Only fade out parent if ALL 4 children are loaded
    const allLoaded = childKeys.every((k) => loadedChildren.has(k));
    if (allLoaded) {
      const parentMesh = this.cache.get(parentKey);
      if (parentMesh) {
        if ((window as any).enableTileFade) {
          fadeOutTileMesh(parentMesh, 400, () => {
            if (parentMesh.parent) parentMesh.parent.remove(parentMesh);
            this.visibleTiles.delete(parentKey);
            this.opts.onParentRemoval?.(parentKey, parentMesh);
          });
        } else {
          if (parentMesh.parent) parentMesh.parent.remove(parentMesh);
          this.visibleTiles.delete(parentKey);
          this.opts.onParentRemoval?.(parentKey, parentMesh);
        }
      }
      // Clean up references
      this.parentToChildren.delete(parentKey);
      childKeys.forEach((k) => this.childToParent.delete(k));
    }
  }

  clear() {
    this.parentToChildren.clear();
    this.childToParent.clear();
  }
}
