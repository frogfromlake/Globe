import { oceanCenters } from "../data/oceanCenters";

// Create a mapping from ocean ID to its index in the sorted list of ocean centers
export const oceanIdToIndex: Record<number, number> = Object.fromEntries(
  // Convert ocean center keys to numbers, sort them in ascending order, and map them to an index
  Object.keys(oceanCenters)
    .map(Number)
    .sort((a, b) => a - b)
    .map((id, index) => [id, index])
);
