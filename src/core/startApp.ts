import * as THREE from "three";
import { setupGlobeInteractions } from "../interactions/setupGlobeInteractions";
import { setupUserLocation } from "../interactions/showUserLocation";
import {
  getEarthRotationAngle,
  getSunDirectionUTC,
  latLonToUnitVector,
} from "../utils/geo";
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
import {
  toggleCountryInteractivity,
  toggleOceanInteractivity,
} from "../interactions/toggleSelections";
import { interactionState } from "../state/interactionState";
import { createStarMaterial } from "../materials/starMaterials";
import { countryCenters } from "../data/countryCenters";
import gsap from "gsap";
import { setupCountrySearch } from "../interactions/countrySearch";

export async function startApp() {
  const selectedCountryIds = new Set<number>();
  const selectedOceanIds = new Set<number>();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const camera = initializeCamera();
  const renderer = initializeRenderer(camera);
  const { scene, controls } = initializeScene(camera, renderer);
  const countrySearchInput = document.getElementById(
    "country-search"
  ) as HTMLInputElement;
  const {
    dayTexture,
    nightTexture,
    countryIdMapTexture,
    oceanIdMapTexture,
    esoSkyMapTexture,
  } = initializeTextures(renderer);
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

  // === Background starsphere ===
  let useFixedBackground = false; // default to realistic

  // Add star sphere to scene
  esoSkyMapTexture.wrapS = THREE.RepeatWrapping;
  esoSkyMapTexture.wrapT = THREE.RepeatWrapping;
  esoSkyMapTexture.offset.set(CONFIG.stars.offset.x, CONFIG.stars.offset.y); // Move horizontally (U), vertically (V)

  const starSphere = new THREE.Mesh(
    new THREE.SphereGeometry(
      CONFIG.stars.radius,
      CONFIG.stars.widthSegments,
      CONFIG.stars.heightSegments
    ),
    createStarMaterial()
  );
  scene.add(starSphere);

  setupGlobeInteractions(renderer, globe, raycaster, pointer, camera, {
    onHover: (hit) => {
      uniforms.cursorWorldPos.value.copy(hit.point.clone().normalize());
    },
    onClick: (hit) => {
      if (!hit.uv) return;

      const clickedCountryId = interactionState.countryEnabled
        ? getCountryIdAtUV(hit.uv)
        : -1;
      const clickedOceanId = interactionState.oceanEnabled
        ? getOceanIdAtUV(hit.uv)
        : -1;

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

    // === Detect if mouse is on the globe ===
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

    // === Camera distance based interaction ===
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
    const countryResult = interactionState.countryEnabled
      ? updateHoveredCountry(raycaster, pointer, camera, globe, globe.material)
      : { id: -1, position: null };

    const oceanResult = interactionState.oceanEnabled
      ? updateHoveredOcean(raycaster, pointer, camera, globe)
      : { id: -1, position: null };

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
        previousHoveredId = currentHoveredId;
        fadeOut = fadeIn;
        fadeIn = 0;
      } else {
        previousHoveredOceanId = currentHoveredOceanId;
        fadeOutOcean = fadeInOcean;
        fadeInOcean = 0;
      }

      currentHoveredId = newHoveredId;

      if (newHoveredId >= 10000) {
        currentHoveredOceanId = newHoveredId;
      }
    }

    // === Hover fade logic ===
    if (currentHoveredId > 0 && currentHoveredId < 10000)
      fadeIn = Math.min(fadeIn + delta * CONFIG.fade.highlight, 1);
    if (fadeOut > 0)
      fadeOut = Math.max(fadeOut - delta * CONFIG.fade.highlight, 0);

    if (currentHoveredId >= 10000) {
      fadeInOcean = Math.min(fadeInOcean + delta * CONFIG.fade.highlight, 1);
    }
    if (
      previousHoveredOceanId >= 10000 &&
      previousHoveredOceanId !== currentHoveredOceanId
    ) {
      fadeOutOcean = Math.max(fadeOutOcean - delta * CONFIG.fade.highlight, 0);
    }

    // === Label visibility ===
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

    // === Selection textures ===
    updateSelectionTexture(
      selectedFadeIn,
      selectedFlags,
      selectedData,
      uniforms.selectedMask.value as THREE.DataTexture,
      delta
    );

    updateSelectionTexture(
      selectedOceanFadeIn,
      selectedOceanFlags,
      selectedOceanData,
      uniforms.selectedOceanMask.value as THREE.DataTexture,
      delta
    );

    // === Update shader uniforms ===
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

    if (useFixedBackground) {
      // Keep stars always behind camera like a static skydome
      starSphere.quaternion.copy(camera.quaternion);
      starSphere.position.copy(camera.position);
    } else {
      // Reset to origin and rotation for realistic celestial backdrop
      starSphere.quaternion.identity();
      starSphere.position.set(0, 0, 0);
    }

    renderer.render(scene, camera);
  }

  // Button functionalities
  setupUserLocation(scene, globe);

  // === Button state management ===
  function updateButtonState(button: HTMLButtonElement, enabled: boolean) {
    button.classList.toggle("enabled", enabled);
    button.classList.toggle("disabled", !enabled);
  }

  // Get all button references
  const countryBtn = document.getElementById(
    "toggle-country"
  ) as HTMLButtonElement;
  const oceanBtn = document.getElementById("toggle-ocean") as HTMLButtonElement;
  const flashlightBtn = document.getElementById(
    "toggle-flashlight"
  ) as HTMLButtonElement;
  const clearBtn = document.getElementById(
    "clear-selection"
  ) as HTMLButtonElement;
  const starBtn = document.getElementById(
    "toggle-star-mode"
  ) as HTMLButtonElement;

  // Attach button event listeners
  clearBtn?.addEventListener("click", () => {
    clearAllSelections(
      selectedFlags,
      selectedOceanFlags,
      selectedCountryIds,
      selectedOceanIds
    );
  });

  countryBtn?.addEventListener("click", () => {
    toggleCountryInteractivity(countryBtn);
    countryBtn.textContent = interactionState.countryEnabled
      ? "Disable Country Interactivity"
      : "Enable Country Interactivity";
    updateButtonState(countryBtn, interactionState.countryEnabled);
  });

  oceanBtn?.addEventListener("click", () => {
    toggleOceanInteractivity(oceanBtn);
    oceanBtn.textContent = interactionState.oceanEnabled
      ? "Disable Ocean Interactivity"
      : "Enable Ocean Interactivity";
    updateButtonState(oceanBtn, interactionState.oceanEnabled);
  });

  flashlightBtn?.addEventListener("click", () => {
    interactionState.flashlightEnabled = !interactionState.flashlightEnabled;
    uniforms.uFlashlightEnabled.value = interactionState.flashlightEnabled;
    flashlightBtn.textContent = interactionState.flashlightEnabled
      ? "Disable Flashlight"
      : "Enable Flashlight";
    updateButtonState(flashlightBtn, interactionState.flashlightEnabled);
  });

  // === Set initial button states ===
  countryBtn.textContent = interactionState.countryEnabled
    ? "Disable Country Interactivity"
    : "Enable Country Interactivity";
  oceanBtn.textContent = interactionState.oceanEnabled
    ? "Disable Ocean Interactivity"
    : "Enable Ocean Interactivity";
  flashlightBtn.textContent = interactionState.flashlightEnabled
    ? "Disable Flashlight"
    : "Enable Flashlight";

  starBtn?.addEventListener("click", () => {
    useFixedBackground = !useFixedBackground;
    starBtn.textContent = useFixedBackground
      ? "Background: Infinite"
      : "Background: Realistic";
    updateButtonState(starBtn, useFixedBackground);
  });

  updateButtonState(countryBtn, interactionState.countryEnabled);
  updateButtonState(oceanBtn, interactionState.oceanEnabled);
  updateButtonState(flashlightBtn, interactionState.flashlightEnabled);
  updateButtonState(starBtn, useFixedBackground);

  const sidebar = document.getElementById("sidebar")!;
  const toggle = document.getElementById("sidebar-toggle")!;

  toggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });

  animate();

  setupCountrySearch(
    countrySearchInput,
    camera,
    controls,
    selectedCountryIds,
    selectedFlags
  );
}
