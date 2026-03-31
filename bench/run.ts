/**
 * Performance benchmark for @s2js hot paths.
 *
 * Run: npx tsx bench/run.ts
 */

import {
  cellIDFromLatLng,
  cellIDFromLatLngDegrees,
  toToken,
  face,
  level,
  parentAtLevel,
  children,
  contains,
  edgeNeighbors,
  allNeighbors,
  toPoint,
  toLatLng,
  cellIDFromToken,
  type CellID,
  type Region,
  covering,
  normalize,
  cellUnionFromCellIDs,
  loopFromPoints,
  loopContainsPoint,
  loopArea,
} from "@s2js/s2";
import { normalize as vecNormalize, vector } from "@s2js/r3";

function bench(name: string, fn: () => void, iterations: number): void {
  // Warmup
  for (let i = 0; i < Math.min(1000, iterations); i++) fn();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = performance.now() - start;

  const opsPerSec = ((iterations / elapsed) * 1000).toFixed(0);
  const usPerOp = ((elapsed / iterations) * 1000).toFixed(2);
  console.log(`  ${name.padEnd(40)} ${opsPerSec.padStart(12)} ops/sec  ${usPerOp.padStart(8)} µs/op`);
}

console.log("=== @s2js Performance Benchmark ===\n");

// Precompute test data
const sfLat = (37.7749 * Math.PI) / 180;
const sfLng = (-122.4194 * Math.PI) / 180;
const sfCell = cellIDFromLatLng(sfLat, sfLng);
const sfL10 = parentAtLevel(sfCell, 10);
const sfToken = toToken(sfCell);

console.log("--- CellID Operations ---");
bench("cellIDFromLatLng", () => cellIDFromLatLng(sfLat, sfLng), 100_000);
bench("cellIDFromLatLngDegrees", () => cellIDFromLatLngDegrees(37.7749, -122.4194), 100_000);
bench("cellIDFromToken", () => cellIDFromToken(sfToken), 100_000);
bench("toToken", () => toToken(sfCell), 100_000);
bench("face", () => face(sfCell), 500_000);
bench("level", () => level(sfCell), 500_000);
bench("level (face cell)", () => level(parentAtLevel(sfCell, 0)), 500_000);
bench("parentAtLevel", () => parentAtLevel(sfCell, 10), 100_000);
bench("children", () => children(sfL10), 100_000);
bench("contains (true)", () => contains(sfL10, sfCell), 500_000);
bench("contains (false)", () => contains(sfCell, sfL10), 500_000);
bench("toPoint", () => toPoint(sfCell), 100_000);
bench("toLatLng", () => toLatLng(sfCell), 100_000);
bench("edgeNeighbors", () => edgeNeighbors(sfL10), 50_000);
bench("allNeighbors", () => allNeighbors(sfL10, 10), 10_000);

console.log("\n--- CellUnion Operations ---");
const testIds = Array.from({ length: 100 }, (_, i) =>
  parentAtLevel(cellIDFromLatLngDegrees(37 + i * 0.01, -122 + i * 0.01), 15),
);
bench("cellUnionFromCellIDs (100)", () => cellUnionFromCellIDs(testIds), 10_000);
bench("normalize (100)", () => normalize(testIds), 10_000);

console.log("\n--- RegionCoverer ---");
const target = parentAtLevel(cellIDFromLatLngDegrees(37.7749, -122.4194), 8);
const region: Region = {
  containsCell: (id: CellID) => contains(target, id),
  mayIntersect: (id: CellID) => contains(target, id) || contains(id, target),
};
bench("covering (maxCells=8, maxLevel=15)", () => covering(region, { maxCells: 8, maxLevel: 15 }), 1_000);
bench("covering (maxCells=100, maxLevel=20)", () => covering(region, { maxCells: 100, maxLevel: 20 }), 500);

console.log("\n--- Loop Operations ---");
const triVerts = [
  vecNormalize(vector(0, 0.1, 1)),
  vecNormalize(vector(-0.1, -0.05, 1)),
  vecNormalize(vector(0.1, -0.05, 1)),
];
const triLoop = loopFromPoints(triVerts);
const insidePoint = vecNormalize(vector(0, 0.02, 1));
const outsidePoint = vecNormalize(vector(0, 0, -1));

bench("loopContainsPoint (inside, 3 verts)", () => loopContainsPoint(triLoop, insidePoint), 100_000);
bench("loopContainsPoint (outside, 3 verts)", () => loopContainsPoint(triLoop, outsidePoint), 100_000);
bench("loopArea (3 verts)", () => loopArea(triLoop), 100_000);

// Larger loop
const nVerts = 100;
const largeVerts = Array.from({ length: nVerts }, (_, i) => {
  const angle = (2 * Math.PI * i) / nVerts;
  return vecNormalize(vector(0.1 * Math.cos(angle), 0.1 * Math.sin(angle), 1));
});
const largeLoop = loopFromPoints(largeVerts);

bench("loopContainsPoint (inside, 100 verts)", () => loopContainsPoint(largeLoop, insidePoint), 10_000);
bench("loopArea (100 verts)", () => loopArea(largeLoop), 10_000);

console.log("\n=== Done ===");
