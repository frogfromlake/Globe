import {
  Box3,
  Box3Helper,
  Frustum,
  Group,
  Matrix4,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Sphere,
  Vector3,
  WebGLRenderer,
} from "three";
import type { CreateTileMeshFn, TileLoaderConfig } from "./types";
import { TileCache } from "./tileCache";
import {
  getCameraCenterDirection,
  getCameraLongitude,
} from "./utils/cameraUtils";
import { tileToLatLonBounds } from "./utils/tileToBounds";
import { latLonToUnitVector } from "./utils/latLonToVector";
import {
  estimateZoomLevel,
  getBoundingSphereMultiplier,
  getConcurrencyLimit,
  getMaxTilesToLoad,
  getMinDotThreshold,
  getMinTileRadius,
  getScreenDistanceCap,
  getTileInflation,
  getTileSearchRadius,
} from "./utils/lodFunctions";

export interface TileManagerOptions {
  zoomLevel?: number;
  fallbackZoomLevel?: number;
  urlTemplate: string;
  radius?: number;
  renderer: WebGLRenderer;
  createTileMesh: CreateTileMeshFn;
  camera: PerspectiveCamera;
  fadeDuration?: number;
  config?: TileLoaderConfig;
  scene?: Scene;
}

export class TileManager {
  private config: TileLoaderConfig;
  private cache = new TileCache(512);
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
  private minDirectionChangeThreshold = 0.0005;
  private fallbackManager?: TileManager;
  private tileQueueBusy = false;
  private scene?: Scene;
  private debugArrows: Object3D[] = [];
  public group: Group;
  private readonly dotLogCounts: Record<number, number> = {};
  private readonly LOG_LIMIT_PER_ZOOM = 10;
  private cameraRevision = 0;
  private tileQueue: {
    key: string;
    zoom: number;
    revision: number;
    task: () => Promise<void>;
  }[] = [];
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
  }: TileManagerOptions) {
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
  }

  public setFallbackManager(fallback: TileManager) {
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

  public setFeatureEnabled(feature: keyof TileLoaderConfig, enabled: boolean) {
    this.config[feature] = enabled;
    this.forceNextUpdate();
  }

  private passesUnifiedVisibility(
    tileDir: Vector3,
    boundingSphere: Sphere,
    frustum: Frustum
  ): boolean {
    const z = this.zoom;

    if (
      !this.config.enableDotProductFiltering &&
      !this.config.enableFrustumCulling
    ) {
      return true;
    }

    const viewDir = getCameraCenterDirection(this.camera);
    const dot = viewDir.dot(tileDir);
    const minDotThreshold = getMinDotThreshold(z, this.camera.fov);

    const passedDot =
      !this.config.enableDotProductFiltering || dot >= minDotThreshold;

    const passedFrustum =
      !this.config.enableFrustumCulling ||
      frustum.intersectsSphere(boundingSphere);

    const passed = passedDot && passedFrustum;
    return passed;
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
    const MAX_TILES_TO_LOAD = getMaxTilesToLoad(this.zoom);
    const tileCount = 2 ** this.zoom;
    const z = this.zoom;

    const startTime = performance.now();
    let numEvaluated = 0;
    let numVisible = 0;
    let numFrustumPassed = 0;
    let numDotPassed = 0;

    if (z >= 10 && this.group.children.length > 120) {
      console.warn(
        `⚠️ Skipping Z${z} — too many tiles (${this.group.children.length})`
      );
      return;
    }

    const frustum = new Frustum();
    if (this.config.enableFrustumCulling) {
      const fov = this.camera.fov * 1.3;
      const tempCamera = new PerspectiveCamera(
        fov,
        this.camera.aspect,
        this.camera.near,
        this.camera.far
      );
      tempCamera.position.copy(this.camera.position);
      tempCamera.quaternion.copy(this.camera.quaternion);
      tempCamera.updateMatrixWorld(true);

      const projMatrix = new Matrix4().multiplyMatrices(
        tempCamera.projectionMatrix,
        tempCamera.matrixWorldInverse
      );
      frustum.setFromProjectionMatrix(projMatrix);
    }

    const tileCandidates: {
      x: number;
      y: number;
      key: string;
      screenDist: number;
    }[] = [];

    const cameraLon = getCameraLongitude(this.camera);
    const centerRay = new Vector3(0, 0, -1).unproject(this.camera).normalize();
    const cameraLat = Math.asin(centerRay.y) * (180 / Math.PI);

    function lon2tileX(lon: number, z: number): number {
      return Math.floor(((lon + 180) / 360) * Math.pow(2, z));
    }
    function lat2tileY(lat: number, z: number): number {
      const rad = (lat * Math.PI) / 180;
      const n = Math.PI - Math.log(Math.tan(Math.PI / 4 + rad / 2));
      return Math.floor((n / Math.PI / 2) * Math.pow(2, z));
    }

    const centerTileX = lon2tileX(cameraLon, z);
    const centerTileY = lat2tileY(cameraLat, z);
    const MAX_RADIUS = getTileSearchRadius(z);

    function* spiralCoords(radius: number) {
      let dx = 0,
        dy = 0,
        segmentLength = 1;
      let x = 0,
        y = 0,
        direction = 0;

      while (Math.abs(x) <= radius && Math.abs(y) <= radius) {
        for (let i = 0; i < segmentLength; i++) {
          if (Math.abs(x) <= radius && Math.abs(y) <= radius) {
            yield { dx: x, dy: y };
          }
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

      const key = `${z}/${x}/${y}`;
      if (this.visibleTiles.has(key)) continue;

      if (this.config.enableCaching && this.cache.has(key)) {
        const cached = this.cache.get(key);
        if (cached && !this.group.children.includes(cached)) {
          this.group.add(cached);
          this.visibleTiles.add(key);
        }
        continue;
      }

      const bounds = tileToLatLonBounds(x, y, z);
      const centerLat = (bounds.latMin + bounds.latMax) / 2;
      const centerLon = (bounds.lonMin + bounds.lonMax) / 2;
      const lonDiff = Math.abs(centerLon - cameraLon);
      if (Math.min(lonDiff, 360 - lonDiff) > 100) continue;

      if (window.DEBUG_SPIRAL_BOUNDS && z >= 9 && this.scene) {
        debugShowTileBox(bounds, this.scene, z);
      }

      const tileDir = latLonToUnitVector(centerLat, centerLon);
      const viewDir = getCameraCenterDirection(this.camera);
      const dot = viewDir.dot(tileDir);
      const minDot = getMinDotThreshold(z, this.camera.fov);
      if (this.config.enableDotProductFiltering && dot < minDot) continue;
      numDotPassed++;

      const cameraDistance = this.camera.position.length();
      const boundingSphere = getTileBoundingSphere(
        x,
        y,
        z,
        this.radius,
        cameraDistance
      );
      if (
        this.config.enableFrustumCulling &&
        !frustum.intersectsSphere(boundingSphere)
      )
        continue;
      numFrustumPassed++;

      const screenDist = this.computeScreenDistance(boundingSphere.center);
      if (screenDist > getScreenDistanceCap(z)) continue;

      tileCandidates.push({ x, y, key, screenDist });
      numEvaluated++;
      numVisible++;

      if (tileCandidates.length > MAX_TILES_TO_LOAD * 3) break spiral;
    }

    tileCandidates.sort((a, b) => a.screenDist - b.screenDist);

    const loadCap =
      z >= 13 ? 4 : z === 12 ? 8 : z === 11 ? 16 : MAX_TILES_TO_LOAD;
    const loadList = tileCandidates.slice(0, loadCap);

    console.log(
      `🧮 Z${z} → ${tileCandidates.length} tiles, queuing ${loadList.length}`
    );

    for (const { x, y, key } of loadList) {
      const MAX_QUEUE_LENGTH =
        this.zoom >= 12 ? 20 : this.zoom >= 10 ? 50 : 100;
      if (this.tileQueue.length > MAX_QUEUE_LENGTH) {
        console.warn(`⚠️ Tile queue overloaded at Z${this.zoom}`);
        break;
      }

      if (this.tileQueue.find((entry) => entry.key === key)) continue;

      this.tileQueue.push({
        key,
        zoom: z, // 🆕 attach zoom to this tile
        revision: this.cameraRevision, // 🆕 store revision
        task: async () => {
          // ⛔ Check if tile is still relevant
          if (z !== this.zoom) {
            console.log(
              `⏩ Skipping stale tile ${key} (was Z${z}, now Z${this.zoom})`
            );
            return;
          }
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
            console.warn(`❌ Failed to load tile ${key}`, err);
          }
        },
      });
    }

    // const duration = performance.now() - startTime;
    // console.log(
    //   `%c[Z${z}] loadVisibleTiles(): ${duration.toFixed(1)}ms\n` +
    //     `Evaluated: ${numEvaluated}, Passed: ${tileCandidates.length}, ` +
    //     `Dot: ${numDotPassed}, Frustum: ${numFrustumPassed}, Queued: ${loadList.length}`,
    //   "color: cyan; font-weight: bold;"
    // );

    if (!this.tileQueueBusy) this.processTileQueue();
  }

  private async processTileQueue(): Promise<void> {
    this.tileQueueBusy = true;
    const TIME_BUDGET_MS = 12; // max time per frame

    while (this.tileQueue.length > 0) {
      const start = performance.now();
      let didYield = false;

      while (this.tileQueue.length > 0) {
        const { task } = this.tileQueue.shift()!;
        await task();

        const elapsed = performance.now() - start;
        if (elapsed > TIME_BUDGET_MS) {
          didYield = true;
          break;
        }
      }

      if (didYield) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }

    this.tileQueueBusy = false;
  }

  updateTiles(): void {
    const estimatedZoom = estimateZoomLevel(this.camera);
    if (this.zoom !== estimatedZoom && this.zoom >= 10) {
      this.tileQueue.length = 0;
      this.cameraRevision++; // 🔄 bump revision on zoom change
    }

    // Skip high zoom if we're too far out
    if (this.zoom > estimatedZoom + 1 && this.zoom >= 12) {
      const centerRay = new Vector3(0, 0, -1).unproject(this.camera);
      const screenDist = centerRay.length();
      if (screenDist > 1.3) return;
    }

    if (this.updateScheduled) {
      this.updatePending = true;
      return;
    }

    // 🆕 Clear stale tile queue if zoom is no longer current
    if (this.zoom !== estimatedZoom && this.zoom >= 10) {
      this.tileQueue.length = 0;
    }

    this.updateScheduled = true;
    this.tileQueue = this.tileQueue.filter(
      (entry) =>
        entry.zoom === estimatedZoom && entry.revision === this.cameraRevision
    );

    requestAnimationFrame(async () => {
      await this.loadVisibleTiles();
      this.updateScheduled = false;
      if (this.updatePending) {
        this.updatePending = false;
        this.updateTiles();
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
}

async function runConcurrent<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
  yieldEveryMs = 16
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<T>[] = [];
  let lastYield = performance.now();
  for (const task of tasks) {
    const p = task()
      .then((result) => results.push(result))
      .finally(() => {
        const i = executing.indexOf(p as Promise<T>);
        if (i > -1) executing.splice(i, 1);
      });
    executing.push(p as Promise<T>);
    if (executing.length >= limit) await Promise.race(executing);
    const now = performance.now();
    if (now - lastYield > yieldEveryMs) {
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 0);
        });
      });
      lastYield = performance.now();
    }
  }
  await Promise.all(executing);
  return results;
}

