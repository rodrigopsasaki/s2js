/**
 * Two-dimensional points in Cartesian coordinates.
 *
 * @module
 */

/** A two-dimensional point. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Creates a new point. */
export function point(x: number, y: number): Point {
  return { x, y };
}

/** Returns the sum of two points. */
export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** Returns the difference of two points (a - b). */
export function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** Returns the point scaled by the given scalar. */
export function mul(p: Point, m: number): Point {
  return { x: p.x * m, y: p.y * m };
}

/** Returns the counterclockwise orthogonal point (-y, x). */
export function ortho(p: Point): Point {
  return { x: -p.y, y: p.x };
}

/** Returns the dot product of two points. */
export function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

/** Returns the cross product of two points (scalar in 2D). */
export function crossProduct(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x;
}

/** Returns the magnitude of the point vector. */
export function norm(p: Point): number {
  return Math.hypot(p.x, p.y);
}

/**
 * Returns the unit vector in the same direction.
 * Returns the zero point if the input is the zero point.
 */
export function normalize(p: Point): Point {
  const n = norm(p);
  if (n !== 0) {
    return mul(p, 1 / n);
  }
  return p;
}
