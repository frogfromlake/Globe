/**
 * @file GlobeTileEngine.ts
 * @description High-level orchestrator for managing zoom-level-aware tile loading on a 3D globe.
 */

import type { Scene, PerspectiveCamera, WebGLRenderer } from "three";
import type { CreateTileMeshFn, TileEngineConfig } from "../@types";
import { estimateZoomLevel } from "../utils/lod/lodFunctions";
import { TileLayer } from "./TileLayer/TileLayer";

export interface GlobeTileEngineOptions {
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  scene: Scene;
  urlTemplate: string;
  createTileMesh: CreateTileMeshFn;
  minZoom: number;
  maxZoom: number;
  fallbackTileManager: TileLayer;
  config?: TileEngineConfig;
}

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
  private readonly fallbackManager: TileLayer;
  private readonly tileLayers: Map<number, TileLayer>;

  private currentZoom: number;
  private updateDebounceHandle: number | null = null;

  constructor(options: GlobeTileEngineOptions) {
    this.camera = options.camera;
    this.renderer = options.renderer;
    this.scene = options.scene;
    this.urlTemplate = options.urlTemplate;
    this.createTileMesh = options.createTileMesh;
    this.minZoom = options.minZoom;
    this.maxZoom = options.maxZoom;
    this.fallbackManager = options.fallbackTileManager;
    this.config = {
      enableFrustumCulling: true,
      enableDotProductFiltering: true,
      enableScreenSpacePrioritization: true,
      enableCaching: true,
      ...options.config,
    };

    this.currentZoom = this.minZoom;
    this.tileLayers = new Map();

    this.initializeTileLayers();
  }

  /**
   * Initializes one TileLayer per zoom level between minZoom and maxZoom.
   */
  private initializeTileLayers(): void {
    for (let z = this.minZoom; z <= this.maxZoom; z++) {
      const layer = new TileLayer({
        zoomLevel: z,
        urlTemplate: this.urlTemplate,
        radius: 1,
        renderer: this.renderer,
        createTileMesh: this.createTileMesh,
        camera: this.camera,
        config: this.config,
        scene: this.scene,
      });

      layer.setFallbackManager(this.fallbackManager);
      this.tileLayers.set(z, layer);
    }
  }

  /**
   * Adds all tile groups to the scene graph, including fallback.
   */
  public attachToScene(): void {
    for (const layer of this.tileLayers.values()) {
      this.scene.add(layer.group);
    }
    this.scene.add(this.fallbackManager.group);
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
      const zoomChanged = estimatedZoom !== this.currentZoom;
      const activeLayer = this.tileLayers.get(estimatedZoom);
      if (!activeLayer) return;

      if (zoomChanged) {
        if (estimatedZoom < this.currentZoom) {
          this.unloadHigherZoomLevels();
        }
        this.currentZoom = estimatedZoom;
      }

      activeLayer.updateTiles();

      // Opportunistically preload next higher LOD
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
      if (z > this.currentZoom) {
        layer.clear();
      }
    }
  }

  /**
   * Returns a map of all managed tile layers by zoom level.
   */
  public getTileLayers(): Map<number, TileLayer> {
    return this.tileLayers;
  }
}
