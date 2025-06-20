/**
 * @file engine/GlobeTileEngine.ts
 * @description High-level orchestrator for managing zoom-level-aware tile loading on a 3D globe.
 */

import { Scene, PerspectiveCamera, WebGLRenderer, Group } from "three";
import type { CreateTileMeshFn } from "../@types";
import { estimateZoomLevel } from "./utils/lod/lodFunctions";
import { TileMeshCache } from "./TileLayer/TileMeshCache";
import { TileVisualPipeline } from "./TileLayer/TilePipeline/TileVisualPipeline";
import { TileStickyManager } from "./TileLayer/TileStickyManager";
import {
  GlobeTileEngineOptions,
  TileEngineConfig,
  TileVisualPipelineLayer,
} from "./TileLayer/TilePipelineTypes";
import { TaskQueue } from "./TileLayer/TilePipeline/TaskQueue";
import { getCameraState, cameraStateChanged } from "./utils/camera/cameraUtils";

const DEFAULT_UPDATE_DEBOUNCE_MS = 100;

/**
 * GlobeTileEngine manages tile loading across zoom levels and responds to camera movement.
 */
export class GlobeTileEngine {
  private readonly config: TileEngineConfig;
  private readonly camera: PerspectiveCamera;
  private readonly renderer: WebGLRenderer;
  private readonly scene: Scene;
  private readonly urlTemplate: string;
  private readonly createTileMesh: CreateTileMeshFn;
  private readonly minZoom: number;
  private readonly maxZoom: number;
  // private readonly fallbackManager: TileLayer;
  private readonly tileLayers: Map<number, TileVisualPipeline>;
  private readonly visibleTiles: Set<string>;
  private currentZoom: number;
  private readonly getRadiusForZoom: (z: number) => number;
  private updateDebounceHandle: number | null = null;
  private lastCameraState: any = null;

  constructor(options: GlobeTileEngineOptions) {
    this.camera = options.camera;
    this.renderer = options.renderer;
    this.scene = options.scene;
    this.urlTemplate = options.urlTemplate;
    this.createTileMesh = options.createTileMesh;
    this.minZoom = options.minZoom;
    this.maxZoom = options.maxZoom;
    // this.fallbackManager = options.fallbackTileManager;
    this.config = {
      enableFrustumCulling: true,
      enableDotProductFiltering: true,
      enableScreenSpacePrioritization: true,
      enableCaching: true,
      debugSpiralBounds: options.config?.debugSpiralBounds ?? false,
      enableTileFade: options.config?.enableTileFade ?? false,
      enableStickyTiles: options.config?.enableStickyTiles ?? false,
    };
    this.currentZoom = this.minZoom;
    this.getRadiusForZoom = options.getRadiusForZoom ?? (() => 1);
    this.tileLayers = new Map();
    this.visibleTiles = new Set();

    this.initializeTileLayers();
  }

  private initializeTileLayers(): void {
    for (let z = this.minZoom; z <= this.maxZoom; z++) {
      const group = new Group();
      const cache = new TileMeshCache(512);
      const stickyManager = new TileStickyManager(cache, this.visibleTiles);
      const radius = this.getRadiusForZoom(z);
      const taskQueue = new TaskQueue();

      // Create the pipeline
      const pipeline = new TileVisualPipeline(
        this.renderer,
        this.camera,
        group,
        cache,
        stickyManager,
        this.createTileMesh,
        this.urlTemplate,
        radius,
        this.config,
        this.visibleTiles,
        taskQueue,
        z
      );

      // Register after construction!
      this.tileLayers.set(z, pipeline);
    }
  }

  /**
   * Adds all tile groups to the scene graph, including fallback.
   */
  public attachToScene(): void {
    for (const layer of this.tileLayers.values()) {
      this.scene.add(layer.group);
    }
    // You may keep fallback for Z3, etc., if needed
    // this.scene.add(this.fallbackManager.group);
  }

  /**
   * Triggers a debounced tile update based on current camera position.
   * Automatically preloads the next zoom level.
   */
  public update(): void {
    if (this.updateDebounceHandle !== null) {
      clearTimeout(this.updateDebounceHandle);
    }

    this.updateDebounceHandle = window.setTimeout(() => {
      const estimatedZoom = estimateZoomLevel(this.camera);

      // 1. Get current and previous camera state
      const currState = getCameraState(this.camera);
      let shouldIncrementRevision = false;

      if (!this.lastCameraState) {
        // On first run, always trigger
        shouldIncrementRevision = true;
      } else if (cameraStateChanged(currState, this.lastCameraState)) {
        shouldIncrementRevision = true;
      }
      this.lastCameraState = currState;

      // 2. Find the active tile layer (by zoom)
      const zoomChanged = estimatedZoom !== this.currentZoom;
      const activeLayer = this.tileLayers.get(estimatedZoom);
      if (!activeLayer) return;

      // 3. Increment revision if camera or zoom changed
      if (shouldIncrementRevision || zoomChanged) {
        (activeLayer as any).state.revision++;
        if (zoomChanged && estimatedZoom < this.currentZoom) {
          this.unloadHigherZoomLevels();
        }
        this.currentZoom = estimatedZoom;
      }

      // 4. Clean stale queued tasks
      (activeLayer as any).state.taskQueue.filterCurrentZoomAndRevision(
        this.currentZoom,
        (activeLayer as any).state.revision
      );

      // 5. Update main and preload next LOD
      activeLayer.updateTiles();

      // Preload next higher LOD
      const preloadLayer = this.tileLayers.get(this.currentZoom + 1);
      if (preloadLayer) {
        preloadLayer.updateTiles();
      }
    }, DEFAULT_UPDATE_DEBOUNCE_MS);
  }

  /**
   * Preloads the current zoom level's tiles. Call once after scene init.
   */
  public async loadInitialTiles(): Promise<void> {
    this.currentZoom = estimateZoomLevel(this.camera);
    const layer = this.tileLayers.get(this.currentZoom);
    if (layer) {
      await layer.loadTiles();
    }
  }

  /**
   * Clears tile layers above currentZoom to reduce GPU and memory pressure.
   */
  public unloadHigherZoomLevels(): void {
    for (const [z, layer] of this.tileLayers.entries()) {
      if (z > this.currentZoom && z > 3) {
        // <-- Don't clear Z3!
        layer.clear();
      }
    }
  }

  /**
   * Returns a map of all managed tile layers by zoom level.
   */
  public getTileLayers(): Map<number, TileVisualPipelineLayer> {
    return this.tileLayers;
  }
}
