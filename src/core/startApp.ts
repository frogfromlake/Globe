// startApp.ts
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

export async function startApp() {
  const selectedCountryIds = new Set<number>();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const camera = initializeCamera();
  const renderer = initializeRenderer(camera);
  const { scene, controls } = initializeScene(camera, renderer);
  const { dayTexture, nightTexture, countryIdMapTexture } =
    initializeTextures(renderer);
  const { uniforms, selectedData, selectedFadeIn, selectedFlags } =
    initializeUniforms(dayTexture, nightTexture, countryIdMapTexture);

  await loadCountryIdMapTexture();
  init3DLabels(scene);

  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(1, 128, 128),
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
      const clickedId = getCountryIdAtUV(hit.uv);
      if (clickedId <= 0 || clickedId >= selectedFlags.length) return;

      if (selectedCountryIds.has(clickedId)) {
        selectedCountryIds.delete(clickedId);
        selectedFlags[clickedId] = 0;
      } else {
        selectedCountryIds.add(clickedId);
        selectedFlags[clickedId] = 1;
      }
    },
  });

  setupUserLocation(scene, globe);

  let fadeIn = 0,
    fadeOut = 0;
  let currentHoveredId = -1,
    previousHoveredId = -1;
  const highlightFadeSpeed = 2.5;
  const selectionFadeSpeed = 3.5;
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
      0.1 + normalized * 3.0,
      0.1,
      5.0
    );
    controls.zoomSpeed = THREE.MathUtils.clamp(
      0.1 + normalized * 4.0,
      0.1,
      6.0
    );

    uniforms.lightDirection.value.copy(getSunDirectionUTC());
    controls.update();

    const newId = updateHoveredCountry(
      raycaster,
      pointer,
      camera,
      globe,
      globe.material
    );

    if (newId !== currentHoveredId) {
      previousHoveredId = currentHoveredId;
      fadeOut = fadeIn;
      fadeIn = 0;
      currentHoveredId = typeof newId === "number" ? newId : newId.id;
    }

    if (currentHoveredId > 0)
      fadeIn = Math.min(fadeIn + delta * highlightFadeSpeed, 1);
    if (fadeOut > 0)
      fadeOut = Math.max(fadeOut - delta * highlightFadeSpeed, 0);

    hideAll3DLabelsExcept(
      [...selectedCountryIds, currentHoveredId].filter((id) => id > 0)
    );

    const rotationY = getEarthRotationAngle();
    const cameraDist = camera.position.length();

    if (currentHoveredId > 0)
      update3DLabel(currentHoveredId, rotationY, cameraDist);
    for (const selectedId of selectedCountryIds) {
      if (selectedId !== currentHoveredId)
        update3DLabel(selectedId, rotationY, cameraDist);
    }

    for (let i = 0; i < selectedData.length; i++) {
      const isSelected = selectedFlags[i] === 1;
      selectedFadeIn[i] += delta * selectionFadeSpeed * (isSelected ? 1 : -1);
      selectedFadeIn[i] = THREE.MathUtils.clamp(selectedFadeIn[i], 0, 1);
    }

    const texData = (uniforms.selectedMask.value as THREE.DataTexture).image
      .data as Uint8Array;
    for (let i = 0; i < texData.length; i++) {
      texData[i] = Math.floor(selectedFadeIn[i] * 255);
    }
    (uniforms.selectedMask.value as THREE.DataTexture).needsUpdate = true;

    uniforms.hoveredCountryId.value = currentHoveredId;
    uniforms.previousHoveredId.value = previousHoveredId;
    uniforms.highlightFadeIn.value = fadeIn;
    uniforms.highlightFadeOut.value = fadeOut;
    uniforms.cameraDirection.value.copy(camera.position).normalize();

    globe.rotation.y = getEarthRotationAngle();
    renderer.render(scene, camera);
  }

  animate();
}
