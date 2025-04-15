import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const CONFIG = {
  zoom: {
    min: 1.1,
    max: 10,
  },
  speed: {
    zoomSpeedMultiplier: 0.3,
    rotateSpeedBase: 0.25,
    rotateSpeedScale: 0.8,
    dampingFactor: 0.03, // inertia smoothing
  },
  polarLimits: {
    min: 0.01,
    max: Math.PI - 0.01,
  },
};

// === Setup scene ===
const scene = new THREE.Scene();
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

// === Globe ===
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load("/earth.png");

const globe = new THREE.Mesh(
  new THREE.SphereGeometry(1, 64, 64),
  new THREE.MeshPhongMaterial({
    map: earthTexture,
    shininess: 5,
    specular: 0x111111,
  })
);
scene.add(globe);

// === Lighting ===
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 0, 5);
directionalLight.target = globe;
scene.add(directionalLight);

// === Controls ===
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = true;
controls.enablePan = false;
controls.autoRotate = false;
controls.enableDamping = true; // inertia built-in
controls.dampingFactor = CONFIG.speed.dampingFactor;
controls.target.set(0, 0, 0);
camera.up.set(0, 1, 0);
controls.minPolarAngle = CONFIG.polarLimits.min;
controls.maxPolarAngle = CONFIG.polarLimits.max;
controls.minDistance = CONFIG.zoom.min;
controls.maxDistance = CONFIG.zoom.max;
controls.update();

// === Speed update ===
function updateControlSpeed() {
  const distance = camera.position.distanceTo(controls.target);
  const normalized =
    (distance - CONFIG.zoom.min) / (CONFIG.zoom.max - CONFIG.zoom.min);

  // Rotate: starts slow near surface, much faster when zoomed out
  controls.rotateSpeed = THREE.MathUtils.clamp(
    0.1 + normalized * 3.0,
    0.1,
    5.0
  );

  // Zoom: ramp-up from surface to far orbit
  controls.zoomSpeed = THREE.MathUtils.clamp(
    0.1 + normalized * 4.0,
    0.1,
    6.0
  );
}

// === Animation loop ===
function animate() {
  requestAnimationFrame(animate);
  updateControlSpeed();
  controls.update(); // handles inertia
  renderer.render(scene, camera);
}

animate();
