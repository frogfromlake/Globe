import {
  AdditiveBlending,
  BackSide,
  Group,
  Mesh,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Texture,
  Vector2,
  Vector3,
} from "three";

import { CONFIG } from "@/configs/config";
import {
  atmosphereFragmentShader,
  atmosphereVertexShader,
} from "@/core/earth/shaders/earthShaders";
import { createCloudMaterial } from "@/core/earth/materials/cloudMaterial";
import { createStarMaterial } from "@/core/earth/materials/starMaterials";
import {
  createPrimeMeridianMarker,
  createSubsolarMarkerMesh,
} from "@/utils/debugMarkers";

/**
 * Enhances the scene with clouds, atmosphere, stars, aurora, and debug markers.
 */
export function enhanceSceneObjects(
  scene: Scene,
  uniforms: { [key: string]: any },
  tiltGroup: Group,
  esoSkyMapTexture: Texture
): {
  atmosphere: Mesh;
  cloudSphere: Mesh;
  starSphere: Mesh;
  auroraMesh: Mesh;
  subsolarMarker: Mesh;
} {
  // === Atmosphere ===
  const atmosphereGeometry = new SphereGeometry(
    CONFIG.globe.radius * 1.027,
    128,
    128
  );
  const atmosphereMaterial = new ShaderMaterial({
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    transparent: true,
    depthWrite: false,
    side: BackSide,
    blending: AdditiveBlending,
    uniforms: {
      uCameraDistance: { value: 5.0 },
      uLightDirection: { value: new Vector3(1, 0, 0) },
    },
  });
  const atmosphere = new Mesh(atmosphereGeometry, atmosphereMaterial);
  atmosphere.renderOrder = 0;
  scene.add(atmosphere);

  // === Cloud Layer ===
  const cloudGeometry = new SphereGeometry(
    CONFIG.globe.radius * 1.003,
    128,
    128
  );
  const cloudMaterial = createCloudMaterial();
  const cloudSphere = new Mesh(cloudGeometry, cloudMaterial);
  cloudSphere.renderOrder = 1.5;
  cloudSphere.visible = false;
  cloudSphere.frustumCulled = false;
  tiltGroup.add(cloudSphere);

  // === Star Sphere ===
  esoSkyMapTexture.offset.set(CONFIG.stars.offset.x, CONFIG.stars.offset.y);
  const starGeometry = new SphereGeometry(
    CONFIG.stars.radius,
    CONFIG.stars.widthSegments,
    CONFIG.stars.heightSegments
  );
  const starMaterial = createStarMaterial(esoSkyMapTexture, uniforms);
  const starSphere = new Mesh(starGeometry, starMaterial);
  starSphere.frustumCulled = false;
  starSphere.renderOrder = -1;
  scene.add(starSphere);

  // === Aurora Mesh ===
  // const auroraRadius = CONFIG.globe.radius * 1.015;
  // const auroraGeometry = new SphereGeometry(auroraRadius, 64, 64);
  // const auroraMaterial = createAuroraMaterial(
  //   new Vector2(window.innerWidth, window.innerHeight)
  // );
  // const auroraMesh = new Mesh(auroraGeometry, auroraMaterial);
  const auroraMesh = new Mesh();
  auroraMesh.frustumCulled = false;

  // === Debug Markers ===
  //   const primeMeridianMarker = createPrimeMeridianMarker();
  //   const subsolarMarker = createSubsolarMarkerMesh();
  //   tiltGroup.add(primeMeridianMarker);
  //   tiltGroup.add(subsolarMarker);
  const subsolarMarker = new Mesh();

  return {
    atmosphere,
    cloudSphere,
    starSphere,
    auroraMesh,
    subsolarMarker,
  };
}
