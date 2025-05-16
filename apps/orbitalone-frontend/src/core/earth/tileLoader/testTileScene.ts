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

const PROXY_BASE =
  import.meta.env.VITE_TILE_PROXY_URL || "http://localhost:8080";

const urlTemplate = useKTX2
  ? "https://orbitalone-tiles.b-cdn.net/day/{z}/{x}/{y}.ktx2"
  : `${PROXY_BASE}/tile/{z}/{y}/{x}`;

const zoomLevel = useKTX2 ? 5 : 4;

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
const controls = new OrbitControls(
  camera,
  renderer.domElement
) as OrbitControlsWithEvents;

controls.enableDamping = true;
controls.minDistance = 1.1;
controls.maxDistance = 10;

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

// Initialize tile manager
const tileManager = new TileManager({
  urlTemplate,
  zoomLevel,
  radius: 1,
  renderer,
  createTileMesh: createTileMeshFn,
  camera,
});
scene.add(tileManager.group);

// Defer tile loading until OrbitControls finishes first update
let firstUpdateDone = false;
type OrbitControlsWithEvents = OrbitControls & {
  addEventListener: (type: string, listener: () => void) => void;
  dispatchEvent: (event: { type: "change" }) => void;
};

controls.addEventListener("change", () => {
  if (!firstUpdateDone) {
    firstUpdateDone = true;
    tileManager.loadTiles().then(() => {
      console.log("✅ Initial tile loading complete.");
    });
  } else {
    tileManager.updateTiles();
  }
});

// Resize handling
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Kick off initial camera update & tile loading
controls.update();
controls.dispatchEvent({ type: "change" }); // Trigger tile loading once

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
