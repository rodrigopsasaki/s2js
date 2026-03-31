// embedex: README.md

import {
  cellIDFromLatLngDegrees,
  toToken,
  face,
  level,
  parentAtLevel,
  contains,
  children,
  toLatLngDegrees,
} from "@s2js/s2";

// San Francisco
const cellId = cellIDFromLatLngDegrees(37.7749, -122.4194);

console.log(toToken(cellId)); // leaf cell token
console.log(face(cellId)); // 4
console.log(level(cellId)); // 30 (leaf)

// Navigate the hierarchy
const level10 = parentAtLevel(cellId, 10);
console.log(toToken(level10)); // coarser ~10km cell

// The elegant property: containment is a prefix check
console.log(contains(level10, cellId)); // true

// Get the 4 children of a cell
const kids = children(level10);
console.log(kids.length); // 4

// Convert back to lat/lng
const center = toLatLngDegrees(level10);
console.log(center.lat, center.lng); // degrees
