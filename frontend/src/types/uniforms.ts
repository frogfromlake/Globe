import * as THREE from "three";

export interface GlobeUniforms {
  [uniform: string]: THREE.IUniform<any>;

  dayTexture: THREE.IUniform<THREE.Texture>;
  nightTexture: THREE.IUniform<THREE.Texture>;
  countryIdMap: THREE.IUniform<THREE.Texture>;
  previousHoveredId: THREE.IUniform<number>;
  hoveredCountryId: THREE.IUniform<number>;
  uTime: THREE.IUniform<number>;
  lightDirection: THREE.IUniform<THREE.Vector3>;
  highlightFadeIn: THREE.IUniform<number>;
  highlightFadeOut: THREE.IUniform<number>;
  selectedMask: THREE.IUniform<THREE.DataTexture>;
  cameraDirection: THREE.IUniform<THREE.Vector3>;
  cityLightStrength: THREE.IUniform<number>;
  cursorWorldPos: THREE.IUniform<THREE.Vector3>;
  cursorGlowStrength: THREE.IUniform<number>;
  cursorGlowRadius: THREE.IUniform<number>;
  cursorUV: THREE.IUniform<THREE.Vector2>;
  hoveredOceanId: THREE.IUniform<number>;
  uCursorOnGlobe: THREE.IUniform<boolean>;
  nightBrightness: THREE.IUniform<number>;
}
