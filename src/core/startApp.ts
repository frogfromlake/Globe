import * as THREE from "three";
import { setupGlobeInteractions } from "../interactions/setupGlobeInteractions";
import { setupUserLocation } from "../interactions/showUserLocation";
import { getEarthRotationAngle, getSunDirectionUTC } from "../utils/geo";
import {
  loadCountryIdMapTexture,
  updateHoveredCountry,
  getCountryIdAtUV,
} from "../systems/countryHover";
import {
  init3DLabels,
  update3DLabel,
  hideAll3DLabelsExcept,
} from "../systems/countryLabels3D";
import { CONFIG } from "../configs/config";
import { initializeCamera } from "../init/initializeCamera";
import { initializeRenderer } from "../init/initializeRenderer";
import { initializeTextures } from "../init/initializeTextures";
import { initializeUniforms } from "../init/initializeUniforms";
import { initializeScene } from "../init/initializeScene";
import {
  earthFragmentShader,
  earthVertexShader,
} from "../shaders/earthShaders";
import {
  getOceanIdAtUV,
  loadOceanIdMapTexture,
  updateHoveredOcean,
} from "../systems/oceanHover";
import {
  hideAll3DOceanLabels,
  init3DOceanLabels,
  update3DOceanLabel,
} from "../systems/oceanLabel3D";
import { oceanIdToIndex } from "../data/oceanIdToIndex";
import { clearAllSelections } from "../interactions/clearSelections";

export const selectedCountryIds = new Set<number>();
export const selectedOceanIds = new Set<number>();

