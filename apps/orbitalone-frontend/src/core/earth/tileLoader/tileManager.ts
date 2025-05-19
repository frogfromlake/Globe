import {
  Frustum,
  Group,
  Material,
  Matrix4,
  PerspectiveCamera,
  Sphere,
  Vector3,
  WebGLRenderer,
} from "three";
import type { CreateTileMeshFn } from "./types";
import { TileCache } from "./tileCache";
import { getCameraCenterDirection } from "./utils/cameraUtils";
import { tileToLatLonBounds } from "./utils/tileToBounds";
import { latLonToUnitVector } from "./utils/latLonToVector";

/**
 * Configuration for initializing the TileManager.
 */
export interface TileManagerOptions {
  zoomLevel?: number;
  fallbackZoomLevel?: number;
  urlTemplate: string;
  radius?: number;
  renderer: WebGLRenderer;
  createTileMesh: CreateTileMeshFn;
  camera: PerspectiveCamera;
  fadeDuration?: number;
}

/**
 * Manages loading and displaying a static globe shell using XYZ tiles.
 * Supports both standard raster formats and GPU-compressed KTX2 tiles.
 */
export class TileManager {
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
  private minDirectionChangeThreshold = 0.0005; // tweakable — lower = more sensitive
  private fallbackManager?: TileManager;

  public group: Group;

  constructor({
    zoomLevel = 3,
    urlTemplate,
    radius = 1,
    renderer,
    createTileMesh,
    camera,
  }: TileManagerOptions) {
    this.zoom = zoomLevel;
    this.urlTemplate = urlTemplate;
    this.radius = radius;
    this.renderer = renderer;
    this.createTileMesh = createTileMesh;
    this.camera = camera;
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
    this.lastCenterDir.set(NaN, NaN, NaN); // Guarantees angleDiff will be NaN → trigger update
  }

  /**
   * Loads all tiles for the globe.
   */
  async loadTiles(): Promise<void> {
    await this.loadVisibleTiles();
  }

  /**
   * Loads only tiles relevant to the current camera view.
   */
  async loadVisibleTiles(): Promise<void> {
    const MAX_TILES_TO_LOAD = Math.floor(4000 / Math.pow(2, this.zoom - 10));

    const tileCount = 2 ** this.zoom;
    const z = this.zoom;
    const concurrencyLimit = this.zoom >= 8 ? 3 : 6;
    const tileTasks: (() => Promise<void>)[] = [];

    const frustum = new Frustum();
    this.camera.updateMatrixWorld();
    const projScreenMatrix = new Matrix4();
    projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );

