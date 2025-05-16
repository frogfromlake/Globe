import {
  Frustum,
  Group,
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
  private cache = new TileCache(256);
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
  private minDirectionChangeThreshold = 0.002; // tweakable — lower = more sensitive

  public group: Group;

  constructor({
    zoomLevel = 2,
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

  /**
   * Loads all tiles for the globe, including polar ring and cap patches.
   */
  async loadTiles(): Promise<void> {
    await this.loadVisibleTiles();
  }

  /**
   * Loads only tiles relevant to the current camera view.
   */
  async loadVisibleTiles(): Promise<void> {
    console.log("📦 Loading tiles at zoom", this.zoom);
    const tileCount = 2 ** this.zoom;
    const z = this.zoom;
    const concurrencyLimit = 6;
    const tileTasks: (() => Promise<void>)[] = [];
    const frustum = new Frustum();
    this.camera.updateMatrixWorld();
    const projScreenMatrix = new Matrix4();
    projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(projScreenMatrix);

    const centerDir = getCameraCenterDirection(this.camera);
    const allTiles: { x: number; y: number; dist: number; key: string }[] = [];
    for (let x = 0; x < tileCount; x++) {
      for (let y = 0; y < tileCount; y++) {
        const key = `${z}/${x}/${y}`;
        if (this.visibleTiles.has(key)) continue;

        if (this.cache.has(key)) {
          const existing = this.cache.get(key);
          if (existing && !this.group.children.includes(existing)) {
            this.group.add(existing);
            this.visibleTiles.add(key);
          }
          continue;
        }

        const bounds = tileToLatLonBounds(x, y, z);
        const centerLat = (bounds.latMin + bounds.latMax) / 2;
        const centerLon = (bounds.lonMin + bounds.lonMax) / 2;
        const tileDir = latLonToUnitVector(centerLat, centerLon);

        console.log("🔄 Checking tile", key);

        const boundingSphere = getTileBoundingSphere(x, y, z, this.radius);
        console.log(
          "  center:",
          boundingSphere.center.toArray(),
          "radius:",
          boundingSphere.radius
        );

        const dot = centerDir.dot(tileDir.negate());
        if (dot < 0.15) {
          console.log("❌ Culled by angle", key);
          continue;
        }

        if (!frustum.intersectsSphere(boundingSphere)) {
          console.log("❌ Culled by frustum", key);
          continue;
        }

        console.log("✅ Visible", key);

        const dist = 1 - centerDir.dot(tileDir);
        allTiles.push({ x, y, dist, key });
      }
    }

    allTiles.sort((a, b) => a.dist - b.dist);

    for (const { x, y, key } of allTiles) {
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
          this.group.add(mesh);
          this.cache.set(key, mesh);
          this.visibleTiles.add(key);
        } catch (err) {
          console.warn(`❌ Failed to load tile ${key}`, err);
        }
      });
    }

    await runConcurrent(tileTasks, concurrencyLimit);
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
}

async function runConcurrent<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const p = task()
      .then((result) => {
        results.push(result);
      })
      .finally(() => {
        const index = executing.indexOf(p);
        if (index > -1) executing.splice(index, 1);
      });

    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

function getTileBoundingSphere(
  x: number,
  y: number,
  z: number,
  radius: number
): Sphere {
  const bounds = tileToLatLonBounds(x, y, z);

  // Get center position of the tile on the globe
  const centerLat = (bounds.latMin + bounds.latMax) / 2;
  const centerLon = (bounds.lonMin + bounds.lonMax) / 2;
  const centerDir = latLonToUnitVector(centerLat, centerLon);

  // Compute tile center in world space
  const center = centerDir.clone().multiplyScalar(radius * 1.05);

  // Estimate angular tile height (in radians)
  const deltaLat = Math.abs(bounds.latMax - bounds.latMin);
  const approxAngle = (deltaLat * Math.PI) / 180;

  // Convert angular height to world radius
  const sphereRadius = Math.sin(approxAngle / 2) * radius * 0.8;

  return new Sphere(center, sphereRadius);
}
