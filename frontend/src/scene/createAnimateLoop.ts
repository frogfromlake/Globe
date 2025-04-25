/**
 * @file createAnimateLoop.ts
 * @description Provides the animation loop for the 3D Earth scene. This includes handling camera movement, hover effects,
 * label updates, and selection fading based on user interactions (hover and click). Also manages dynamic adjustments to globe rotation,
 * atmosphere, and star background based on camera position and interaction states.
 */

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
  hideAll3DOceanLabels,
} from "../hoverLabel/oceanLabel3D";
import { oceanIdToIndex } from "../utils/oceanIdToIndex";
import { interactionState } from "../state/interactionState";
import { userHasMovedPointer } from "../interactions/pointerTracker";

/**
 * Parameters required to initialize the animation loop.
 * @interface AnimateParams
 */
interface AnimateParams {
  globe: Mesh;
  atmosphere: Mesh;
  starSphere: Mesh;
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
  updateKeyboard: (delta: number) => void;
  selectedCountryIds: Set<number>;
  selectedOceanIds: Set<number>;
}

/**
 * Creates and returns the animation loop that updates the scene, handles hover and selection, and controls dynamic properties
 * like the globe's rotation and camera adjustments.
 *
 * @param {AnimateParams} params - Parameters used for the animation loop.
 * @returns {Function} A function that repeatedly calls `animate` for rendering the scene and handling updates.
 */
