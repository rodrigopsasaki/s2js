/**
 * Boolean operations on polygons via cell-based approximation.
 *
 * Provides union, intersection, difference, and symmetric difference
 * of polygons by converting them to CellUnion coverings and applying
 * the corresponding set operations.
 *
 * @module
 */

import { type CellID, level, toPoint } from "./cellId.js";
import { type CellUnion, cellUnionDifference, cellUnionIntersection, cellUnionUnion } from "./cellUnion.js";
import { type Polygon, polygonContainsPoint } from "./polygon.js";
import { type Region, covering } from "./regionCoverer.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MAX_LEVEL = 15;
const DEFAULT_MAX_CELLS = 100;

/**
 * Precomputed max half-diagonal chord for S2 cells at each level (indices 0–30).
 *
 * Computed for the center cell of face 0 (UV origin), which has the largest
 * angular extent at any given level due to the tangent-plane projection.
 * The corner at UV (2^-l, 2^-l) → 3D (1, 2^-l, 2^-l)/‖…‖; the center is (1,0,0).
 */
const CELL_MAX_HALF_CHORD = (() => {
  const table = new Float64Array(31);
  for (let l = 0; l <= 30; l++) {
    const uv = 2 ** -l;
    const denom = Math.sqrt(1 + 2 * uv * uv);
    const cornerComp = uv / denom;
    const centerDeviation = 1 / denom - 1;
    table[l] = Math.sqrt(2 * cornerComp * cornerComp + centerDeviation * centerDeviation);
  }
  return table;
})();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a CellUnion approximation of the union of two polygons.
 * Uses cell coverings to approximate the boolean operation.
 *
 * @param a - First polygon
 * @param b - Second polygon
 * @param maxLevel - Maximum cell level for the approximation (default: 15)
 */
export function polygonUnionApprox(a: Polygon, b: Polygon, maxLevel: number = DEFAULT_MAX_LEVEL): CellUnion {
  const coverA = covering(polygonAsRegion(a), { maxCells: DEFAULT_MAX_CELLS, maxLevel });
  const coverB = covering(polygonAsRegion(b), { maxCells: DEFAULT_MAX_CELLS, maxLevel });
  return cellUnionUnion(coverA, coverB);
}

/**
 * Returns a CellUnion approximation of the intersection of two polygons.
 *
 * @param a - First polygon
 * @param b - Second polygon
 * @param maxLevel - Maximum cell level for the approximation (default: 15)
 */
export function polygonIntersectionApprox(a: Polygon, b: Polygon, maxLevel: number = DEFAULT_MAX_LEVEL): CellUnion {
  const coverA = covering(polygonAsRegion(a), { maxCells: DEFAULT_MAX_CELLS, maxLevel });
  const coverB = covering(polygonAsRegion(b), { maxCells: DEFAULT_MAX_CELLS, maxLevel });
  return cellUnionIntersection(coverA, coverB);
}

/**
 * Returns a CellUnion approximation of the difference (a - b).
 *
 * @param a - Polygon to subtract from
 * @param b - Polygon to subtract
 * @param maxLevel - Maximum cell level for the approximation (default: 15)
 */
export function polygonDifferenceApprox(a: Polygon, b: Polygon, maxLevel: number = DEFAULT_MAX_LEVEL): CellUnion {
  const coverA = covering(polygonAsRegion(a), { maxCells: DEFAULT_MAX_CELLS, maxLevel });
  const coverB = covering(polygonAsRegion(b), { maxCells: DEFAULT_MAX_CELLS, maxLevel });
  return cellUnionDifference(coverA, coverB);
}

/**
 * Returns a CellUnion approximation of the symmetric difference.
 * The result contains cells that are in either polygon but not both.
 *
 * @param a - First polygon
 * @param b - Second polygon
 * @param maxLevel - Maximum cell level for the approximation (default: 15)
 */
