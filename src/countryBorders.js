import * as THREE from "three";

let borderLines = null;

export async function loadCountryBorders(group, globeRadius = 1.002) {
  if (borderLines) {
    group.clear(); // properly clear existing lines
    borderLines = null;
    return;
  }

  const response = await fetch("/geojson/countries.geojson");
  const data = await response.json();

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });

  const createLine = (points) => {
    const positions = points.map(([lon, lat]) => {
      const phi = (90 - lat) * (Math.PI / 180);
    //   const theta = ((-lon + 90) * Math.PI) / 180;
      const theta = ((0 - lon) * Math.PI) / 180;
      return new THREE.Vector3(
        globeRadius * Math.sin(phi) * Math.cos(theta),
        globeRadius * Math.cos(phi),
        globeRadius * Math.sin(phi) * Math.sin(theta)
      );
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(positions);
    const line = new THREE.Line(geometry, lineMaterial);
    group.add(line);
  };

  data.features.forEach((feature) => {
    const coords = feature.geometry.coordinates;
    const type = feature.geometry.type;

    if (type === "Polygon") {
      coords.forEach((ring) => createLine(ring));
    } else if (type === "MultiPolygon") {
      coords.forEach((poly) => poly.forEach((ring) => createLine(ring)));
    }
  });

  borderLines = group;
}
