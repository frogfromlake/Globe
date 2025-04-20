// src/materials/starMaterials.ts
import * as THREE from "three";
import { CONFIG } from "../configs/config";

export function createStarMaterial(): THREE.MeshBasicMaterial {
  const starTexture = new THREE.TextureLoader().load(
    CONFIG.textures.esoSkyMapPath,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
  );

  return new THREE.MeshBasicMaterial({
    map: starTexture,
    side: THREE.BackSide,
    depthWrite: false,
    transparent: true,
    opacity: CONFIG.stars.opacity,
    color: new THREE.Color(...CONFIG.stars.tint), // [r, g, b] in 0–1
  });
}
