// countryHover.js
import * as THREE from "three";
import { countryCenters } from "../data/country_centroids.js";

let countryIdMapCanvas = null;
let countryIdCtx = null;
let imageLoaded = false;
let currentHoveredId = -1;
let labelContainer = null;
let labelEl = null;
let labelLine = null;
let cameraRef = null;

export function getCountryIdAtUV(uv) {
  if (!imageLoaded) return -1;

  const x = Math.floor(uv.x * countryIdMapCanvas.width);
  const y = Math.floor((1.0 - uv.y) * countryIdMapCanvas.height);
  const pixel = countryIdCtx.getImageData(x, y, 1, 1).data;
  return (pixel[0] << 16) | (pixel[1] << 8) | pixel[2];
}

export async function loadCountryIdMapTexture() {
  await Promise.all([
    new Promise((resolve) => {
      const image = new Image();
      image.src = "/country_id_map_8k_rgb.png";
      image.onload = () => {
        countryIdMapCanvas = document.createElement("canvas");
        countryIdMapCanvas.width = image.width;
        countryIdMapCanvas.height = image.height;
        countryIdCtx = countryIdMapCanvas.getContext("2d");
        countryIdCtx.drawImage(image, 0, 0);
        imageLoaded = true;
        resolve();
      };
    }),
  ]);
}

export function updateHoveredCountry(
  raycaster,
  pointer,
  camera,
  globe,
  globeMaterial
) {
  if (!imageLoaded) return { id: -1, position: null };

  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(globe)[0];
  if (!hit || !hit.uv || !hit.point) return { id: -1, position: null };

  const uv = hit.uv;
  const x = Math.floor(uv.x * countryIdMapCanvas.width);
  const y = Math.floor((1.0 - uv.y) * countryIdMapCanvas.height);
  const pixel = countryIdCtx.getImageData(x, y, 1, 1).data;
  const countryId = (pixel[0] << 16) | (pixel[1] << 8) | pixel[2];

  globeMaterial.uniforms.hoveredCountryId.value = countryId;

  if (countryId !== currentHoveredId) {
    const name = countryCenters[countryId]?.name || "(unknown)";
    console.log(`Hovering country ID: ${countryId} (${name})`);
  }

  return {
    id: countryId,
    position: hit.point.clone().normalize().multiplyScalar(1.01),
  };
}

export function initCountryLabel(container, camera) {
  cameraRef = camera;
  labelContainer = container;

  labelEl = document.createElement("div");
  labelEl.className = "label";
  labelEl.style.display = "none";
  labelContainer.appendChild(labelEl);

  labelLine = document.createElement("div");
  labelLine.className = "label-line";
  labelLine.style.display = "none";
  labelContainer.appendChild(labelLine);
}

export function updateCountryLabel(countryId) {
  if (!labelEl || !labelLine || !cameraRef) return;

  const entry = countryCenters[countryId];
  if (!entry) return;

  const radius = 1.005;

  // Optional tweaks to shift root slightly on the globe surface
  const phiOffset = THREE.MathUtils.degToRad(1.5);
  const thetaOffset = THREE.MathUtils.degToRad(-6.0);

  const phi = (90 - entry.lat) * (Math.PI / 180) + phiOffset;
  const theta = (entry.lon + 90) * (Math.PI / 180) + thetaOffset;

  let root3D = new THREE.Vector3().setFromSphericalCoords(radius, phi, theta);

  // Lift start of line off surface slightly
  root3D = root3D.add(root3D.clone().normalize().multiplyScalar(0.02));

  // Adjust label position outward based on camera distance
  const cameraDistance = cameraRef.position.distanceTo(root3D);
  const zoomFactor = THREE.MathUtils.clamp(cameraDistance, 2, 6); // tune if needed
  const labelOffsetDist = 0.15 + (zoomFactor - 2) * 0.06;

  const label3D = root3D
    .clone()
    .add(root3D.clone().normalize().multiplyScalar(labelOffsetDist));

  const rootScreen = root3D.clone().project(cameraRef);
  const labelScreen = label3D.clone().project(cameraRef);

  const rootX = (rootScreen.x * 0.5 + 0.5) * window.innerWidth;
  const rootY = (-rootScreen.y * 0.5 + 0.5) * window.innerHeight;
  const labelX = (labelScreen.x * 0.5 + 0.5) * window.innerWidth;
  const labelY = (-labelScreen.y * 0.5 + 0.5) * window.innerHeight;

  labelEl.textContent = entry.name;
  labelEl.style.left = `${labelX}px`;
  labelEl.style.top = `${labelY}px`;
  labelEl.style.display = "block";

  // Line from root to label
  const dx = labelX - rootX;
  const dy = labelY - rootY;
  const length = Math.sqrt(dx * dx + dy * dy);

  labelLine.style.width = `${length}px`;
  labelLine.style.height = `1px`;
  labelLine.style.left = `${rootX}px`;
  labelLine.style.top = `${rootY}px`;
  labelLine.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  labelLine.style.transformOrigin = `0 0`;
  labelLine.style.display = "block";
}

export function hideCountryLabel() {
  if (labelEl) labelEl.style.display = "none";
  if (labelLine) labelLine.style.display = "none";
}
