// main.js
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { earthVertexShader, earthFragmentShader } from "./earthShaders.js";
import {
  updateHoveredCountry,
  loadCountryIdMapTexture,
  getCountryIdAtUV,
  initCountryLabel,
  updateCountryLabel,
  hideAllLabelsExcept,
} from "./countryHover.js";

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

const scene = new THREE.Scene();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let userMarker = null;
let userLat = null;
let userLon = null;
const selectedCountryIds = new Set();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 3);

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("globe"),
  antialias: true,
});
renderer.debug.checkShaderErrors = true;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const loader = new THREE.TextureLoader();
const dayTexture = loader.load(`/earth_day_8k.jpg`);
const nightTexture = loader.load(`/earth_night_8k.jpg`);
const countryIdMapTexture = loader.load("/country_id_map_8k_rgb.png", (tex) => {
  tex.encoding = THREE.LinearEncoding;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.flipY = false;
  tex.needsUpdate = true;
});

const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
[dayTexture, nightTexture].forEach((tex) => {
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = maxAnisotropy;
});

const selectedCountryMask = createSelectionTexture();

const uniforms = {
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
};

const globeMaterial = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: earthVertexShader,
  fragmentShader: earthFragmentShader,
  depthWrite: true,
  transparent: false,
  blending: THREE.NormalBlending,
});

await loadCountryIdMapTexture();

const labelsContainer = document.getElementById("labels-container");
initCountryLabel(labelsContainer, camera);

const globe = new THREE.Mesh(
  new THREE.SphereGeometry(1, 128, 128),
  globeMaterial
);
scene.add(globe);

renderer.domElement.addEventListener("pointermove", (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

const selectedData = selectedCountryMask.image.data;

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

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 0, 5);
scene.add(light);

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

function updateControlSpeed() {
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

function getEarthRotationAngle(date = new Date()) {
  const secondsInDay = 86400;
  const utcSeconds =
    date.getUTCHours() * 3600 +
    date.getUTCMinutes() * 60 +
    date.getUTCSeconds() +
    date.getUTCMilliseconds() / 1000;
  return (utcSeconds / secondsInDay) * Math.PI * 2;
}

function getSunDirectionUTC(date = new Date()) {
  const rad = Math.PI / 180;

  const daysSinceJ2000 = (date - new Date(Date.UTC(2000, 0, 1, 12))) / 86400000;
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

  const sunDir = new THREE.Vector3(-x, -z, y).normalize(); // original direction

  return sunDir;
}

function createSelectionTexture(maxCountries = 2048) {
  const data = new Uint8Array(maxCountries); // 1 byte per country
  const texture = new THREE.DataTexture(
    data,
    maxCountries,
    1,
    THREE.RedFormat,
    THREE.UnsignedByteType
  );
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

let fadeIn = 0;
let fadeOut = 0;
let currentHoveredId = -1;
let previousHoveredId = -1;
const highlightFadeSpeed = 2.5;
const selectionFadeSpeed = 3.5;
let lastFrameTime = performance.now();

const selectedFadeIn = new Float32Array(selectedData.length).fill(0);
const selectedFlags = new Uint8Array(selectedData.length).fill(0);

// Set up location button
const locationBtn = document.getElementById("show-location");

if (!("geolocation" in navigator)) {
  locationBtn.style.display = "none";
} else {
  let locationVisible = false;

  locationBtn.addEventListener("click", () => {
    if (locationVisible) {
      // Hide marker
      if (userMarker) {
        globe.remove(userMarker);
        userMarker.geometry.dispose();
        userMarker.material.dispose();
        userMarker = null;
      }
      userLat = null;
      userLon = null;
      locationBtn.textContent = "Show My Location";
      locationVisible = false;
    } else {
      locationBtn.disabled = true;
      locationBtn.textContent = "Locating...";

      navigator.geolocation.getCurrentPosition(
        (position) => {
          userLat = position.coords.latitude;
          userLon = position.coords.longitude;

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
        (error) => {
          console.warn("Geolocation error:", error.message);
          locationBtn.disabled = false;
          locationBtn.textContent = "Show My Location";
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    }
  });
}

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = (now - lastFrameTime) / 1000;
  lastFrameTime = now;
  uniforms.uTime.value = now / 1000;

  updateControlSpeed();

  uniforms.lightDirection.value.copy(getSunDirectionUTC());

  controls.update();

  const { id: newId, position: labelPosition } = updateHoveredCountry(
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
    currentHoveredId = newId;
  }

  if (currentHoveredId > 0) {
    fadeIn += delta * highlightFadeSpeed;
    if (fadeIn > 1) fadeIn = 1;
  }

  // Always clear all but active labels
  hideAllLabelsExcept(
    [...selectedCountryIds, currentHoveredId].filter((id) => id > 0)
  );

  // Update hovered label
  if (currentHoveredId > 0) {
    updateCountryLabel(currentHoveredId, getEarthRotationAngle());
  }

  // Update all selected labels
  for (const selectedId of selectedCountryIds) {
    if (selectedId !== currentHoveredId) {
      updateCountryLabel(selectedId, getEarthRotationAngle());
    }
  }

  if (fadeOut > 0) {
    fadeOut -= delta * highlightFadeSpeed;
    if (fadeOut < 0) fadeOut = 0;
  }

  // Selection animation update
  for (let i = 0; i < selectedData.length; i++) {
    const isSelected = selectedFlags[i] === 1;
    if (isSelected) {
      selectedFadeIn[i] += delta * selectionFadeSpeed;
      if (selectedFadeIn[i] > 1) selectedFadeIn[i] = 1;
    } else {
      selectedFadeIn[i] -= delta * selectionFadeSpeed;
      if (selectedFadeIn[i] < 0) selectedFadeIn[i] = 0;
    }
  }

  // Update texture with selection fades
  const texData = selectedCountryMask.image.data;
  for (let i = 0; i < texData.length; i++) {
    texData[i] = Math.floor(selectedFadeIn[i] * 255);
  }
  selectedCountryMask.needsUpdate = true;

  // Pass hover states to shader
  uniforms.hoveredCountryId.value = currentHoveredId;
  uniforms.previousHoveredId.value = previousHoveredId;
  uniforms.highlightFadeIn.value = fadeIn;
  uniforms.highlightFadeOut.value = fadeOut;
  uniforms.cameraDirection.value.copy(camera.position).normalize();

  globe.rotation.y = getEarthRotationAngle();

  renderer.render(scene, camera);
}

animate();
