import { Material } from "three";

export function disposeMaterial(material: Material | Material[]) {
  if (Array.isArray(material)) {
    material.forEach((m) => m.dispose());
  } else {
    material.dispose();
  }
}