export function getTileBoundingSphere(
  x: number,
  y: number,
  z: number,
  globeRadius: number,
  cameraDistance: number
): Sphere {
  const bounds = tileToLatLonBounds(x, y, z);
  const centerLat = (bounds.latMin + bounds.latMax) / 2;
  const centerLon = (bounds.lonMin + bounds.lonMax) / 2;
  const centerDir = latLonToUnitVector(centerLat, centerLon);
  const center = centerDir.multiplyScalar(globeRadius * 1.02);

  const angleDeg = Math.max(
    bounds.latMax - bounds.latMin,
    bounds.lonMax - bounds.lonMin
  );
  const angleRad = (angleDeg * Math.PI) / 180;

  const rawRadius = Math.sin(angleRad / 2) * globeRadius;

  const baseMultiplier = getBoundingSphereMultiplier(z); // e.g. 1.0 → 4.0
  const inflation = getTileInflation(z, cameraDistance); // optional
  const minRadius = getMinTileRadius(z); // fallback radius (per zoom)

  const inflated = rawRadius * baseMultiplier * inflation;
  // const radius = Math.max(inflated, minRadius * inflation); // ensure it's never too small
  const radius = Math.max(
    inflated,
    minRadius * inflation * (z === 11 ? 1.2 : 1.0)
  );

  return new Sphere(center, radius);
}

function debugShowTileBox(
  bounds: { latMin: number; latMax: number; lonMin: number; lonMax: number },
  scene: Scene,
  z: number
) {
  const centerLat = (bounds.latMin + bounds.latMax) / 2;
  const centerLon = (bounds.lonMin + bounds.lonMax) / 2;
  const center = latLonToUnitVector(centerLat, centerLon).multiplyScalar(1.0);

  const box = new Box3().setFromCenterAndSize(
    center,
    new Vector3(0.005, 0.005, 0.005)
  );
  const colors = {
    10: 0xffff00,
    11: 0xffaa00,
    12: 0xff5500,
    13: 0xff0000,
  };
  const helper = new Box3Helper(
    box,
    colors[z as keyof typeof colors] ?? 0x888888
  );

  scene.add(helper);
}
