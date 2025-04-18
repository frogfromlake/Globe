import * as THREE from "three";
import { CONFIG } from "../configs/config";

export function initializeTextures(renderer: THREE.WebGLRenderer) {
  const loader = new THREE.TextureLoader();

  const dayTexture = loader.load(CONFIG.textures.dayMapPath);
  const nightTexture = loader.load(CONFIG.textures.nightMapPath);

  const countryIdMapTexture = loader.load(
    CONFIG.textures.countryIdMapPath,
    (tex) => {
      tex.colorSpace = THREE.LinearSRGBColorSpace;
      tex.magFilter = CONFIG.textures.idMagFilter;
      tex.minFilter = CONFIG.textures.idMinFilter;
      tex.generateMipmaps = CONFIG.textures.generateMipmaps;
      tex.flipY = CONFIG.textures.flipY;
      tex.needsUpdate = true;
    }
  );

  const maxAnisotropy = Math.min(
    CONFIG.textures.maxAnisotropy,
    renderer.capabilities.getMaxAnisotropy()
  );

  [dayTexture, nightTexture].forEach((tex) => {
    tex.minFilter = CONFIG.textures.minFilter;
    tex.magFilter = CONFIG.textures.magFilter;
    tex.anisotropy = maxAnisotropy;
  });

  return { dayTexture, nightTexture, countryIdMapTexture };
}