export function createAnimateLoop({
  globe,
  atmosphere,
  starSphere,
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
  updateKeyboard,
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

  /**
   * Updates the selection texture based on the selected flags and fading values.
   * @param {Float32Array} fadeInArray - Array containing fade-in values for selections.
   * @param {Uint8Array} flagsArray - Array of flags indicating selected items.
   * @param {Uint8Array} dataArray - Array of data used for generating selection textures.
   * @param {DataTexture} texture - The texture that holds the selection data.
   * @param {number} delta - Time delta used for fading calculations.
   */
  function updateSelectionTexture(
    fadeInArray: Float32Array,
    flagsArray: Uint8Array,
    dataArray: Uint8Array,
    texture: DataTexture,
    delta: number
  ) {
    for (let i = 0; i < dataArray.length; i++) {
      const isSelected = flagsArray[i] === 1;
      fadeInArray[i] += delta * CONFIG.fade.selection * (isSelected ? 1 : -1);
      fadeInArray[i] = MathUtils.clamp(fadeInArray[i], 0, 1);
      dataArray[i] = Math.floor(
        fadeInArray[i] * CONFIG.selectionTexture.fadeMaxValue
      );
    }
    texture.needsUpdate = true;
  }

  /**
   * The main animation loop function that is called repeatedly to update the scene.
   * Handles camera movement, hover effects, fade-in/out, and selection updates.
   */
  return function animate(): void {
    requestAnimationFrame(animate);
    const now = performance.now();
    const delta = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    uniforms.uTime.value = now / 1000;
    uniforms.uTimeStars.value = uniforms.uTime.value;

    // Hover detection
    raycaster.setFromCamera(pointer, camera);
    const globeIntersection = raycaster.intersectObject(globe);
    if (globeIntersection.length > 0) {
      uniforms.cursorWorldPos.value.copy(
        globeIntersection[0].point.clone().normalize()
      );
      uniforms.uCursorOnGlobe.value = true;
    } else {
      uniforms.uCursorOnGlobe.value = false;
    }

    const atmosphereMaterial = atmosphere.material as ShaderMaterial;

    const distance = camera.position.distanceTo(controls.target);
    atmosphereMaterial.uniforms.uCameraDistance.value = distance;

    const normalized =
      (distance - CONFIG.zoom.min) / (CONFIG.zoom.max - CONFIG.zoom.min);

    controls.rotateSpeed = MathUtils.clamp(
      CONFIG.interaction.rotateSpeed.base +
        normalized * CONFIG.interaction.rotateSpeed.scale,
      CONFIG.interaction.rotateSpeed.min,
      CONFIG.interaction.rotateSpeed.max
    );

    controls.zoomSpeed = MathUtils.clamp(
      CONFIG.interaction.zoomSpeed.base +
        normalized * CONFIG.interaction.zoomSpeed.scale,
      CONFIG.interaction.zoomSpeed.min,
      CONFIG.interaction.zoomSpeed.max
    );

    uniforms.lightDirection.value.copy(getSunDirectionUTC());
    atmosphereMaterial.uniforms.uLightDirection.value.copy(
      uniforms.lightDirection.value
    );

    updateKeyboard(delta);
    controls.update();

    // Hover updates
    let newHoveredId = -1;
    type HoverResult = {
      id: number;
      position: Vector3 | null;
    };

    let countryResult: HoverResult = { id: -1, position: null };
    let oceanResult: HoverResult = { id: -1, position: null };

    if (userHasMovedPointer()) {
      if (interactionState.countryEnabled) {
        countryResult = updateHoveredCountry(
          raycaster,
          pointer,
          camera,
          globe,
          globe.material as ShaderMaterial
        );
      }
      if (interactionState.oceanEnabled) {
        oceanResult = updateHoveredOcean(raycaster, pointer, camera, globe);
      }
    }

    if (countryResult.id > 0) {
      newHoveredId = countryResult.id;
    } else if (oceanResult.id >= 10000) {
      newHoveredId = oceanResult.id;
    }

    if (newHoveredId !== currentHoveredId) {
      if (newHoveredId < 10000) {
        previousHoveredId = currentHoveredId;
        fadeOut = fadeIn;
        fadeIn = 0;
      } else {
        previousHoveredOceanId = currentHoveredOceanId;
        fadeOutOcean = fadeInOcean;
        fadeInOcean = 0;
      }

      currentHoveredId = newHoveredId;
      if (newHoveredId >= 10000) currentHoveredOceanId = newHoveredId;
    }

    // Fade updates
    if (currentHoveredId > 0 && currentHoveredId < 10000)
      fadeIn = Math.min(fadeIn + delta * CONFIG.fade.highlight, 1);
    if (fadeOut > 0)
      fadeOut = Math.max(fadeOut - delta * CONFIG.fade.highlight, 0);

    if (currentHoveredId >= 10000)
      fadeInOcean = Math.min(fadeInOcean + delta * CONFIG.fade.highlight, 1);
    if (
      previousHoveredOceanId >= 10000 &&
      previousHoveredOceanId !== currentHoveredOceanId
    ) {
      fadeOutOcean = Math.max(fadeOutOcean - delta * CONFIG.fade.highlight, 0);
    }

    // Label updates
    hideAll3DLabelsExcept(
      [...selectedCountryIds, currentHoveredId].filter(
        (id) => id > 0 && id < 10000
      )
    );
    hideAll3DOceanLabels();

    const rotationY = getEarthRotationAngle();

    if (currentHoveredId > 0 && currentHoveredId < 10000) {
      update3DLabel(currentHoveredId, rotationY, camera, fadeIn);
    } else if (currentHoveredId >= 10000) {
      const ocean = CONFIG.oceanHover.oceanCenters[currentHoveredId];
      if (ocean) {
        update3DOceanLabel(
          ocean.name,
          ocean.lat,
          ocean.lon,
          rotationY,
          camera,
          fadeInOcean
        );
      }
    }

    for (const id of selectedCountryIds) {
      if (id !== currentHoveredId) {
        update3DLabel(id, rotationY, camera, selectedFadeIn[id]);
      }
    }

    for (const id of selectedOceanIds) {
      if (id !== currentHoveredId) {
        const ocean = CONFIG.oceanHover.oceanCenters[id];
        if (ocean) {
          update3DOceanLabel(
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
  };
}
