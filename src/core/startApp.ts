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

export async function startApp() {
  const selectedCountryIds = new Set<number>();
  const selectedOceanIds = new Set<number>();
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
      console.log("Clicked ocean ID:", clickedOceanId);

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

  let fadeIn = 0,
    fadeOut = 0;
  let currentHoveredId = -1,
    previousHoveredId = -1;

  let lastFrameTime = performance.now();

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
      previousHoveredId = currentHoveredId;
      fadeOut = fadeIn;
      fadeIn = 0;
      currentHoveredId = newHoveredId;
    }

    if (currentHoveredId > 0)
      fadeIn = Math.min(fadeIn + delta * CONFIG.fade.highlight, 1);
    if (fadeOut > 0)
      fadeOut = Math.max(fadeOut - delta * CONFIG.fade.highlight, 0);

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
      update3DLabel(currentHoveredId, rotationY, cameraDist);
    } else if (currentHoveredId >= 10000) {
      const ocean = CONFIG.oceanHover.oceanCenters[currentHoveredId];
      if (ocean) {
        update3DOceanLabel(
          ocean.name,
          ocean.lat,
          ocean.lon,
          rotationY,
          cameraDist
        );
      }
    }

    for (const selectedId of selectedCountryIds) {
      if (selectedId !== currentHoveredId) {
        update3DLabel(selectedId, rotationY, cameraDist);
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
            cameraDist
          );
        }
      }
    }

    // === Country selection texture update ===
    for (let i = 0; i < selectedData.length; i++) {
      const isSelected = selectedFlags[i] === 1;
      selectedFadeIn[i] +=
        delta * CONFIG.fade.selection * (isSelected ? 1 : -1);
      selectedFadeIn[i] = THREE.MathUtils.clamp(selectedFadeIn[i], 0, 1);
    }

    const texData = (uniforms.selectedMask.value as THREE.DataTexture).image
      .data as Uint8Array;
    for (let i = 0; i < texData.length; i++) {
      texData[i] = Math.floor(
        selectedFadeIn[i] * CONFIG.selectionTexture.fadeMaxValue
      );
    }
    (uniforms.selectedMask.value as THREE.DataTexture).needsUpdate = true;

    // === Ocean selection texture update ===
    for (let i = 0; i < selectedOceanData.length; i++) {
      const isSelected = selectedOceanFlags[i] === 1;
      selectedOceanFadeIn[i] +=
        delta * CONFIG.fade.selection * (isSelected ? 1 : -1);
      selectedOceanFadeIn[i] = THREE.MathUtils.clamp(
        selectedOceanFadeIn[i],
        0,
        1
      );
    }

    for (let i = 0; i < selectedOceanData.length; i++) {
      selectedOceanData[i] = Math.floor(
        selectedOceanFadeIn[i] * CONFIG.selectionTexture.fadeMaxValue
      );
    }
    (uniforms.selectedOceanMask.value as THREE.DataTexture).needsUpdate = true;

    // === Uniforms ===
    uniforms.hoveredCountryId.value =
      currentHoveredId < 10000 ? currentHoveredId : 0;
    uniforms.hoveredOceanId.value =
      currentHoveredId >= 10000 ? currentHoveredId : 0;
    uniforms.previousHoveredId.value = previousHoveredId;
    uniforms.highlightFadeIn.value = fadeIn;
    uniforms.highlightFadeOut.value = fadeOut;
    uniforms.cameraDirection.value.copy(camera.position).normalize();

    globe.rotation.y = rotationY;
    renderer.render(scene, camera);
  }

  animate();
}
