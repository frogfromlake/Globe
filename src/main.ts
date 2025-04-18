// main.ts
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { createGlobeMaterial } from "./materials";
import {
  updateHoveredCountry,
  loadCountryIdMapTexture,
  getCountryIdAtUV,
  createSelectionTexture,
} from "./countryHover.js";
import {
  init3DLabels,
  update3DLabel,
  hideAll3DLabelsExcept,
} from "./countryLabel3D.js";

// --- Config ---
const CONFIG = {
  zoom: { min: 1.1, max: 10 },
  speed: {
    zoomSpeedMultiplier: 0.3,
    rotateSpeedBase: 0.25,
    rotateSpeedScale: 0.8,
    dampingFactor: 0.03,
  },
  polarLimits: { min: 0.01, max: Math.PI - 0.01 },
};

// --- Scene Setup ---
const scene = new THREE.Scene();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const selectedCountryIds = new Set<number>();

let userMarker: THREE.Mesh | null = null;
let userLat: number | null = null;
let userLon: number | null = null;

const canvas = document.getElementById("globe") as HTMLCanvasElement;
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 3);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.debug.checkShaderErrors = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Textures ---
const loader = new THREE.TextureLoader();
const dayTexture = loader.load(`/textures/earth_day_8k.jpg`);
const nightTexture = loader.load(`/textures/earth_night_8k.jpg`);
const countryIdMapTexture = loader.load(
  "/textures/country_id_map_8k_rgb.png",
  (tex) => {
    tex.colorSpace = THREE.LinearSRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.flipY = false;
    tex.needsUpdate = true;
  }
);

const maxAnisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
[dayTexture, nightTexture].forEach((tex) => {
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = maxAnisotropy;
});

const selectedCountryMask = createSelectionTexture();
const selectedData = selectedCountryMask.image.data as Uint8Array;
const selectedFadeIn = new Float32Array(selectedData.length).fill(0);
const selectedFlags = new Uint8Array(selectedData.length).fill(0);

const uniforms: Record<string, THREE.IUniform<any>> = {
  dayTexture: { value: dayTexture },
  nightTexture: { value: nightTexture },
  countryIdMap: { value: countryIdMapTexture },
  previousHoveredId: { value: -1 },
  hoveredCountryId: { value: -1 },
  uTime: { value: 0 },
  lightDirection: { value: new THREE.Vector3() },
  highlightFadeIn: { value: 0 },
  highlightFadeOut: { value: 0 },
  selectedMask: { value: selectedCountryMask },
  cameraDirection: { value: new THREE.Vector3() },
  cityLightStrength: { value: 0.5 },
  cursorWorldPos: { value: new THREE.Vector3(0, 0, 0) },
  cursorGlowStrength: { value: 0.1 },
  cursorGlowRadius: { value: 0.4 },
  cursorUV: { value: new THREE.Vector2(-1, -1) },
};

const globeMaterial = createGlobeMaterial(uniforms);

await loadCountryIdMapTexture();

init3DLabels(scene);
const globe = new THREE.Mesh(
  new THREE.SphereGeometry(1, 128, 128),
  globeMaterial
);
scene.add(globe);

// --- Pointer Events ---
renderer.domElement.addEventListener("pointermove", (event: PointerEvent) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(globe)[0];
  if (hit) uniforms.cursorWorldPos.value.copy(hit.point.clone().normalize());
});

let lastClickTime = 0;

renderer.domElement.addEventListener("click", () => {
  const now = performance.now();
  if (now - lastClickTime < 200) return;
  lastClickTime = now;

  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(globe)[0];
  if (!hit || !hit.uv) return;

  const clickedId = getCountryIdAtUV(hit.uv);
  if (clickedId <= 0 || clickedId >= selectedFlags.length) return;

  if (selectedCountryIds.has(clickedId)) {
    selectedCountryIds.delete(clickedId);
    selectedFlags[clickedId] = 0;
  } else {
    selectedCountryIds.add(clickedId);
    selectedFlags[clickedId] = 1;
  }

  const state = selectedFlags[clickedId] === 1 ? "Selected" : "Deselected";
  console.log(`${state} country ID: ${clickedId}`);
});

// --- Lighting ---
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 0, 5);
scene.add(light);

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = true;
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = CONFIG.speed.dampingFactor;
controls.minPolarAngle = CONFIG.polarLimits.min;
controls.maxPolarAngle = CONFIG.polarLimits.max;
controls.minDistance = CONFIG.zoom.min;
controls.maxDistance = CONFIG.zoom.max;
controls.update();

