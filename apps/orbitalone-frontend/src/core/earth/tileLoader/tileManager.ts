import {
  Frustum,
  Group,
  Matrix4,
  Mesh,
  Object3D,
  PerspectiveCamera,
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
  getTileInflation,
} from "./utils/lodFunctions";

const DEBUG_DOT_PRODUCT = true;

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
  private tileQueue: { key: string; task: () => Promise<void> }[] = [];

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
    const currentDir = getCameraCenterDirection(this.camera);
    const angleDiff = currentDir.angleTo(this.lastCenterDir);
    return angleDiff >= this.minDirectionChangeThreshold;
  }

  public forceNextUpdate(): void {
    this.lastCenterDir.set(NaN, NaN, NaN);
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

    // ✅ Draw debug arrow (optional)
    // if (
    //   DEBUG_DOT_PRODUCT &&
    //   this.scene &&
    //   this.debugArrows.length < getMaxDebugArrows(z)
    // ) {
    //   const arrowColor = passed ? 0x00ff00 : 0xff0000;
    //   const arrow = new ArrowHelper(
    //     tileDir.clone().normalize(),
    //     new Vector3(0, 0, 0),
    //     1.05,
    //     arrowColor,
    //     0.02,
    //     0.01
    //   );
    //   this.scene.add(arrow);
    //   this.debugArrows.push(arrow);
    // }

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
    const concurrencyLimit = getConcurrencyLimit(this.zoom);

    // Early exit if too many meshes already visible at high zoom
    if (z >= 10 && this.group.children.length > 120) {
      console.warn(
        `⚠️ Skipping Z${z} tile load — too many meshes (${this.group.children.length})`
      );
      return;
    }

    // Clear debug arrows
    if (DEBUG_DOT_PRODUCT && this.scene) {
      for (const obj of this.debugArrows) {
        this.scene.remove(obj);
      }
      this.debugArrows = [];
    }

    const frustum = new Frustum();
    if (this.config.enableFrustumCulling) {
      const lookaheadFov = this.camera.fov * 1.3;
      const tempCamera = new PerspectiveCamera(
        lookaheadFov,
        this.camera.aspect,
        this.camera.near,
        this.camera.far
      );
      tempCamera.position.copy(this.camera.position);
      tempCamera.quaternion.copy(this.camera.quaternion);
      tempCamera.updateMatrixWorld(true);

      const projScreenMatrix = new Matrix4().multiplyMatrices(
        tempCamera.projectionMatrix,
        tempCamera.matrixWorldInverse
      );
      frustum.setFromProjectionMatrix(projScreenMatrix);
    }

    const tileCandidates: {
      x: number;
      y: number;
      key: string;
      screenDist: number;
    }[] = [];

    for (let x = 0; x < tileCount; x++) {
      for (let y = 0; y < tileCount; y++) {
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
        const cameraLon = getCameraLongitude(this.camera);
        const lonDiff = Math.abs(centerLon - cameraLon);
        const wrappedLonDiff = lonDiff > 180 ? 360 - lonDiff : lonDiff;

        if (wrappedLonDiff > 100) continue;

        const cameraDistance = this.camera.position.length();

        const boundingSphere = getTileBoundingSphere(
          x,
          y,
          z,
          this.radius,
          cameraDistance
        );

        const tileDir = latLonToUnitVector(centerLat, centerLon);
        const screenDist = this.computeScreenDistance(boundingSphere.center);
        // const screenDistCap = Math.min(3.0, 1.9 + (12.5 - z) * 0.5);
        const screenDistCaps: Record<number, number> = {
          3: 3.5,
          4: 2.4,
          5: 2.55,
          6: 3.1,
          7: 3.6,
          8: 4.5,
          9: 4.1,
          10: 3.95,
          11: 2.2,
          12: 2.04,
          13: 2.02,
        };
        const screenDistCap = screenDistCaps[z] ?? 1.0;
        if (screenDist > screenDistCap) continue;

        if (!this.passesUnifiedVisibility(tileDir, boundingSphere, frustum)) {
          continue;
        }

        tileCandidates.push({ x, y, key, screenDist });
      }
    }

    tileCandidates.sort((a, b) => a.screenDist - b.screenDist);
    // Load cap based on zoom level
    const loadCap =
      z >= 13 ? 4 : z === 12 ? 8 : z === 11 ? 16 : MAX_TILES_TO_LOAD;

    const loadList = tileCandidates.slice(0, loadCap);

    console.log(
      `🧮 Z${z} → ${tileCandidates.length} tiles, queuing ${loadList.length}`
    );

    for (const { x, y, key } of loadList) {
      if (this.tileQueue.length > 100) {
        console.warn("⚠️ Tile queue overloaded, skipping remaining tiles");
        break;
      }

      if (this.tileQueue.find((entry) => entry.key === key)) continue;

      this.tileQueue.push({
        key,
        task: async () => {
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

    if (!this.tileQueueBusy) this.processTileQueue();
  }

  private async processTileQueue(): Promise<void> {
    this.tileQueueBusy = true;
    let processedCount = 0;

    while (this.tileQueue.length > 0) {
      const { task } = this.tileQueue.shift()!;
      await task();
      processedCount++;

      //  Yield every 8 tiles
      if (processedCount % 8 === 0) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }

    this.tileQueueBusy = false;
  }

  updateTiles(): void {
    const estimatedZoom = estimateZoomLevel(this.camera);

    // Z13 is always deferred for now
    if (this.zoom > estimatedZoom + 1 && this.zoom >= 12) {
      // Check center pixel before continuing
      const centerRay = new Vector3(0, 0, -1).unproject(this.camera);
      const screenDist = centerRay.length();
      if (screenDist > 1.3) return; // Skip until we're zoomed in closer
    }

    if (this.updateScheduled) {
      this.updatePending = true;
      return;
    }

    this.updateScheduled = true;
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
    const tileTasks: (() => Promise<void>)[] = [];

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

        tileTasks.push(async () => {
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
      }
    }

    await runConcurrent(tileTasks, concurrencyLimit);
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

function getMaxDebugArrows(z: number): number {
  if (z <= 5) return 100;
  if (z <= 7) return 150;
  if (z <= 9) return 200;
  if (z <= 11) return 300;
  return 400; // Z12+
}
