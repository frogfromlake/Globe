/**
 * @file engine/TileLayer/TilePipeline/TileVisualPipeline.ts
 * @description Tile pipeline orchestrator: runs all tile pipeline stages for a single zoom layer.
 */
import { CandidateGenerator } from "./CandidateGenerator";
import type { Group, WebGLRenderer, PerspectiveCamera } from "three";
import { Prioritizer } from "./Prioritizer";
import { VisibilityFilter } from "./VisibilityFilter";
import { Cleanup } from "./Cleanup";
import { Loader } from "./Loader";
import { StickyManager } from "./StickyManager";
import { TaskQueue } from "./TaskQueue";
import { latLonToUnitVector } from "@/core/earth/geo/coordinates";
import { TileMeshCache } from "./TileMeshCache";
import {
  TileVisualPipelineLayer,
  TilePipelineState,
  TileEngineConfig,
  CreateTileMeshFn,
  initializeTilePipelineState,
} from "./TilePipelineStore";
import { tileToLatLonBounds } from "../utils/bounds/tileToBounds";
import { getCameraCenterDirection } from "../utils/camera/cameraUtils";
import { runConcurrent } from "../utils/concurrency/runConcurrent";
import { TileStickyManager } from "./TileStickyManager";
import { TilePrewarmer } from "./TilePrewarmer";

export class TileVisualPipeline implements TileVisualPipelineLayer {
  private state: TilePipelineState;
  private config: TileEngineConfig;

  private candidateGen = new CandidateGenerator();
  private visibilityFilter = new VisibilityFilter();
  private prioritizer = new Prioritizer();
  private loader = new Loader();
  private stickyManager = new StickyManager();
  private cleanup = new Cleanup();
  private prewarmer = new TilePrewarmer();

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
    // Always sort all candidates by screenDist!
    this.state.taskQueue.filterCurrentZoomAndRevision(
      this.z,
      this.state.revision
    );
    this.state.taskQueue.filterCurrentZoomAndRevision(
      this.z,
      this.state.revision
    );

    this.candidateGen.run(this.state, this.config, this.z);

    // Sort candidates by screenDist (closest-to-center first)
    if (Array.isArray(this.state.candidates)) {
      this.state.candidates.sort((a, b) => a.screenDist - b.screenDist);
    }
    if (Array.isArray(this.state.visibleCandidates)) {
      this.state.visibleCandidates.sort((a, b) => a.screenDist - b.screenDist);
    }
    if (Array.isArray(this.state.prioritizedTiles)) {
      this.state.prioritizedTiles.sort((a, b) => a.screenDist - b.screenDist);
    }

    this.visibilityFilter.run(this.state, this.config, this.z);
    this.prioritizer.run(this.state, this.config, this.z);
    this.prewarmer.run(this.state, this.config, this.z);

    console.log(
      `[TileVisualPipeline Z${this.z}] cands:${this.state.candidates.length}, vis:${this.state.visibleCandidates.length}, prio:${this.state.prioritizedTiles.length}, queue:${this.state.queue.length}`
    );

    this.loader.run(this.state, this.config, this.z);
    this.stickyManager.run(this.state, this.config, this.z);
    this.cleanup.run(this.state, this.config, this.z);
  }

  public async loadTiles(): Promise<void> {
    this.update();
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  public clear(): void {
    this.state.tileGroup.clear();
    this.state.loadedTiles.clear();
    this.state.stickyTiles.clear();
    // Don't clear visibleTiles (global)
  }

  public get group(): Group {
    return this.state.tileGroup;
  }

  public updateTiles(): void {
    this.update();
  }

  public async loadAllTiles(): Promise<void> {
    const z = this.z;
    const tileCount = 2 ** z;
    const concurrencyLimit = 6;

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
        if (this.state.tileCache.has(key)) {
          const cached = this.state.tileCache.get(key);
          if (cached && !this.state.tileGroup.children.includes(cached)) {
            this.state.tileGroup.add(cached);
            this.state.visibleTiles.add(key);
          }
          continue;
        }
        // Estimate center for screenDist prioritization
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
