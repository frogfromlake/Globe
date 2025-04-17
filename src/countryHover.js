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

  // if (countryId !== currentHoveredId) {
  // const name = countryCenters[countryId]?.name || "(unknown)";
  // console.log(`Hovering country ID: ${countryId} (${name})`);
  // }

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

export function updateCountryLabel(countryId, rotationY) {
  if (!labelEl || !labelLine || !cameraRef) return;

  const entry = countryCenters[countryId];
  if (!entry) return;

  const baseRadius = 1.005;
  const cameraDist = cameraRef.position.length();

  // const phiOffset = THREE.MathUtils.degToRad(0.0); // latitude shift
  // const thetaOffset = THREE.MathUtils.degToRad(5.0); // longitude shift

  const phi = (90 - entry.lat) * (Math.PI / 180);
  const theta = (entry.lon + 90) * (Math.PI / 180);

  // Compute 3D position from lat/lon
  let root3D = new THREE.Vector3().setFromSphericalCoords(
    baseRadius,
    phi,
    theta
  );

  // Apply globe rotation
  root3D.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);

  // Raise it slightly off the globe surface
  const liftAmount = 0.02; // adjust this for spacing
  root3D = root3D.add(root3D.clone().normalize().multiplyScalar(liftAmount));

  // Compute zoom scaling
  const minDist = 1.1;
  const maxDist = 10.0;
  const zoomFactor = THREE.MathUtils.clamp(
    (cameraDist - minDist) / (maxDist - minDist),
    0,
    1
  );

  const minLineLength = 30;
  const maxLineLength = 400;
  const lineLength = THREE.MathUtils.lerp(
    minLineLength,
    maxLineLength,
    zoomFactor
  );

  // Project root position to screen
  const rootScreen = root3D.clone().project(cameraRef);
  const rootX = (rootScreen.x * 0.5 + 0.5) * window.innerWidth;
  const rootY = (-rootScreen.y * 0.5 + 0.5) * window.innerHeight;

  // Direction to extend the label outward (toward camera direction)
  const label3D = root3D
    .clone()
    .add(cameraRef.position.clone().normalize().multiplyScalar(0.05));

  const labelScreen = label3D.clone().project(cameraRef);
  let labelX = (labelScreen.x * 0.5 + 0.5) * window.innerWidth;
  let labelY = (-labelScreen.y * 0.5 + 0.5) * window.innerHeight;

  // Direction and length of the line in screen space
  let dx = labelX - rootX;
  let dy = labelY - rootY;
  const screenLength = Math.sqrt(dx * dx + dy * dy);
  if (screenLength > 0) {
    dx = (dx / screenLength) * lineLength;
    dy = (dy / screenLength) * lineLength;
  }

  const endX = rootX + dx;
  const endY = rootY + dy;

  // Add spacing beyond line end
  const labelOffsetMin = 20;
  const labelOffsetMax = 50;
  const labelOffset = THREE.MathUtils.lerp(
    labelOffsetMin,
    labelOffsetMax,
    zoomFactor
  );

  const screenDirLength = Math.sqrt(dx * dx + dy * dy);
  const dirX = screenDirLength > 0 ? dx / screenDirLength : 0;
  const dirY = screenDirLength > 0 ? dy / screenDirLength : 0;

  const labelBoxOffset = 10; // consistent padding in px from line end

  // Assume fixed alignment: label is always drawn to the bottom-right of the line end
  labelX = endX + dirX * labelBoxOffset;
  labelY = endY + dirY * labelBoxOffset;

  // Apply manual transform offset to anchor top-left of box at this point
  labelEl.style.transform = "translate(0, 0)";

  // Update label position
  labelEl.textContent = entry.name;
  labelEl.style.left = `${labelX}px`;
  labelEl.style.top = `${labelY}px`;
  labelEl.style.display = "block";

  // Update connecting line
  labelLine.style.width = `${lineLength}px`;
  labelLine.style.height = `1px`;
  labelLine.style.left = `${rootX}px`;
  labelLine.style.top = `${rootY}px`;
  labelLine.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  labelLine.style.transformOrigin = `0 0`;
  labelLine.style.display = "block";

  // Debug info
  console.log(
    `[Label] ID: ${countryId}, Name: ${entry.name}, Zoom: ${zoomFactor.toFixed(
      2
    )}, LineLength: ${lineLength.toFixed(1)}px`
  );
}

export function hideCountryLabel() {
  if (labelEl) labelEl.style.display = "none";
  if (labelLine) labelLine.style.display = "none";
}
