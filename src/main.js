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
camera.position.z = 3;

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

// Axial tilt and spin
const tiltGroup = new THREE.Group();
scene.add(tiltGroup);
tiltGroup.rotation.z = THREE.MathUtils.degToRad(23.5); // Earth's axial tilt

const globeGroup = new THREE.Group();
tiltGroup.add(globeGroup);

const globe = new THREE.Mesh(geometry, material);
globeGroup.add(globe);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 0, 5);
directionalLight.target = globe;
scene.add(directionalLight);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;
controls.enablePan = false;
controls.autoRotate = false;
controls.rotateSpeed = 0.6;
controls.minPolarAngle = Math.PI / 2;
controls.maxPolarAngle = Math.PI / 2;

// Animate
function animate() {
  requestAnimationFrame(animate);
  globeGroup.rotation.y += 0.001; // Earth spin
  controls.update();
  renderer.render(scene, camera);
}
animate();
