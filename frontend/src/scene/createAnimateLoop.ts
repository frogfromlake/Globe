import {
  Mesh,
  ShaderMaterial,
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Raycaster,
  Vector2,
  Vector3,
  MathUtils,
  DataTexture,
  Intersection,
} from "three";

import { CONFIG } from "../configs/config";
import { getEarthRotationAngle, getSunDirectionUTC } from "../globe/geo";
import { updateHoveredCountry } from "../hoverLabel/countryHover";
import { updateHoveredOcean } from "../hoverLabel/oceanHover";
import {
  update3DLabel,
  hideAll3DLabelsExcept,
} from "../hoverLabel/countryLabels3D";
import {
  update3DOceanLabel,
  hideAll3DOceanLabelsExcept,
} from "../hoverLabel/oceanLabel3D";
import { oceanIdToIndex } from "../utils/oceanIdToIndex";
import { interactionState } from "../state/interactionState";
import { userHasMovedPointer } from "../interactions/pointerTracker";

interface AnimateParams {
  globe: Mesh;
  atmosphere: Mesh;
  starSphere: Mesh;
  globeRaycastMesh: Mesh;
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
}

export function createAnimateLoop({
  globe,
  atmosphere,
  starSphere,
  globeRaycastMesh,
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
}: AnimateParams): () => void {
  let fadeIn = 0,
    fadeOut = 0;
  let fadeInOcean = 0,
    fadeOutOcean = 0;
  let currentHoveredId = -1,
    previousHoveredId = -1;
  let currentHoveredOceanId = -1,
    previousHoveredOceanId = -1;
  let lastFrameTime = performance.now();

  let lastRaycastTime = 0;
  const raycastInterval = 100; // Milliseconds between raycasts
  let currentUV: Vector2 | null = null;

  const atmosphereMaterial = atmosphere.material as ShaderMaterial;
  const zoomRange = CONFIG.zoom.max - CONFIG.zoom.min;

  function updateSelectionTexture(
    fadeInArray: Float32Array,
    flagsArray: Uint8Array,
    dataArray: Uint8Array,
    texture: DataTexture,
    delta: number
  ) {
    for (let i = 0, len = dataArray.length; i < len; i++) {
      const isSelected = flagsArray[i] === 1;
      fadeInArray[i] += delta * CONFIG.fade.selection * (isSelected ? 1 : -1);
      fadeInArray[i] = MathUtils.clamp(fadeInArray[i], 0, 1);
      dataArray[i] = Math.floor(
        fadeInArray[i] * CONFIG.selectionTexture.fadeMaxValue
      );
    }
    texture.needsUpdate = true;
  }

  function animate(): void {
    requestAnimationFrame(animate);

    const now = performance.now();
    const delta = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    uniforms.uTime.value = now / 1000;
    uniforms.uTimeStars.value = uniforms.uTime.value;

    let globeIntersection: Vector3 | null = null;
    let globeHit: Intersection | null = null;

    // Only raycast every 'raycastInterval' ms
    if (userHasMovedPointer() && now - lastRaycastTime > raycastInterval) {
      lastRaycastTime = now;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(globeRaycastMesh);
      if (hits.length > 0) {
        const hitPoint = hits[0].point.clone().normalize();
        globeHit = hits[0];
        globeIntersection = hitPoint;

        const longitude = Math.atan2(hitPoint.z, hitPoint.x);
        const latitude = Math.asin(hitPoint.y);

        const u = MathUtils.euclideanModulo(
          0.5 - longitude / (2.0 * Math.PI) + 0.125,
          1.0
        );
        const v = MathUtils.clamp(0.5 + latitude / Math.PI, 0, 1);

        currentUV = new Vector2(u, v);
      } else {
        globeHit = null;
        globeIntersection = null;
        currentUV = null;
      }
    }

    uniforms.uCursorOnGlobe.value = globeIntersection !== null;
    if (globeIntersection) {
      uniforms.cursorWorldPos.value.copy(globeIntersection);
    }

    // Atmosphere + Rotation Speed Updates
    const distance = camera.position.distanceTo(controls.target);
    const normalizedZoom = (distance - CONFIG.zoom.min) / zoomRange;

    controls.rotateSpeed = MathUtils.clamp(
      CONFIG.interaction.rotateSpeed.base +
        normalizedZoom * CONFIG.interaction.rotateSpeed.scale,
      CONFIG.interaction.rotateSpeed.min,
      CONFIG.interaction.rotateSpeed.max
    );

    controls.zoomSpeed = MathUtils.clamp(
      CONFIG.interaction.zoomSpeed.base +
        normalizedZoom * CONFIG.interaction.zoomSpeed.scale,
      CONFIG.interaction.zoomSpeed.min,
      CONFIG.interaction.zoomSpeed.max
    );

    atmosphereMaterial.uniforms.uCameraDistance.value = distance;
    uniforms.lightDirection.value.copy(getSunDirectionUTC());
    atmosphereMaterial.uniforms.uLightDirection.value.copy(
      uniforms.lightDirection.value
    );

    updateKeyboardRef.fn(delta);
    controls.update();

    // Country / Ocean Hover Updates
    let newHoveredId = -1;
    if (userHasMovedPointer() && currentUV) {
      type HoverResult = { id: number; position: Vector3 | null };
      let countryResult: HoverResult = { id: -1, position: null };
      let oceanResult: HoverResult = { id: -1, position: null };

      if (currentUV) {
        if (interactionState.countryEnabled) {
          countryResult = updateHoveredCountry(
            currentUV,
            globe.material as ShaderMaterial
          );
        }
        if (interactionState.oceanEnabled) {
          oceanResult = updateHoveredOcean(currentUV);
        }
      }

      if (countryResult.id > 0) {
        newHoveredId = countryResult.id;
        currentHoveredOceanId = -1;
      } else if (oceanResult.id >= 10000) {
        newHoveredId = oceanResult.id;
        currentHoveredOceanId = oceanResult.id;
      } else {
        newHoveredId = -1;
        currentHoveredOceanId = -1;
      }
    }

    // --- Hover State Transitions ---
    if (newHoveredId !== currentHoveredId) {
      if (currentHoveredId > 0 && currentHoveredId < 10000) {
        previousHoveredId = currentHoveredId;
        fadeOut = fadeIn;
        fadeIn = 0;
        previousHoveredOceanId = 0;
        fadeOutOcean = 0;
      } else if (currentHoveredId >= 10000) {
        previousHoveredOceanId = currentHoveredId;
        fadeOutOcean = fadeInOcean;
        fadeInOcean = 0;
        previousHoveredId = 0;
        fadeOut = 0;
      }
      currentHoveredId = newHoveredId;

      uniforms.hoveredCountryId.value =
        currentHoveredId > 0 && currentHoveredId < 10000 ? currentHoveredId : 0;
      uniforms.hoveredOceanId.value =
        currentHoveredId >= 10000 ? currentHoveredId : 0;
    }

    // Fade Logic
    if (currentHoveredId > 0 && currentHoveredId < 10000) {
      fadeIn = Math.min(fadeIn + delta * CONFIG.fade.highlight, 1);
    }
    if (fadeOut > 0) {
      fadeOut = Math.max(fadeOut - delta * CONFIG.fade.highlight, 0);
    }
    if (currentHoveredId >= 10000) {
      fadeInOcean = Math.min(fadeInOcean + delta * CONFIG.fade.highlight, 1);
    }
    if (
      previousHoveredOceanId >= 10000 &&
      previousHoveredOceanId !== currentHoveredOceanId
    ) {
      fadeOutOcean = Math.max(fadeOutOcean - delta * CONFIG.fade.highlight, 0);
    }

    // Label Updates
    hideAll3DLabelsExcept(
      [...selectedCountryIds, currentHoveredId].filter(
        (id) => id > 0 && id < 10000
      )
    );
    hideAll3DOceanLabelsExcept(
      [...selectedOceanIds, currentHoveredId].filter((id) => id >= 10000)
    );

    const rotationY = getEarthRotationAngle();

    if (
      currentHoveredId > 0 &&
      currentHoveredId < 10000 &&
      !selectedCountryIds.has(currentHoveredId)
    ) {
      update3DLabel(currentHoveredId, rotationY, camera, fadeIn);
    } else if (
      currentHoveredId >= 10000 &&
      !selectedOceanIds.has(currentHoveredId)
    ) {
      const ocean = CONFIG.oceanHover.oceanCenters[currentHoveredId];
      if (ocean) {
        update3DOceanLabel(
          currentHoveredId,
          ocean.name,
          ocean.lat,
          ocean.lon,
          rotationY,
          camera,
          fadeInOcean
        );
      }
    }

    for (const id of selectedOceanIds) {
      if (id !== currentHoveredId) {
        const ocean = CONFIG.oceanHover.oceanCenters[id];
        if (ocean) {
          update3DOceanLabel(
            id,
            ocean.name,
            ocean.lat,
            ocean.lon,
            rotationY,
            camera,
            selectedOceanFadeIn[oceanIdToIndex[id]]
          );
        }
      }
    }

    updateSelectionTexture(
      selectedFadeIn,
      selectedFlags,
      selectedData,
      uniforms.selectedMask.value as DataTexture,
      delta
    );
    updateSelectionTexture(
      selectedOceanFadeIn,
      selectedOceanFlags,
      selectedOceanData,
      uniforms.selectedOceanMask.value as DataTexture,
      delta
    );

    uniforms.hoveredCountryId.value =
      currentHoveredId < 10000 ? currentHoveredId : 0;
    uniforms.hoveredOceanId.value =
      currentHoveredId >= 10000 ? currentHoveredId : 0;
    uniforms.previousHoveredId.value = previousHoveredId;
    uniforms.previousHoveredOceanId.value = previousHoveredOceanId;
    uniforms.highlightFadeIn.value =
      currentHoveredId >= 10000 ? fadeInOcean : fadeIn;
    uniforms.highlightFadeOut.value =
      currentHoveredId >= 10000 ? fadeOutOcean : fadeOut;
    uniforms.cameraDirection.value.copy(camera.position).normalize();

    globe.rotation.y = rotationY;

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
