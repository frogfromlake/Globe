import {
  Scene,
  SphereGeometry,
  ShaderMaterial,
  Mesh,
  MeshBasicMaterial,
  Vector3,
  RepeatWrapping,
  BackSide,
  AdditiveBlending,
  Texture,
  Group,
  Object3DEventMap,
} from "three";

import { CONFIG } from "../configs/config";
import { createStarMaterial } from "../materials/starMaterials";
import {
  atmosphereFragmentShader,
  atmosphereVertexShader,
  earthFragmentShader,
  earthVertexShader,
} from "../shaders/earthShaders";
import { createCloudMaterial } from "../materials/cloudMaterial";
import { createAuroraMaterial } from "../materials/auroraMaterial";
import { countryLabelGroup } from "../hoverLabel/countryLabels3D";
import { oceanLabelGroup } from "../hoverLabel/oceanLabel3D";

import {
  createPrimeMeridianMarker,
  createSubsolarMarkerMesh,
} from "../utils/debugMarkers";

/**
 * Initializes and adds the main 3D globe, its atmosphere layer, star background, and raycast helper.
 *
 * @param scene - The Three.js scene to which objects will be added.
 * @param uniforms - Uniforms shared between shaders and rendering pipeline.
 * @param esoSkyMapTexture - High-res star map texture for the star sphere background.
 * @returns An object containing created globe, atmosphere, star sphere, and raycast helper mesh.
 */
export function setupSceneObjects(
  scene: Scene,
  uniforms: { [key: string]: any },
  esoSkyMapTexture: Texture
): {
  globe: Mesh;
  cloudSphere: Mesh;
  atmosphere: Mesh;
  auroraMesh: Mesh;
  starSphere: Mesh;
  globeRaycastMesh: Mesh;
  tiltGroup: Group<Object3DEventMap>;
  subsolarMarker: Mesh;
} {
  // === Globe (Earth) ===
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
  scene.add(globe);

  // === Cloud Layer ===
  const cloudRadius = CONFIG.globe.radius * 1.003;
  const cloudGeometry = new SphereGeometry(cloudRadius, 128, 128);

  // Pass no texture yet — will be set after loading in startApp
  const cloudMaterial = createCloudMaterial();

  const cloudSphere = new Mesh(cloudGeometry, cloudMaterial);
  cloudSphere.renderOrder = 1.5;
  cloudSphere.visible = false;

  // === Atmosphere ===
  const atmosphereRadius = CONFIG.globe.radius * 1.027;
  const atmosphereGeometry = new SphereGeometry(atmosphereRadius, 128, 128);
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
  scene.add(atmosphere);

  // === Aurora Mesh ===
  // const auroraRadius = CONFIG.globe.radius * 1.015;
  // const auroraGeometry = new SphereGeometry(auroraRadius, 64, 64);
  // const auroraMaterial = createAuroraMaterial(
  //   new Vector2(window.innerWidth, window.innerHeight)
  // );
  // const auroraMesh = new Mesh(auroraGeometry, auroraMaterial);
  const auroraMesh = new Mesh();

  // === Star Sphere ===
  esoSkyMapTexture.wrapS = RepeatWrapping;
  esoSkyMapTexture.wrapT = RepeatWrapping;
  esoSkyMapTexture.offset.set(CONFIG.stars.offset.x, CONFIG.stars.offset.y);

  const starSphereGeometry = new SphereGeometry(
    CONFIG.stars.radius,
    CONFIG.stars.widthSegments,
    CONFIG.stars.heightSegments
  );

  const starMaterial = createStarMaterial(esoSkyMapTexture, uniforms);
  const starSphere = new Mesh(starSphereGeometry, starMaterial);
  starSphere.renderOrder = -1;
  atmosphere.renderOrder = 0;
  globe.renderOrder = 1;
  scene.add(starSphere);

  // === Invisible Raycast Globe ===
  const globeRaycastGeometry = new SphereGeometry(
    CONFIG.globe.radius,
    32, // Fewer segments
    32
  );

  const globeRaycastMesh = new Mesh(
    globeRaycastGeometry,
    new MeshBasicMaterial({ visible: false })
  );
  scene.add(globeRaycastMesh);

  const tiltGroup = new Group();
  tiltGroup.add(globe);
  tiltGroup.add(globeRaycastMesh);
  tiltGroup.add(countryLabelGroup);
  tiltGroup.add(oceanLabelGroup);
  tiltGroup.add(cloudSphere);

  // DEBUG MARKERS#
  const primeMeridianMarker = createPrimeMeridianMarker();
  tiltGroup.add(primeMeridianMarker);
  const subsolarMarker = createSubsolarMarkerMesh();
  tiltGroup.add(subsolarMarker);

  scene.add(tiltGroup);

  return {
    globe,
    cloudSphere,
    atmosphere,
    auroraMesh,
    starSphere,
    globeRaycastMesh,
    tiltGroup,
    subsolarMarker,
  };
}
