/**
 * Polygons on the unit sphere.
 *
 * A Polygon is a collection of Loops where the first loop is the outer
 * boundary and subsequent loops are holes. Each hole must be contained
 * within the outer boundary.
 *
 * @module
 */

import { type Vector, vector } from "@s2js/r3";
import {
  type Loop,
  loopFromPoints,
  loopContainsPoint,
  loopArea,
  loopCentroid,
  numVertices as loopNumVertices,
  loopIsValid,
  loopContainsLoop,
} from "./loop.js";

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

/** A polygon defined by an outer loop and optional holes. */
export interface Polygon {
  readonly loops: readonly Loop[];
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

/**
 * Creates a Polygon from a sequence of loops.
 * The first loop is the outer boundary; subsequent loops are holes.
 *
 * @param loops - The polygon loops
 */
export function polygonFromLoops(loops: readonly Loop[]): Polygon {
  return { loops };
}

/**
 * Creates a Polygon from a single loop (no holes).
 *
 * @param loop - The outer boundary loop
 */
export function polygonFromLoop(loop: Loop): Polygon {
  return { loops: [loop] };
}

/**
 * Creates a Polygon from a single set of vertices (convenience).
 *
 * @param vertices - The vertices of the outer boundary
 */
export function polygonFromVertices(vertices: readonly Vector[]): Polygon {
  return polygonFromLoop(loopFromPoints(vertices));
}

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------

/** Returns the number of loops in the polygon. */
export function numLoops(p: Polygon): number {
  return p.loops.length;
}

/**
 * Returns the total number of vertices across all loops.
 *
 * @param p - The polygon
 */
export function numVerticesPolygon(p: Polygon): number {
  let total = 0;
  for (const loop of p.loops) {
    total += loopNumVertices(loop);
  }
  return total;
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/**
 * Returns the total area of the polygon in steradians.
 * The outer loop contributes positive area; holes contribute negative area.
 *
 * @param p - The polygon
 */
export function polygonArea(p: Polygon): number {
  if (p.loops.length === 0) return 0;

  // The first loop is the outer boundary (positive area).
  // Subsequent loops are holes whose area should be subtracted.
  let area = loopArea(p.loops[0] as Loop);
  for (let i = 1; i < p.loops.length; i++) {
    area -= loopArea(p.loops[i] as Loop);
  }

  return Math.max(0, area);
}

/**
 * Returns the centroid of the polygon as a non-unit vector.
 * The centroid is the area-weighted average of the loop centroids.
 *
 * @param p - The polygon
 */
export function polygonCentroid(p: Polygon): Vector {
  let cx = 0;
  let cy = 0;
  let cz = 0;

  for (const loop of p.loops) {
    const c = loopCentroid(loop);
    cx += c.x;
    cy += c.y;
    cz += c.z;
  }

  return vector(cx, cy, cz);
}

// ---------------------------------------------------------------------------
// Containment
// ---------------------------------------------------------------------------

/**
 * Returns true if the polygon contains the given point.
 * A point is inside the polygon if it is inside the outer loop and
 * outside all holes.
 *
 * @param p - The polygon
 * @param pt - A point on the unit sphere
 */
export function polygonContainsPoint(p: Polygon, pt: Vector): boolean {
  if (p.loops.length === 0) return false;

  // Must be inside the outer loop
  if (!loopContainsPoint(p.loops[0] as Loop, pt)) return false;

  // Must be outside all holes
  for (let i = 1; i < p.loops.length; i++) {
    if (loopContainsPoint(p.loops[i] as Loop, pt)) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Returns true if the polygon is valid.
 * - All loops must be valid.
 * - Holes must be contained within the outer loop.
 *
 * @param p - The polygon to validate
 */
export function polygonIsValid(p: Polygon): boolean {
  if (p.loops.length === 0) return true;

  // All loops must be individually valid
  for (const loop of p.loops) {
    if (!loopIsValid(loop)) return false;
  }

  // Holes must be contained within the outer loop
  const outer = p.loops[0] as Loop;
  for (let i = 1; i < p.loops.length; i++) {
    if (!loopContainsLoop(outer, p.loops[i] as Loop)) return false;
  }

  return true;
}
