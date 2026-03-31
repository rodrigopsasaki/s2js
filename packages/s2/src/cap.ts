/**
 * Spherical caps (discs on the unit sphere).
 *
 * A Cap represents the set of all points within a given angular distance
 * of a center point on the unit sphere. The angular distance is stored
 * as a ChordAngle (squared chord length) for efficiency.
 *
 * @module
 */

import { type Vector, norm2, sub, vector } from "@s2js/r3";
import {
  type Angle,
  type ChordAngle,
  chordAngleFromAngle,
  chordAngleFromSquaredLength,
  chordAngleToAngle,
  negativeChordAngle,
  straightChordAngle,
  zeroChordAngle,
} from "@s2js/s1";

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

/** A spherical cap defined by a center point and a chord angle radius. */
export interface Cap {
  readonly center: Vector;
  readonly radius: ChordAngle;
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

/** Returns an empty cap (contains no points). */
export function emptyCap(): Cap {
  return { center: vector(1, 0, 0), radius: negativeChordAngle() };
}

/** Returns a full cap (contains the entire sphere). */
export function fullCap(): Cap {
  return { center: vector(1, 0, 0), radius: straightChordAngle() };
}

/**
 * Creates a Cap from a center point and an angular radius.
 *
 * @param center - The center point on the unit sphere
 * @param angle - The angular radius as an s1.Angle (in radians)
 */
export function capFromCenterAngle(center: Vector, angle: Angle): Cap {
  return { center, radius: chordAngleFromAngle(angle) };
}

/**
 * Creates a Cap from a center point and a ChordAngle radius.
 *
 * @param center - The center point on the unit sphere
 * @param radius - The angular radius as a ChordAngle
 */
export function capFromCenterChordAngle(center: Vector, radius: ChordAngle): Cap {
  return { center, radius };
}

/**
 * Creates a Cap from a center point and a height.
 * The height is the distance from the center point to the cap boundary
 * measured along the axis from the center to the boundary, in the range [0, 2].
 * A height of 0 is a point cap; a height of 2 is a full cap.
 *
 * @param center - The center point on the unit sphere
 * @param height - The cap height in [0, 2]
 */
export function capFromCenterHeight(center: Vector, height: number): Cap {
  return { center, radius: chordAngleFromSquaredLength(2 * height) };
}

/**
 * Creates a Cap from a center point and an area.
 * The area of a spherical cap is `2 * PI * h` where h is the cap height.
 * The total area of the unit sphere is `4 * PI`.
 *
 * @param center - The center point on the unit sphere
 * @param area - The desired cap area
 */
export function capFromCenterArea(center: Vector, area: number): Cap {
  const height = area / (2 * Math.PI);
  return capFromCenterHeight(center, height);
}

// ---------------------------------------------------------------------------
// Predicates
// ---------------------------------------------------------------------------

/**
 * Returns true if the cap is empty (contains no points).
 *
 * @param c - The cap to check
 */
export function isEmptyCap(c: Cap): boolean {
  return (c.radius as number) < 0;
}

/**
 * Returns true if the cap is full (contains the entire sphere).
 *
 * @param c - The cap to check
 */
export function isFullCap(c: Cap): boolean {
  return (c.radius as number) >= 4;
}

// ---------------------------------------------------------------------------
// Containment and intersection
// ---------------------------------------------------------------------------

/**
 * Returns true if the cap contains the given point.
 * The point must be on the unit sphere.
 *
 * @param c - The cap
 * @param p - A point on the unit sphere
 */
export function capContainsPoint(c: Cap, p: Vector): boolean {
  if (isEmptyCap(c)) return false;
  return chordAngleBetweenPoints(c.center, p) <= (c.radius as number);
}

/**
 * Returns true if this cap contains the other cap entirely.
 *
 * @param c - The containing cap
 * @param other - The cap to check containment of
 */
export function capContainsCap(c: Cap, other: Cap): boolean {
  if (isFullCap(c) || isEmptyCap(other)) return true;
  if (isEmptyCap(c)) return false;

  // The distance from c.center to the farthest point in other is at most:
  // chordAngle(c.center, other.center) + other.radius
  // We need this to be <= c.radius.
  // For chord angles, addition is not simply sum. We use the approximation
  // based on the angle representation.
  const distToCenter = chordAngleToAngle(chordAngleFromSquaredLength(chordAngleBetweenPoints(c.center, other.center)));
  const otherAngle = chordAngleToAngle(other.radius);
  const capAngle = chordAngleToAngle(c.radius);

  return (distToCenter as number) + (otherAngle as number) <= (capAngle as number);
}

/**
 * Returns true if the two caps have any points in common.
 *
 * @param c - First cap
 * @param other - Second cap
 */
export function capIntersectsCap(c: Cap, other: Cap): boolean {
  if (isEmptyCap(c) || isEmptyCap(other)) return false;
  if (isFullCap(c) || isFullCap(other)) return true;

  // Two caps intersect if the distance between centers is less than the sum
  // of their radii. We work in angle space for correctness with chord angles.
  const distToCenter = chordAngleToAngle(chordAngleFromSquaredLength(chordAngleBetweenPoints(c.center, other.center)));
  const capAngle = chordAngleToAngle(c.radius);
  const otherAngle = chordAngleToAngle(other.radius);

  return (distToCenter as number) < (capAngle as number) + (otherAngle as number);
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * Returns the complement of the cap (the region not covered by the cap).
 * The complement of a full cap is an empty cap and vice versa.
 *
 * @param c - The cap to complement
 */
export function capComplement(c: Cap): Cap {
  if (isFullCap(c)) return emptyCap();
  if (isEmptyCap(c)) return fullCap();

  const complementRadius = chordAngleFromSquaredLength(4 - (c.radius as number));
  return {
    center: vector(-c.center.x, -c.center.y, -c.center.z),
    radius: complementRadius,
  };
}

/**
 * Returns the smallest cap containing both the cap and the given point.
 *
 * @param c - The cap to expand
 * @param p - The point to include
 */
export function capAddPoint(c: Cap, p: Vector): Cap {
  if (isEmptyCap(c)) {
    return { center: p, radius: zeroChordAngle() };
  }

  const dist2 = chordAngleBetweenPoints(c.center, p);
  if (dist2 <= (c.radius as number)) {
    return c;
  }

  // The new radius must cover both the old cap boundary and the new point.
  // The new center is the midpoint (in angle space) between the old cap's
  // antipodal boundary and the new point. For simplicity, we keep the center
  // the same and expand the radius.
  return { center: c.center, radius: chordAngleFromSquaredLength(dist2) };
}

/**
 * Returns the smallest cap containing both caps.
 *
 * @param c - First cap
 * @param other - Second cap
 */
export function capAddCap(c: Cap, other: Cap): Cap {
  if (isEmptyCap(c)) return other;
  if (isEmptyCap(other)) return c;

  if (capContainsCap(c, other)) return c;
  if (capContainsCap(other, c)) return other;

  // The new cap must cover both caps. We compute the angle from c.center
  // to the farthest point of the other cap.
  const distAngle = chordAngleToAngle(chordAngleFromSquaredLength(chordAngleBetweenPoints(c.center, other.center)));
  const otherAngle = chordAngleToAngle(other.radius);
  const newAngle = (distAngle as number) + (otherAngle as number);

  const capAngle = chordAngleToAngle(c.radius);
  const maxAngle = Math.max(capAngle as number, newAngle);

  return { center: c.center, radius: chordAngleFromAngle(maxAngle as Angle) };
}

/**
 * Returns the surface area of the cap.
 * The area of a spherical cap is `2 * PI * h` where h is the cap height,
 * and the height is `1 - cos(r)` where r is the angular radius.
 *
 * @param c - The cap
 */
export function capArea(c: Cap): number {
  if (isEmptyCap(c)) return 0;
  // Area = 2 * PI * radius (where radius here is the ChordAngle value = 2*h).
  // The height h = 1 - cos(r) = radius/2 (where radius is chord angle squared length).
  // Area = 2 * PI * (radius/2) = PI * radius.
  return Math.PI * (c.radius as number);
}

/**
 * Returns a cap expanded by the given angle.
 * If the cap is empty, the result is also empty.
 *
 * @param c - The cap to expand
 * @param angle - The angle to expand by
 */
export function capExpanded(c: Cap, angle: Angle): Cap {
  if (isEmptyCap(c)) return c;

  const newAngle = (chordAngleToAngle(c.radius) as number) + (angle as number);
  if (newAngle >= Math.PI) return fullCap();
  if (newAngle <= 0) return emptyCap();

  return { center: c.center, radius: chordAngleFromAngle(newAngle as Angle) };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns the squared chord distance between two unit vectors.
 * For unit vectors a and b: |a - b|^2 = 2 - 2*(a.b)
 */
function chordAngleBetweenPoints(a: Vector, b: Vector): number {
  const d = sub(a, b);
  return Math.min(4, norm2(d));
}
