import {
  Box3,
  Box3Helper,
  Group,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import type { CreateTileMeshFn, TileEngineConfig } from "../../@types";
import { TileMeshCache } from "../../cache/TileMeshCache";
import {
  getCameraCenterDirection,
  getCameraLongitude,
} from "../../utils/camera/cameraUtils";
import { tileToLatLonBounds } from "../../utils/bounds/tileToBounds";
import { latLonToUnitVector } from "../../utils/geo/latLonToVector";
import {
  estimateZoomLevel,
  getMaxTilesToLoad,
  getTileSearchRadius,
} from "../../utils/lod/lodFunctions";
import { TileQueueProcessor } from "./TileQueueProcessor";
import { loadTile } from "./TileLoader";
import {
  computeFrustum,
  isTileVisible,
  TileCullingContext,
} from "./TileCulling";
import { prewarmTile } from "./TilePrewarmer";
import { runConcurrent } from "../../utils/concurrency/runConcurrent";
import { lon2tileX, lat2tileY } from "../../utils/geo/tileIndexing";

export interface TileLayerOptions {
  zoomLevel?: number;
  fallbackZoomLevel?: number;
  urlTemplate: string;
  radius?: number;
  renderer: WebGLRenderer;
  createTileMesh: CreateTileMeshFn;
  camera: PerspectiveCamera;
  fadeDuration?: number;
  config?: TileEngineConfig;
  scene?: Scene;
}

interface TileCandidate {
  x: number;
  y: number;
  key: string;
  screenDist: number;
}

export class TileLayer {
  private config: TileEngineConfig;
  private cache = new TileMeshCache(512);
  private radius: number;
  private zoom: number;
  private urlTemplate: string;
  private renderer: WebGLRenderer;
  private createTileMesh: CreateTileMeshFn;
  private camera: PerspectiveCamera;
  private visibleTiles = new Set<string>();
  private updateScheduled = false;
  private updatePending = false;
  private lastCenterDir = new Vector3();
  private fallbackManager?: TileLayer;
  private tileQueueBusy = false;
  private scene?: Scene;
  private debugArrows: Object3D[] = [];
  public group: Group;
  private cameraRevision = 0;
  private tileQueueProcessor: TileQueueProcessor;

  private lastCameraPos = new Vector3();
  private lastCameraQuat = new Quaternion();

  debugBoundingSpheres: Mesh[] = [];
  debugBoundingGroup: Group = new Group();

  constructor({
    zoomLevel = 3,
    urlTemplate,
    radius = 1,
    renderer,
    createTileMesh,
    camera,
    config = {},
    scene,
  }: TileLayerOptions) {
    this.zoom = zoomLevel;
    this.urlTemplate = urlTemplate;
    this.radius = radius;
    this.renderer = renderer;
    this.createTileMesh = createTileMesh;
    this.camera = camera;
    this.config = {
      enableFrustumCulling: true,
      enableDotProductFiltering: true,
      enableScreenSpacePrioritization: true,
      enableCaching: true,
      ...config,
    };
    this.scene = scene;
    this.group = new Group();
    this.group.name = `TileGroup_Z${this.zoom}`;
    this.tileQueueProcessor = new TileQueueProcessor(camera);
  }

  public setFallbackManager(fallback: TileLayer) {
    this.fallbackManager = fallback;
  }

  public needsUpdate(): boolean {
    const posMoved =
      this.camera.position.distanceTo(this.lastCameraPos) > 0.0002;
    const quatChanged =
      1 - this.camera.quaternion.dot(this.lastCameraQuat) > 0.00002;

    const changed = posMoved || quatChanged;

    if (changed) {
      this.lastCameraPos.copy(this.camera.position);
      this.lastCameraQuat.copy(this.camera.quaternion);
    }

    return changed;
  }

  public forceNextUpdate(): void {
    this.lastCenterDir.set(NaN, NaN, NaN);
    this.cameraRevision++; // 🔄 bump revision on forced updates
  }

  public setFeatureEnabled(feature: keyof TileEngineConfig, enabled: boolean) {
    this.config[feature] = enabled;
    this.forceNextUpdate();
  }

  private computeScreenDistance(center: Vector3): number {
    if (!this.config.enableScreenSpacePrioritization) return 0;
    const projected = center.clone().project(this.camera);
    return projected.distanceTo(new Vector3(0, 0, -1));
  }

  async loadTiles(): Promise<void> {
    await this.loadVisibleTiles();
  }

  async loadVisibleTiles(): Promise<void> {
    const z = this.zoom;
    const tileCandidates = this.computeTileCandidates();

    if (tileCandidates.length === 0) return;

    const loadList = this.selectTilesToLoad(tileCandidates);
    this.queueTilesToLoad(loadList);

    const MAX_QUEUE_LENGTH = z >= 12 ? 20 : z >= 10 ? 50 : 100;
    if (this.tileQueueProcessor.length() < MAX_QUEUE_LENGTH * 0.7) {
      const preloadList = tileCandidates.slice(
        loadList.length,
        loadList.length + 16
      );
      this.prewarmTiles(preloadList);
    }

    if (!this.tileQueueProcessor.isBusy()) {
      this.tileQueueProcessor.process();
    }
  }

  private computeTileCandidates(): TileCandidate[] {
    const z = this.zoom;
    const tileCount = 2 ** z;
    const MAX_TILES_TO_LOAD = getMaxTilesToLoad(z);

    if (z >= 10 && this.group.children.length > 120) {
      console.warn(
        `⚠️ Skipping Z${z} — too many tiles (${this.group.children.length})`
      );
      return [];
    }

    const frustum = this.config.enableFrustumCulling
      ? computeFrustum(this.camera)
      : undefined;

    const tileCandidates: TileCandidate[] = [];
    const cameraLon = getCameraLongitude(this.camera);
    const centerRay = new Vector3(0, 0, -1).unproject(this.camera).normalize();
    const cameraLat = Math.asin(centerRay.y) * (180 / Math.PI);
    const centerTileX = lon2tileX(cameraLon, z);
    const centerTileY = lat2tileY(cameraLat, z);
    const MAX_RADIUS = getTileSearchRadius(z);

    const cullingContext: TileCullingContext = {
      camera: this.camera,
      zoom: z,
      radius: this.radius,
      enableFrustumCulling: this.config.enableFrustumCulling || true,
      enableDotProductFiltering: this.config.enableDotProductFiltering || true,
      enableScreenSpacePrioritization:
        this.config.enableScreenSpacePrioritization || true,
      frustum,
      scene: this.scene,
    };

    function* spiralCoords(radius: number) {
      let dx = 0,
        dy = 0,
        segmentLength = 1;
      let x = 0,
        y = 0,
        direction = 0;
      while (Math.abs(x) <= radius && Math.abs(y) <= radius) {
        for (let i = 0; i < segmentLength; i++) {
          if (Math.abs(x) <= radius && Math.abs(y) <= radius)
            yield { dx: x, dy: y };
          if (direction === 0) x++;
          else if (direction === 1) y++;
          else if (direction === 2) x--;
          else if (direction === 3) y--;
        }
        direction = (direction + 1) % 4;
        if (direction === 0 || direction === 2) segmentLength++;
      }
    }

    spiral: for (const { dx, dy } of spiralCoords(MAX_RADIUS)) {
      const x = centerTileX + dx;
      const y = centerTileY + dy;
      if (x < 0 || y < 0 || x >= tileCount || y >= tileCount) continue;

      const result = isTileVisible(
        x,
        y,
        z,
        cullingContext,
        this.visibleTiles,
        frustum
      );
      if (!result.visible) continue;

      tileCandidates.push({
        x,
        y,
        key: result.key,
        screenDist: result.screenDist,
      });
      if (tileCandidates.length > MAX_TILES_TO_LOAD * 3) break spiral;
    }

    tileCandidates.sort((a, b) => a.screenDist - b.screenDist);
    return tileCandidates;
  }

  private selectTilesToLoad(tileCandidates: TileCandidate[]): TileCandidate[] {
    const z = this.zoom;
    const MAX_TILES_TO_LOAD = getMaxTilesToLoad(z);
    const loadCap =
      z >= 13 ? 4 : z === 12 ? 8 : z === 11 ? 16 : MAX_TILES_TO_LOAD;
    return tileCandidates.slice(0, loadCap);
  }

  private queueTilesToLoad(loadList: TileCandidate[]): void {
    const z = this.zoom;
    const MAX_QUEUE_LENGTH = z >= 12 ? 20 : z >= 10 ? 50 : 100;
    if (this.tileQueueProcessor.length() > MAX_QUEUE_LENGTH) {
      console.warn(`⚠️ Tile queue overloaded at Z${z}`);
      return;
    }

    for (const { x, y, key } of loadList) {
      this.tileQueueProcessor.enqueue({
        key,
        zoom: z,
        revision: this.cameraRevision,
        task: () =>
          loadTile(x, y, z, key, {
            urlTemplate: this.urlTemplate,
            radius: this.radius,
            renderer: this.renderer,
            group: this.group,
            cache: this.cache,
            visibleTiles: this.visibleTiles,
            createTileMesh: this.createTileMesh,
            zoom: this.zoom,
            revision: this.cameraRevision,
          }),
      });
    }
  }

  private prewarmTiles(preloadList: TileCandidate[]): void {
    const z = this.zoom;
    for (const { x, y } of preloadList) {
      const key = `${z}/${x}/${y}`;
      prewarmTile(x, y, z, key, {
        cache: this.cache,
        createTileMesh: this.createTileMesh,
        radius: this.radius,
        urlTemplate: this.urlTemplate,
        renderer: this.renderer,
      });
    }
  }

  updateTiles(): void {
    const estimatedZoom = estimateZoomLevel(this.camera);

    // 🔄 If zoom has changed, reset revision (for stale task detection)
    if (this.zoom !== estimatedZoom && this.zoom >= 10) {
      this.cameraRevision++;
    }

    // 🧹 Skip high-zoom levels if too far away (performance optimization)
    if (this.zoom > estimatedZoom + 1 && this.zoom >= 12) {
      const centerRay = new Vector3(0, 0, -1).unproject(this.camera);
      const screenDist = centerRay.length();
      if (screenDist > 1.3) return;
    }

    // 🕒 Debounce updates: only one active at a time
    if (this.updateScheduled) {
      this.updatePending = true;
      return;
    }

    // 🧼 Clear outdated entries from the queue (wrong zoom or revision)
    this.tileQueueProcessor.prune((entry) => {
      return (
        entry.zoom !== estimatedZoom || entry.revision !== this.cameraRevision
      );
    });

    this.updateScheduled = true;

    requestAnimationFrame(async () => {
      await this.loadVisibleTiles(); // queues new tiles
      this.cleanupStaleHighZTiles(); // removes unloaded high-Z tiles

      this.updateScheduled = false;
      if (this.updatePending) {
        this.updatePending = false;
        this.updateTiles(); // restart update cycle if more updates requested
      }
    });
  }

  public clear(): void {
    this.group.clear();
    this.visibleTiles.clear();
    this.cache.clear();
    this.lastCenterDir.setScalar(Infinity);
    this.updateScheduled = false;
    this.updatePending = false;
  }

  async loadAllTiles(): Promise<void> {
    const tileCount = 2 ** this.zoom;
    const z = this.zoom;
    const concurrencyLimit = 6;
    const tileTasks: {
      x: number;
      y: number;
      key: string;
      screenDist: number;
    }[] = [];

    const cameraDirection = getCameraCenterDirection(this.camera);

    for (let x = 0; x < tileCount; x++) {
      for (let y = 0; y < tileCount; y++) {
        const key = `${z}/${x}/${y}`;

        if (this.cache.has(key)) {
          const cached = this.cache.get(key);
          if (cached && !this.group.children.includes(cached)) {
            this.group.add(cached);
            this.visibleTiles.add(key);
          }
          continue;
        }

        // Estimate tile center coordinates
        const bounds = tileToLatLonBounds(x, y, z);
        const lat = (bounds.latMin + bounds.latMax) / 2;
        const lon = (bounds.lonMin + bounds.lonMax) / 2;

        // Convert to screen distance (lower = higher priority)
        const tileDir = latLonToUnitVector(lat, lon);
        const screenDist = 1 - cameraDirection.dot(tileDir); // cheap proxy for angle

        tileTasks.push({ x, y, key, screenDist });
      }
    }

    // Sort tiles by screen center proximity (lower distance = higher priority)
    tileTasks.sort((a, b) => a.screenDist - b.screenDist);

    // Convert into async task functions
    const taskFns = tileTasks.map(({ x, y, key }) => async () => {
      try {
        const mesh = await this.createTileMesh({
          x,
          y,
          z,
          urlTemplate: this.urlTemplate,
          radius: this.radius,
          renderer: this.renderer,
        });
        mesh.visible = true;
        this.group.add(mesh);
        this.cache.set(key, mesh);
        this.visibleTiles.add(key);
      } catch (err) {
        console.warn(`❌ Failed to load fallback tile ${key}`, err);
      }
    });

    await runConcurrent(taskFns, concurrencyLimit);
  }

  public cleanupStaleHighZTiles(): void {
    const Z_UNLOAD_THRESHOLD = 10; // only clean up Z10+
    const SCREEN_DIST_THRESHOLD = 2.5; // aggressive cleanup beyond this

    const toRemove: string[] = [];

    for (const key of this.visibleTiles) {
      const mesh = this.cache.get(key);
      if (!mesh || !this.group.children.includes(mesh)) continue;

      const [zStr] = key.split("/");
      const z = parseInt(zStr, 10);
      if (z < Z_UNLOAD_THRESHOLD) continue;

      // Estimate screen distance
      const screenDist = this.computeScreenDistance(mesh.position);
      if (screenDist > SCREEN_DIST_THRESHOLD) {
        this.group.remove(mesh);
        mesh.visible = false;
        toRemove.push(key);
      }
    }

    for (const key of toRemove) {
      this.visibleTiles.delete(key);
    }

    if (toRemove.length > 0) {
      console.log(
        `🧹 Unloaded ${toRemove.length} stale tiles at Z≥${Z_UNLOAD_THRESHOLD}`
      );
    }
  }
}
