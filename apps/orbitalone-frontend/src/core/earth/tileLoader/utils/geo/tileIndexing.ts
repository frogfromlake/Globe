/**
 * @file utils/geo/tileIndexing.ts
 * @description
 */

/**
 * Converts longitude to tile X coordinate at zoom level `z`.
 */
export function lon2tileX(lon: number, z: number): number {
    return Math.floor(((lon + 180) / 360) * Math.pow(2, z));
  }
  
  /**
   * Converts latitude to tile Y coordinate at zoom level `z`.
   */
  export function lat2tileY(lat: number, z: number): number {
    const rad = (lat * Math.PI) / 180;
    const n = Math.PI - Math.log(Math.tan(Math.PI / 4 + rad / 2));
    return Math.floor((n / Math.PI / 2) * Math.pow(2, z));
  }
  