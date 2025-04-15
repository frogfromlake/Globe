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
camera.position.set(0, 0, 3); // view from z-axis, looking at origin

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("globe"),
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Handle resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Load Earth texture
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load("/earth.png");

// Earth material with texture
const geometry = new THREE.SphereGeometry(1, 64, 64);
const material = new THREE.MeshPhongMaterial({
  map: earthTexture,
  shininess: 5,
  specular: 0x111111,
});

// Globe setup (centered at origin)
const globe = new THREE.Mesh(geometry, material);
scene.add(globe); // add globe directly at (0, 0, 0)

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 0, 5);
directionalLight.target = globe;
scene.add(directionalLight);

// OrbitControls setup
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = true;
controls.enablePan = false;
controls.autoRotate = false;

// Always orbit around Earth's center
controls.target.set(0, 0, 0);
camera.up.set(0, 1, 0); // lock the "up" direction to prevent flipping
controls.update(); // important to apply target and up settings

// Full rotation around the globe allowed
controls.minPolarAngle = 0.01;
controls.maxPolarAngle = Math.PI - 0.01;

// Zoom boundaries
controls.minDistance = 1.1;
controls.maxDistance = 10;

// Dynamic zoom and rotation speed
function updateControlSpeed() {
  const distance = camera.position.length();
  controls.zoomSpeed = 0.3 * distance;
  controls.rotateSpeed = 0.5 * distance;
}

// Animate
function animate() {
  requestAnimationFrame(animate);
  updateControlSpeed();
  controls.update();
  renderer.render(scene, camera);
}
animate();
