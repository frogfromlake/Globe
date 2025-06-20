// engine/TileLayer/TilePipeline/CandidateGenerator.ts
import { computeTileSpiral } from "../../utils/geo/tileIndexing";
import {
  getMaxTilesToLoad,
  getTileSearchRadius,
} from "../../utils/lod/lodFunctions";
import {
  getCameraLongitude,
  getCameraLatitude,
} from "../../utils/camera/cameraUtils";
import { TileEngineConfig, TilePipelineState } from "../TilePipelineTypes";

export class CandidateGenerator {
  public run(
    state: TilePipelineState,
    config: TileEngineConfig,
    z: number
  ): void {
    console.log(`[CandidateGenerator] Z${z}: running...`);
    const cameraLon = getCameraLongitude(state.camera);
    const cameraLat = getCameraLatitude(state.camera);
    const maxRadius = getTileSearchRadius(z);
    state.candidates.length = 0;
    let count = 0;
    const MAX_CANDIDATES = getMaxTilesToLoad(z);

    for (const { x, y } of computeTileSpiral(
      cameraLon,
      cameraLat,
      z,
      maxRadius
    )) {
      state.candidates.push({ x, y, z, key: `${z}/${x}/${y}`, screenDist: 0 });
      if (++count >= MAX_CANDIDATES) break;
    }
    // Bundled debug log
    if (config.debugSpiralBounds) {
      console.log(
        `[CandidateGenerator] Z${z}: generated ${state.candidates.length} candidates (maxRadius=${maxRadius}, max=${MAX_CANDIDATES})`
      );
    }
  }
}
