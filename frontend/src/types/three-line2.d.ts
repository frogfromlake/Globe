declare module "three/examples/jsm/lines/Line2" {
  import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2";
  import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
  import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";

  export class Line2 extends LineSegments2 {
    constructor(geometry?: LineGeometry, material?: LineMaterial);
    geometry: LineGeometry;
    material: LineMaterial;
    computeLineDistances(): this;
  }
}

declare module "three/examples/jsm/lines/LineGeometry" {
  import { BufferGeometry } from "three";

  export class LineGeometry extends BufferGeometry {
    constructor();
    setPositions(array: Array<number> | Float32Array): void;
  }
}

declare module "three/examples/jsm/lines/LineMaterial" {
  import { ShaderMaterial, ColorRepresentation, Vector2 } from "three";

  export class LineMaterial extends ShaderMaterial {
    constructor(parameters?: {
      color?: ColorRepresentation;
      linewidth?: number;
      dashed?: boolean;
      dashScale?: number;
      dashSize?: number;
      gapSize?: number;
      resolution?: Vector2;
      alphaToCoverage?: boolean;
      transparent?: boolean;
      opacity?: number;
      depthWrite?: boolean;
    });

    color: ColorRepresentation;
    linewidth: number;
    resolution: Vector2;
    dashed: boolean;
    dashScale: number;
    dashSize: number;
    gapSize: number;
  }
}
