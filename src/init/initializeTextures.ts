import * as THREE from "three";

export function initializeTextures(renderer: THREE.WebGLRenderer) {
  const loader = new THREE.TextureLoader();

  const dayTexture = loader.load("/textures/earth_day_8k.jpg");
  const nightTexture = loader.load("/textures/earth_night_8k.jpg");
  const countryIdMapTexture = loader.load(
    "/textures/country_id_map_8k_rgb.png",
    (tex) => {
      tex.colorSpace = THREE.LinearSRGBColorSpace;
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.flipY = false;
      tex.needsUpdate = true;
    }
  );

  const maxAnisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  [dayTexture, nightTexture].forEach((tex) => {
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = maxAnisotropy;
  });

  return { dayTexture, nightTexture, countryIdMapTexture };
}