function updateControlSpeed(): void {
  const distance = camera.position.distanceTo(controls.target);
  const normalized =
    (distance - CONFIG.zoom.min) / (CONFIG.zoom.max - CONFIG.zoom.min);
  controls.rotateSpeed = THREE.MathUtils.clamp(
    0.1 + normalized * 3.0,
    0.1,
    5.0
  );
  controls.zoomSpeed = THREE.MathUtils.clamp(0.1 + normalized * 4.0, 0.1, 6.0);
}

function getEarthRotationAngle(date: Date = new Date()): number {
  const secondsInDay = 86400;
  const utcSeconds =
    date.getUTCHours() * 3600 +
    date.getUTCMinutes() * 60 +
    date.getUTCSeconds() +
    date.getUTCMilliseconds() / 1000;
  return (utcSeconds / secondsInDay) * Math.PI * 2;
}

function getSunDirectionUTC(date: Date = new Date()): THREE.Vector3 {
  const rad = Math.PI / 180;
  const daysSinceJ2000 = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86400000;
  const meanLongitude = (280.46 + 0.9856474 * daysSinceJ2000) % 360;
  const meanAnomaly = (357.528 + 0.9856003 * daysSinceJ2000) % 360;
  const eclipticLongitude =
    meanLongitude +
    1.915 * Math.sin(meanAnomaly * rad) +
    0.02 * Math.sin(2 * meanAnomaly * rad);
  const obliquity = 23.439 * rad;

  const x = Math.cos(eclipticLongitude * rad);
  const y = Math.cos(obliquity) * Math.sin(eclipticLongitude * rad);
  const z = Math.sin(obliquity) * Math.sin(eclipticLongitude * rad);

  return new THREE.Vector3(-x, -z, y).normalize();
}

// --- Geolocation Marker ---
const locationBtn = document.getElementById(
  "show-location"
) as HTMLButtonElement;

if (!("geolocation" in navigator)) {
  locationBtn.style.display = "none";
} else {
  let locationVisible = false;

  locationBtn.addEventListener("click", () => {
    if (locationVisible) {
      if (userMarker) {
        globe.remove(userMarker);
        userMarker.geometry.dispose();

        if (Array.isArray(userMarker.material)) {
          userMarker.material.forEach((m) => m.dispose());
        } else {
          userMarker.material.dispose();
        }

        userMarker = null;
      }

      userLat = userLon = null;
      locationBtn.textContent = "Show My Location";
      locationVisible = false;
    } else {
      locationBtn.disabled = true;
      locationBtn.textContent = "Locating...";

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          userLat = pos.coords.latitude;
          userLon = pos.coords.longitude;

          const radius = 1.01;
          const phi = (90 - userLat) * (Math.PI / 180);
          const theta = (userLon + 90) * (Math.PI / 180);

          userMarker = new THREE.Mesh(
            new THREE.SphereGeometry(0.01, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 })
          );
          userMarker.position.setFromSphericalCoords(radius, phi, theta);
          globe.add(userMarker);

          locationBtn.disabled = false;
          locationBtn.textContent = "Hide My Location";
          locationVisible = true;

          console.log(`📍 User marker at lat: ${userLat}, lon: ${userLon}`);
        },
        (err) => {
          console.warn("Geolocation error:", err.message);
          locationBtn.disabled = false;
          locationBtn.textContent = "Show My Location";
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  });
}

// --- Animation ---
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

  updateControlSpeed();
  uniforms.lightDirection.value.copy(getSunDirectionUTC());
  controls.update();

  const newId = updateHoveredCountry(
    raycaster,
    pointer,
    camera,
    globe,
    globeMaterial
  );

  if (newId !== currentHoveredId) {
    previousHoveredId = currentHoveredId;
    fadeOut = fadeIn;
    fadeIn = 0;
    currentHoveredId = typeof newId === "number" ? newId : newId.id;
  }

  if (currentHoveredId > 0)
    fadeIn = Math.min(fadeIn + delta * highlightFadeSpeed, 1);
  if (fadeOut > 0) fadeOut = Math.max(fadeOut - delta * highlightFadeSpeed, 0);

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

  const texData = selectedCountryMask.image.data as Uint8Array;

  for (let i = 0; i < texData.length; i++) {
    texData[i] = Math.floor(selectedFadeIn[i] * 255);
  }

  selectedCountryMask.needsUpdate = true;

  uniforms.hoveredCountryId.value = currentHoveredId;
  uniforms.previousHoveredId.value = previousHoveredId;
  uniforms.highlightFadeIn.value = fadeIn;
  uniforms.highlightFadeOut.value = fadeOut;
  uniforms.cameraDirection.value.copy(camera.position).normalize();

  globe.rotation.y = getEarthRotationAngle();
  renderer.render(scene, camera);
}

animate();
