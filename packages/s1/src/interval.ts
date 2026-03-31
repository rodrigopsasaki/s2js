/**
 * Closed intervals on the unit circle (circular intervals).
 *
 * Unlike r1.Interval, s1.Interval can represent intervals that wrap
 * around the discontinuity at ±π. The interval is "inverted" when lo > hi,
 * meaning it wraps through -π.
 *
 * @module
 */

const EPSILON = 1e-15;

/** A closed interval on the unit circle, represented in radians [-π, π]. */
export interface Interval {
  readonly lo: number;
  readonly hi: number;
}

/** Returns an empty interval [π, -π]. */
export function emptyInterval(): Interval {
  return { lo: Math.PI, hi: -Math.PI };
}

/** Returns the full interval [-π, π]. */
export function fullInterval(): Interval {
  return { lo: -Math.PI, hi: Math.PI };
}

/** Creates an interval from a single point. */
export function intervalFromPoint(p: number): Interval {
  return { lo: p, hi: p };
}

/**
 * Creates an interval from endpoints.
 * The interval goes counterclockwise from lo to hi.
 */
export function intervalFromEndpoints(lo: number, hi: number): Interval {
  return { lo, hi };
}

/** Returns true if the interval is valid. */
export function isValid(i: Interval): boolean {
  return (
    Math.abs(i.lo) <= Math.PI &&
    Math.abs(i.hi) <= Math.PI &&
    !(i.lo === -Math.PI && i.hi !== Math.PI) &&
    !(i.hi === -Math.PI && i.lo !== Math.PI)
  );
}

/** Returns true if the interval is full [-π, π]. */
export function isFull(i: Interval): boolean {
  return i.lo === -Math.PI && i.hi === Math.PI;
}

/** Returns true if the interval is empty [π, -π]. */
export function isEmpty(i: Interval): boolean {
  return i.lo === Math.PI && i.hi === -Math.PI;
}

/** Returns true if lo > hi (the interval wraps around -π). */
export function isInverted(i: Interval): boolean {
  return i.lo > i.hi;
}

/** Returns the center of the interval. */
export function center(i: Interval): number {
  const c = 0.5 * (i.lo + i.hi);
  if (!isInverted(i)) {
    return c;
  }
  return c <= 0 ? c + Math.PI : c - Math.PI;
}

/** Returns the angular length of the interval. Negative for empty intervals. */
export function length(i: Interval): number {
  let l = i.hi - i.lo;
  if (l >= 0) {
    return l;
  }
  l += 2 * Math.PI;
  if (l > 0) {
    return l;
  }
  return -1;
}

/** Returns the interval with swapped endpoints. */
export function invert(i: Interval): Interval {
  return { lo: i.hi, hi: i.lo };
}

/** Returns the complement of the interval. */
export function complement(i: Interval): Interval {
  if (i.lo === i.hi) {
    return fullInterval();
  }
  return { lo: i.hi, hi: i.lo };
}

/** Returns true if the interval contains the given point. */
export function contains(i: Interval, p: number): boolean {
  if (isEmpty(i)) return false;
  if (p === -Math.PI) {
    p = Math.PI;
  }
  return fastContains(i, p);
}

/** Returns true if the interval contains every point of the other interval. */
export function containsInterval(i: Interval, other: Interval): boolean {
  if (isInverted(i)) {
    if (isInverted(other)) {
      return other.lo >= i.lo && other.hi <= i.hi;
    }
    return (other.lo >= i.lo || other.hi <= i.hi) && !isEmpty(i);
  }
  if (isInverted(other)) {
    return isFull(i) || isEmpty(other);
  }
  return other.lo >= i.lo && other.hi <= i.hi;
}

/** Returns true if the interior of the interval contains the given point. */
export function interiorContains(i: Interval, p: number): boolean {
  if (p === -Math.PI) {
    p = Math.PI;
  }
  if (isInverted(i)) {
    return p > i.lo || p < i.hi;
  }
  return (p > i.lo && p < i.hi) || isFull(i);
}

/** Returns true if the interior of the interval contains every point of the other. */
export function interiorContainsInterval(i: Interval, other: Interval): boolean {
  if (isInverted(i)) {
    if (!isInverted(other)) {
      return other.lo > i.lo || other.hi < i.hi;
    }
    return (other.lo > i.lo && other.hi < i.hi) || isEmpty(other);
  }
  if (isInverted(other)) {
    return isFull(i) || isEmpty(other);
  }
  return (other.lo > i.lo && other.hi < i.hi) || isFull(i);
}

/** Returns true if the intervals share any common points. */
export function intersects(i: Interval, other: Interval): boolean {
  if (isEmpty(i) || isEmpty(other)) {
    return false;
  }
  if (isInverted(i)) {
    return isInverted(other) || other.lo <= i.hi || other.hi >= i.lo;
  }
  if (isInverted(other)) {
    return other.lo <= i.hi || other.hi >= i.lo;
  }
  return other.lo <= i.hi && other.hi >= i.lo;
}

