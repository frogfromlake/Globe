// engine/TileLayer/TilePipeline/VisibilityFilter.ts
import { computeFrustum, isTileVisible } from "../TileCulling";
import type { TileEngineConfig, TilePipelineState } from "../TilePipelineTypes";

export class VisibilityFilter {
  run(state: TilePipelineState, config: TileEngineConfig, z: number) {
    const frustum = config.enableFrustumCulling
      ? computeFrustum(state.camera)
      : undefined;
    state.visibleCandidates.length = 0;

    for (const candidate of state.candidates) {
      const result = isTileVisible(
        candidate.x,
        candidate.y,
        z, // pass z explicitly
        {
          camera: state.camera,
          zoom: z,
          radius: state.radius,
          enableFrustumCulling: config.enableFrustumCulling,
          enableDotProductFiltering: config.enableDotProductFiltering,
          enableScreenSpacePrioritization: config.enableScreenSpacePrioritization,
          frustum,
        },
        state.visibleTiles,
        frustum
      );
      if (result.visible) {
        state.visibleCandidates.push({
          x: candidate.x,
          y: candidate.y,
          z,
          key: result.key,
          screenDist: result.screenDist,
        });
      }
    }
    console.log(
      `[VisibilityFilter] Z${z}: ${state.visibleCandidates.length}/${state.candidates.length} passed`
    );
  }
}
