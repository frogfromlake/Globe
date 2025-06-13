// dynamicTileManager.ts
import type { Object3D, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { TileManager } from "./tileManager";
import type { CreateTileMeshFn, TileLoaderConfig } from "./types";
import { estimateZoomLevel } from "./utils/lodFunctions";

export interface DynamicTileManagerOptions {
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  urlTemplate: string;
  createTileMesh: CreateTileMeshFn;
  minZoom: number;
  maxZoom: number;
  fallbackTileManager: TileManager;
  config?: TileLoaderConfig;
  scene: Scene;
}

export class DynamicTileManager {
  private config: TileLoaderConfig;
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
  private scene: Scene;

  constructor(options: DynamicTileManagerOptions) {
    this.config = {
      enableFrustumCulling: true,
      enableDotProductFiltering: true,
      enableScreenSpacePrioritization: true,
      enableCaching: true,
      ...options.config,
    };
    this.camera = options.camera;
    this.renderer = options.renderer;
    this.urlTemplate = options.urlTemplate;
    this.createTileMesh = options.createTileMesh;
    this.minZoom = options.minZoom;
    this.maxZoom = options.maxZoom;
    this.fallback = options.fallbackTileManager;
    this.lastZoomEstimate = this.minZoom;
    this.scene = options.scene;
    // Pre-instantiate tile managers
    for (let z = this.minZoom; z <= this.maxZoom; z++) {
      const manager = new TileManager({
        zoomLevel: z,
        urlTemplate: this.urlTemplate,
        radius: 1,
        renderer: this.renderer,
        createTileMesh: this.createTileMesh,
        camera: this.camera,
        config: this.config,
        scene: this.scene,
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
      const newZoom = estimateZoomLevel(this.camera);
      const zoomChanged = newZoom !== this.currentZoom;
      const manager = this.tileManagers.get(newZoom);
      if (!manager) return;

      if (zoomChanged) {
        if (newZoom < this.currentZoom) {
          this.unloadHigherZoomLevels();
        }
        this.currentZoom = newZoom;
      }
      manager.updateTiles(); // Always run if in view

      // Also keep fading in next LOD if available
      const estimatedZoom = estimateZoomLevel(this.camera);
      if (estimatedZoom >= this.currentZoom + 1) {
        const preloadNext = this.tileManagers.get(this.currentZoom + 1);
        if (preloadNext) preloadNext.updateTiles();
      }
    }, 100); // Adjust the debounce delay as needed
  }

  /**
   * Exposed in case you want to trigger initial loads manually
   */
  async loadInitialTiles(): Promise<void> {
    this.currentZoom = estimateZoomLevel(this.camera);
    const manager = this.tileManagers.get(this.currentZoom);
    if (manager) {
      await manager.loadTiles();
    }
  }

  public getTileManagers(): Map<number, TileManager> {
    return this.tileManagers;
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
