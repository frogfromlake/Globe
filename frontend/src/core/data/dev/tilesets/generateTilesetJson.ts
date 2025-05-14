import fs from "fs";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TILESET_ROOT = path.resolve(__dirname, "tileset-glb");
const INPUTS = [
  {
    inputDir: path.join(TILESET_ROOT, "day"),
    outputPath: path.join(TILESET_ROOT, "day", "tileset.json"),
    label: "🌞 Day",
  },
  {
    inputDir: path.join(TILESET_ROOT, "night"),
    outputPath: path.join(TILESET_ROOT, "night", "tileset.json"),
    label: "🌙 Night",
  },
];

const GLOBE_RADIUS = 1;
const MIN_LEVEL = 5;
const MAX_LEVEL = 7;

function tileLatLonToXYZBounds(
  z: number,
  x: number,
  y: number,
  radius: number
) {
  const n = 2 ** z;
  const lonMin = -180 + (x / n) * 360;
  const lonMax = -180 + ((x + 1) / n) * 360;
  const latMax = 90 - (y / n) * 180;
  const latMin = 90 - ((y + 1) / n) * 180;

  const toRad = (d: number) => (d * Math.PI) / 180;
  const toVec3 = (lat: number, lon: number) => {
    const phi = toRad(90 - lat);
    const theta = toRad(lon + 180);
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return [x, y, z];
  };

  const p1 = toVec3(latMin, lonMin);
  const p2 = toVec3(latMax, lonMax);

  const center = [
    (p1[0] + p2[0]) / 2,
    (p1[1] + p2[1]) / 2,
    (p1[2] + p2[2]) / 2,
  ];
  const pad = 0.001;
  const halfSize = [
    Math.abs(p2[0] - p1[0]) / 2 + pad,
    Math.abs(p2[1] - p1[1]) / 2 + pad,
    Math.abs(p2[2] - p1[2]) / 2 + pad,
  ];

  return {
    box: [...center, halfSize[0], 0, 0, 0, halfSize[1], 0, 0, 0, halfSize[2]],
  };
}

function generateTiles(inputDir: string) {
  const tiles = new Map();

  for (let z = MIN_LEVEL; z <= MAX_LEVEL; z++) {
    const zPath = path.join(inputDir, z.toString());
    if (!fs.existsSync(zPath)) continue;

    const xDirs = fs.readdirSync(zPath);
    for (const xStr of xDirs) {
      const x = parseInt(xStr);
      const xPath = path.join(zPath, xStr);
      if (!fs.existsSync(xPath)) continue;

      const yFiles = fs.readdirSync(xPath);
      for (const yFile of yFiles) {
        if (!yFile.endsWith(".glb")) continue;
        const y = parseInt(path.basename(yFile, ".glb"));
        const key = `${z}/${x}/${y}`;
        const uri = `${z}/${x}/${y}.glb`;

        const bounds = tileLatLonToXYZBounds(z, x, y, GLOBE_RADIUS);
        const geometricError = z === MAX_LEVEL ? 0 : 256 / 2 ** (z - MIN_LEVEL);
        const refine = z === MIN_LEVEL ? "REPLACE" : "ADD";

        tiles.set(key, { key, z, x, y, uri, bounds, geometricError, refine });
      }
    }
  }

  return tiles;
}

function buildTileTree(tiles: Map<string, any>) {
  const nodes = new Map<string, any>();

  // Create nodes for each tile
  for (const tile of tiles.values()) {
    const node = {
      boundingVolume: tile.bounds,
      geometricError: tile.geometricError,
      content: { uri: tile.uri, mimeType: "model/gltf-binary" },
      refine: tile.refine,
      children: [],
    };
    nodes.set(tile.key, node);
  }

  // Link children to parents
  for (const tile of tiles.values()) {
    const parentZ = tile.z - 1;
    if (parentZ < MIN_LEVEL) continue;
    const parentX = Math.floor(tile.x / 2);
    const parentY = Math.floor(tile.y / 2);
    const parentKey = `${parentZ}/${parentX}/${parentY}`;
    const parent = nodes.get(parentKey);
    if (parent) {
      parent.children.push(nodes.get(tile.key));
      nodes.delete(tile.key); // only keep top-most parents
    }
  }

  // Compute root bounding box
  const rootChildren = Array.from(nodes.values());
  const allBoxes = rootChildren.map((n) => n.boundingVolume.box);

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (const box of allBoxes) {
    const [cx, cy, cz, hx, , , , hy, , , , hz] = box;
    const lo = [cx - hx, cy - hy, cz - hz];
    const hi = [cx + hx, cy + hy, cz + hz];
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], lo[i]);
      max[i] = Math.max(max[i], hi[i]);
    }
  }

  const rootCenter = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ];
  const rootHalfSize = [
    (max[0] - min[0]) / 2,
    (max[1] - min[1]) / 2,
    (max[2] - min[2]) / 2,
  ];

  return {
    asset: { version: "1.0" },
    geometricError: 512,
    root: {
      boundingVolume: {
        box: [
          ...rootCenter,
          rootHalfSize[0],
          0,
          0,
          0,
          rootHalfSize[1],
          0,
          0,
          0,
          rootHalfSize[2],
        ],
      },
      geometricError: 256,
      refine: "REPLACE",
      children: rootChildren,
    },
  };
}

// Run for each tileset
for (const { inputDir, outputPath, label } of INPUTS) {
  const tiles = generateTiles(inputDir);
  const tileset = buildTileTree(tiles);
  fs.writeFileSync(outputPath, JSON.stringify(tileset, null, 2));
  console.log(`✅ ${label} tileset written to ${outputPath}`);
}
