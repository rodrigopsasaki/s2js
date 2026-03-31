/**
 * One-dimensional closed intervals on the real number line.
 *
 * An interval represents a closed set of real numbers [lo, hi].
 * An empty interval is represented by lo > hi.
 *
 * @module
 */

/** Standard noise threshold for approximate equality comparisons. */
const EPSILON = 1e-15;

/**
 * A closed interval on the real number line.
 * Empty intervals are represented by lo > hi.
 */
export interface Interval {
  readonly lo: number;
  readonly hi: number;
}

/** Returns an empty interval (lo > hi). */
export function emptyInterval(): Interval {
  return { lo: 1, hi: 0 };
}

/** Returns a single-point interval [p, p]. */
export function intervalFromPoint(p: number): Interval {
  return { lo: p, hi: p };
}

/**
 * Returns the smallest interval containing both points.
 * The order of the arguments does not matter.
 */
export function intervalFromPointPair(a: number, b: number): Interval {
  return a <= b ? { lo: a, hi: b } : { lo: b, hi: a };
}

/** Returns true if the interval is empty (contains no points). */
export function isEmpty(i: Interval): boolean {
  return i.lo > i.hi;
}

/** Returns the center (midpoint) of the interval. Undefined for empty intervals. */
export function center(i: Interval): number {
  return 0.5 * (i.lo + i.hi);
}

/** Returns the length of the interval. Negative for empty intervals. */
export function length(i: Interval): number {
  return i.hi - i.lo;
}

/** Returns true if the interval contains the given point. */
export function contains(i: Interval, p: number): boolean {
  return i.lo <= p && p <= i.hi;
}

/** Returns true if the interval contains every point of the other interval. */
export function containsInterval(i: Interval, other: Interval): boolean {
  if (isEmpty(other)) {
    return true;
  }
  return i.lo <= other.lo && other.hi <= i.hi;
}

/** Returns true if the interior of the interval contains the given point (strict containment). */
export function interiorContains(i: Interval, p: number): boolean {
  return i.lo < p && p < i.hi;
}

/** Returns true if the interior of the interval contains every point of the other interval. */
export function interiorContainsInterval(i: Interval, other: Interval): boolean {
  if (isEmpty(other)) {
    return true;
  }
  return i.lo < other.lo && other.hi < i.hi;
}

/** Returns true if the interval and the other interval have any points in common. */
export function intersects(i: Interval, other: Interval): boolean {
  if (i.lo <= other.lo) {
    return other.lo <= i.hi && other.lo <= other.hi;
  }
  return i.lo <= other.hi && i.lo <= i.hi;
}

/** Returns true if the interior of the interval intersects any point of the other interval (including its boundary). */
export function interiorIntersects(i: Interval, other: Interval): boolean {
  return other.lo < i.hi && i.lo < other.hi;
}

/** Returns the interval containing all points common to both intervals. */
export function intersection(i: Interval, j: Interval): Interval {
  const lo = Math.max(i.lo, j.lo);
  const hi = Math.min(i.hi, j.hi);
  if (lo <= hi) {
    return { lo, hi };
  }
  return emptyInterval();
}

/** Returns the smallest interval containing all points in both intervals. */
export function union(i: Interval, other: Interval): Interval {
  if (isEmpty(i)) {
    return other;
  }
  if (isEmpty(other)) {
    return i;
  }
  return {
    lo: Math.min(i.lo, other.lo),
    hi: Math.max(i.hi, other.hi),
  };
}

/** Returns the interval expanded to include the given point. */
export function addPoint(i: Interval, p: number): Interval {
  if (isEmpty(i)) {
    return intervalFromPoint(p);
  }
  if (p < i.lo) {
    return { lo: p, hi: i.hi };
  }
  if (p > i.hi) {
    return { lo: i.lo, hi: p };
  }
  return i;
}

/** Returns the point closest to p that is within the interval. */
export function clampPoint(i: Interval, p: number): number {
  return Math.max(i.lo, Math.min(i.hi, p));
}

/**
 * Returns an interval expanded by the given margin on each side.
 * If the margin is negative and greater than half the interval width,
 * the result is an empty interval.
 * Empty intervals remain empty regardless of margin.
 */
export function expanded(i: Interval, margin: number): Interval {
  if (isEmpty(i)) {
    return i;
  }
  const result = { lo: i.lo - margin, hi: i.hi + margin };
  if (result.lo > result.hi) {
    return emptyInterval();
  }
  return result;
}

/** Returns true if the two intervals contain the same set of points. */
export function equals(a: Interval, b: Interval): boolean {
  if (isEmpty(a)) {
    return isEmpty(b);
  }
  return a.lo === b.lo && a.hi === b.hi;
}

/**
 * Returns true if the interval can be transformed into the other
 * by moving each endpoint by at most maxError.
 * The empty interval is only considered approximately equal to itself.
 */
export function approxEquals(a: Interval, b: Interval, maxError: number = EPSILON): boolean {
  if (isEmpty(a)) {
    return length(b) <= 2 * maxError;
  }
  if (isEmpty(b)) {
    return length(a) <= 2 * maxError;
  }
  return Math.abs(a.lo - b.lo) <= maxError && Math.abs(a.hi - b.hi) <= maxError;
}

/**
 * Returns the directed Hausdorff distance from this interval to the other.
 * For two intervals i and j, this is defined as:
 *   h(i, j) = max_{p in i} min_{q in j} d(p, q)
 */
export function directedHausdorffDistance(i: Interval, other: Interval): number {
  if (isEmpty(i)) {
    return 0;
  }
  if (isEmpty(other)) {
    return Infinity;
  }
  return Math.max(0, Math.max(i.hi - other.hi, other.lo - i.lo));
}
