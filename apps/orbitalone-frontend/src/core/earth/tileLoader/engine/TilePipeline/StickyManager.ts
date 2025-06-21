import { TilePipelineState, TileEngineConfig } from "./TilePipelineStore";

// engine/TileLayer/TilePipeline/StickyManager.ts
export class StickyManager {
  run(state: TilePipelineState, config: TileEngineConfig, z: number) {
    // If you want to debug sticky logic:
    if ((window as any).enableStickyTiles && config.enableStickyTiles) {
      // e.g. log the sticky tile set size or sticky actions
      // console.log(`[StickyManager] Sticky tiles: ${state.stickyTiles.size}`);
    }
    // Actual sticky tile logic is handled by onTileLoaded in Loader
  }
}
