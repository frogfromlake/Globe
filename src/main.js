import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { earthVertexShader, earthFragmentShader } from "./earthShaders.js";
import { loadCountryBorders } from "./countryBorders.js";

const CONFIG = {
  use8k: true,
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
raycaster.params.Mesh = { threshold: 0.02 };
raycaster.params.Line.threshold = 0.01;
const pointer = new THREE.Vector2();
let hoveredCountry = null;
let countryMeshes = [];
let countryLineMeshes = [];

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
const dayTexture = loader.load(`/earth_day_8k.jpg`);
const nightTexture = loader.load(`/earth_night_8k.jpg`);

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
  new THREE.SphereGeometry(1, 128, 128),
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
    texture.anisotropy = maxAnisotropy;
    globeMaterial.uniforms.dayTexture.value = texture;
  });
  const newNight = loader.load(`/earth_night${suffix}`, (texture) => {
    texture.anisotropy = maxAnisotropy;
    globeMaterial.uniforms.nightTexture.value = texture;
  });
});

document.getElementById("toggleBorders").addEventListener("click", async () => {
  const { countryGroups, lineMeshes } = await loadCountryBorders(borderGroup);
  countryMeshes = countryGroups;
  countryLineMeshes = lineMeshes;
});

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
  borderGroup.rotation.y = globe.rotation.y;
  uniforms.lightDirection.value.set(0, 0, 1);

  controls.update();
  raycaster.setFromCamera(pointer, camera);
  const globeHit = raycaster.intersectObject(globe, true)[0];

  if (globeHit) {
    const intersects = raycaster.intersectObjects(countryLineMeshes, true);

    for (let i = 0; i < intersects.length; i++) {
      const intersect = intersects[i];
      const hitPoint = intersect.point;
      const distance = globeHit.point.distanceTo(hitPoint);

      if (distance < 0.02) {
        const newCountry = intersect.object.parent;
        if (
          newCountry &&
          newCountry.userData.isCountry &&
          (!hoveredCountry || newCountry !== hoveredCountry)
        ) {
          // Reset previous hovered country border color
          if (hoveredCountry) {
            hoveredCountry.children.forEach((child) => {
              if (child.visible && child.material) {
                child.material.color.set(0xffffff);
                child.material.opacity = 0.9;
              }
            });
          }

          // Set new hovered country border color
          hoveredCountry = newCountry;
          hoveredCountry.children.forEach((child) => {
            if (child.visible && child.material) {
              child.material.color.set(0x3399ff); // bright blue
              child.material.opacity = 1.0;
            }
          });

          console.log("Hovering:", hoveredCountry.userData.name);
        }

        break;
      }
    }
  }

  renderer.render(scene, camera);
}

animate();
