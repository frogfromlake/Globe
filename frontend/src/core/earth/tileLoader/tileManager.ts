import { Group, WebGLRenderer } from "three";
import type { CreateTileMeshFn } from "./types";
import { generatePolarPatches } from "./createPolarTilePatches";

/**
 * Configuration for initializing the TileManager.
 */
export interface TileManagerOptions {
  zoomLevel?: number;
  urlTemplate: string;
  radius?: number;
  renderer: WebGLRenderer;
  createTileMesh: CreateTileMeshFn;
}

/**
 * Manages loading and displaying a static globe shell using XYZ tiles.
 * Supports both standard raster formats and GPU-compressed KTX2 tiles.
 */
export class TileManager {
  public group: Group;
  private radius: number;
  private zoom: number;
  private urlTemplate: string;
  private renderer: WebGLRenderer;
  private createTileMesh: CreateTileMeshFn;

  constructor({
    zoomLevel = 2,
    urlTemplate,
    radius = 1,
    renderer,
    createTileMesh,
  }: TileManagerOptions) {
    this.zoom = zoomLevel;
    this.urlTemplate = urlTemplate;
    this.radius = radius;
    this.renderer = renderer;
    this.createTileMesh = createTileMesh;
    this.group = new Group();
    this.group.name = `TileGroup_Z${this.zoom}`;
  }

  /**
   * Loads all tiles for the globe, including polar ring and cap patches.
   */
  async loadTiles(): Promise<void> {
    const tileCount = 2 ** this.zoom;
    const z = this.zoom;
    const tilePromises: Promise<void>[] = [];

    // Load standard XYZ tiles
    for (let x = 0; x < tileCount; x++) {
      for (let y = 0; y < tileCount; y++) {
        const tilePromise = this.createTileMesh({
          x,
          y,
          z,
          urlTemplate: this.urlTemplate,
          radius: this.radius,
          renderer: this.renderer,
        }).then((mesh) => {
          this.group.add(mesh);
        });

        tilePromises.push(tilePromise);
      }
    }

    // Load polar ring/cap patches using lat/lon overrides
    const patches = generatePolarPatches(this.zoom);
    for (const patch of patches) {
      const { x, y, latMin, latMax, lonMin, lonMax, name } = patch;
      const patchPromise = this.createTileMesh({
        x,
        y,
        z,
        urlTemplate: this.urlTemplate,
        radius: this.radius,
        renderer: this.renderer,
        latOverride: { latMin, latMax, lonMin, lonMax },
      })
        .then((mesh) => {
          mesh.name += `-${name}`;
          this.group.add(mesh);
        })
        .catch((err) => {
          console.warn(
            `⚠️ Failed to load patch "${name}" at z=${z}, x=${x}, y=${y}`,
            err
          );
        });

      tilePromises.push(patchPromise);
    }

    await Promise.all(tilePromises);
  }
}
