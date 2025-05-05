// src/configs/config.ts
import {
  SRGBColorSpace,
  LinearFilter,
  NearestFilter,
  NormalBlending,
  ClampToEdgeWrapping,
  MathUtils,
} from "three";
import { oceanCenters } from "../data/oceanCenters";
import { countryMeta } from "../data/countryMeta";
import { oceanIdToIndex } from "../utils/oceanIdToIndex";

const desiredOffsetDegrees = 0; // adjust based on texture alignment

export const CONFIG = {
  /** Camera settings for perspective projection */
  camera: {
    /** Field of view in degrees for the perspective camera */
    fov: 50,
    /** Near clipping plane distance */
    near: 0.1,
    /** Far clipping plane distance */
    far: 1000,
    /** Initial camera position in 3D space */
    initialPosition: {
      x: 0,
      y: 0,
      z: 1.9, // Change this value to zoom in or out by default
    },
    /** Multiplier to adjust camera Z based on FOV (e.g., lower FOV = pull back) */
    fovDistanceMultiplier: 1.5,
    /** How fast (in seconds) the automatic camera transition to the searched country happens */
    autoTransitionDuration: 1.8,
  },

  /** Globe mesh geometry settings */
  globe: {
    /** Radius of the globe sphere */
    radius: 1,
    /** Horizontal resolution (longitude segments) */
    widthSegments: 128,
    /** Vertical resolution (latitude segments) */
    heightSegments: 128,
  },

  stars: {
    /** Offset for panning the texture horizontally (U) and vertically (V) */
    offset: {
      x: 0.7,
      y: 0.0,
    },

    /** Opacity of the starfield (0 = transparent, 1 = fully visible) */
    opacity: 0.6,

    /** RGB color tint applied to the star texture (in 0–1 range) */
    tint: [0.85, 0.9, 1.0] as [number, number, number],

    /** Radius of the sphere geometry for the starscape */
    radius: 500,

    /** Resolution of the sphere used for the star background */
    widthSegments: 128,
    heightSegments: 128,
  },

  /** Lighting setup for the 3D scene */
  lighting: {
    directionalLight: {
      /** Hex color of the directional light */
      color: 0xffffff,
      /** Intensity of the directional light */
      intensity: 1,
      /** Position of the directional light in world space */
      position: { x: 5, y: 0, z: 5 },
    },
  },

  /** Limits for zoom distance using orbit controls */
  zoom: {
    /** Minimum zoom distance — how close the camera can get to the globe */
    min: 1.25,
    /** Maximum zoom distance — how far the camera can pull back from the globe */
    max: 10,
  },

  /** Clamp range for vertical camera rotation (polar angle) */
  polarLimits: {
    /** Minimum polar angle — restricts how far below the globe the camera can go */
    min: 0.01,
    /** Maximum polar angle — restricts how far above the globe the camera can go */
    max: Math.PI - 0.01,
  },

  /** Speed modifiers for user interactions with the globe */
  speed: {
    /** Multiplier applied to zoom speed based on distance from target */
    zoomSpeedMultiplier: 0.3,
    /** Base rotation speed when the camera is close to the globe */
    rotateSpeedBase: 0.25,
    /** Additional rotation speed that scales with camera distance */
    rotateSpeedScale: 0.8,
    /** Inertia factor for orbit controls — how smooth or snappy motion feels */
    dampingFactor: 0.03,
  },

  /** Clamp ranges for computed zoom/rotation speeds */
  interaction: {
    /** Clamp range for rotation speed */
    rotateSpeed: {
      min: 0.1,
      max: 5.0,
      /** Base value used before scaling with distance */
      base: 0.1,
      /** Distance-based multiplier */
      scale: 3.0,
    },
    /** Clamp range for zoom speed */
    zoomSpeed: {
      min: 0.1,
      max: 6.0,
      /** Base value used before scaling with distance */
      base: 0.1,
      /** Distance-based multiplier */
      scale: 4.0,
    },
  },

  /** Mouse interaction thresholds and behaviors */
  interactionEvents: {
    /** Minimum time between valid clicks in milliseconds (prevents accidental double clicks) */
    clickDebounceMs: 200,
  },

  /** Speeds for highlight and selection fade effects */
  fade: {
    /** Speed at which hover highlights fade in and out */
    highlight: 4.0,
    /** Speed at which selected countries fade in and out */
    selection: 4.5,
  },

  /** Texture settings for selection highlight */
  selectionTexture: {
    /** Max value for fade-in alpha stored in the texture (0–255 range) */
    fadeMaxValue: 255,
  },

  /** Renderer and canvas settings */
  renderer: {
    /** ID of the canvas element in the DOM */
    canvasId: "globe",
    /** Whether antialiasing is enabled */
    antialias: true,
    /** Whether to check for shader compile errors */
    checkShaderErrors: true,
    /** Output color space setting (e.g., THREE.SRGBColorSpace) */
    outputColorSpace: SRGBColorSpace,
    /** Pixel ratio to use for rendering; set to 'device' to auto-detect */
    pixelRatio: "device" as "device" | number,
  },

  /** Texture file paths and settings */
  textures: {
    /** Path to the day-side Earth texture */
    dayMapPath: "/textures/earth_day_8k.webp",
    /** Path to the night-side Earth texture */
    nightMapPath: "/textures/earth_night_8k.webp",
    /** Path to the RGB-encoded country ID map */
    countryIdMapPath: "/textures/country_id_map_8k_gray.png",
    /** Path to the RGB-encoded ocean ID map */
    oceanIdMapPath: "/textures/ocean_id_map_8k_rgb.png",
    /** Path to the eso sky map */
    esoSkyMapPath: "/textures/eso_sky.webp",
    /** Path to the clouds map */
    cloudsMapPath: "/textures/earth_clouds_8k.webp",
    /** Path to the bump map */
    topographyMapPath: "/textures/earth_topography_8k.webp",
    /** Path to the aurora noise texture */
    auroraNoisePath: "/textures/auroraNoise.webp",
    /** Min filter for day/night textures */
    minFilter: LinearFilter,
    /** Mag filter for day/night textures */
    magFilter: LinearFilter,
    /** Min filter for country ID map */
    idMinFilter: NearestFilter,
    /** Mag filter for country ID map */
    idMagFilter: NearestFilter,
    /** Whether to generate mipmaps for country ID map */
    generateMipmaps: false,
    /** Whether to flip the Y axis on the country ID map texture */
    flipY: false,
    /** Max anisotropy for day/night maps (clamped in code) */
    maxAnisotropy: 4,
    /** Night Brightness*/
    nightBrightness: 1.2,
  },

  /** Default uniform values for shaders */
  uniforms: {
    /** Strength of the city lights in night view (0–1) */
    cityLightStrength: 0.5,
    /** Strength of the circular glow around the cursor */
    cursorGlowStrength: 0.2,
    /** Radius of the cursor glow (in UV space, 0–1) */
    cursorGlowRadius: 0.45,
    /** Initial value for cursor UV (offscreen by default) */
    initialCursorUV: [-1, -1] as [number, number],
    /** Initial hovered/previous hovered country and ocean IDs */
    defaultHoveredId: -1,
  },

  /** Settings for geolocation-based user marker display */
  userLocation: {
    /** Marker radius multiplier (offset from globe surface) */
    markerAltitudeMultiplier: 1.01,
    /** Radius of the marker sphere in world units */
    markerSize: 0.01,
    /** Number of segments (horizontal/vertical) used to generate the sphere geometry */
    markerSegments: 16,
    /** Marker color */
    markerColor: 0x00ff00,
    /** Options passed to `navigator.geolocation.getCurrentPosition()` */
    geolocationOptions: {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    },
  },

  /** Materials and appearance settings */
  materials: {
    /** Default country border material */
    borderLineDefault: {
      color: 0xcccccc,
      opacity: 0.5,
    },
    /** Hovered country border material */
    borderLineHover: {
      color: 0x3399ff,
      opacity: 0.8,
    },
    /** Globe shader material options */
    globeMaterial: {
      /** Whether globe writes to depth buffer */
      depthWrite: true,
      /** Whether globe material is transparent */
      transparent: false,
      /** Blending mode for fragment color */
      blending: NormalBlending,
    },
  },

  /** Settings related to the country ID hover system */
  countryHover: {
    /** Precomputed geographic center coordinates for each country ID */
    countryCenters: countryMeta,
    /** Maximum number of countries supported for selection */
    maxCountryCount: 242,
    /** Texture settings for country selection DataTexture */
    selectionTexture: {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
    },
  },

  /** Settings related to the ocean ID hover and selection system */
  oceanHover: {
    /** Precomputed geographic center coordinates for each ocean ID */
    oceanCenters: oceanCenters,

    /** ID-to-index map for ocean selections */
    oceanIdToIndex: oceanIdToIndex,

    /** Maximum number of oceans supported for selection and highlighting */
    maxOceanCount: 512,

    /** Texture settings for ocean selection DataTexture (same format as country selection) */
    selectionTexture: {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
    },
  },

  /** Configuration for 3D country and ocean labels */
  labels3D: {
    /** Font type for both country and ocean labels */
    fontFamily: "Inter",
    /** Base scale for the text sprite relative to canvas size (actual fontsize) */
    spriteScale: 0.18,
    /** Canvas font size for text clarity (px) */
    canvasFontSize: 512,
    /** Distance from globe center for label anchor point */
    markerRadius: 1.01,
    /** Zoom range used to calculate dynamic label offset */
    zoomRange: { min: 1.1, max: 10 },
    /** Label offset range (minimum and maximum label distance from anchor) */
    offsetRange: { min: 0.0, max: 1.0 },
    /** Configuration for country labels */
    country: {
      /** Line color connecting country label to country */
      lineColor: "rgb(255, 255, 255)",
      /** Line thickness for country labels */
      lineWidth: 1.5,
      /** Fill color for country label text */
      labelColor: "rgb(215, 255, 232)",
    },

    /** Configuration for ocean labels */
    ocean: {
      /** Line color connecting ocean label to ocean */
      lineColor: "rgb(255, 255, 255)",
      /** Line thickness for ocean labels */
      lineWidth: 1.5,
      /** Fill color for ocean label text */
      labelColor: "rgb(203, 246, 255)",
    },

    /** Glow effect for text labels */
    glow: {
      /** Shadow color for glow effect */
      shadowColor: "rgba(0, 140, 255, 0.2)",
      /** Shadow blur radius in pixels */
      shadowBlur: 20,
      /** Fill color for label text */
      fillStyle: "#BFE1FF",
    },
  },

  /** Geographic and astronomy-related constants */
  geo: {
    /** Default radius used when projecting geographic coordinates to spherical */
    defaultRadius: 1.01,
    /** Total seconds in a UTC day */
    secondsInDay: 86400,
    /** Milliseconds in a UTC day (used for J2000 date calculations) */
    msPerDay: 86400000,
    /** Reference date for J2000 epoch (UTC) */
    j2000UTC: Date.UTC(2000, 0, 1, 12),
    /** Earth's axial tilt (obliquity) in degrees */
    obliquityDegrees: 23.439,
    /** Degree-to-radian conversion factor */
    degToRad: Math.PI / 180,
    /** Latitude and longitude offsets */
    latOffset: 90,
    lonOffset: 90,
    /** Offset of the texture relative to Greenwich longitude, in degrees */
    textureOffsetDegrees: desiredOffsetDegrees,
    /** Same offset in radians (auto-converted below) */
    textureOffsetRadians: 0, // placeholder
    /** Solar calculation constants */
    solar: {
      /** Base mean longitude of the sun at J2000 (°) */
      meanLongitudeBase: 280.46,
      /** Daily increase of mean longitude (°/day) */
      meanLongitudePerDay: 0.9856474,
      /** Base mean anomaly of the sun at J2000 (°) */
      meanAnomalyBase: 357.528,
      /** Daily increase of mean anomaly (°/day) */
      meanAnomalyPerDay: 0.9856003,
      /** First correction for orbital eccentricity (°) */
      eclipticCorrection1: 1.915,
      /** Second correction for orbit shape (°) */
      eclipticCorrection2: 0.02,
    },
  },
};

// Assign computed radians after CONFIG definition
CONFIG.geo.textureOffsetRadians = MathUtils.degToRad(
  CONFIG.geo.textureOffsetDegrees
);
