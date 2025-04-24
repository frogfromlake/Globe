// three-examples.d.ts
declare module "three/examples/jsm/controls/OrbitControls" {
  import { Camera, EventDispatcher, MOUSE, TOUCH, Vector3 } from "three";

  /**
   * @class OrbitControls
   * @description This class allows you to control a camera in 3D space, using mouse or touch events.
   * It provides features like zoom, rotate, and pan functionalities for user interaction with the camera.
   */
  export class OrbitControls extends EventDispatcher {
    /**
     * Constructor to initialize OrbitControls.
     * @param object The camera object to control.
     * @param domElement The HTML DOM element to attach the controls (optional).
     */
    constructor(object: Camera, domElement?: HTMLElement);

    // Camera settings
    object: Camera; // The camera to control
    target: Vector3; // The target point the camera will orbit around

    // Zoom limits
    minDistance: number; // Minimum zoom distance
    maxDistance: number; // Maximum zoom distance

    // Zoom settings
    minZoom: number; // Minimum zoom factor
    maxZoom: number; // Maximum zoom factor

    // Polar angle limits (up/down)
    minPolarAngle: number; // Minimum angle in radians (from the horizon)
    maxPolarAngle: number; // Maximum angle in radians (towards the sky)

    // Azimuth angle limits (left/right)
    minAzimuthAngle: number; // Minimum azimuth angle in radians
    maxAzimuthAngle: number; // Maximum azimuth angle in radians

    // Damping settings (inertia)
    enableDamping: boolean; // Whether to enable damping (inertia effect)
    dampingFactor: number; // How much damping should be applied

    // Zoom settings
    enableZoom: boolean; // Whether zooming is enabled
    zoomSpeed: number; // Speed of zooming

    // Rotation settings
    enableRotate: boolean; // Whether rotation is enabled
    rotateSpeed: number; // Speed of rotation

    // Pan settings
    enablePan: boolean; // Whether panning is enabled
    panSpeed: number; // Speed of panning
    screenSpacePanning: boolean; // Whether to pan in screen space (instead of world space)
    keyPanSpeed: number; // Speed of panning using the keyboard

    // Auto-rotation settings
    autoRotate: boolean; // Whether auto-rotation is enabled
    autoRotateSpeed: number; // Speed of auto-rotation

    // Key bindings for camera control
    enableKeys: boolean; // Whether key controls are enabled
    keys: { LEFT: string; UP: string; RIGHT: string; BOTTOM: string }; // Key bindings for controls

    // Mouse buttons settings
    mouseButtons: { LEFT: MOUSE; MIDDLE: MOUSE; RIGHT: MOUSE }; // Mouse buttons for actions

    // Touch settings
    touches: { ONE: TOUCH; TWO: TOUCH }; // Touch events for interaction

    /**
     * @description Updates the controls (used in each animation frame).
     */
    update(): void;

    /**
     * @description Resets the controls (e.g., position, zoom, etc.).
     */
    reset(): void;

    /**
     * @description Disposes of the controls to clean up resources.
     */
    dispose(): void;

    /**
     * @description Rotates the camera to the left (counterclockwise) by a given angle.
     * @param angle The angle (in radians) to rotate.
     */
    rotateLeft(angle: number): void;

    /**
     * @description Rotates the camera upwards (clockwise) by a given angle.
     * @param angle The angle (in radians) to rotate.
     */
    rotateUp(angle: number): void;
  }
}
