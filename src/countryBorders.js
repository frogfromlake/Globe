// countryBorders.js
import * as THREE from "three";
import { defaultLineMaterial } from "./materials.js";

let borderLines = null;

export async function loadCountryBorders(group, globeRadius = 1.002) {
  if (borderLines) {
    group.clear();
    borderLines = null;
    return { countryGroups: [], lineMeshes: [] };
  }

  const response = await fetch("/geojson/countries.geojson");
  const data = await response.json();

  const countryGroups = [];
  const lineMeshes = []; // will store the invisible hit zones

  const createCountryMesh = (rings, name) => {
    const countryGroup = new THREE.Group();
    countryGroup.name = name;
    countryGroup.userData = { isCountry: true, name };

    rings.forEach((ring) => {
      if (ring.length < 40) return; // skip small islands

      const points = ring.map(([lon, lat]) => {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (-lon * Math.PI) / 180;
        return new THREE.Vector3(
          globeRadius * Math.sin(phi) * Math.cos(theta),
          globeRadius * Math.cos(phi),
          globeRadius * Math.sin(phi) * Math.sin(theta)
        );
      });

      const curve = new THREE.CatmullRomCurve3(points, true, "centripetal");

      // Visible border
      //   new THREE.TubeGeometry(
      //     path, // The curve (your border line)
      //     tubularSegments, // How many segments along the path
      //     radius, //  Border thickness
      //     radialSegments, // Smoothness of the tube
      //     closed // Whether the tube is closed
      //   );
      const tubeGeo = new THREE.TubeGeometry(curve, 128, 0.001, 6, true);

      const borderMesh = new THREE.Mesh(tubeGeo, defaultLineMaterial.clone());
      countryGroup.add(borderMesh);

      // Invisible raycasting helper
      const pickGeo = new THREE.TubeGeometry(curve, 64, 0.01, 4, false);
      const pickMesh = new THREE.Mesh(
        pickGeo,
        new THREE.MeshBasicMaterial({ visible: false })
      );
      countryGroup.add(pickMesh);
      lineMeshes.push(pickMesh);
    });

    group.add(countryGroup);
    countryGroups.push(countryGroup);
  };

  const uniqueCountries = new Set();

  data.features.forEach((feature) => {
    const name = feature.properties.name || "Unknown";
    if (uniqueCountries.has(name)) return;
    uniqueCountries.add(name);

    const coords = feature.geometry.coordinates;
    const type = feature.geometry.type;

    if (type === "Polygon") {
      createCountryMesh(coords, name);
    } else if (type === "MultiPolygon") {
      coords.forEach((polygon) => createCountryMesh(polygon, name));
    }
  });

  borderLines = group;
  return { countryGroups, lineMeshes };
}
