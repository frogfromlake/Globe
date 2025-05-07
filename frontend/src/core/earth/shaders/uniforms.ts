// src/shaders/uniforms.ts
import { IUniform, Texture, Vector2, Vector3, DataTexture } from "three";

/**
 * @interface GlobeUniforms
 * @description Defines the uniform variables used in the globe shaders.
 * These uniforms are passed from JavaScript to GLSL and control the appearance and behavior of the globe, textures, lighting, and interactions.
 */
export interface GlobeUniforms {
  dayTexture: IUniform<Texture>;
  nightTexture: IUniform<Texture>;
  countryIdMap: IUniform<Texture>;
  previousHoveredId: IUniform<number>;
  hoveredCountryId: IUniform<number>;
  uTime: IUniform<number>;
  lightDirection: IUniform<Vector3>;
  highlightFadeIn: IUniform<number>;
  highlightFadeOut: IUniform<number>;
  selectedMask: IUniform<DataTexture>;
  cameraDirection: IUniform<Vector3>;
  cityLightStrength: IUniform<number>;
  cursorWorldPos: IUniform<Vector3>;
  cursorGlowStrength: IUniform<number>;
  cursorGlowRadius: IUniform<number>;
  cursorUV: IUniform<Vector2>;
  hoveredOceanId: IUniform<number>;
  uCursorOnGlobe: IUniform<boolean>;
  nightBrightness: IUniform<number>;
  uCameraDistance: IUniform<number>;
  uTextureFade: IUniform<number>;
  uStarFade: IUniform<number>;
  uCountryCount: IUniform<number>;
  uOceanCount: IUniform<number>;
  bumpScale: IUniform<number>;
  uHoverEnabled: IUniform<boolean>;

  /** Dynamic uniform extension point */
  [uniform: string]: IUniform<any>;
}
