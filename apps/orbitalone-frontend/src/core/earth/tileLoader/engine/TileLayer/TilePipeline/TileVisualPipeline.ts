/**
 * @file engine/TileLayer/TilePipeline/TileVisualPipeline.ts
 * @description Tile pipeline orchestrator: runs all tile pipeline stages for a single zoom layer.
 */

import {
  initializeTilePipelineState,
  TilePipelineState,
  CreateTileMeshFn,
  TileVisualPipelineLayer,
  TileEngineConfig,
} from "../TilePipelineTypes";
import { CandidateGenerator } from "./CandidateGenerator";
import type { TileMeshCache } from "../TileMeshCache";
import type { TileStickyManager } from "../TileStickyManager";
import type { Group, WebGLRenderer, PerspectiveCamera } from "three";
import { Prioritizer } from "./Prioritizer";
import { VisibilityFilter } from "./VisibilityFilter";
import { Cleanup } from "./Cleanup";
import { Loader } from "./Loader";
import { StickyManager } from "./StickyManager";
import { TaskQueue } from "./TaskQueue";
import { latLonToUnitVector } from "@/core/earth/geo/coordinates";
import { tileToLatLonBounds } from "../../utils/bounds/tileToBounds";
import { getCameraCenterDirection } from "../../utils/camera/cameraUtils";
import { runConcurrent } from "../../utils/concurrency/runConcurrent";

export class TileVisualPipeline implements TileVisualPipelineLayer {
  private state: TilePipelineState;
  private config: TileEngineConfig;

  private candidateGen = new CandidateGenerator();
  private visibilityFilter = new VisibilityFilter();
  private prioritizer = new Prioritizer();
  private loader = new Loader();
  private stickyManager = new StickyManager();
  private cleanup = new Cleanup();

  private readonly z: number = 0;

  constructor(
    renderer: WebGLRenderer,
    camera: PerspectiveCamera,
    tileGroup: Group,
    tileCache: TileMeshCache,
    stickyManager: TileStickyManager,
    createTileMesh: CreateTileMeshFn,
    urlTemplate: string,
    radius: number,
    config: TileEngineConfig,
    visibleTiles: Set<string>,
    taskQueue: TaskQueue,
    z: number
  ) {
    this.config = config;
    this.z = z;
    this.state = initializeTilePipelineState(
      renderer,
      camera,
      tileGroup,
      tileCache,
      stickyManager,
      createTileMesh,
      urlTemplate,
      radius,
      taskQueue
    );
    this.state.visibleTiles = visibleTiles; // Share global visible set
    this.state.revision = 0;
  }

  /**
   * Main pipeline execution for this zoom level.
   */
  public update(): void {
    console.log("Updating tile visual pipeline...");
    // Use this.z everywhere, pass to all stages!
    this.state.taskQueue.filterCurrentZoomAndRevision(
      this.z, // was currentZoom
      this.state.revision
    );

    // No need to bump revision here—controlled by GlobeTileEngine.
    this.state.taskQueue.filterCurrentZoomAndRevision(
      this.z,
      this.state.revision
    );

    this.candidateGen.run(this.state, this.config, this.z);
    this.visibilityFilter.run(this.state, this.config, this.z);
    this.prioritizer.run(this.state, this.config, this.z);
    this.loader.run(this.state, this.config, this.z);
    this.stickyManager.run(this.state, this.config, this.z);
    this.cleanup.run(this.state, this.config, this.z);
  }

  /**
   * Loads all tiles for the current pipeline state. (For now, just triggers update)
   */
  public async loadTiles(): Promise<void> {
    this.update();
    // In the future: resolve only when all tasks finish.
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  /**
   * Clears all loaded/visible/sticky tiles from this layer.
   */
  public clear(): void {
    this.state.tileGroup.clear();
    this.state.loadedTiles.clear();
    this.state.stickyTiles.clear();
    // Do *not* clear visibleTiles here, since it's global!
  }

  /**
   * Getter to expose the tile group for scene integration.
   */
  public get group(): Group {
    return this.state.tileGroup;
  }

  // --- For interface compatibility ---
  public updateTiles(): void {
    this.update();
  }
  /**
   * Loads ALL tiles for this zoom level (used for fallback/base layer).
   * Use ONLY for the fallback Z layer (e.g. Z3), not for dynamic LODs!
   */
  public async loadAllTiles(): Promise<void> {
    const z = this.z;
    const tileCount = 2 ** z;
    const concurrencyLimit = 6;

    // Use camera direction for screenDist (center bias)
    const cameraDirection = getCameraCenterDirection(this.state.camera);

    const tileTasks: {
      x: number;
      y: number;
      key: string;
      screenDist: number;
    }[] = [];

    for (let x = 0; x < tileCount; x++) {
      for (let y = 0; y < tileCount; y++) {
        const key = `${z}/${x}/${y}`;
        // Use cache and tileGroup from pipeline state!
        if (this.state.tileCache.has(key)) {
          const cached = this.state.tileCache.get(key);
          if (cached && !this.state.tileGroup.children.includes(cached)) {
            this.state.tileGroup.add(cached);
            this.state.visibleTiles.add(key);
          }
          continue;
        }
        // Estimate center for screenDist prioritization (optional)
        const bounds = tileToLatLonBounds(x, y, z);
        const lat = (bounds.latMin + bounds.latMax) / 2;
        const lon = (bounds.lonMin + bounds.lonMax) / 2;
        const tileDir = latLonToUnitVector(lat, lon);
        const screenDist = 1 - cameraDirection.dot(tileDir);

        tileTasks.push({ x, y, key, screenDist });
      }
    }

    // Closest to camera center loads first
    tileTasks.sort((a, b) => a.screenDist - b.screenDist);

    const taskFns = tileTasks.map(({ x, y, key }) => async () => {
      try {
        const mesh = await this.state.createTileMesh({
          x,
          y,
          z,
          urlTemplate: this.state.urlTemplate,
          radius: this.state.radius,
          renderer: this.state.renderer,
        });
        mesh.visible = true;
        this.state.tileGroup.add(mesh);
        this.state.tileCache.set(key, mesh);
        this.state.visibleTiles.add(key);
      } catch (err) {
        console.warn(`❌ Failed to load fallback tile ${key}`, err);
      }
    });

    await runConcurrent(taskFns, concurrencyLimit);
  }
}
