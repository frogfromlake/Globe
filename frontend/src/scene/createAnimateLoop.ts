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
  cloudSphere: Mesh;
  atmosphere: Mesh;
  auroraMesh: Mesh;
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
  cloudSphere,
  atmosphere,
  auroraMesh,
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
  const raycastInterval = 100;
  let currentUV: Vector2 | null = null;

  const atmosphereMaterial = atmosphere.material as ShaderMaterial;
  const zoomRange = CONFIG.zoom.max - CONFIG.zoom.min;

  // === Cloud Movement Config ===
  let cloudElapsedTime = 0;
  let currentDrift = new Vector2(1, 0);
  let targetDrift = new Vector2(1, 0);
  let lastDriftChange = performance.now();
  const driftChangeInterval = 30000; // every 30s
  const driftLerpSpeed = 0.015; // slow gradual turn

  let cloudDriftBaseSpeed = 0.00004; // very slow: matches shader default
  let cloudSpeedVariation = 0.0;
  let cloudTargetVariation = 0.0;
  let lastSpeedVariationChange = performance.now();
  const speedVariationStrength = 0.00001; // subtle pulsing
  const speedVariationChangeInterval = 20000; // update every 20s
  const speedLerpSpeed = 0.04;

  // === Lightning Config ===
  const MAX_FLASHES = 80;
  const NUM_STORM_CENTERS = 30; // more storm systems (used to be 15)
  const baseFlashChance = 0.007; // flashes more rarely inside each storm (was 0.02)
  const stormDriftSpeed = 0.00002; // keep same slow drift
  const flashFadeSpeed = 0.8; // faster fading (was 0.88)

  const flashPoints: Vector2[] = Array.from(
    { length: MAX_FLASHES },
    () => new Vector2(Math.random(), Math.random())
  );
  const flashStrengths: number[] = Array(MAX_FLASHES).fill(0);

  const stormCenters: Vector2[] = Array.from(
    { length: NUM_STORM_CENTERS },
    () => new Vector2(Math.random(), Math.random())
  );

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
    const nowInSeconds = now / 1000;

    if (auroraMesh.material instanceof ShaderMaterial) {
      auroraMesh.material.uniforms.uTime.value = nowInSeconds;
      auroraMesh.material.uniforms.lightDirection.value.copy(
        uniforms.lightDirection.value
      );
    }

    const rotationY = getEarthRotationAngle();
    globe.rotation.y = rotationY;
    globeRaycastMesh.rotation.y = rotationY;

    // Update real-time uniform for globe shaders
    uniforms.uTime.value = nowInSeconds;

    cloudElapsedTime += delta;

    // Drift Direction Update
    if (now - lastDriftChange > driftChangeInterval) {
      const maxAngleOffset = MathUtils.degToRad(10); // small angle, stay eastward
      const angleOffset = MathUtils.randFloatSpread(maxAngleOffset); // random between -5.0° and +5.0°
      const eastward = new Vector2(1, 0); // pure east
      targetDrift = eastward
        .clone()
        .rotateAround(new Vector2(0, 0), angleOffset);
      lastDriftChange = now;
    }

    currentDrift.lerp(targetDrift, delta * driftLerpSpeed);
    currentDrift.normalize();

    // Speed Variation Update
    if (now - lastSpeedVariationChange > speedVariationChangeInterval) {
      cloudTargetVariation = (Math.random() * 2 - 1) * speedVariationStrength;
      lastSpeedVariationChange = now;
    }
    cloudSpeedVariation = MathUtils.lerp(
      cloudSpeedVariation,
      cloudTargetVariation,
      delta * speedLerpSpeed
    );

    const totalSpeed = cloudDriftBaseSpeed + cloudSpeedVariation;

    // Pass cloud drift and time to shader
    if (cloudSphere.material instanceof ShaderMaterial) {
      cloudSphere.material.uniforms.uCloudTime.value = cloudElapsedTime;
      cloudSphere.material.uniforms.uCloudDrift.value.copy(currentDrift);
      cloudSphere.material.uniforms.uLightDirection.value.copy(
        uniforms.lightDirection.value
      );
      cloudSphere.material.uniforms.uBaseDriftSpeed.value = totalSpeed;

      // === LIGHTNING FLASH ===
      // === Drift storm centers slightly ===
      for (let center of stormCenters) {
        center.x += MathUtils.randFloatSpread(stormDriftSpeed);
        center.y += MathUtils.randFloatSpread(stormDriftSpeed);
        if (center.x < 0) center.x += 1;
        if (center.x > 1) center.x -= 1;
        if (center.y < 0) center.y += 1;
        if (center.y > 1) center.y -= 1;
      }

      const baseFlashChance = 0.02; // base 2%

      for (let i = 0; i < MAX_FLASHES; i++) {
        const randomChance = baseFlashChance * MathUtils.randFloat(0.7, 1.3);
        if (Math.random() < randomChance) {
          const center =
            stormCenters[Math.floor(Math.random() * NUM_STORM_CENTERS)];
          const jitter = new Vector2(
            MathUtils.randFloatSpread(0.05),
            MathUtils.randFloatSpread(0.05)
          );
          flashPoints[i].copy(center).add(jitter);

          // Random strength (rarely bright)
          flashStrengths[i] = Math.random() < 0.05 ? 2.0 : 1.0;
        }

        // Faster fade per frame
        if (typeof flashStrengths[i] !== "number") flashStrengths[i] = 0;
        flashStrengths[i] *= flashFadeSpeed;
      }

      // Send to shader
      if (cloudSphere.material instanceof ShaderMaterial) {
        const mat = cloudSphere.material as ShaderMaterial;
        mat.uniforms.uFlashPoints.value = flashPoints;
        mat.uniforms.uFlashStrengths.value = flashStrengths;
        mat.uniforms.uNumFlashes.value = MAX_FLASHES;
      }
    }

    // Store rotationY globally for this frame
    let globeIntersection: Vector3 | null = null;
    let globeHit: Intersection | null = null;

    // Only raycast every 'raycastInterval' ms
    const enoughTimePassed = now - lastRaycastTime > raycastInterval;
    if (userHasMovedPointer() && enoughTimePassed) {
      lastRaycastTime = now;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(globeRaycastMesh, true);

      if (hits.length > 0) {
        const hitPoint = hits[0].point.clone().normalize();
        globeHit = hits[0];
        globeIntersection = hitPoint;

        const longitude = Math.atan2(hitPoint.z, hitPoint.x);
        const latitude = Math.asin(hitPoint.y);

        const correctedLongitude = longitude + rotationY;
        const u = MathUtils.euclideanModulo(
          0.5 - correctedLongitude / (2.0 * Math.PI),
          1.0
        );
        const v = MathUtils.clamp(0.5 + latitude / Math.PI, 0, 1);

        currentUV = new Vector2(u, v);

        uniforms.uCursorOnGlobe.value = true;
        uniforms.cursorWorldPos.value.copy(hitPoint);
      } else {
        globeHit = null;
        globeIntersection = null;
        currentUV = null;
      }
    } else {
      // No raycast, but if cursor was already on globe, update cursorWorldPos
      if (uniforms.uCursorOnGlobe.value) {
        uniforms.uCursorOnGlobe.value = false;
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObject(globeRaycastMesh, true)[0];
        if (hit) {
          uniforms.uCursorOnGlobe.value = true;
          uniforms.cursorWorldPos.value.copy(hit.point.normalize());
        }
      }
    }

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
