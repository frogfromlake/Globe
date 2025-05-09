import {
  Mesh,
  ShaderMaterial,
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Raycaster,
  Vector2,
  Vector3,
  DataTexture,
  Group,
  Object3DEventMap,
} from "three";

import { appState } from "@/state/appState";
import { userHasMovedPointer } from "@/core/earth/controls/pointerTracker";
import { updateAurora } from "./loopParts/updateAurora";
import { updateCloudsAndLightning } from "./loopParts/updateCloudsAndLightning";
import { updateSolarLighting } from "./loopParts/updateSolarLighting";
import { updatePointerRaycast } from "./loopParts/updatePointerRaycast";
import { updateCameraControls } from "./loopParts/updateCameraControls";
import { updateHoveredEntities } from "./loopParts/updateHoveredEntities";
import {
  hideAllCountryBorders,
  hideAllOceanBorders,
  updateCountryBorderVisibility,
  updateOceanBorderVisibility,
} from "./loopParts/updateBorderVisibility";
import { update3DLabels } from "./loopParts/update3DLabels";
import { updateSelectionTextures } from "./loopParts/updateSelectionTextures";
import { updateUniforms } from "./loopParts/updateUniforms";
import { resetHighlightUniforms } from "./loopParts/resetHighlightUniforms";
import { hideAll3DLabels } from "../earth/interactivity/countryLabels3D";
import { hideAll3DOceanLabels } from "../earth/interactivity/oceanLabel3D";

interface AnimateParams {
  globe: Mesh;
  cloudSphere: Mesh;
  atmosphere: Mesh;
  auroraMesh: Mesh;
  starSphere: Mesh;
  globeRaycastMesh: Mesh;
  tiltGroup: Group<Object3DEventMap>;
  uniforms: { [key: string]: any };
  camera: PerspectiveCamera;
  controls: any;
  renderer: WebGLRenderer;
  scene: Scene;
  raycaster: Raycaster;
  pointer: Vector2;
  selectedFlags: Uint8Array;
  selectedOceanFlags: Uint8Array;
  selectedFadeIn: Float32Array;
  selectedOceanFadeIn: Float32Array;
  selectedData: Uint8Array;
  selectedOceanData: Uint8Array;
  getBackgroundMode: () => boolean;
  updateKeyboardRef: { fn: (delta: number) => void };
  selectedCountryIds: Set<number>;
  selectedOceanIds: Set<number>;
  subsolarMarker: Mesh;
}

export function createAnimateLoop({
  globe,
  cloudSphere,
  atmosphere,
  auroraMesh,
  starSphere,
  globeRaycastMesh,
  tiltGroup,
  uniforms,
  camera,
  controls,
  renderer,
  scene,
  raycaster,
  pointer,
  selectedFlags,
  selectedOceanFlags,
  selectedFadeIn,
  selectedOceanFadeIn,
  selectedData,
  selectedOceanData,
  getBackgroundMode,
  updateKeyboardRef,
  selectedCountryIds,
  selectedOceanIds,
  subsolarMarker,
  hoverReadyRef,
}: AnimateParams & { hoverReadyRef: { current: boolean } }): () => void {
  let lastFrameTime = performance.now();
  let lastRaycastTime = 0;
  const raycastInterval = 100;
  let currentUV: Vector2 | null = null;
  let flashlightWorldPos: Vector3 | null = null;

  const atmosphereMaterial = atmosphere.material as ShaderMaterial;
  resetHighlightUniforms(uniforms);
  let firstRender = true;

  function animate(): void {
    if (firstRender) {
      performance.mark("first-frame-rendered");
      firstRender = false;
    }

    const now = performance.now();
    const delta = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    const nowInSeconds = now / 1000;

    appState.simulation.time = Date.now();

    updateAurora(auroraMesh, uniforms.lightDirection.value, nowInSeconds);

    const targetRotation = updateSolarLighting(
      uniforms,
      nowInSeconds,
      delta,
      appState.simulation,
      subsolarMarker,
      tiltGroup
    );

    updateCloudsAndLightning(
      cloudSphere,
      uniforms,
      now,
      delta,
      appState.driftState
    );

    const pointerActive = userHasMovedPointer();
    const {
      currentUV: newUV,
      updatedLastRaycastTime,
      flashlightWorldPos: newFlashlightPos,
      uvUpdated,
    } = updatePointerRaycast(
      raycaster,
      pointer,
      camera,
      globeRaycastMesh,
      uniforms,
      now,
      lastRaycastTime,
      raycastInterval,
      pointerActive,
      targetRotation
    );

    // Reset hover state when pointer leaves the globe
    const pointerOnGlobe = uniforms.uCursorOnGlobe.value === true;

    if (!pointerOnGlobe) {
      hideAll3DLabels();
      hideAll3DOceanLabels();
      hideAllCountryBorders();
      hideAllOceanBorders();
      resetHighlightUniforms(uniforms);
      appState.hoverIdState = {
        currentHoveredId: -1,
        previousHoveredId: -1,
        fadeIn: 0,
        fadeOut: 0,
        currentHoveredOceanId: -1,
        previousHoveredOceanId: -1,
        fadeInOcean: 0,
        fadeOutOcean: 0,
      };
    } else {
      // Only update labels if cursor is on globe
      update3DLabels(
        camera,
        appState.hoverIdState,
        selectedCountryIds,
        selectedOceanIds,
        selectedOceanFadeIn,
        delta
      );
      updateCountryBorderVisibility(selectedCountryIds, appState.hoverIdState);
      updateOceanBorderVisibility(selectedOceanIds, appState.hoverIdState);
    }

    lastRaycastTime = updatedLastRaycastTime;
    flashlightWorldPos = newFlashlightPos;
    if (uvUpdated && newUV) {
      currentUV = newUV;
    }

    updateCameraControls(camera, controls, atmosphereMaterial, uniforms);
    updateKeyboardRef.fn(delta);
    controls.update();

    appState.hoverIdState = updateHoveredEntities(
      currentUV,
      globe.material as ShaderMaterial,
      hoverReadyRef.current && userHasMovedPointer(),
      appState.hoverIdState,
      delta,
      uniforms
    );

    appState.lastSelectedCountryIds = new Set(selectedCountryIds);
    appState.lastHoveredCountryId = appState.hoverIdState.currentHoveredId;
    appState.lastPreviousHoveredId = appState.hoverIdState.previousHoveredId;

    updateSelectionTextures(
      selectedFadeIn,
      selectedFlags,
      selectedData,
      uniforms.selectedMask.value as DataTexture,
      selectedOceanFadeIn,
      selectedOceanFlags,
      selectedOceanData,
      uniforms.selectedOceanMask.value as DataTexture,
      delta
    );

    updateUniforms(uniforms, hoverReadyRef.current, appState.hoverIdState);
    uniforms.cameraDirection.value.copy(camera.position).normalize();

    if (getBackgroundMode()) {
      starSphere.quaternion.copy(camera.quaternion);
      starSphere.position.copy(camera.position);
    } else {
      starSphere.quaternion.identity();
      starSphere.position.set(0, 0, 0);
    }

    renderer.render(scene, camera);
  }

  return animate;
}
