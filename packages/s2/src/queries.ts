/**
 * Spatial query functions for testing containment and finding closest edges.
 *
 * Provides ContainsPointQuery (thin wrappers around existing containment logic)
 * and ClosestEdgeQuery (find closest edges to a target point across loops/polygons).
 *
 * @module
 */

import { type Vector } from "@s2js/r3";
import { type Loop, loopContainsPoint, vertex, numVertices } from "./loop.js";
import { type Polygon, polygonContainsPoint } from "./polygon.js";
import { distanceFromSegment } from "./predicates.js";

// ---------------------------------------------------------------------------
// ContainsPointQuery
// ---------------------------------------------------------------------------

/**
 * Tests whether a loop contains a point.
 *
 * @param loop - The loop to test against
 * @param point - A point on the unit sphere
 */
export function queryLoopContainsPoint(loop: Loop, point: Vector): boolean {
  return loopContainsPoint(loop, point);
}

/**
 * Tests whether a polygon contains a point.
 *
 * @param polygon - The polygon to test against
 * @param point - A point on the unit sphere
 */
export function queryPolygonContainsPoint(polygon: Polygon, point: Vector): boolean {
  return polygonContainsPoint(polygon, point);
}

// ---------------------------------------------------------------------------
// ClosestEdgeQuery types
// ---------------------------------------------------------------------------

/** Result of a closest edge query. */
export interface ClosestEdgeResult {
  /** The distance in radians from the target to the closest edge. */
  readonly distance: number;
  /** Index of the loop containing the closest edge (-1 if not found). */
  readonly loopIndex: number;
  /** Index of the edge within the loop (i.e., the edge from vertex[edgeIndex] to vertex[edgeIndex+1]). */
  readonly edgeIndex: number;
}

/** Options for the closest edge query. */
export interface ClosestEdgeQueryOptions {
  /** Maximum distance to search (radians). Edges farther than this are ignored. Default: Infinity. */
  readonly maxDistance?: number;
  /** Maximum number of results to return. Default: 1. */
  readonly maxResults?: number;
}

// ---------------------------------------------------------------------------
// ClosestEdgeQuery functions
// ---------------------------------------------------------------------------

/**
 * Finds the closest edge(s) in a loop to the given target point.
 * Returns results sorted by distance (nearest first).
 *
 * @param loop - The loop to search
 * @param target - A point on the unit sphere
 * @param options - Optional query parameters
 */
export function findClosestEdgeToPoint(
  loop: Loop,
  target: Vector,
  options?: ClosestEdgeQueryOptions,
): readonly ClosestEdgeResult[] {
  const maxDist = options?.maxDistance ?? Infinity;
  const maxResults = options?.maxResults ?? 1;
  const n = numVertices(loop);
  const results: ClosestEdgeResult[] = [];

  for (let i = 0; i < n; i++) {
    const a = vertex(loop, i);
    const b = vertex(loop, i + 1);
    const dist = distanceFromSegment(target, a, b);

    if (dist <= maxDist) {
      results.push({ distance: dist, loopIndex: 0, edgeIndex: i });
    }
  }

  results.sort((a, b) => a.distance - b.distance);
  return results.slice(0, maxResults);
}

/**
 * Finds the closest edge(s) across all loops in a polygon.
 * Returns results sorted by distance (nearest first).
 *
 * @param polygon - The polygon to search
 * @param target - A point on the unit sphere
 * @param options - Optional query parameters
 */
export function findClosestEdgeInPolygon(
  polygon: Polygon,
  target: Vector,
  options?: ClosestEdgeQueryOptions,
): readonly ClosestEdgeResult[] {
  const maxDist = options?.maxDistance ?? Infinity;
  const maxResults = options?.maxResults ?? 1;
  const results: ClosestEdgeResult[] = [];

  for (let li = 0; li < polygon.loops.length; li++) {
    const loop = polygon.loops[li]!;
    const n = numVertices(loop);

    for (let i = 0; i < n; i++) {
      const a = vertex(loop, i);
      const b = vertex(loop, i + 1);
      const dist = distanceFromSegment(target, a, b);

      if (dist <= maxDist) {
        results.push({ distance: dist, loopIndex: li, edgeIndex: i });
      }
    }
  }

  results.sort((a, b) => a.distance - b.distance);
  return results.slice(0, maxResults);
}

/**
 * Returns the signed distance from a point to a loop boundary.
 * Returns a positive value if the point is outside the loop,
 * and a negative value if inside (the distance to the nearest edge, negated).
 * Returns Infinity if the loop has no vertices.
 *
 * @param loop - The loop
 * @param point - A point on the unit sphere
 */
export function signedDistanceToLoop(loop: Loop, point: Vector): number {
  const n = numVertices(loop);
  if (n === 0) return Infinity;

  let minDist = Infinity;
  for (let i = 0; i < n; i++) {
    const a = vertex(loop, i);
    const b = vertex(loop, i + 1);
    const dist = distanceFromSegment(point, a, b);
    if (dist < minDist) {
      minDist = dist;
    }
  }

  return loopContainsPoint(loop, point) ? -minDist : minDist;
}

/**
 * Tests if the minimum distance from a point to the nearest edge of a loop
 * is less than the given limit (in radians).
 * This is faster than computing the exact distance when only a threshold check is needed.
 *
 * @param loop - The loop
 * @param target - A point on the unit sphere
 * @param limitRadians - The distance threshold in radians
 */
export function isDistanceLess(loop: Loop, target: Vector, limitRadians: number): boolean {
  const n = numVertices(loop);
  for (let i = 0; i < n; i++) {
    const a = vertex(loop, i);
    const b = vertex(loop, i + 1);
    if (distanceFromSegment(target, a, b) < limitRadians) {
      return true;
    }
  }
  return false;
}
