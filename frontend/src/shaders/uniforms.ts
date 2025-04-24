import * as THREE from "three";

/**
 * @interface GlobeUniforms
 * @description Defines the uniform variables used in the globe shaders.
 * These uniforms are passed from JavaScript to GLSL and control the appearance and behavior of the globe, textures, lighting, and interactions.
 */
export interface GlobeUniforms {
  /**
   * Uniform to store day texture for the globe.
   */
  dayTexture: THREE.IUniform<THREE.Texture>;

  /**
   * Uniform to store night texture for the globe.
   */
  nightTexture: THREE.IUniform<THREE.Texture>;

  /**
   * Uniform to store the country ID map texture.
   */
  countryIdMap: THREE.IUniform<THREE.Texture>;

  /**
   * Uniform to store the ID of the previously hovered country.
   */
  previousHoveredId: THREE.IUniform<number>;

  /**
   * Uniform to store the ID of the currently hovered country.
   */
  hoveredCountryId: THREE.IUniform<number>;

  /**
   * Uniform to store the current time for time-dependent animations or effects.
   */
  uTime: THREE.IUniform<number>;

  /**
   * Uniform to store the direction of light (used for lighting calculations and day/night transitions).
   */
  lightDirection: THREE.IUniform<THREE.Vector3>;

  /**
   * Uniform for controlling the fade-in effect of highlighted countries or objects.
   */
  highlightFadeIn: THREE.IUniform<number>;

  /**
   * Uniform for controlling the fade-out effect of highlighted countries or objects.
   */
  highlightFadeOut: THREE.IUniform<number>;

  /**
   * Uniform for the selected mask, controlling which areas of the texture are highlighted based on selection.
   */
  selectedMask: THREE.IUniform<THREE.DataTexture>;

  /**
   * Uniform to store the camera's direction for rendering effects based on camera position.
   */
  cameraDirection: THREE.IUniform<THREE.Vector3>;

  /**
   * Uniform to control the intensity of the city lights effect.
   */
  cityLightStrength: THREE.IUniform<number>;

  /**
   * Uniform for the cursor's world position in 3D space (used for interactions).
   */
  cursorWorldPos: THREE.IUniform<THREE.Vector3>;

  /**
   * Uniform to control the strength of the cursor glow effect.
   */
  cursorGlowStrength: THREE.IUniform<number>;

  /**
   * Uniform to control the radius of the cursor's glow effect.
   */
  cursorGlowRadius: THREE.IUniform<number>;

  /**
   * Uniform to store the current UV coordinates of the cursor on the globe.
   */
  cursorUV: THREE.IUniform<THREE.Vector2>;

  /**
   * Uniform to store the ID of the currently hovered ocean.
   */
  hoveredOceanId: THREE.IUniform<number>;

  /**
   * Uniform to indicate if the cursor is on the globe (true or false).
   */
  uCursorOnGlobe: THREE.IUniform<boolean>;

  /**
   * Uniform to control the brightness of the night texture (for simulating different day-night cycles).
   */
  nightBrightness: THREE.IUniform<number>;

  /**
   * Uniform to store the current camera distance (used for zoom or camera-related calculations).
   */
  uCameraDistance: THREE.IUniform<number>;

  /**
   * Dynamic uniform for any other additional uniforms that may be added to the shaders.
   */
  [uniform: string]: THREE.IUniform<any>;
}
