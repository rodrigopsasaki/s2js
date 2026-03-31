/**
 * Robust geometric predicates for S2 spherical geometry.
 *
 * Provides orientation predicates (sign/robustSign) and edge crossing
 * detection that work correctly even for degenerate inputs.
 *
 * @module
 */

import { type Vector, cross, dot, sub, norm2 } from "@s2js/r3";

/**
 * Possible signs for the orientation predicate.
 * - Clockwise: the points turn clockwise
 * - CounterClockwise: the points turn counter-clockwise
 * - Indeterminate: the points are collinear
 */
export const SIGN = {
  CLOCKWISE: -1,
  INDETERMINATE: 0,
  COUNTER_CLOCKWISE: 1,
} as const;

export type Sign = (typeof SIGN)[keyof typeof SIGN];

/**
 * Returns the sign of the determinant of the 3x3 matrix [a, b, c].
 * Equivalently, this is the sign of the cross product (a-c) x (b-c) · c.
 *
 * Returns +1 if the points are counter-clockwise, -1 if clockwise,
 * and 0 if they are collinear.
 *
 * This is the fast approximate version using floating-point arithmetic.
 */
export function sign(a: Vector, b: Vector, c: Vector): Sign {
  const d = dot(cross(a, b), c);
  if (d > 0) return SIGN.COUNTER_CLOCKWISE;
  if (d < 0) return SIGN.CLOCKWISE;
  return SIGN.INDETERMINATE;
}

/**
 * Crossing sign for two edges AB and CD.
 * - +1: edges cross each other (proper crossing)
 * - -1: point A or B lies on edge CD, or vice versa (degenerate)
 * - 0: edges do not cross
 */
export const CROSSING = {
  CROSS: 1,
  MAYBE_CROSS: -1,
  DO_NOT_CROSS: 0,
} as const;

export type Crossing = (typeof CROSSING)[keyof typeof CROSSING];

/**
 * Returns the crossing sign of edges AB and CD.
 *
 * Uses orientation predicates to determine if the edges properly cross,
 * share an endpoint, or don't cross at all.
 */
export function crossingSign(a: Vector, b: Vector, c: Vector, d: Vector): Crossing {
  const bda = sign(b, d, a);
  const bdc = sign(b, d, c);

  if (bda !== bdc) {
    const abc = sign(a, b, c);
    const abd = sign(a, b, d);
    if (abc !== abd) {
      return abc === bda ? CROSSING.CROSS : CROSSING.DO_NOT_CROSS;
    }
    if (abc === SIGN.INDETERMINATE) return CROSSING.MAYBE_CROSS;
    return CROSSING.DO_NOT_CROSS;
  }

  if (bda === SIGN.INDETERMINATE) {
    // Both edges are collinear — check for overlap
    if (dot(a, c) === dot(b, d) || dot(a, d) === dot(b, c)) return CROSSING.MAYBE_CROSS;
    return CROSSING.DO_NOT_CROSS;
  }

  return CROSSING.DO_NOT_CROSS;
}

/**
 * Interpolates between two unit vectors a and b at parameter t in [0, 1].
 * Returns a point on the great circle arc from a to b.
 */
export function interpolate(a: Vector, b: Vector, t: number): Vector {
  if (t === 0) return a;
  if (t === 1) return b;

  const ab = Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
  return interpolateAtDistance(a, b, t * ab);
}

/**
 * Returns a point on the great circle arc from a to b at the given angular distance.
 */
function interpolateAtDistance(a: Vector, b: Vector, axRadians: number): Vector {
  const sinAx = Math.sin(axRadians);
  const cosAx = Math.cos(axRadians);

  // Direction perpendicular to a in the plane of a and b.
  const d = sub(b, { x: a.x * dot(a, b), y: a.y * dot(a, b), z: a.z * dot(a, b) });
  const dNorm = Math.sqrt(norm2(d));

  if (dNorm === 0) return a;

  return {
    x: a.x * cosAx + (d.x / dNorm) * sinAx,
    y: a.y * cosAx + (d.y / dNorm) * sinAx,
    z: a.z * cosAx + (d.z / dNorm) * sinAx,
  };
}

/**
 * Returns the minimum distance from point x to the edge AB.
 * The edge is the shorter of the two great circle arcs from A to B.
 */
export function distanceFromSegment(x: Vector, a: Vector, b: Vector): number {
  // If the closest point on the great circle is within the arc, compute perpendicular distance.
  // Otherwise, return the minimum of distances to endpoints.
  const crossAB = cross(a, b);
  const crossABNorm2 = norm2(crossAB);

  if (crossABNorm2 === 0) {
    // a and b are the same point or antipodal
    return Math.acos(Math.max(-1, Math.min(1, dot(x, a))));
  }

  // Check if the closest point on the great circle through AB is between A and B.
  const d = dot(cross(crossAB, a), x);
  const e = dot(cross(b, crossAB), x);

  if (d >= 0 && e >= 0) {
    // Closest point is within the arc.
    const sinDist = Math.abs(dot(crossAB, x)) / Math.sqrt(crossABNorm2);
    return Math.asin(Math.max(-1, Math.min(1, sinDist)));
  }

  // Closest point is one of the endpoints.
  const dA = Math.acos(Math.max(-1, Math.min(1, dot(x, a))));
  const dB = Math.acos(Math.max(-1, Math.min(1, dot(x, b))));
  return Math.min(dA, dB);
}
