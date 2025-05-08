import {
  CatmullRomCurve3,
  Mesh,
  MeshBasicMaterial,
  TubeGeometry,
  Vector3,
  Group,
} from "three";
import { latLonToUnitVector } from "@/core/earth/geo/coordinates";
import { countryMeta } from "@/core/data/countryMeta";

const fallbackIsoMap: Record<string, string> = {
  "-99:Somaliland": "SO",
  "-99:Kosovo": "XK",
  "-99:France": "FR",
  "-99:Norway": "NO",
  "-99:Northern Cyprus": "CY",
  "-99:Indian Ocean Territories": "IO",
  "-99:Ashmore and Cartier Islands": "AU",
  "-99:Siachen Glacier": "IN",
  "CN-TW:Taiwan": "TW",
};

/**
 * Builds grouped TubeGeometry borders for each country from GeoJSON.
 */
export function buildCountryBorderMeshes(
  geojson: any,
  radius: number,
  tubeRadius = 0.07
): { mesh: Group; id: number; name: string }[] {
  const borders: { mesh: Group; id: number; name: string }[] = [];

  for (const feature of geojson.features) {
    const rawIso = feature.properties.ISO_A2 ?? feature.properties.iso ?? "";
    const rawName =
      feature.properties.ADMIN || feature.properties.name || "Unknown";

    const fallbackKey = `${rawIso}:${rawName}`;
    const normalizedIso = fallbackIsoMap[fallbackKey] || rawIso;

    const match = Object.entries(countryMeta).find(
      ([, meta]) => meta.iso === normalizedIso
    );
    const id = match ? parseInt(match[0], 10) : -1;

    if (id < 1) {
      console.warn(
        `❌ No countryMeta ID for ISO "${normalizedIso}" (${rawName})`
      );
      continue;
    }

    const geometry = feature.geometry;
    const polygons =
      geometry.type === "Polygon"
        ? [geometry.coordinates]
        : geometry.type === "MultiPolygon"
        ? geometry.coordinates
        : [];

    const group = new Group();
    let addedAny = false;

    let ringCounter = 0;

    for (const polygon of polygons) {
      for (const ring of polygon) {
        const ringLabel = `[${normalizedIso}] Ring #${ringCounter} (length ${ring.length})`;
        ringCounter++;

        // Only log up to 3 skipped rings per country
        if (ring.length < 4) {
          if (ringCounter < 3) {
            console.warn(`⚠️ Skipped too-short ring ${ringLabel}`);
          }
          continue;
        }

        const points: Vector3[] = ring
          .map(([lon, lat]: [number, number]) =>
            latLonToUnitVector(lat, lon).multiplyScalar(radius)
          )
          .filter(
            (v: { x: number; y: number; z: number }) =>
              isFinite(v.x) && isFinite(v.y) && isFinite(v.z)
          );

        if (points.length < 4) {
          if (ringCounter < 3) {
            console.warn(`⚠️ Invalid ring after filtering ${ringLabel}`);
          }
          continue;
        }

        try {
          const curve = new CatmullRomCurve3(points, false, "catmullrom", 0.0);
          const tube = new TubeGeometry(
            curve,
            Math.max(6, points.length * 2),
            tubeRadius,
            4,
            false
          );

          if (tube.attributes.position.count === 0) {
            if (ringCounter < 3) {
              console.warn(`❌ Empty geometry created ${ringLabel}`);
            }
            continue;
          }

          const material = new MeshBasicMaterial({ color: 0xaaaaaa });
          const mesh = new Mesh(tube, material);
          group.add(mesh);
          addedAny = true;
        } catch (err) {
          console.warn(`❌ Geometry exception ${ringLabel}`, err);
        }
      }
    }

    if (!addedAny) {
      console.warn(
        `⚠️ Skipped entire country: ${rawName} (${normalizedIso}) — no usable rings`
      );
    }

    const existing = borders.find((b) => b.id === id);
    if (addedAny) {
      if (existing) {
        existing.mesh.add(...group.children);
      } else {
        borders.push({ mesh: group, id, name: rawName });
      }
    }
  }

  return borders;
}
