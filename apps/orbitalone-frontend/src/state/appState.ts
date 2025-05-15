import { Vector2 } from "three";

export interface HoverIdState {
  currentHoveredId: number;
  previousHoveredId: number;
  fadeIn: number;
  fadeOut: number;
  currentHoveredOceanId: number;
  previousHoveredOceanId: number;
  fadeInOcean: number;
  fadeOutOcean: number;
}

export interface SimulationState {
  time: number;
}

export interface DriftState {
  cloudElapsedTime: number;
  currentDrift: Vector2;
  targetDrift: Vector2;
  lastDriftChange: number;
  cloudDriftBaseSpeed: number;
  cloudSpeedVariation: number;
  cloudTargetVariation: number;
  lastSpeedVariationChange: number;
  flashPoints: Vector2[];
  flashStrengths: number[];
  stormCenters: Vector2[];
}

export interface AppState {
  countryInteractivity: boolean;
  oceanInteractivity: boolean;
  flashlightEnabled: boolean;
  lastOpenedCountryId: number | null;
  cloudsEnabled: boolean;

  // NEW stateful additions
  hoverIdState: HoverIdState;
  simulation: SimulationState;
  driftState: DriftState;
  lastSelectedCountryIds: Set<number>;
  lastHoveredCountryId: number;
  lastPreviousHoveredId: number;
}

export const appState: AppState = {
  countryInteractivity: true,
  oceanInteractivity: true,
  flashlightEnabled: true,
  lastOpenedCountryId: null,
  cloudsEnabled: true,

  hoverIdState: {
    currentHoveredId: -1,
    previousHoveredId: -1,
    fadeIn: 0,
    fadeOut: 0,
    currentHoveredOceanId: -1,
    previousHoveredOceanId: -1,
    fadeInOcean: 0,
    fadeOutOcean: 0,
  },

  simulation: { time: Date.now() },

  driftState: {
    cloudElapsedTime: 0,
    currentDrift: new Vector2(1, 0),
    targetDrift: new Vector2(1, 0),
    lastDriftChange: performance.now(),
    cloudDriftBaseSpeed: 0.00004,
    cloudSpeedVariation: 0,
    cloudTargetVariation: 0,
    lastSpeedVariationChange: performance.now(),
    flashPoints: Array.from(
      { length: 80 },
      () => new Vector2(Math.random(), Math.random())
    ),
    flashStrengths: Array(80).fill(0),
    stormCenters: Array.from(
      { length: 25 },
      () => new Vector2(Math.random(), Math.random())
    ),
  },

  lastSelectedCountryIds: new Set<number>(),
  lastHoveredCountryId: -1,
  lastPreviousHoveredId: -1,
};
