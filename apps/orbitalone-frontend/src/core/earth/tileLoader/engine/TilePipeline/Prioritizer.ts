// engine/TileLayer/TilePipeline/Prioritizer.ts

import { TilePipelineState, TileEngineConfig } from "./TilePipelineStore";
import { getMaxTilesToLoad } from "../utils/lod/lodFunctions";

export class Prioritizer {
  run(state: TilePipelineState, config: TileEngineConfig, z: number) {
    // Sort by screen distance for priority
    state.visibleCandidates.sort((a, b) => a.screenDist - b.screenDist);

    const MAX_TILES_TO_LOAD = getMaxTilesToLoad(z);
    const loadCap =
      z >= 13 ? 4 : z === 12 ? 8 : z === 11 ? 16 : MAX_TILES_TO_LOAD;
    if (state.visibleCandidates.length > loadCap) {
      state.visibleCandidates.length = loadCap;
    }
    state.queue = state.visibleCandidates.slice();

    // console.log(`[Prioritizer] Z${z}: prioritized ${state.queue.length} tiles`);
  }
}
