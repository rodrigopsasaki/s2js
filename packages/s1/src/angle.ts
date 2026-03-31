/**
 * Angular types representing one-dimensional angles.
 *
 * Angle is stored internally as radians (a branded number type).
 *
 * @module
 */

const DEGREE = Math.PI / 180;
const EPSILON = 1e-15;

/** A branded type representing an angle in radians. */
export type Angle = number & { readonly __brand: "s1.Angle" };

/** Creates an Angle from radians. */
export function angleFromRadians(radians: number): Angle {
  return radians as Angle;
}

/** Creates an Angle from degrees. */
export function angleFromDegrees(degrees: number): Angle {
  return (degrees * DEGREE) as Angle;
}

/** Creates an Angle from E5 (hundred-thousandths of degrees). */
export function angleFromE5(e5: number): Angle {
  return angleFromDegrees(e5 * 1e-5);
}

/** Creates an Angle from E6 (millionths of degrees). */
export function angleFromE6(e6: number): Angle {
  return angleFromDegrees(e6 * 1e-6);
}

/** Creates an Angle from E7 (ten-millionths of degrees). */
export function angleFromE7(e7: number): Angle {
  return angleFromDegrees(e7 * 1e-7);
}

/** Returns positive infinity as an Angle. */
export function infAngle(): Angle {
  return Infinity as Angle;
}

/** Returns the angle value in radians. */
export function toRadians(a: Angle): number {
  return a;
}

/** Returns the angle value in degrees. */
export function toDegrees(a: Angle): number {
  return (a as number) / DEGREE;
}

/** Returns the angle in E5 (hundred-thousandths of degrees). */
export function toE5(a: Angle): number {
  return Math.round(toDegrees(a) * 1e5);
}

/** Returns the angle in E6 (millionths of degrees). */
export function toE6(a: Angle): number {
  return Math.round(toDegrees(a) * 1e6);
}

/** Returns the angle in E7 (ten-millionths of degrees). */
export function toE7(a: Angle): number {
  return Math.round(toDegrees(a) * 1e7);
}

/** Returns the absolute value of the angle. */
export function absAngle(a: Angle): Angle {
  return Math.abs(a) as Angle;
}

/**
 * Returns the angle normalized to the range (-π, π].
 * Uses remainder to wrap the angle.
 */
export function normalized(a: Angle): Angle {
  let rem = remainder(a, 2 * Math.PI);
  if (rem <= -Math.PI) {
    rem = Math.PI;
  }
  return rem as Angle;
}

/** Returns true if the angle is infinite. */
export function isInfAngle(a: Angle): boolean {
  return !isFinite(a);
}

/** Returns true if two angles are approximately equal. */
export function approxEqualAngle(a: Angle, b: Angle): boolean {
  return Math.abs(a - b) <= EPSILON;
}

/**
 * IEEE 754 remainder (matching Go's math.Remainder).
 * Equivalent to: x - round(x/y) * y
 */
function remainder(x: number, y: number): number {
  return x - Math.round(x / y) * y;
}
