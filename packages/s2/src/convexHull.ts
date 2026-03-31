/**
 * Spherical convex hull computation.
 *
 * Computes the convex hull of a set of points on the unit sphere using
 * a gift-wrapping (Jarvis march) algorithm adapted for spherical geometry.
 *
 * @module
 */

import { type Vector, cross, dot } from "@s2js/r3";
import { type Loop, loopFromPoints } from "./loop.js";
import { sign, SIGN } from "./predicates.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_HULL_POINTS = 3;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Computes the spherical convex hull of a set of points.
 * Returns a Loop whose vertices form the convex hull in CCW order.
 *
 * Uses a gift-wrapping (Jarvis march) algorithm adapted for the sphere.
 * For small point sets this is efficient. For large sets, consider
 * using a divide-and-conquer approach.
 *
 * @param points - Points on the unit sphere
 * @returns A Loop representing the convex hull, or the input points as a loop if fewer than 3
 */
export function convexHull(points: readonly Vector[]): Loop {
  if (points.length < MIN_HULL_POINTS) {
    return loopFromPoints(points);
  }

  // Remove duplicate points
  const unique = deduplicatePoints(points);
  if (unique.length < MIN_HULL_POINTS) {
    return loopFromPoints(unique);
  }

  // Find the starting point: smallest x, then smallest y as tiebreaker
  let startIdx = 0;
  for (let i = 1; i < unique.length; i++) {
    const p = unique[i]!;
    const s = unique[startIdx]!;
    if (p.x < s.x || (p.x === s.x && p.y < s.y)) {
      startIdx = i;
    }
  }

  const hull: Vector[] = [];
  let current = startIdx;

  do {
    hull.push(unique[current]!);
    let next = 0;

    for (let i = 0; i < unique.length; i++) {
      if (i === current) continue;

      if (next === current) {
        next = i;
        continue;
      }

      // Check if unique[i] is to the left of the line from current to next
      const s = sign(unique[current]!, unique[next]!, unique[i]!);
      if (s === SIGN.COUNTER_CLOCKWISE) {
        next = i;
      } else if (s === SIGN.INDETERMINATE) {
        // Collinear: pick the farther point
        const distNext = greatCircleDistance2(unique[current]!, unique[next]!);
        const distI = greatCircleDistance2(unique[current]!, unique[i]!);
        if (distI > distNext) {
          next = i;
        }
      }
    }

    current = next;
  } while (current !== startIdx && hull.length < unique.length);

  return loopFromPoints(hull);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns the squared great circle distance approximation between two unit vectors.
 * Uses the squared norm of the cross product, which is proportional to sin^2(angle).
 *
 * @param a - First unit vector
 * @param b - Second unit vector
 */
function greatCircleDistance2(a: Vector, b: Vector): number {
  const c = cross(a, b);
  return dot(c, c);
}

/**
 * Removes duplicate points from the input array.
 *
 * @param points - The points to deduplicate
 */
function deduplicatePoints(points: readonly Vector[]): Vector[] {
  const result: Vector[] = [];
  for (const p of points) {
    const isDuplicate = result.some((r) => r.x === p.x && r.y === p.y && r.z === p.z);
    if (!isDuplicate) {
      result.push(p);
    }
  }
  return result;
}
