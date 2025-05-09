// src/core/earth/borders/loadBorderMeshesDeferred.ts

import {
  Scene,
  Mesh,
  MeshBasicMaterial,
  Group,
  WebGLRenderer,
  Camera,
} from "three";
import { CONFIG } from "@/configs/config";
import { buildCountryBorderMeshes } from "./generateCountryBorders";
import { buildOceanBorderMeshes } from "./generateOceanBorders";
import { countryBorderMeshMap, oceanBorderMeshMap } from "./borderMeshMap";

import countryGeojson from "@/core/data/dev/countries.json";
import oceanGeojson from "@/core/data/dev/oceans.json";

/**
 * Generates all country and ocean borders in the background and attaches them to the tilt group.
 * Also precompiles materials to avoid shader lag on first hover.
 */
export function loadBorderMeshesDeferred(
  tiltGroup: Group,
  scene: Scene,
  camera: Camera,
  renderer: WebGLRenderer
): void {
  requestIdleCallback(() => {
    const radius = CONFIG.globe.radius;
    const thickness = CONFIG.borders.countryBorderThickness ?? 0.07;

    // === Country Borders ===
    const countryBorderEntries = buildCountryBorderMeshes(
      countryGeojson,
      radius,
      thickness
    );
    for (const { id, mesh } of countryBorderEntries) {
      mesh.visible = false;
      mesh.renderOrder = 3;
      mesh.frustumCulled = false;
      mesh.matrixAutoUpdate = false;

      mesh.traverse((child) => {
        if (
          child instanceof Mesh &&
          child.material instanceof MeshBasicMaterial
        ) {
          child.material.opacity = 1.0;
          child.material.transparent = false;
          child.renderOrder = 3;
        }
      });

      tiltGroup.add(mesh);
      countryBorderMeshMap.set(id, mesh);
    }

    // === Ocean Borders ===
    const oceanBorderEntries = buildOceanBorderMeshes(
      oceanGeojson,
      radius,
      thickness
    );
    for (const { id, mesh } of oceanBorderEntries) {
      mesh.visible = false;
      mesh.renderOrder = 3;
      mesh.frustumCulled = false;
      mesh.matrixAutoUpdate = false;

      mesh.traverse((child) => {
        if (
          child instanceof Mesh &&
          child.material instanceof MeshBasicMaterial
        ) {
          child.material.opacity = 1.0;
          child.material.transparent = false;
          child.renderOrder = 3;
        }
      });

      tiltGroup.add(mesh);
      oceanBorderMeshMap.set(id, mesh);
    }

    // === Force material compilation to avoid shader stall on first use
    scene.updateMatrixWorld(true);
    renderer.compile(scene, camera);

    tiltGroup.traverse((child) => {
      if (child instanceof Mesh) {
        child.onBeforeRender?.(
          renderer,
          scene,
          camera,
          null as any,
          null as any,
          null as any
        );
      }
    });
  });
}
