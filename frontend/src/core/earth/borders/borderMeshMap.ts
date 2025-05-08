import { Group, Object3DEventMap } from "three";

// Global store for geometry-based country borders
export const countryBorderMeshMap = new Map<number, Group<Object3DEventMap>>();

// Global store for geometry-based ocean borders
export const oceanBorderMeshMap = new Map<number, Group<Object3DEventMap>>();
