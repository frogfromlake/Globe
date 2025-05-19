// dynamicTileManager.ts
import type { PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { TileManager } from "./tileManager";
import type { CreateTileMeshFn } from "./types";

interface DynamicTileManagerOptions {
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  urlTemplate: string;
  createTileMesh: CreateTileMeshFn;
  minZoom: number; // e.g. 4
  maxZoom: number; // e.g. 13
  fallbackTileManager: TileManager; // e.g. Z2 manager
}

export class DynamicTileManager {
  private camera: PerspectiveCamera;
  private tileManagers: Map<number, TileManager> = new Map();
  private currentZoom: number = 4;
  private fallback: TileManager;
  private urlTemplate: string;
  private createTileMesh: CreateTileMeshFn;
  private renderer: WebGLRenderer;
  private minZoom: number;
  private maxZoom: number;
  private updateTimeout: number | null = null;
  private lastZoomEstimate: number;

  constructor(options: DynamicTileManagerOptions) {
    this.camera = options.camera;
    this.renderer = options.renderer;
    this.urlTemplate = options.urlTemplate;
    this.createTileMesh = options.createTileMesh;
    this.minZoom = options.minZoom;
    this.maxZoom = options.maxZoom;
    this.fallback = options.fallbackTileManager;
    this.lastZoomEstimate = this.minZoom;

    // Pre-instantiate tile managers
    for (let z = this.minZoom; z <= this.maxZoom; z++) {
      const manager = new TileManager({
        zoomLevel: z,
        urlTemplate: this.urlTemplate,
        radius: 1,
        renderer: this.renderer,
        createTileMesh: this.createTileMesh,
        camera: this.camera,
      });

      // Link fallback manager
      manager.setFallbackManager(this.fallback);

      this.tileManagers.set(z, manager);
    }
  }

  /**
   * Add all internal tile manager groups to the scene
   */
  attachToScene(scene: Scene): void {
    for (const manager of this.tileManagers.values()) {
      scene.add(manager.group);
    }
    scene.add(this.fallback.group); // Always include fallback
  }

  /**
   * Called when camera moves
   */
  update(): void {
    if (this.updateTimeout !== null) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = window.setTimeout(() => {
      const { newZoom, dist } = this.estimateZoomLevel();
      const zoomChanged = newZoom !== this.currentZoom;
      const manager = this.tileManagers.get(newZoom);
      if (!manager) return;

      const currentManager = this.tileManagers.get(this.currentZoom);
      if (zoomChanged) {
        if (newZoom < this.currentZoom) {
          this.unloadHigherZoomLevels();
        }

        const prevZoom = this.currentZoom;
        this.currentZoom = newZoom;

        console.log(
          `🔁 Switching LOD: Z${prevZoom} → Z${newZoom} at dist:${dist}`
        );

        manager.updateTiles();
      } else if (manager.needsUpdate()) {
        manager.updateTiles();
      }

      // Also keep fading in next LOD if available
      const preloadNext = this.tileManagers.get(this.currentZoom + 1);
      if (preloadNext) preloadNext.updateTiles();

      if (currentManager) {
        manager.hideOverlappingFallbacks(this.fallback);
      }

      manager.hideOverlappingFallbacks(this.fallback);
    }, 100); // Adjust the debounce delay as needed
  }

  /**
   * Very basic heuristic — improve later
   */
  private estimateZoomLevel(): { newZoom: number; dist: number } {
    const dist = this.camera.position.length();

    const hysteresis = 0.0015; // buffer distance

    const zoomRanges = [
      { min: 1.5, max: Infinity, zoom: 4 },
      { min: 1.25, max: 1.5, zoom: 5 },
      { min: 1.12, max: 1.25, zoom: 6 },
      { min: 1.06, max: 1.12, zoom: 7 },
      { min: 1.035, max: 1.06, zoom: 8 },
      { min: 1.012, max: 1.035, zoom: 9 },
      { min: 1.0045, max: 1.012, zoom: 10 },
      { min: 1.0025, max: 1.0045, zoom: 11 },
      { min: 1.002, max: 1.0025, zoom: 12 },
      { min: 1.001, max: 1.002, zoom: 13 },
    ];

    for (let i = 0; i < zoomRanges.length; i++) {
      const range = zoomRanges[i];

      const enterMin = range.min;
      const exitMax = range.max;

      const prevZoom = this.lastZoomEstimate;

      // Entry condition (allow switching into this zoom level)
      const entryCondition = dist >= enterMin && dist < exitMax;

      // Exit condition (require a larger change to switch *out* of this zoom)
      const currentRange = zoomRanges.find((z) => z.zoom === prevZoom);
      const inPreviousZoomBand =
        currentRange &&
        dist >= currentRange.min - hysteresis &&
        dist < currentRange.max + hysteresis;

      if (entryCondition || (range.zoom === prevZoom && inPreviousZoomBand)) {
        this.lastZoomEstimate = range.zoom;
        return { newZoom: range.zoom, dist };
      }
    }

    // Default fallback
    return { newZoom: this.lastZoomEstimate, dist };
  }

  /**
   * Exposed in case you want to trigger initial loads manually
   */
  async loadInitialTiles(): Promise<void> {
    const zoom = this.estimateZoomLevel();
    this.currentZoom = zoom.newZoom;

    const manager = this.tileManagers.get(this.currentZoom);
    if (manager) {
      await manager.loadTiles();

      // Delay hiding fallback by ~300ms to allow high-res tiles to fade in
      setTimeout(() => {
        manager.hideOverlappingFallbacks(this.fallback);
      }, 300);
    }
  }

  /**
   * Unloads tiles from all zoom levels higher than currentZoom.
   * Useful to reduce memory usage when zooming out.
   */
  public unloadHigherZoomLevels(): void {
    for (const [zoom, manager] of this.tileManagers.entries()) {
      if (zoom > this.currentZoom) {
        manager.clear();
      }
    }
  }
}
