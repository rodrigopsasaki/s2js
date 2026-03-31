/**
 * Three-dimensional vectors in Cartesian coordinates.
 *
 * Provides operations on 3D vectors used as the foundation for
 * representing points on the unit sphere in S2 geometry.
 *
 * @module
 */

/** Epsilon for approximate floating-point comparisons. */
const EPSILON = 1e-16;

/** Epsilon for unit vector validation (allows some tolerance). */
const IS_UNIT_EPSILON = 5e-14;

/** Axis identifiers for component selection. */
export const AXIS = {
  X: 0,
  Y: 1,
  Z: 2,
} as const;

export type Axis = (typeof AXIS)[keyof typeof AXIS];

/** A three-dimensional vector. */
export interface Vector {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Creates a new vector. */
export function vector(x: number, y: number, z: number): Vector {
  return { x, y, z };
}

/** Returns the sum of two vectors. */
export function add(a: Vector, b: Vector): Vector {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

/** Returns the difference of two vectors (a - b). */
export function sub(a: Vector, b: Vector): Vector {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

/** Returns the vector scaled by the given scalar. */
export function mul(v: Vector, m: number): Vector {
  return { x: v.x * m, y: v.y * m, z: v.z * m };
}

/** Returns the dot product of two vectors. */
export function dot(a: Vector, b: Vector): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Returns the cross product of two vectors. */
export function cross(a: Vector, b: Vector): Vector {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/** Returns the magnitude (Euclidean norm) of the vector. */
export function norm(v: Vector): number {
  return Math.sqrt(dot(v, v));
}

/** Returns the squared magnitude of the vector. */
export function norm2(v: Vector): number {
  return dot(v, v);
}

/**
 * Returns the unit vector in the same direction.
 * Returns the zero vector if the input is the zero vector.
 */
export function normalize(v: Vector): Vector {
  const n = norm(v);
  if (n !== 0) {
    return mul(v, 1 / n);
  }
  return v;
}

/** Returns true if the vector has unit length (within tolerance). */
export function isUnit(v: Vector): boolean {
  return Math.abs(norm2(v) - 1) <= IS_UNIT_EPSILON;
}

/** Returns a vector with the absolute value of each component. */
export function abs(v: Vector): Vector {
  return { x: Math.abs(v.x), y: Math.abs(v.y), z: Math.abs(v.z) };
}

/** Returns the Euclidean distance between two vectors. */
export function distance(a: Vector, b: Vector): number {
  return norm(sub(a, b));
}

/**
 * Returns the angle between two vectors in radians.
 * Uses atan2(|a x b|, a . b) for numerical stability at all angles.
 */
export function angle(a: Vector, b: Vector): number {
  return Math.atan2(norm(cross(a, b)), dot(a, b));
}

/**
 * Returns a unit vector orthogonal to the input.
 * The result is determined by the largest component of the input
 * to maximize numerical stability.
 */
export function ortho(v: Vector): Vector {
  const axis = largestComponent(v);
  let temp: Vector;
  if (axis === AXIS.X) {
    temp = { x: 0, y: 0, z: 1 };
  } else if (axis === AXIS.Y) {
    temp = { x: 1, y: 0, z: 0 };
  } else {
    temp = { x: 0, y: 1, z: 0 };
  }
  return normalize(cross(v, temp));
}

/** Returns the axis with the largest absolute component value. */
export function largestComponent(v: Vector): Axis {
  const t = abs(v);
  if (t.x > t.y) {
    if (t.x > t.z) {
      return AXIS.X;
    }
    return AXIS.Z;
  }
  if (t.y > t.z) {
    return AXIS.Y;
  }
  return AXIS.Z;
}

/** Returns the axis with the smallest absolute component value. */
export function smallestComponent(v: Vector): Axis {
  const t = abs(v);
  if (t.x < t.y) {
    if (t.x < t.z) {
      return AXIS.X;
    }
    return AXIS.Z;
  }
  if (t.y < t.z) {
    return AXIS.Y;
  }
  return AXIS.Z;
}

/** Returns true if the two vectors are approximately equal (within epsilon per component). */
export function approxEqual(a: Vector, b: Vector): boolean {
  return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON && Math.abs(a.z - b.z) < EPSILON;
}

/**
 * Lexicographic comparison of two vectors.
 * Returns -1, 0, or 1.
 */
export function cmp(a: Vector, b: Vector): -1 | 0 | 1 {
  if (a.x < b.x) return -1;
  if (a.x > b.x) return 1;
  if (a.y < b.y) return -1;
  if (a.y > b.y) return 1;
  if (a.z < b.z) return -1;
  if (a.z > b.z) return 1;
  return 0;
}
