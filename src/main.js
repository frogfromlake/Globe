import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

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

// Resize handling
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Load Earth texture
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load("/earth.png");

// Earth mesh
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

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = true;
controls.enablePan = false;
controls.autoRotate = false;
controls.target.set(0, 0, 0);
camera.up.set(0, 1, 0);
controls.minPolarAngle = 0.01;
controls.maxPolarAngle = Math.PI - 0.01;
controls.minDistance = 1.1;
controls.maxDistance = 10;
controls.update();

// 🌀 Inertia system (omnidirectional spin)
let isDragging = false;
let lastPos = new THREE.Vector2();
let dragVelocity = new THREE.Vector2();
let decay = 0.95;
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
    dragVelocity.subVectors(currentPos, lastPos).multiplyScalar(0.002); // sensitivity
    lastPos.copy(currentPos);
  }
});

renderer.domElement.addEventListener("pointerup", () => {
  isDragging = false;
  isInertiaActive = true;
});

// Update camera speed dynamically
function updateControlSpeed() {
  const distance = camera.position.length();
  controls.zoomSpeed = 0.3 * distance;
  const base = 0.25;
  const scale = Math.log(distance + 0.25);
  controls.rotateSpeed = base * scale * 0.5;
}

// Animate
function animate() {
  requestAnimationFrame(animate);
  updateControlSpeed();

  // Apply spin after release
  if (isInertiaActive && dragVelocity.lengthSq() > 0.000001) {
    const axis = new THREE.Vector3(
      dragVelocity.y,
      dragVelocity.x,
      0
    ).normalize();
    const angle = dragVelocity.length();
    const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
    globe.quaternion.premultiply(quaternion);
    dragVelocity.multiplyScalar(decay); // apply friction
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();