    // Lookahead camera for preloading
    const lookaheadFov = this.camera.fov * 1.15;
    const tempCamera = new PerspectiveCamera(
      lookaheadFov,
      this.camera.aspect,
      this.camera.near,
      this.camera.far
    );
    tempCamera.position.copy(this.camera.position);
    tempCamera.quaternion.copy(this.camera.quaternion);
    tempCamera.updateMatrixWorld(true);
    projScreenMatrix.multiplyMatrices(
      tempCamera.projectionMatrix,
      tempCamera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(projScreenMatrix);

    const allTiles: {
      x: number;
      y: number;
      key: string;
      dot: number;
      screenDist: number;
    }[] = [];

    const viewDir = getCameraCenterDirection(this.camera);
    const screenCenter = new Vector3(0, 0, -1); // NDC center

    let shouldBreak = false;

    for (let x = 0; x < tileCount && !shouldBreak; x++) {
      for (let y = 0; y < tileCount; y++) {
        const key = `${z}/${x}/${y}`;
        if (this.visibleTiles.has(key)) continue;

        if (this.cache.has(key)) {
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
        const cameraDistance = this.camera.position.length();

        const boundingSphere = getTileBoundingSphere(
          x,
          y,
          z,
          this.radius,
          cameraDistance
        );
        const tileDir = latLonToUnitVector(centerLat, centerLon);
        const dot = viewDir.dot(tileDir);

        const minDotThreshold =
          z <= 8
            ? 0.6
            : z === 9
            ? 0.74
            : z === 10
            ? 0.78
            : z === 11
            ? 0.83
            : z === 12
            ? 0.87
            : 0.9;

        if (dot < minDotThreshold) continue;
        if (!frustum.intersectsSphere(boundingSphere)) continue;

        // Screen-space prioritization
        const projected = boundingSphere.center.clone().project(this.camera);
        const screenDist = projected.distanceTo(screenCenter);

        allTiles.push({ x, y, key, dot, screenDist });

        if (allTiles.length >= MAX_TILES_TO_LOAD * 4) {
          shouldBreak = true;
          break;
        }
      }
    }

    console.log(
      `🧮 [TileManager Z${z}] ${allTiles.length} tiles passed culling`
    );

    if (allTiles.length > MAX_TILES_TO_LOAD * 3) {
      console.warn(
        `⚠️ Too many tiles (${allTiles.length}) passed culling at Z${z}. Reducing to top ${MAX_TILES_TO_LOAD}`
      );
    }

    allTiles.sort((a, b) => {
      if (b.dot !== a.dot) return b.dot - a.dot;
      return a.screenDist - b.screenDist;
    });

    const loadLimit = allTiles.slice(0, MAX_TILES_TO_LOAD);

    for (const { x, y, key } of loadLimit) {
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
          console.warn(`❌ Failed to load tile ${key}`, err);
        }
      });
    }

    await runConcurrent(tileTasks, concurrencyLimit, 16);
  }

  /**
   * Called externally when camera moves.
   */
  updateTiles(): void {
    const currentDir = getCameraCenterDirection(this.camera);
    const angleDiff = currentDir.angleTo(this.lastCenterDir);

    if (angleDiff < this.minDirectionChangeThreshold) {
      return; // Camera hasn't moved enough
    }

    this.lastCenterDir.copy(currentDir);

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
        this.updateTiles(); // rerun once more for latest state
      }
    });
  }

  hideOverlappingFallbacks(fallbackManager: TileManager): void {
    for (const key of fallbackManager.visibleTiles) {
      const [zStr, xStr, yStr] = key.split("/");
      const zx = parseInt(xStr, 10);
      const zy = parseInt(yStr, 10);
      const zz = parseInt(zStr, 10);

      const tileMesh = fallbackManager.cache.get(key);
      if (!tileMesh || !tileMesh.visible) continue;

      const scale = 2 ** (this.zoom - zz);
      const baseX = zx * scale;
      const baseY = zy * scale;

      let covered = true;
      for (let dx = 0; dx < scale; dx++) {
        for (let dy = 0; dy < scale; dy++) {
          const subKey = `${this.zoom}/${baseX + dx}/${baseY + dy}`;
          const highRes = this.cache.get(subKey);
          const mat = highRes?.material as Material & { opacity: number };
          if (!highRes || mat.opacity < 1) {
            covered = false;
            break;
          }
        }
        if (!covered) break;
      }

      if (covered) {
        tileMesh.visible = false;
      }
    }
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

  /**
   * Clears all loaded tiles from the scene and cache.
   */
  public clear(): void {
    this.group.clear();
    this.visibleTiles.clear();
    this.cache.clear();

    // Important: reset to force update trigger next time
    this.lastCenterDir.setScalar(Infinity); // Or any invalid direction
    this.updateScheduled = false;
    this.updatePending = false;
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

    if (executing.length >= limit) {
      await Promise.race(executing);
    }

    const now = performance.now();
    if (now - lastYield > yieldEveryMs) {
      await new Promise(requestAnimationFrame);
      lastYield = performance.now();
    }
  }

  await Promise.all(executing);
  return results;
}

function getTileBoundingSphere(
  x: number,
  y: number,
  z: number,
  radius: number,
  cameraDistance?: number
): Sphere {
  const bounds = tileToLatLonBounds(x, y, z);
  const centerLat = (bounds.latMin + bounds.latMax) / 2;
  const centerLon = (bounds.lonMin + bounds.lonMax) / 2;
  const centerDir = latLonToUnitVector(centerLat, centerLon);
  const center = centerDir.clone().multiplyScalar(radius * 1.05);

  const deltaLat = Math.abs(bounds.latMax - bounds.latMin);
  const approxAngle = (deltaLat * Math.PI) / 180;

  // Steeper curve above Z10 to prevent runaway tile counts
  const baseMultiplier =
    z <= 8
      ? 1.0
      : z === 9
      ? 1.7
      : z === 10
      ? 2.6
      : z === 11
      ? 3.8
      : z === 12
      ? 5.0
      : 6.3; // Z13

  const inflation =
    cameraDistance && cameraDistance < 1.004 && z >= 10
      ? 1.05 + (1.004 - cameraDistance) * 40
      : 1.0;

  const minRadius =
    z <= 8 ? 0.005 : z <= 10 ? 0.03 : z === 11 ? 0.06 : z === 12 ? 0.08 : 0.1;

  const sphereRadius = Math.max(
    Math.sin(approxAngle / 2) * radius * baseMultiplier * inflation,
    minRadius * inflation
  );

  return new Sphere(center, sphereRadius);
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