export async function startApp() {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const camera = initializeCamera();
  const renderer = initializeRenderer(camera);
  const { scene, controls } = initializeScene(camera, renderer);
  const { dayTexture, nightTexture, countryIdMapTexture, oceanIdMapTexture } =
    initializeTextures(renderer);
  const {
    uniforms,
    selectedData,
    selectedFadeIn,
    selectedFlags,
    selectedOceanData,
    selectedOceanFadeIn,
    selectedOceanFlags,
  } = initializeUniforms(
    dayTexture,
    nightTexture,
    countryIdMapTexture,
    oceanIdMapTexture
  );

  await loadCountryIdMapTexture();
  await loadOceanIdMapTexture();
  init3DLabels(scene);
  init3DOceanLabels(scene);

  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(
      CONFIG.globe.radius,
      CONFIG.globe.widthSegments,
      CONFIG.globe.heightSegments
    ),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: earthVertexShader,
      fragmentShader: earthFragmentShader,
    })
  );
  scene.add(globe);

  setupGlobeInteractions(renderer, globe, raycaster, pointer, camera, {
    onHover: (hit) => {
      uniforms.cursorWorldPos.value.copy(hit.point.clone().normalize());
    },
    onClick: (hit) => {
      if (!hit.uv) return;

      const clickedCountryId = getCountryIdAtUV(hit.uv);
      const clickedOceanId = getOceanIdAtUV(hit.uv);

      // Handle country selection
      if (clickedCountryId > 0 && clickedCountryId < selectedFlags.length) {
        if (selectedCountryIds.has(clickedCountryId)) {
          selectedCountryIds.delete(clickedCountryId);
          selectedFlags[clickedCountryId] = 0;
        } else {
          selectedCountryIds.add(clickedCountryId);
          selectedFlags[clickedCountryId] = 1;
        }
      }

      // Handle ocean selection
      const oceanIndex = oceanIdToIndex[clickedOceanId];
      if (oceanIndex === undefined) return;

      if (selectedOceanIds.has(clickedOceanId)) {
        selectedOceanIds.delete(clickedOceanId);
        selectedOceanFlags[oceanIndex] = 0;
      } else {
        selectedOceanIds.add(clickedOceanId);
        selectedOceanFlags[oceanIndex] = 1;
      }
    },
  });

  setupUserLocation(scene, globe);
  clearAllSelections(selectedFlags, selectedOceanFlags);

  let fadeIn = 0,
    fadeOut = 0;
  let fadeInOcean = 0,
    fadeOutOcean = 0;

  let currentHoveredId = -1,
    previousHoveredId = -1;
  let currentHoveredOceanId = -1,
    previousHoveredOceanId = -1;

  let lastFrameTime = performance.now();

  function updateSelectionTexture(
    fadeInArray: Float32Array,
    flagsArray: Uint8Array,
    dataArray: Uint8Array,
    texture: THREE.DataTexture,
    delta: number
  ) {
    for (let i = 0; i < dataArray.length; i++) {
      const isSelected = flagsArray[i] === 1;
      fadeInArray[i] += delta * CONFIG.fade.selection * (isSelected ? 1 : -1);
      fadeInArray[i] = THREE.MathUtils.clamp(fadeInArray[i], 0, 1);
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

    const distance = camera.position.distanceTo(controls.target);
    const normalized =
      (distance - CONFIG.zoom.min) / (CONFIG.zoom.max - CONFIG.zoom.min);

    controls.rotateSpeed = THREE.MathUtils.clamp(
      CONFIG.interaction.rotateSpeed.base +
        normalized * CONFIG.interaction.rotateSpeed.scale,
      CONFIG.interaction.rotateSpeed.min,
      CONFIG.interaction.rotateSpeed.max
    );

    controls.zoomSpeed = THREE.MathUtils.clamp(
      CONFIG.interaction.zoomSpeed.base +
        normalized * CONFIG.interaction.zoomSpeed.scale,
      CONFIG.interaction.zoomSpeed.min,
      CONFIG.interaction.zoomSpeed.max
    );

    uniforms.lightDirection.value.copy(getSunDirectionUTC());
    controls.update();

    // === Hover detection ===
    const countryResult = updateHoveredCountry(
      raycaster,
      pointer,
      camera,
      globe,
      globe.material
    );
    const oceanResult = updateHoveredOcean(raycaster, pointer, camera, globe);

    let newHoveredId = -1;
    let newHoverPosition: THREE.Vector3 | null = null;

    if (countryResult.id > 0) {
      newHoveredId = countryResult.id;
      newHoverPosition = countryResult.position;
    } else if (oceanResult.id >= 10000) {
      newHoveredId = oceanResult.id;
      newHoverPosition = oceanResult.position;
    }

    if (newHoveredId !== currentHoveredId) {
      if (newHoveredId < 10000) {
        // Country hover changed
        previousHoveredId = currentHoveredId;
        fadeOut = fadeIn;
        fadeIn = 0;
      } else {
        // Ocean hover changed
        previousHoveredOceanId = currentHoveredOceanId;
        fadeOutOcean = fadeInOcean;
        fadeInOcean = 0;
      }

      currentHoveredId = newHoveredId;

      if (newHoveredId >= 10000) {
        currentHoveredOceanId = newHoveredId;
      }
    }

    // Country fade
    if (currentHoveredId > 0 && currentHoveredId < 10000)
      fadeIn = Math.min(fadeIn + delta * CONFIG.fade.highlight, 1);
    if (fadeOut > 0)
      fadeOut = Math.max(fadeOut - delta * CONFIG.fade.highlight, 0);

    // Ocean fade
    if (currentHoveredId >= 10000) {
      fadeInOcean = Math.min(fadeInOcean + delta * CONFIG.fade.highlight, 1);
    }
    if (
      previousHoveredOceanId >= 10000 &&
      previousHoveredOceanId !== currentHoveredOceanId
    ) {
      fadeOutOcean = Math.max(fadeOutOcean - delta * CONFIG.fade.highlight, 0);
    }

    hideAll3DLabelsExcept(
      [...selectedCountryIds, currentHoveredId].filter(
        (id) => id > 0 && id < 10000
      )
    );
    hideAll3DOceanLabels();

    const rotationY = getEarthRotationAngle();
    const cameraDist = camera.position.length();

    // === Label display ===
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

    for (const selectedId of selectedCountryIds) {
      if (selectedId !== currentHoveredId) {
        update3DLabel(
          selectedId,
          rotationY,
          camera,
          selectedFadeIn[selectedId]
        );
      }
    }

    for (const selectedOceanId of selectedOceanIds) {
      if (selectedOceanId !== currentHoveredId) {
        const ocean = CONFIG.oceanHover.oceanCenters[selectedOceanId];
        if (ocean) {
          update3DOceanLabel(
            ocean.name,
            ocean.lat,
            ocean.lon,
            rotationY,
            camera,
            selectedOceanFadeIn[oceanIdToIndex[selectedOceanId]]
          );
        }
      }
    }

    // === Country selection texture update ===
    updateSelectionTexture(
      selectedFadeIn,
      selectedFlags,
      selectedData,
      uniforms.selectedMask.value as THREE.DataTexture,
      delta
    );

    // === Ocean selection texture update ===
    updateSelectionTexture(
      selectedOceanFadeIn,
      selectedOceanFlags,
      selectedOceanData,
      uniforms.selectedOceanMask.value as THREE.DataTexture,
      delta
    );

    // === Uniforms ===
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
    renderer.render(scene, camera);
  }

  animate();
}
