// materials.js
import * as THREE from "three";

export const defaultLineMaterial = new THREE.MeshBasicMaterial({
  color: 0xcccccc, // softer light gray
  transparent: true,
  opacity: 0.5,
  depthWrite: false,
  side: THREE.DoubleSide,
});

export const hoverLineMaterial = new THREE.MeshBasicMaterial({
  color: 0x3399ff, // bright blue
  transparent: true,
  opacity: 0.8,
  depthWrite: false,
  side: THREE.DoubleSide,
});
