// oceanIdToIndex.ts
import { oceanCenters } from "./oceanCenters";

export const oceanIdToIndex: Record<number, number> = Object.fromEntries(
  Object.keys(oceanCenters)
    .map(Number)
    .sort((a, b) => a - b)
    .map((id, index) => [id, index])
);