export function polygonSymmetricDifferenceApprox(
  a: Polygon,
  b: Polygon,
  maxLevel: number = DEFAULT_MAX_LEVEL,
): CellUnion {
  const coverA = covering(polygonAsRegion(a), { maxCells: DEFAULT_MAX_CELLS, maxLevel });
  const coverB = covering(polygonAsRegion(b), { maxCells: DEFAULT_MAX_CELLS, maxLevel });
  const union = cellUnionUnion(coverA, coverB);
  const intersection = cellUnionIntersection(coverA, coverB);
  return cellUnionDifference(union, intersection);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Bounding cap for a polygon, expressed as a center unit vector and a chord radius. */
interface BoundingCap {
  readonly cx: number;
  readonly cy: number;
  readonly cz: number;
  /** Max chord distance from center to any point on the polygon boundary. */
  readonly radius: number;
}

/**
 * Computes a conservative bounding cap for a polygon.
 *
 * Center: normalized sum of all loop vertices.
 * Radius: max vertex chord + max edge chord (triangle inequality ensures all boundary
 * points lie within this distance of the center).
 *
 * @param polygon - The polygon to bound
 */
function computeBoundingCap(polygon: Polygon): BoundingCap {
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;
  let vertexCount = 0;

  for (const loop of polygon.loops) {
    for (const v of loop.vertices) {
      sumX += v.x;
      sumY += v.y;
      sumZ += v.z;
      vertexCount++;
    }
  }

  if (vertexCount === 0) return { cx: 1, cy: 0, cz: 0, radius: 0 };

  const len = Math.sqrt(sumX * sumX + sumY * sumY + sumZ * sumZ);
  if (len === 0) return { cx: 1, cy: 0, cz: 0, radius: Math.SQRT2 };

  const cx = sumX / len;
  const cy = sumY / len;
  const cz = sumZ / len;

  let maxVertexChord = 0;
  let maxEdgeChord = 0;

  for (const loop of polygon.loops) {
    const n = loop.vertices.length;
    for (let i = 0; i < n; i++) {
      const v = loop.vertices[i]!;
      const dx = v.x - cx;
      const dy = v.y - cy;
      const dz = v.z - cz;
      const c = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (c > maxVertexChord) maxVertexChord = c;

      // For the triangle-inequality correction: any point p on edge (v, w) satisfies
      // chord(center, p) ≤ chord(center, v) + chord(v, p) ≤ maxVertexChord + chord(v, w).
      const w = loop.vertices[(i + 1) % n]!;
      const ex = w.x - v.x;
      const ey = w.y - v.y;
      const ez = w.z - v.z;
      const ec = Math.sqrt(ex * ex + ey * ey + ez * ez);
      if (ec > maxEdgeChord) maxEdgeChord = ec;
    }
  }

  // Cap on chord distance (max possible chord on unit sphere = sqrt(2) ≈ 1.414)
  return { cx, cy, cz, radius: Math.min(Math.SQRT2, maxVertexChord + maxEdgeChord) };
}

/**
 * Adapts a Polygon to the Region interface for use with RegionCoverer.
 *
 * @param polygon - The polygon to adapt
 */
function polygonAsRegion(polygon: Polygon): Region {
  const isEmpty = polygon.loops.length === 0;
  const cap: BoundingCap | null = isEmpty ? null : computeBoundingCap(polygon);

  return {
    containsCell(id: CellID): boolean {
      // A polygon contains a cell if its center is inside the polygon.
      // This is a conservative approximation; a more precise version would
      // check all four corners of the cell as well.
      const center = toPoint(id);
      return polygonContainsPoint(polygon, center);
    },
    mayIntersect(id: CellID): boolean {
      if (cap === null) return false;

      const center = toPoint(id);
      // Reject cells whose closest possible point is beyond the polygon bounding cap.
      // chord(cap.center, cell.center) > cap.radius + cell.halfDiagonal → no overlap.
      const dx = center.x - cap.cx;
      const dy = center.y - cap.cy;
      const dz = center.z - cap.cz;
      const dist2 = dx * dx + dy * dy + dz * dz;
      const maxDist = cap.radius + CELL_MAX_HALF_CHORD[level(id)]!;
      return dist2 <= maxDist * maxDist;
    },
  };
}
