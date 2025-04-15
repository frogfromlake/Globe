import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

//
// ===== Configuration =====
//

const CONFIG = {
  zoom: {
    min: 1.1,
    max: 10,
  },
  speed: {
    zoomSpeedMultiplier: 0.3, // Zoom speed multiplier based on distance
    rotateSpeedBase: 0.25, // Base rotation speed
    rotateSpeedScale: 0.8, // Scale factor for rotation speed
    inertiaSensitivity: 0.0009, // How fast globe spins based on drag
    inertiaDecay: 0.99, // Friction/decay applied to spin inertia
  },
  polarLimits: {
    min: 0.01,
    max: Math.PI - 0.01,
  },
};

//
// ===== Setup =====
//

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 3);

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("globe"),
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Earth Texture
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load("/earth.png");

// Globe
const geometry = new THREE.SphereGeometry(1, 64, 64);
const material = new THREE.MeshPhongMaterial({
  map: earthTexture,
  shininess: 5,
  specular: 0x111111,
});
const globe = new THREE.Mesh(geometry, material);
scene.add(globe);

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 0, 5);
directionalLight.target = globe;
scene.add(directionalLight);

//
// ===== Orbit Controls =====
//

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = true;
controls.enablePan = false;
controls.autoRotate = false;
controls.target.set(0, 0, 0);
camera.up.set(0, 1, 0);
controls.minPolarAngle = CONFIG.polarLimits.min;
controls.maxPolarAngle = CONFIG.polarLimits.max;
controls.minDistance = CONFIG.zoom.min;
controls.maxDistance = CONFIG.zoom.max;
controls.update();

//
// ===== Inertia Spin System =====
//

let isDragging = false;
let lastPos = new THREE.Vector2();
let dragVelocity = new THREE.Vector2();
let isInertiaActive = false;

renderer.domElement.addEventListener("pointerdown", (event) => {
  isDragging = true;
  isInertiaActive = false;
  lastPos.set(event.clientX, event.clientY);
  dragVelocity.set(0, 0);
});

renderer.domElement.addEventListener("pointermove", (event) => {
  if (isDragging) {
    const currentPos = new THREE.Vector2(event.clientX, event.clientY);
    dragVelocity
      .subVectors(currentPos, lastPos)
      .multiplyScalar(CONFIG.speed.inertiaSensitivity);
    lastPos.copy(currentPos);
  }
});

renderer.domElement.addEventListener("pointerup", () => {
  isDragging = false;
  isInertiaActive = true;
});

//
// ===== Dynamic Speed Updates =====
//

function updateControlSpeed() {
  const distance = camera.position.length();

  // Dynamic zoom speed
  controls.zoomSpeed = CONFIG.speed.zoomSpeedMultiplier * distance;

  // Dynamic rotation speed (scales with distance)
  const scale = Math.log(distance + 0.25);
  controls.rotateSpeed =
    CONFIG.speed.rotateSpeedBase * scale * CONFIG.speed.rotateSpeedScale;
}

//
// ===== Animation Loop =====
//

function animate() {
  requestAnimationFrame(animate);
  updateControlSpeed();

  if (isInertiaActive && dragVelocity.lengthSq() > 0.000001) {
    const axis = new THREE.Vector3(
      dragVelocity.y,
      dragVelocity.x,
      0
    ).normalize();
    const angle = dragVelocity.length();
    const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
    globe.quaternion.premultiply(quaternion);
    dragVelocity.multiplyScalar(CONFIG.speed.inertiaDecay);
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();
