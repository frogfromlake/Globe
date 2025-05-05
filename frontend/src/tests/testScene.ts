/**
 * testScene.ts
 * A minimal standalone test scene to validate globe coordinates and lighting.
 * Shows:
 * - 🔴 Red marker at Greenwich (0°, 0°)
 * - 🟡 Yellow marker at real-time subsolar point (updated every frame)
 * - ☀️ Directional light from the Sun hitting the subsolar point
 * - ⏱ UTC time label in top-left corner
 * - No tilt, no rotation — a frozen reference globe
 */

import {
  Scene,
  Mesh,
  SphereGeometry,
  MeshBasicMaterial,
  DirectionalLight,
  AxesHelper,
} from "three";

import { CONFIG } from "../configs/config";
import { getSubsolarPoint, latLonToUnitVector } from "../astronomy/geo";
import { initializeRenderer } from "../init/initializeRenderer";
import { initializeCamera } from "../init/initializeCamera";

/**
 * Runs a standalone Earth sanity test scene.
 */
export async function runTestScene() {
  const scene = new Scene();
  const camera = initializeCamera();
  const renderer = initializeRenderer(camera);

  const testTime = new Date(Date.UTC(2025, 0, 1, 14, 0, 0)); // January is 0-indexed

  const testPoint = getSubsolarPoint(testTime);

  const expectedLat = -23 - 12.8 / 60; // S23° 12.8′ ≈ -23.2133°
  const expectedLon = -27 - 50.1 / 60; // GHA = 27° 50.1′E → Longitude = -27.835°

  compareWithAstron(testTime, testPoint.lat, testPoint.lon, {
    expectedLat,
    expectedLon,
  });

  document.body.innerHTML = "";
  document.body.appendChild(renderer.domElement);

  // === Globe
  const earth = new Mesh(
    new SphereGeometry(CONFIG.globe.radius, 64, 64),
    new MeshBasicMaterial({ color: 0x003366 })
  );
  scene.add(earth);

  // === Axes
  scene.add(new AxesHelper(CONFIG.globe.radius * 1.5));

  // === Greenwich marker 🔴
  const greenwichMarker = new Mesh(
    new SphereGeometry(0.01, 16, 16),
    new MeshBasicMaterial({ color: 0xff0000 })
  );
  greenwichMarker.position.copy(
    latLonToUnitVector(0, 0).multiplyScalar(CONFIG.globe.radius + 0.01)
  );
  scene.add(greenwichMarker);

  // === Subsolar marker 🟡
  const subsolarMarker = new Mesh(
    new SphereGeometry(0.01, 16, 16),
    new MeshBasicMaterial({ color: 0xffff00 })
  );
  scene.add(subsolarMarker);

  // === ASTRON marker 🔵
  const astronMarker = new Mesh(
    new SphereGeometry(0.01, 16, 16),
    new MeshBasicMaterial({ color: 0x3399ff })
  );
  const astronVec = latLonToUnitVector(expectedLat, expectedLon).multiplyScalar(
    CONFIG.globe.radius + 0.01
  );
  astronMarker.position.copy(astronVec);
  scene.add(astronMarker);

  // === Sunlight ☀️
  const light = new DirectionalLight(0xffffaa, 1.5);
  scene.add(light);
  scene.add((light.target = earth));

  // === UTC label
  const utcLabel = document.createElement("div");
  utcLabel.style.position = "absolute";
  utcLabel.style.top = "10px";
  utcLabel.style.left = "10px";
  utcLabel.style.color = "white";
  utcLabel.style.font = "14px monospace";
  utcLabel.style.background = "rgba(0, 0, 0, 0.5)";
  utcLabel.style.padding = "4px 8px";
  utcLabel.style.zIndex = "9999";
  document.body.appendChild(utcLabel);

  // === Camera
  camera.position.set(0, 0, CONFIG.globe.radius * 3);
  camera.lookAt(0, 0, 0);

  function animate() {
    requestAnimationFrame(animate);


    const { lat, lon } = getSubsolarPoint(testTime);
    const subsolarVec = latLonToUnitVector(lat, lon).multiplyScalar(
      CONFIG.globe.radius + 0.01
    );

    subsolarMarker.position.copy(subsolarVec);
    light.position.copy(subsolarVec.clone().normalize().multiplyScalar(5));
    light.target.updateMatrixWorld();

    utcLabel.textContent = `UTC: ${testTime.toUTCString()}`;

    // if (Math.floor(now.getMilliseconds() / 100) === 0) {
    //   console.log("🕓 UTC Time:", now.toISOString());
    //   console.log(
    //     `🟡 Subsolar point: lat = ${toDMS(lat)}, lon = ${toDMS(lon)}`
    //   );
    //   console.log("☀️ Light direction:", light.position.toArray());
    // }

    renderer.render(scene, camera);
  }

  animate();
}

function toDMS(deg: number, isLat = false): string {
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const m = ((abs - d) * 60).toFixed(1);
  const hemisphere = isLat ? (deg >= 0 ? "N" : "S") : deg >= 0 ? "E" : "W";
  return `${hemisphere}${String(d).padStart(3, "0")}° ${m}′`;
}

function compareWithAstron(
  time: Date,
  lat: number,
  lon: number,
  { expectedLat, expectedLon }: { expectedLat: number; expectedLon: number }
) {
  try {
    const latDiff = lat - expectedLat;
    const lonDiff = lon - expectedLon;

    console.log("🔭 ASTRON Exact Time:", time.toISOString());
    console.log(
      `📍 Decl of Sun: expected ${toDMS(expectedLat, true)}, got ${toDMS(
        lat,
        true
      )}, Δ = ${latDiff.toFixed(6)}°`
    );
    console.log(
      `📍 GHA of Sun:  expected ${toDMS(-expectedLon, false)}, got ${toDMS(
        -lon,
        false
      )}, Δ = ${(-lonDiff).toFixed(6)}°`
    );
  } catch (e) {
    console.error("❌ compareWithAstron() failed:", e);
  }
}
