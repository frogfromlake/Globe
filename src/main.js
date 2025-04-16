// main.js
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { earthVertexShader, earthFragmentShader } from "./earthShaders.js";
import {
  updateHoveredCountry,
  loadCountryIdMapTexture,
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
const dayTexture = loader.load(`/earth_day_8k.jpg`);
const nightTexture = loader.load(`/earth_night_8k.jpg`);
const countryIdMapTexture = loader.load("/country_id_map_8k.png");
countryIdMapTexture.minFilter = THREE.NearestFilter;
countryIdMapTexture.magFilter = THREE.NearestFilter;

const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
[dayTexture, nightTexture].forEach((tex) => {
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = maxAnisotropy;
});

const uniforms = {
  dayTexture: { value: dayTexture },
  nightTexture: { value: nightTexture },
  countryIdMap: { value: countryIdMapTexture },
  hoveredCountryId: { value: -1 },
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

await loadCountryIdMapTexture();

const globe = new THREE.Mesh(
  new THREE.SphereGeometry(1, 128, 128),
  globeMaterial
);
scene.add(globe);

renderer.domElement.addEventListener("pointermove", (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
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

function getSubsolarLongitude() {
  const now = new Date();
  const utcHours =
    now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  return ((utcHours * 15 + 180) % 360) - 180;
}

function animate() {
  requestAnimationFrame(animate);

  updateControlSpeed();

  const mapOffset = 90;
  const subsolarLon = getSubsolarLongitude();
  globe.rotation.y = THREE.MathUtils.degToRad(subsolarLon + mapOffset);
  uniforms.lightDirection.value.set(0, 0, 1);

  controls.update();

  if (globeMaterial) {
    updateHoveredCountry(raycaster, pointer, camera, globe, globeMaterial);
  }

  renderer.render(scene, camera);
}

animate();
