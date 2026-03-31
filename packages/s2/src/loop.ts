/**
 * Loops on the unit sphere.
 *
 * A Loop represents a closed boundary on the unit sphere. It is defined by a
 * sequence of vertices where the interior of the loop is on the left side of
 * the edges when traversed in order.
 *
 * @module
 */

import { type Vector, cross, dot, angle, isUnit, vector } from "@s2js/r3";
import { sign, SIGN } from "./predicates.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The full sphere area: 4 * PI steradians. */
const FULL_SPHERE_AREA = 4 * Math.PI;

/** Two PI. */
const TWO_PI = 2 * Math.PI;

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

/** A closed loop of vertices on the unit sphere. */
export interface Loop {
  readonly vertices: readonly Vector[];
  readonly depth: number;
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

/**
 * Creates a Loop from a sequence of vertices with depth 0.
 * The vertices define edges from vertex[i] to vertex[(i+1) % len].
 * The interior is to the left of the edges when traversed in order.
 *
 * @param vertices - The loop vertices (must be unit vectors)
 */
export function loopFromPoints(vertices: readonly Vector[]): Loop {
  return { vertices, depth: 0 };
}

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------

/** Returns the number of vertices in the loop. */
export function numVertices(l: Loop): number {
  return l.vertices.length;
}

/**
 * Returns the vertex at the given index, wrapping around.
 * vertex(l, numVertices(l)) returns vertex(l, 0).
 *
 * @param l - The loop
 * @param i - The vertex index (may be negative or >= numVertices)
 */
export function vertex(l: Loop, i: number): Vector {
  const n = l.vertices.length;
  const idx = ((i % n) + n) % n;
  return l.vertices[idx] as Vector;
}

// ---------------------------------------------------------------------------
// Predicates
// ---------------------------------------------------------------------------

/** Returns true if the loop has no vertices. */
export function isEmptyLoop(l: Loop): boolean {
  return l.vertices.length === 0;
}

/**
 * Returns true if this is the "full loop" (contains the entire sphere).
 * A full loop is represented as a single vertex at (0, 0, -1) by convention.
 */
export function isFullLoop(l: Loop): boolean {
  if (l.vertices.length !== 1) return false;
  const v = l.vertices[0] as Vector;
  return v.x === 0 && v.y === 0 && v.z === -1;
}

/**
 * Returns true if the loop vertices form a valid loop.
 * - All vertices must be unit vectors.
 * - No two adjacent vertices may be identical.
 * - No two adjacent vertices may be antipodal.
 *
 * @param l - The loop to validate
 */
export function loopIsValid(l: Loop): boolean {
  const n = l.vertices.length;
  if (n === 0) return true;

  for (let i = 0; i < n; i++) {
    const v = l.vertices[i] as Vector;
    if (!isUnit(v)) return false;

    const next = l.vertices[(i + 1) % n] as Vector;
    // Check for duplicate adjacent vertices
    if (v.x === next.x && v.y === next.y && v.z === next.z) return false;
    // Check for antipodal adjacent vertices
    if (v.x === -next.x && v.y === -next.y && v.z === -next.z) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/**
 * Returns the area of the loop in steradians using the spherical excess formula.
 * For a counter-clockwise loop, the area is positive and at most 4*PI.
 * If the loop is clockwise, the area will be 4*PI minus the enclosed area.
 *
 * Uses the generalization of Girard's theorem: the area of a spherical polygon
 * is the sum of the interior angles minus (n-2)*PI.
 *
 * @param l - The loop
 */
export function loopArea(l: Loop): number {
  const n = l.vertices.length;
  if (n < 3) return 0;

  // Sum interior angles using the spherical excess formula.
  // At each vertex, the interior angle is PI minus the exterior (turning) angle.
  // Area = sum(interior_angles) - (n-2)*PI
  //      = sum(PI - exterior_angle) - (n-2)*PI
  //      = n*PI - sum(exterior_angles) - (n-2)*PI
  //      = 2*PI - sum(exterior_angles)
  //      = 2*PI - turningAngle
  const ta = turningAngle(l);
  let area = TWO_PI - ta;

  // Normalize to [0, 4*PI)
  if (area < 0) {
    area += FULL_SPHERE_AREA;
  }
  if (area > FULL_SPHERE_AREA) {
    area = FULL_SPHERE_AREA;
  }

  return area;
}

/**
 * Returns the sum of the turning (exterior) angles at each vertex.
 * For a counter-clockwise loop enclosing a small area, this is approximately 2*PI.
 *
 * The turning angle at each vertex is the exterior angle: the angle you turn
 * through when traversing the boundary. Positive means turning left (CCW).
 *
 * @param l - The loop
 */
export function turningAngle(l: Loop): number {
  const n = l.vertices.length;
  if (n < 3) return TWO_PI;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    const prev = vertex(l, i - 1);
    const curr = vertex(l, i);
    const next = vertex(l, i + 1);
    sum += exteriorAngle(prev, curr, next);
  }

  return sum;
}

/**
 * Returns the weighted centroid of the loop as a non-unit vector.
 * The magnitude is proportional to the loop area.
 * For a unit-length result, normalize the return value.
 *
 * Each edge contributes a wedge-shaped region whose centroid is proportional
 * to the cross product of its endpoints.
 *
 * @param l - The loop
 */
export function loopCentroid(l: Loop): Vector {
  const n = l.vertices.length;
  if (n === 0) return vector(0, 0, 0);

  let cx = 0;
  let cy = 0;
  let cz = 0;

  for (let i = 0; i < n; i++) {
    const a = vertex(l, i);
    const b = vertex(l, i + 1);
    // The "true centroid" contribution of each edge is proportional to
    // the cross product of its endpoints times the angle between them.
    const c = cross(a, b);
    const ang = angle(a, b);
    cx += c.x * ang;
    cy += c.y * ang;
    cz += c.z * ang;
  }

  return vector(cx, cy, cz);
}

// ---------------------------------------------------------------------------
// Containment
// ---------------------------------------------------------------------------

/**
 * Returns true if the loop contains the given point.
 *
 * Uses the winding number approach: computes the total signed angle subtended
 * at p by all edges of the loop. If the total is approximately +/- 2*PI,
 * the point is inside.
 *
 * @param l - The loop
 * @param p - A point on the unit sphere
 */
export function loopContainsPoint(l: Loop, p: Vector): boolean {
  const n = l.vertices.length;
  if (n === 0) return false;
  if (n === 1) {
    const v = l.vertices[0] as Vector;
    return v.x === 0 && v.y === 0 && v.z === -1;
  }

  // Compute the winding number by summing signed angles at p.
  // We carry forward the cross product cross(p, vertex) between iterations
  // to avoid recomputing it for the shared vertex.
  let windingAngle = 0;
  const v0 = vertex(l, 0);

  // Precompute first cross(p, v0) as scalars (no allocation)
  let prevCrossX = p.y * v0.z - p.z * v0.y;
  let prevCrossY = p.z * v0.x - p.x * v0.z;
  let prevCrossZ = p.x * v0.y - p.y * v0.x;

  for (let i = 0; i < n; i++) {
    const b = vertex(l, i + 1);

    // cross(p, b) — the "next" cross product (reused as "prev" in next iteration)
    const pbx = p.y * b.z - p.z * b.y;
    const pby = p.z * b.x - p.x * b.z;
    const pbz = p.x * b.y - p.y * b.x;

    // Norms of cross(p, a) and cross(p, b)
    const paNorm = Math.sqrt(prevCrossX * prevCrossX + prevCrossY * prevCrossY + prevCrossZ * prevCrossZ);
    const pbNorm = Math.sqrt(pbx * pbx + pby * pby + pbz * pbz);

    if (paNorm > 0 && pbNorm > 0) {
      const invNorms = 1 / (paNorm * pbNorm);
      // dot(cross(p,a), cross(p,b))
      const cosAngle = (prevCrossX * pbx + prevCrossY * pby + prevCrossZ * pbz) * invNorms;
      // dot(cross(cross(p,a), cross(p,b)), p)
      const cpx = prevCrossY * pbz - prevCrossZ * pby;
      const cpy = prevCrossZ * pbx - prevCrossX * pbz;
      const cpz = prevCrossX * pby - prevCrossY * pbx;
      const sinAngle = (cpx * p.x + cpy * p.y + cpz * p.z) * invNorms;
      windingAngle += Math.atan2(sinAngle, cosAngle);
    }

    // Carry forward: next iteration's "prev" is this iteration's "next"
    prevCrossX = pbx;
    prevCrossY = pby;
    prevCrossZ = pbz;
  }

  // For a CCW-oriented loop, the winding number is +2π for interior points.
  return windingAngle > Math.PI;
}

/**
 * Returns true if this loop contains all points of the other loop.
 * This requires that all vertices of the other loop are inside this loop,
 * and that the loops do not cross.
 *
 * @param l - The containing loop
 * @param other - The loop to test
 */
export function loopContainsLoop(l: Loop, other: Loop): boolean {
  if (isEmptyLoop(other)) return true;
  if (isEmptyLoop(l)) return false;

  if (numVertices(other) === 0) return true;
  if (!loopContainsPoint(l, vertex(other, 0))) return false;

  return !loopsHaveEdgeCrossing(l, other);
}

/**
 * Returns true if this loop has any points in common with the other loop.
 *
 * @param l - First loop
 * @param other - Second loop
 */
export function loopIntersectsLoop(l: Loop, other: Loop): boolean {
  if (isEmptyLoop(l) || isEmptyLoop(other)) return false;

  if (loopsHaveEdgeCrossing(l, other)) return true;
  if (loopContainsPoint(l, vertex(other, 0))) return true;
  if (loopContainsPoint(other, vertex(l, 0))) return true;

  return false;
}

/**
 * Returns true if the loop area is at most 2*PI (the interior is the smaller region).
 *
 * @param l - The loop
 */
export function isNormalized(l: Loop): boolean {
  return loopArea(l) <= TWO_PI;
}

/**
 * Returns a normalized version of the loop. If the area exceeds 2*PI,
 * the vertices are reversed so the interior becomes the smaller region.
 *
 * @param l - The loop to normalize
 */
export function normalizeLoop(l: Loop): Loop {
  if (isNormalized(l)) return l;
  return { vertices: [...l.vertices].reverse(), depth: l.depth };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Computes the exterior (turning) angle at vertex curr in the path prev -> curr -> next.
 *
 * The exterior angle is the signed angle between the outgoing tangent direction
 * and the incoming tangent direction. For a convex CCW polygon, exterior angles
 * are positive.
 *
 * Uses the formula: atan2(dot(cross(a,b), b_cross_c_normalized), dot(a_cross_b, b_cross_c))
 * where a_cross_b and b_cross_c are the normals to the great circle edges.
 */
function exteriorAngle(prev: Vector, curr: Vector, next: Vector): number {
  // Normal to the plane of the great circle through prev -> curr
  // (points "left" of the edge for CCW traversal)
  const n1 = cross(prev, curr);
  // Normal to the plane of the great circle through curr -> next
  const n2 = cross(curr, next);

  // The exterior angle is PI minus the angle between the two edge normals,
  // signed by whether we turn left or right.
  // Using atan2 for a robust signed angle:
  //   sin(angle) ~ dot(cross(n1, n2), curr) / (|n1| * |n2|)
  //   cos(angle) ~ dot(n1, n2) / (|n1| * |n2|)
  const sinAngle = dot(cross(n1, n2), curr);
  const cosAngle = dot(n1, n2);

  // atan2 gives the signed angle between n1 and n2 about the curr axis.
  // For a CCW polygon, this is PI - interior_angle, i.e., the exterior angle.
  return Math.atan2(sinAngle, cosAngle);
}

/**
 * Returns true if any edge of loop a properly crosses any edge of loop b.
 */
function loopsHaveEdgeCrossing(a: Loop, b: Loop): boolean {
  const na = numVertices(a);
  const nb = numVertices(b);

  for (let i = 0; i < na; i++) {
    const a0 = vertex(a, i);
    const a1 = vertex(a, i + 1);
    for (let j = 0; j < nb; j++) {
      const b0 = vertex(b, j);
      const b1 = vertex(b, j + 1);
      if (edgesProperCross(a0, a1, b0, b1)) return true;
    }
  }

  return false;
}

/**
 * Returns true if edges AB and CD properly cross (not just touch).
 */
function edgesProperCross(a: Vector, b: Vector, c: Vector, d: Vector): boolean {
  const abc = sign(a, b, c);
  const abd = sign(a, b, d);
  const cda = sign(c, d, a);
  const cdb = sign(c, d, b);

  return (
    abc !== SIGN.INDETERMINATE &&
    abd !== SIGN.INDETERMINATE &&
    abc !== abd &&
    cda !== SIGN.INDETERMINATE &&
    cdb !== SIGN.INDETERMINATE &&
    cda !== cdb
  );
}
