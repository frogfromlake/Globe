import {
  Mesh,
  MeshBasicMaterial,
  Scene,
  SphereGeometry,
  Group,
  Object3DEventMap,
  ShaderMaterial,
  Vector2,
} from "three";

import { CONFIG } from "@/configs/config";
import {
  earthFragmentShader,
  earthVertexShader,
} from "@/core/earth/shaders/earthShaders";
import { countryLabelGroup } from "@/core/earth/interactivity/countryLabels3D";
import { oceanLabelGroup } from "@/core/earth/interactivity/oceanLabel3D";

import { buildCountryBorderMeshes } from "@/core/earth/borders/generateCountryBorders";
import countryGeojson from "@/core/data/dev/countries.json";
import oceanGeojson from "@/core/data/dev/oceans.json";

import {
  countryBorderMeshMap,
  oceanBorderMeshMap,
} from "@/core/earth/borders/borderMeshMap";
import { buildOceanBorderMeshes } from "../earth/borders/generateOceanBorders";

/**
 * Sets up the core globe, raycast mesh, and tilt group (with borders and labels).
 */
export function setupCoreSceneObjects(
  scene: Scene,
  uniforms: { [key: string]: any }
): {
  globe: Mesh;
  globeRaycastMesh: Mesh;
  tiltGroup: Group<Object3DEventMap>;
} {
  const globeGeometry = new SphereGeometry(
    CONFIG.globe.radius,
    CONFIG.globe.widthSegments,
    CONFIG.globe.heightSegments
  );

  const globeMaterial = new ShaderMaterial({
    uniforms,
    vertexShader: earthVertexShader,
    fragmentShader: earthFragmentShader,
  });

  const globe = new Mesh(globeGeometry, globeMaterial);
  globe.renderOrder = 2;

  const raycastGeometry = new SphereGeometry(CONFIG.globe.radius, 32, 32);
  const globeRaycastMesh = new Mesh(
    raycastGeometry,
    new MeshBasicMaterial({ visible: false })
  );

  const tiltGroup = new Group();
  tiltGroup.add(globe, globeRaycastMesh, countryLabelGroup, oceanLabelGroup);

  // Ensure label groups render on top of everything
  countryLabelGroup.renderOrder = 5;
  oceanLabelGroup.renderOrder = 5;

  const borderThickness = CONFIG.borders.countryBorderThickness ?? 0.07;

  // === Country Borders ===
  const countryBorderEntries = buildCountryBorderMeshes(
    countryGeojson,
    CONFIG.globe.radius,
    borderThickness
  );

  for (const { id, mesh } of countryBorderEntries) {
    mesh.visible = false;
    mesh.renderOrder = 3;

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
    CONFIG.globe.radius,
    borderThickness
  );

  for (const { id, mesh } of oceanBorderEntries) {
    mesh.visible = false;
    mesh.renderOrder = 3;

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

  scene.add(tiltGroup);

  return { globe, globeRaycastMesh, tiltGroup };
}
