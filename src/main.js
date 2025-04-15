import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

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

// === Scene Setup ===
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

// === Load Textures ===
const loader = new THREE.TextureLoader();

const resolutionSuffix = CONFIG.use8k ? "_8k.jpg" : "_4k.jpg";
const dayTexture = loader.load(`/earth_day${resolutionSuffix}`);
const nightTexture = loader.load(`/earth_night${resolutionSuffix}`);

// 🔍 Sharpen visual output
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
[dayTexture, nightTexture].forEach((tex) => {
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = maxAnisotropy;
});

// === Shader Material ===
const uniforms = {
  dayTexture: { value: dayTexture },
  nightTexture: { value: nightTexture },
  lightDirection: { value: new THREE.Vector3() },
};

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform vec3 lightDirection;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    float intensity = dot(normalize(vNormal), normalize(lightDirection));
    vec4 dayColor = texture2D(dayTexture, vUv);
    vec4 nightColor = texture2D(nightTexture, vUv);
    vec4 color = mix(nightColor, dayColor, clamp(intensity, 0.0, 1.0));
    gl_FragColor = color;
  }
`;

const globeMaterial = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
});

// === Globe ===
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

// === Lighting ===
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 0, 5);
scene.add(directionalLight);

// === Controls ===
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

// === Speed update ===
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

// === Animate ===
function animate() {
  requestAnimationFrame(animate);
  updateControlSpeed();

  // Earth rotates once every 24 hours = 2 * PI per 86400 seconds
  const secondsInDay = 86400;
  const now = Date.now() / 1000; // in seconds
  const fastTime = now * 50; // simulate 50x real speed
  const rotation = ((fastTime % secondsInDay) / secondsInDay) * Math.PI * 2;

  globe.rotation.y = rotation;

  uniforms.lightDirection.value.copy(
    directionalLight.position.clone().normalize()
  );

  controls.update();
  renderer.render(scene, camera);
}

animate();
