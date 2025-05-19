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
import { DynamicTileManager } from "./DynamicTileManager";
import { getCameraCenterDirection } from "./utils/cameraUtils";

// Select tile source format
const useKTX2 = false; // true for .ktx2 tiles, false for Sentinel-2 Cloudless JPEG tiles

const createTileMeshFn: CreateTileMeshFn = useKTX2
  ? createTileMeshKTX2
  : createTileMeshRaster;

const PROXY_BASE =
  import.meta.env.VITE_TILE_PROXY_URL || "http://localhost:8080";

const urlTemplate = useKTX2
  ? "https://orbitalone-tiles.b-cdn.net/day/{z}/{x}/{y}.ktx2"
  : `${PROXY_BASE}/tile/{z}/{x}/{y}`;

// Initialize the scene
const scene = new Scene();
scene.background = new Color(0x000000);

// Setup renderer
const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Setup camera
const camera = new PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.0001, // near plane allows very close approach
  100
);
camera.position.set(0, 0, 2.5);

// Setup OrbitControls
const controls = new OrbitControls(
  camera,
  renderer.domElement
) as OrbitControlsWithEvents;
controls.enableDamping = true;
controls.minDistance = 1.001; // Always allows zooming to globe surface
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

// Low-res fallback tile manager (Z2)
const fallbackTileManager = new TileManager({
  urlTemplate,
  zoomLevel: 3, // Always Z2 fallback
  radius: 1,
  renderer,
  createTileMesh: createTileMeshFn,
  camera,
});

// Dynamic tile manager (Z4–Z13)
const dynamicTileManager = new DynamicTileManager({
  camera,
  renderer,
  urlTemplate,
  createTileMesh: createTileMeshFn,
  minZoom: 4,
  maxZoom: 13,
  fallbackTileManager,
});

dynamicTileManager.attachToScene(scene);

// Defer high-res tile loading until OrbitControls finishes first update
let firstUpdateDone = false;
type OrbitControlsWithEvents = OrbitControls & {
  addEventListener: (type: string, listener: () => void) => void;
  dispatchEvent: (event: { type: "change" }) => void;
};

// Defer high-res tile loading until OrbitControls finishes first update
controls.addEventListener("change", () => {
  if (!firstUpdateDone) {
    firstUpdateDone = true;

    fallbackTileManager.loadAllTiles().then(() => {
      console.log(
        "✅ Z3 fallback tiles loaded:",
        fallbackTileManager["visibleTiles"].size
      );

      scene.add(fallbackTileManager.group);

      dynamicTileManager.attachToScene(scene);
      dynamicTileManager.loadInitialTiles();
    });
  } else {
    dynamicTileManager.update();
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
  // console.log("📷 Camera Distance:", camera.position.length().toPrecision(5));
  const distanceToSurface = Math.max(0.001, camera.position.length() - 1);
  const t = Math.min(distanceToSurface / 1.5, 1);

  // Ease softly — near 1 until very close
  const eased = Math.pow(t, 1.5); // t^1.5 slows less aggressively

  // Adjust slowFactor: only reduce below 0.1 when REALLY close
  let slowFactor = 1.0;
  if (distanceToSurface < 0.005) {
    slowFactor = 0.05; // Ultra slow when almost inside globe
  } else if (distanceToSurface < 0.01) {
    slowFactor = 0.15;
  } else if (distanceToSurface < 0.02) {
    slowFactor = 0.5;
  } else if (distanceToSurface < 0.03) {
    slowFactor = 0.7;
  } else if (distanceToSurface < 0.05) {
    slowFactor = 0.8;
  }

  controls.zoomSpeed = (1.0 * eased + 0.01) * slowFactor;
  controls.rotateSpeed = (1.0 * eased + 0.01) * slowFactor;

  controls.update();
  renderer.render(scene, camera);
}

animate();
