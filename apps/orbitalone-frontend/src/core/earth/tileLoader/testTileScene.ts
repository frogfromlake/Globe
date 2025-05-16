import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  AmbientLight,
  DirectionalLight,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Color,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TileManager } from "./tileManager";
import { createTileMeshRaster } from "./createTileMeshRaster";
import { createTileMeshKTX2 } from "./createTileMeshKTX2";
import type { CreateTileMeshFn } from "./types";

// Select tile source format
const useKTX2 = false; // true for .ktx2 tiles, false for Sentinel-2 Cloudless JPEG tiles

const createTileMeshFn: CreateTileMeshFn = useKTX2
  ? createTileMeshKTX2
  : createTileMeshRaster;

// const urlTemplate = useKTX2
//   ? "https://orbitalone-tiles.b-cdn.net/day/{z}/{x}/{y}.ktx2"
//   : "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg";

const PROXY_BASE =
  import.meta.env.VITE_TILE_PROXY_URL || "http://localhost:8080";

const urlTemplate = useKTX2
  ? "https://orbitalone-tiles.b-cdn.net/day/{z}/{x}/{y}.ktx2"
  : `${PROXY_BASE}/tile/{z}/{y}/{x}`;

const zoomLevel = useKTX2 ? 5 : 3;

// Initialize the scene
const scene = new Scene();
scene.background = new Color(0x000000);

// Setup camera
const camera = new PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 2.5);

// Setup renderer
const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Setup orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 1.1;
controls.maxDistance = 10;

(controls as any).addEventListener("change", () => {
  tileManager.updateTiles();
});

// Optional wireframe Earth for debugging
const wireframeEarth = new Mesh(
  new SphereGeometry(1, 128, 128),
  new MeshBasicMaterial({
    color: 0x444444,
    wireframe: true,
    opacity: 0.3,
    transparent: true,
  })
);
wireframeEarth.visible = false;
scene.add(wireframeEarth);

// Lighting
scene.add(new AmbientLight(0xffffff, 0.8));
const directionalLight = new DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(3, 2, 1);
scene.add(directionalLight);

// Initialize and load tiles
const tileManager = new TileManager({
  urlTemplate,
  zoomLevel,
  radius: 1,
  renderer,
  createTileMesh: createTileMeshFn,
  camera,
});

scene.add(tileManager.group);

tileManager.loadTiles().then(() => {
  console.log("✅ Tile loading complete.");
});

// Resize handling
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
