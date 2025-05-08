import {
  CatmullRomCurve3,
  Mesh,
  MeshBasicMaterial,
  TubeGeometry,
  Vector3,
  Group,
} from "three";
import { latLonToUnitVector } from "@/core/earth/geo/coordinates";
import { oceanCenters } from "@/core/data/oceanCenters";
import { slerpOnSphere } from "@/utils/oceanBorderUtils";

/**
 * Builds grouped TubeGeometry borders for each ocean from simplified GeoJSON.
 */
export function buildOceanBorderMeshes(
  geojson: any,
  radius: number,
  tubeRadius = 0.07
): { mesh: Group; id: number; name: string }[] {
  const borders: { mesh: Group; id: number; name: string }[] = [];

  for (let i = 0; i < geojson.features.length; i++) {
    const feature = geojson.features[i];
    const id = i + 10000;

    if (!feature.geometry) {
      console.warn(`❌ Skipped ocean #${id} — missing geometry.`);
      continue;
    }

    if (!(id in oceanCenters)) {
      console.warn(`❌ Skipped ocean #${id} — no matching center entry.`);
      continue;
    }

    const { name } = oceanCenters[id];
    const geometry = feature.geometry;
    const polygons =
      geometry.type === "Polygon"
        ? [geometry.coordinates]
        : geometry.type === "MultiPolygon"
        ? geometry.coordinates
        : [];

    const group = new Group();
    let addedAny = false;

    let ringIndex = 0;
    for (const polygon of polygons) {
      for (const ring of polygon) {
        const ringLabel = `[${id}] Ring #${ringIndex++} (length ${
          ring.length
        })`;

        if (ring.length < 4) {
          console.warn(`⚠️ Skipped too-short ring ${ringLabel}`);
          continue;
        }

        const points = ring
          .map(([lon, lat]: [number, number]) =>
            latLonToUnitVector(lat, lon).multiplyScalar(radius)
          )
          .filter(
            (v: { x: number; y: number; z: number }) =>
              isFinite(v.x) && isFinite(v.y) && isFinite(v.z)
          );

        if (points.length < 4) {
          console.warn(`⚠️ Invalid ring after filtering ${ringLabel}`);
          continue;
        }

        try {
          // Generate smoother great-circle arc by slerping between consecutive points
          const interpolated: Vector3[] = [];
          const segmentsPerEdge = 20; // Increase for smoother results

          for (let j = 0; j < points.length - 1; j++) {
            const start = points[j].clone().normalize();
            const end = points[j + 1].clone().normalize();

            for (let k = 0; k < segmentsPerEdge; k++) {
              const t = k / segmentsPerEdge;
              const p = slerpOnSphere(start, end, t).multiplyScalar(radius);
              interpolated.push(p);
            }
          }
          interpolated.push(points[points.length - 1].clone()); // Final point

          const curve = new CatmullRomCurve3(
            interpolated,
            false,
            "catmullrom",
            0.0
          );
          const tube = new TubeGeometry(
            curve,
            Math.max(12, interpolated.length),
            tubeRadius,
            6,
            false
          );

          if (tube.attributes.position.count === 0) {
            console.warn(`❌ Empty geometry created ${ringLabel}`);
            continue;
          }

          const material = new MeshBasicMaterial({ color: 0x00bbff });
          const mesh = new Mesh(tube, material);
          group.add(mesh);
          addedAny = true;
        } catch (err) {
          console.warn(`❌ Geometry exception ${ringLabel}`, err);
        }
      }
    }

    if (addedAny) {
      borders.push({ mesh: group, id, name });
    } else {
      console.warn(`⚠️ Skipped ocean: ${name} (#${id}) — no usable rings`);
    }
  }

  return borders;
}
