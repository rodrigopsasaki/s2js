/**
 * Boolean operations on polygons via cell-based approximation.
 *
 * Provides union, intersection, difference, and symmetric difference
 * of polygons by converting them to CellUnion coverings and applying
 * the corresponding set operations.
 *
 * @module
 */

import { type CellID, toPoint } from "./cellId.js";
import { type CellUnion, cellUnionDifference, cellUnionIntersection, cellUnionUnion } from "./cellUnion.js";
import { type Polygon, polygonContainsPoint } from "./polygon.js";
import { type Region, covering } from "./regionCoverer.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MAX_LEVEL = 15;
const DEFAULT_MAX_CELLS = 100;

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

/**
 * Adapts a Polygon to the Region interface for use with RegionCoverer.
 *
 * @param polygon - The polygon to adapt
 */
function polygonAsRegion(polygon: Polygon): Region {
  return {
    containsCell(id: CellID): boolean {
      // A polygon contains a cell if its center is inside the polygon.
      // This is a conservative approximation; a more precise version would
      // check all four corners of the cell as well.
      const center = toPoint(id);
      return polygonContainsPoint(polygon, center);
    },
    mayIntersect(id: CellID): boolean {
      // Check if the cell center is inside the polygon.
      const center = toPoint(id);
      if (polygonContainsPoint(polygon, center)) return true;
      // Conservative: any non-empty polygon may intersect any cell.
      // A more precise version would check if the polygon boundary
      // crosses the cell boundary.
      return polygon.loops.length > 0;
    },
  };
}