/** Returns true if the interior of the interval intersects any point of the other. */
export function interiorIntersects(i: Interval, other: Interval): boolean {
  if (isEmpty(i) || isEmpty(other) || i.lo === i.hi) {
    return false;
  }
  if (isInverted(i)) {
    return isInverted(other) || other.lo < i.hi || other.hi > i.lo;
  }
  if (isInverted(other)) {
    return other.lo < i.hi || other.hi > i.lo;
  }
  return (other.lo < i.hi && other.hi > i.lo) || isFull(i);
}

/** Returns the smallest interval containing both intervals. */
export function union(i: Interval, other: Interval): Interval {
  if (isEmpty(other)) return i;
  if (fastContains(i, other.lo)) {
    if (fastContains(i, other.hi)) {
      if (containsInterval(i, other)) return i;
      return fullInterval();
    }
    return { lo: i.lo, hi: other.hi };
  }
  if (fastContains(i, other.hi)) {
    return { lo: other.lo, hi: i.hi };
  }
  if (isEmpty(i) || other.lo < i.lo) {
    return other;
  }
  return i;
}

/** Returns the smallest interval containing all common points. */
export function intersection(i: Interval, other: Interval): Interval {
  if (isEmpty(other)) return emptyInterval();
  if (fastContains(i, other.lo)) {
    if (fastContains(i, other.hi)) {
      if (length(other) < length(i)) return other;
      return i;
    }
    return { lo: other.lo, hi: i.hi };
  }
  if (fastContains(i, other.hi)) {
    return { lo: i.lo, hi: other.hi };
  }
  if (containsInterval(other, i)) {
    return i;
  }
  return emptyInterval();
}

/** Returns the interval expanded to include the given point. */
export function addPoint(i: Interval, p: number): Interval {
  if (Math.abs(p) > Math.PI) return i;
  if (p === -Math.PI) {
    p = Math.PI;
  }
  if (fastContains(i, p)) return i;
  if (isEmpty(i)) return { lo: p, hi: p };

  if (positiveDistance(p, i.lo) < positiveDistance(i.hi, p)) {
    return { lo: p, hi: i.hi };
  }
  return { lo: i.lo, hi: p };
}

/**
 * Returns the interval expanded by the given margin on each side.
 * Empty intervals remain empty. Intervals that expand to more than
 * a full circle become full.
 */
export function expanded(i: Interval, margin: number): Interval {
  if (margin >= 0) {
    if (isEmpty(i)) return i;
    const result = { lo: remainder(i.lo - margin, 2 * Math.PI), hi: remainder(i.hi + margin, 2 * Math.PI) };
    if (length(result) >= 2 * Math.PI - 2 * margin) {
      return fullInterval();
    }
    return result;
  }
  const l = length(i);
  if (l < -2 * margin) {
    return emptyInterval();
  }
  if (l < -2 * margin + 2 * EPSILON) {
    const mid = center(i);
    return { lo: mid, hi: mid };
  }
  return { lo: remainder(i.lo - margin, 2 * Math.PI), hi: remainder(i.hi + margin, 2 * Math.PI) };
}

/** Returns the midpoint of the complement of the interval. */
export function complementCenter(i: Interval): number {
  if (i.lo !== i.hi) {
    return complement(i).lo + (complement(i).hi - complement(i).lo) / 2;
  }
  return i.hi <= 0 ? i.hi + Math.PI : i.hi - Math.PI;
}

/** Returns the nearest endpoint to the given point. */
export function project(i: Interval, p: number): number {
  if (p === -Math.PI) p = Math.PI;
  if (fastContains(i, p)) return p;
  const dlo = positiveDistance(p, i.lo);
  const dhi = positiveDistance(i.hi, p);
  return dlo < dhi ? i.lo : i.hi;
}

/** Returns true if the two intervals are approximately equal. */
export function approxEquals(a: Interval, b: Interval): boolean {
  if (isEmpty(a)) {
    return length(b) <= 2 * EPSILON;
  }
  if (isEmpty(b)) {
    return length(a) <= 2 * EPSILON;
  }
  return (
    Math.abs(remainder(b.lo - a.lo, 2 * Math.PI)) <= EPSILON && Math.abs(remainder(b.hi - a.hi, 2 * Math.PI)) <= EPSILON
  );
}

/** Fast containment check assuming p is in (-π, π]. */
function fastContains(i: Interval, p: number): boolean {
  if (isInverted(i)) {
    return p >= i.lo || p <= i.hi;
  }
  return p >= i.lo && p <= i.hi;
}

/** Returns the positive distance from a to b on the circle [0, 2π). */
function positiveDistance(a: number, b: number): number {
  const d = b - a;
  return d >= 0 ? d : b + 2 * Math.PI - a;
}

/** IEEE 754 remainder. */
function remainder(x: number, y: number): number {
  return x - Math.round(x / y) * y;
}
