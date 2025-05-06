import { Texture, SpriteMaterial, Color, Vector2 } from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { CONFIG } from '@/configs/config';

/**
 * Creates a transparent material for glowing 2D label sprites.
 * @param texture - The texture to be used for the label sprite.
 * @param isOcean - Boolean flag to distinguish between ocean and country labels for color adjustment.
 */
export function createLabelSpriteMaterial(
  texture: Texture,
  isOcean: boolean
): SpriteMaterial {
  const labelColor = isOcean
    ? CONFIG.labels3D.ocean.labelColor
    : CONFIG.labels3D.country.labelColor;

  return new SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    color: new Color(labelColor),
  });
}

/**
 * Creates a line material for label connector lines based on type (country or ocean).
 * @param isOcean - Boolean flag to distinguish between ocean and country labels
 */
export function createLabelLineMaterial(isOcean: boolean): LineMaterial {
  const color = isOcean
    ? CONFIG.labels3D.ocean.lineColor
    : CONFIG.labels3D.country.lineColor; // Choose color based on type
  return new LineMaterial({
    color: color,
    linewidth: isOcean
      ? CONFIG.labels3D.ocean.lineWidth
      : CONFIG.labels3D.country.lineWidth, // Choose line width based on type
    transparent: true,
    opacity: 0,
    depthWrite: false,
    resolution: new Vector2(window.innerWidth, window.innerHeight),
  });
}

/**
 * Utility for creating a Line2 instance with default geometry and material.
 * @param isOcean - Boolean flag to distinguish between ocean and country labels
 */
export function createLabelLine(isOcean: boolean): Line2 {
  const geometry = new LineGeometry();
  geometry.setPositions([0, 0, 0, 0, 0, 0]);
  const material = createLabelLineMaterial(isOcean); // Pass the flag here for correct line material
  const line = new Line2(geometry, material);
  line.computeLineDistances();
  return line;
}
