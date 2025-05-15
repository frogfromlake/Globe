import { Texture, SpriteMaterial, Color, Vector2 } from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { CONFIG } from "@/configs/config";

/**
 * Creates a transparent, glowing SpriteMaterial for country or ocean labels.
 *
 * @param texture - The texture used for the sprite label.
 * @param isOcean - If true, uses ocean-specific styling; otherwise, uses country styling.
 * @returns A SpriteMaterial with predefined styling.
 */
export function createLabelSpriteMaterial(
  texture: Texture,
  isOcean: boolean
): SpriteMaterial {
  const labelColor = new Color(
    isOcean
      ? CONFIG.labels3D.ocean.labelColor
      : CONFIG.labels3D.country.labelColor
  );

  return new SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    color: labelColor,
  });
}

/**
 * Creates a screen-resolution-aware LineMaterial for label connector lines.
 *
 * @param isOcean - If true, uses ocean-specific styling; otherwise, uses country styling.
 * @returns A LineMaterial compatible with Line2.
 */
export function createLabelLineMaterial(isOcean: boolean): LineMaterial {
  const config = isOcean ? CONFIG.labels3D.ocean : CONFIG.labels3D.country;

  return new LineMaterial({
    color: config.lineColor,
    linewidth: config.lineWidth,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    resolution: new Vector2(window.innerWidth, window.innerHeight),
  });
}

/**
 * Creates a new Line2 instance with default geometry and appropriate material.
 *
 * @param isOcean - If true, creates an ocean-style line; otherwise, a country-style line.
 * @returns A Line2 with default positions and material.
 */
export function createLabelLine(isOcean: boolean): Line2 {
  const geometry = new LineGeometry();
  geometry.setPositions([0, 0, 0, 0, 0, 0]); // Two 3D points (x1, y1, z1, x2, y2, z2)
  const material = createLabelLineMaterial(isOcean);
  const line = new Line2(geometry, material);
  line.computeLineDistances(); // Enables proper dashed line rendering if needed
  return line;
}
