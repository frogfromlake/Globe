// tileLoader/@types/DebugFlags.d.ts
declare global {
  interface Window {
    enableFrustumCulling: boolean;
    enableDotProductFiltering: boolean;
    enableScreenSpacePrioritization: boolean;
    enableCaching: boolean;
    debugSpiralBounds: boolean;
    enableTileFade: boolean;
    // Add more debug flags here as needed
  }
}
export {};
