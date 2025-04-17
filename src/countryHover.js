// countryHover.js
import * as THREE from "three";
import { countryCenters } from "../data/country_centroids.js";

let countryIdMapCanvas = null;
let countryIdCtx = null;
let imageLoaded = false;
let labelContainer = null;
let cameraRef = null;

const labelsMap = new Map(); // countryId -> { labelEl, labelLine }

export function getCountryIdAtUV(uv) {
  if (!imageLoaded) return -1;

  const x = Math.floor(uv.x * countryIdMapCanvas.width);
  const y = Math.floor((1.0 - uv.y) * countryIdMapCanvas.height);
  const pixel = countryIdCtx.getImageData(x, y, 1, 1).data;
  return (pixel[0] << 16) | (pixel[1] << 8) | pixel[2];
}

export async function loadCountryIdMapTexture() {
  await new Promise((resolve) => {
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
  });
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

  return {
    id: countryId,
    position: hit.point.clone().normalize().multiplyScalar(1.01),
  };
}

export function initCountryLabel(container, camera) {
  cameraRef = camera;
  labelContainer = container;
}

export function updateCountryLabel(countryId, rotationY) {
  if (!cameraRef || !labelContainer) return;
  const entry = countryCenters[countryId];
  if (!entry) return;

  // Create label + line if not yet created
  if (!labelsMap.has(countryId)) {
    const labelEl = document.createElement("div");
    labelEl.className = "label";
    labelEl.dataset.id = countryId;

    const labelLine = document.createElement("div");
    labelLine.className = "label-line";
    labelLine.dataset.id = countryId;

    labelContainer.appendChild(labelEl);
    labelContainer.appendChild(labelLine);

    labelsMap.set(countryId, { labelEl, labelLine });
  }

  const { labelEl, labelLine } = labelsMap.get(countryId);

  const baseRadius = 1.005;
  const cameraDist = cameraRef.position.length();

  const phi = (90 - entry.lat) * (Math.PI / 180);
  const theta = (entry.lon + 90) * (Math.PI / 180);

  let root3D = new THREE.Vector3().setFromSphericalCoords(
    baseRadius,
    phi,
    theta
  );
  root3D.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);
  root3D.add(root3D.clone().normalize().multiplyScalar(0.02)); // Small nudge outwards for clarity

  const minDist = 1.1;
  const maxDist = 10.0;
  const zoomFactor = THREE.MathUtils.clamp(
    (cameraDist - minDist) / (maxDist - minDist),
    0,
    1
  );
  const easedZoom = Math.pow(zoomFactor, 0.5);

  // Calculate the label's 3D position along the radial direction
  const radialDir = root3D.clone().normalize();
  const label3D = root3D
    .clone()
    .add(radialDir.clone().multiplyScalar(easedZoom * 1.5));

  // Convert 3D coordinates to 2D screen space
  const rootScreen = root3D.clone().project(cameraRef);
  const rootX = (rootScreen.x * 0.5 + 0.5) * window.innerWidth;
  const rootY = (-rootScreen.y * 0.5 + 0.5) * window.innerHeight;

  const labelScreen = label3D.clone().project(cameraRef);
  const labelX = (labelScreen.x * 0.5 + 0.5) * window.innerWidth;
  const labelY = (-labelScreen.y * 0.5 + 0.5) * window.innerHeight;

  // Compute line properties
  const dx = labelX - rootX;
  const dy = labelY - rootY;
  const lineLength = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  // Dynamic transform for label anchoring
  const horizontalAlign = dx >= 0 ? "left" : "right";
  const transform = dx >= 0 ? "translate(0, -50%)" : "translate(-100%, -50%)";

  // Apply styles to label
  labelEl.textContent = entry.name;
  labelEl.style.left = `${labelX}px`;
  labelEl.style.top = `${labelY}px`;
  labelEl.style.display = "block";
  labelEl.style.textAlign = horizontalAlign;
  labelEl.style.transform = transform;

  // Apply styles to line
  labelLine.style.width = `${lineLength}px`;
  labelLine.style.height = `1px`;
  labelLine.style.left = `${rootX}px`;
  labelLine.style.top = `${rootY}px`;
  labelLine.style.transform = `rotate(${angle}rad)`;
  labelLine.style.transformOrigin = `0 0`;
  labelLine.style.display = "block";

  console.log(
    `[Label] ID: ${countryId}, Name: ${entry.name}, Zoom: ${zoomFactor.toFixed(
      2
    )}, LineLength: ${lineLength.toFixed(1)}px`
  );
}


export function hideAllLabelsExcept(idsToKeep = []) {
  for (const [id, { labelEl, labelLine }] of labelsMap.entries()) {
    if (!idsToKeep.includes(id)) {
      labelEl.style.display = "none";
      labelLine.style.display = "none";
    }
  }
}
