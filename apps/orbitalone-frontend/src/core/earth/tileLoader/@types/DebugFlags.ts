/**
 * @file @types/DebugFlags.d.ts
 * @description
 */

declare global {
  interface Window {
    enableFrustumCulling: boolean;
    enableDotProductFiltering: boolean;
    enableScreenSpacePrioritization: boolean;
    enableCaching: boolean;
    debugSpiralBounds: boolean;
    enableTileFade: boolean;
    enableStickyTiles: boolean;
    // Add more debug flags here as needed
  }
}

export {};
