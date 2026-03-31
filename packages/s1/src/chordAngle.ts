/**
 * ChordAngle represents the angle subtended by a chord (the straight-line
 * segment connecting two points on the sphere). Its value is the squared
 * chord length, which ranges from 0 to 4.
 *
 * ChordAngle is more efficient than Angle for distance comparisons
 * because it avoids trigonometric functions.
 *
 * @module
 */

import { type Angle, angleFromRadians } from "./angle.js";

/** Maximum squared chord length (corresponding to 180 degrees). */
const MAX_LENGTH2 = 4.0;

/** A branded type representing a chord angle (squared chord length). */
export type ChordAngle = number & { readonly __brand: "s1.ChordAngle" };

/** Returns a negative chord angle (represents angles smaller than zero). */
export function negativeChordAngle(): ChordAngle {
  return -1 as ChordAngle;
}

/** Returns a 90-degree chord angle. */
export function rightChordAngle(): ChordAngle {
  return 2 as ChordAngle;
}

/** Returns a 180-degree chord angle (maximum finite value). */
export function straightChordAngle(): ChordAngle {
  return 4 as ChordAngle;
}

/** Returns positive infinity as a ChordAngle. */
export function infChordAngle(): ChordAngle {
  return Infinity as ChordAngle;
}

/** Returns a zero chord angle. */
export function zeroChordAngle(): ChordAngle {
  return 0 as ChordAngle;
}

/** Creates a ChordAngle from a squared chord length. */
export function chordAngleFromSquaredLength(length2: number): ChordAngle {
  if (length2 > MAX_LENGTH2) {
    return straightChordAngle();
  }
  return length2 as ChordAngle;
}

/** Converts an Angle to a ChordAngle. */
export function chordAngleFromAngle(a: Angle): ChordAngle {
  if (a < 0) {
    return negativeChordAngle();
  }
  if (!isFinite(a)) {
    return infChordAngle();
  }
  if (a > Math.PI) {
    return straightChordAngle();
  }
  const l = 2 * Math.sin(0.5 * a);
  return (l * l) as ChordAngle;
}

/** Converts a ChordAngle to an Angle. */
export function chordAngleToAngle(c: ChordAngle): Angle {
  if (isNegativeChordAngle(c)) {
    return angleFromRadians(-1);
  }
  if (isInfinityChordAngle(c)) {
    return angleFromRadians(Infinity);
  }
  if (c >= MAX_LENGTH2) {
    return angleFromRadians(Math.PI);
  }
  return angleFromRadians(2 * Math.asin(0.5 * Math.sqrt(c)));
}

/** Returns true if the ChordAngle is positive infinity. */
export function isInfinityChordAngle(c: ChordAngle): boolean {
  return c === Infinity;
}

/** Returns true if the ChordAngle is negative. */
export function isNegativeChordAngle(c: ChordAngle): boolean {
  return c < 0;
}

/** Returns true if the ChordAngle is a special value (negative or infinite). */
export function isSpecialChordAngle(c: ChordAngle): boolean {
  return isNegativeChordAngle(c) || isInfinityChordAngle(c);
}

/** Returns true if the ChordAngle is a valid value. */
export function isValidChordAngle(c: ChordAngle): boolean {
  return (c >= 0 && c <= MAX_LENGTH2) || isSpecialChordAngle(c);
}

/**
 * Returns the next representable ChordAngle value.
 * For the zero angle, returns the smallest positive value.
 * For infinity, returns infinity.
 */
export function successorChordAngle(c: ChordAngle): ChordAngle {
  if (c >= MAX_LENGTH2) {
    return infChordAngle();
  }
  if (c < 0) {
    return zeroChordAngle();
  }
  return nextAfter(c, Infinity) as ChordAngle;
}

/**
 * Returns the previous representable ChordAngle value.
 * For the zero angle, returns the negative sentinel.
 * For negative infinity, returns negative.
 */
export function predecessorChordAngle(c: ChordAngle): ChordAngle {
  if (c <= 0) {
    return negativeChordAngle();
  }
  if (c > MAX_LENGTH2) {
    return straightChordAngle();
  }
  return nextAfter(c, -Infinity) as ChordAngle;
}

/** Adds two ChordAngles. The result is clamped to StraightChordAngle. */
export function addChordAngle(a: ChordAngle, b: ChordAngle): ChordAngle {
  if (isSpecialChordAngle(a) || isSpecialChordAngle(b)) {
    if (isInfinityChordAngle(a) || isInfinityChordAngle(b)) {
      return infChordAngle();
    }
    return negativeChordAngle();
  }
  // Clamp to StraightChordAngle
  const sum = a + b;
  if (sum > MAX_LENGTH2) {
    return straightChordAngle();
  }
  return sum as ChordAngle;
}

/** Subtracts ChordAngle b from a. The result is clamped to zero. */
export function subChordAngle(a: ChordAngle, b: ChordAngle): ChordAngle {
  const diff = a - b;
  if (diff < 0) {
    return zeroChordAngle();
  }
  return diff as ChordAngle;
}

/** Returns the sine of the ChordAngle. */
export function sinChordAngle(c: ChordAngle): number {
  return Math.sqrt(sin2ChordAngle(c));
}

/** Returns the squared sine of the ChordAngle: c * (1 - 0.25 * c). */
export function sin2ChordAngle(c: ChordAngle): number {
  const d = c as number;
  return d * (1 - 0.25 * d);
}

/** Returns the cosine of the ChordAngle: 1 - 0.5 * c. */
export function cosChordAngle(c: ChordAngle): number {
  return 1 - 0.5 * (c as number);
}

/** Returns the tangent of the ChordAngle. */
export function tanChordAngle(c: ChordAngle): number {
  return sinChordAngle(c) / cosChordAngle(c);
}

/**
 * Returns the next representable floating-point value after x in the direction of y.
 * Simplified implementation using Float64Array/DataView for bit manipulation.
 */
function nextAfter(x: number, y: number): number {
  if (x === y) return x;
  if (isNaN(x) || isNaN(y)) return NaN;
  if (x === 0) {
    return y > 0 ? Number.MIN_VALUE : -Number.MIN_VALUE;
  }

  const buf = new ArrayBuffer(8);
  const f64 = new Float64Array(buf);
  const i64 = new BigInt64Array(buf);

  f64[0] = x;
  const bits = i64[0]!;

  if ((x > 0 && y > x) || (x < 0 && y < x)) {
    i64[0] = bits + 1n;
  } else {
    i64[0] = bits - 1n;
  }

  return f64[0]!;
}
