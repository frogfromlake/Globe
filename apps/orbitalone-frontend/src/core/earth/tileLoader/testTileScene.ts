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
import type { CreateTileMeshFn, TileLoaderConfig } from "./types";
import { DynamicTileManager } from "./DynamicTileManager";

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
camera.position.set(0, 0, 3.0);

// Setup OrbitControls
const controls = new OrbitControls(
  camera,
  renderer.domElement
) as OrbitControlsWithEvents;
controls.enableDamping = true;
controls.minDistance = 1.0001; // Always allows zooming to globe surface
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

const debugTileLoaderConfig: TileLoaderConfig = {
  enableFrustumCulling: true,
  enableDotProductFiltering: true,
  enableScreenSpacePrioritization: true,
  enableCaching: true,
};

// Low-res fallback tile manager (Z3)
const fallbackTileManager = new TileManager({
  urlTemplate,
  zoomLevel: 3,
  radius: 1,
  renderer,
  createTileMesh: createTileMeshFn,
  camera,
  config: debugTileLoaderConfig,
});

// Dynamic tile manager (Z4–Z13)
const dynamicTileManager = new DynamicTileManager({
  camera,
  renderer,
  urlTemplate,
  createTileMesh: createTileMeshFn,
  minZoom: 3,
  maxZoom: 13,
  fallbackTileManager,
  config: debugTileLoaderConfig,
  scene,
});

// Debug access from browser console
(window as any).fallbackTileManager = fallbackTileManager;
(window as any).dynamicTileManager = dynamicTileManager;
export let DEBUG_SPIRAL_BOUNDS = true;
(window as any).DEBUG_SPIRAL_BOUNDS = DEBUG_SPIRAL_BOUNDS;

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

      // 🔧 Ensure fallback is added BEFORE dynamic managers
      scene.add(fallbackTileManager.group);

      // 🔧 Also force fallback group to render first
      fallbackTileManager.group.renderOrder = 0;

      dynamicTileManager.attachToScene(scene);

      // 🔧 Force high-res groups to render after fallback
      for (const manager of dynamicTileManager["tileManagers"].values()) {
        manager.group.renderOrder = 1;
      }

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
  const distanceToSurface = Math.max(0.001, camera.position.length() - 1);
  const t = Math.min(distanceToSurface / 1.5, 1);

  // Ease softly — near 1 until very close
  const eased = Math.pow(t, 1.2); // t^1.5 slows less aggressively

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

// === Test: Show a known tile in DOM to check backend ===
// const testZ = 10;
// const testX = 220;
// const testY = 210;

// const tileURL = `${PROXY_BASE}/tile/${testZ}/${testX}/${testY}`;
// const flippedURL = `${PROXY_BASE}/tile/${testZ}/${testY}/${testX}`;

// const img1 = document.createElement("img");
// img1.src = tileURL;
// img1.style.position = "absolute";
// img1.style.top = "10px";
// img1.style.left = "10px";
// img1.style.width = "256px";
// img1.style.border = "2px solid red";
// img1.title = "Expected: /tile/3/2/1";
// document.body.appendChild(img1);

// const img2 = document.createElement("img");
// img2.src = flippedURL;
// img2.style.position = "absolute";
// img2.style.top = "10px";
// img2.style.left = "280px";
// img2.style.width = "256px";
// img2.style.border = "2px solid blue";
// img2.title = "Flipped: /tile/3/1/2";
// document.body.appendChild(img2);

animate();
