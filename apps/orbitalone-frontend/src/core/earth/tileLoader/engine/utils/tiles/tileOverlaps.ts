// /engine/utils/tiles/tileOverlaps.ts
export function getParentTileKey(z: number, x: number, y: number): string | null {
    if (z <= 3) return null;
    const parentZ = z - 1;
    const parentX = Math.floor(x / 2);
    const parentY = Math.floor(y / 2);
    return `${parentZ}/${parentX}/${parentY}`;
  }
  