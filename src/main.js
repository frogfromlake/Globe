import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { earthVertexShader, earthFragmentShader } from "./earthShaders.js";
import { loadCountryBorders } from "./countryBorders.js";

const CONFIG = {
  use8k: true, // Toggle between 4K and 8K textures
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
const borderGroup = new THREE.Group();
scene.add(borderGroup);
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
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const loader = new THREE.TextureLoader();
const resolutionSuffix = CONFIG.use8k ? "_8k.jpg" : "_4k.jpg";
const dayTexture = loader.load(`/earth_day${resolutionSuffix}`);
const nightTexture = loader.load(`/earth_night${resolutionSuffix}`);

const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
[dayTexture, nightTexture].forEach((tex) => {
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = maxAnisotropy;
});

const uniforms = {
  dayTexture: { value: dayTexture },
  nightTexture: { value: nightTexture },
  lightDirection: { value: new THREE.Vector3() },
};

const globeMaterial = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: earthVertexShader,
  fragmentShader: earthFragmentShader,
  depthWrite: true,
  transparent: false,
  blending: THREE.NormalBlending,
});

const globe = new THREE.Mesh(
  new THREE.SphereGeometry(1, 64, 64),
  globeMaterial
);
scene.add(globe);

let using8k = CONFIG.use8k;

document.getElementById("toggleResolution").addEventListener("click", () => {
  using8k = !using8k;
  const suffix = using8k ? "_8k.jpg" : "_4k.jpg";
  document.getElementById("toggleResolution").textContent = using8k
    ? "Switch to 4K"
    : "Switch to 8K";
  const newDay = loader.load(`/earth_day${suffix}`, (texture) => {
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = maxAnisotropy;
    globeMaterial.uniforms.dayTexture.value = texture;
  });
  const newNight = loader.load(`/earth_night${suffix}`, (texture) => {
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = maxAnisotropy;
    globeMaterial.uniforms.nightTexture.value = texture;
  });
});

document.getElementById("toggleBorders").addEventListener("click", () => {
  loadCountryBorders(borderGroup);
});

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 0, 5);
scene.add(light);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = true;
controls.enablePan = false;
controls.autoRotate = false;
controls.enableDamping = true;
controls.dampingFactor = CONFIG.speed.dampingFactor;
controls.target.set(0, 0, 0);
camera.up.set(0, 1, 0);
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

function getSubsolarLongitude() {
  const now = new Date();
  const utcHours =
    now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const subsolarLongitude = ((utcHours * 15 + 180) % 360) - 180;
  return subsolarLongitude;
}

function animate() {
  requestAnimationFrame(animate);
  updateControlSpeed();
  const mapOffset = 90;
  const subsolarLon = getSubsolarLongitude();
  globe.rotation.y = THREE.MathUtils.degToRad(subsolarLon + mapOffset);
  borderGroup.rotation.y = globe.rotation.y;
  uniforms.lightDirection.value.set(0, 0, 1);
  controls.update();
  renderer.render(scene, camera);
}

animate();
