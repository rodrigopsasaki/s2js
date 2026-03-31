/**
 * Latitude-longitude rectangles on the unit sphere.
 *
 * A LatLngRect represents a closed rectangle in latitude-longitude space.
 * The latitude component is an r1.Interval (closed interval on the real line),
 * and the longitude component is an s1.Interval (interval on the unit circle
 * that can wrap around +-PI).
 *
 * @module
 */

import {
  type Interval as R1Interval,
  addPoint as r1AddPoint,
  contains as r1Contains,
  emptyInterval as r1EmptyInterval,
  expanded as r1Expanded,
  intervalFromPointPair as r1IntervalFromPointPair,
  isEmpty as r1IsEmpty,
  union as r1Union,
  center as r1Center,
  intersects as r1Intersects,
  containsInterval as r1ContainsInterval,
  intersection as r1Intersection,
} from "@s2js/r1";
import {
  type Interval as S1Interval,
  addPoint as s1AddPoint,
  contains as s1Contains,
  containsInterval as s1ContainsInterval,
  emptyInterval as s1EmptyInterval,
  expanded as s1Expanded,
  fullInterval as s1FullInterval,
  isEmpty as s1IsEmpty,
  isFull as s1IsFull,
  intersects as s1Intersects,
  union as s1Union,
  center as s1Center,
  length as s1Length,
  intersection as s1Intersection,
} from "@s2js/s1";

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

/** A latitude-longitude rectangle on the unit sphere. */
export interface LatLngRect {
  /** Latitude interval in radians, in [-PI/2, PI/2]. */
  readonly lat: R1Interval;
  /** Longitude interval in radians, in [-PI, PI]. */
  readonly lng: S1Interval;
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

/** Returns an empty LatLngRect (contains no points). */
export function emptyLatLngRect(): LatLngRect {
  return { lat: r1EmptyInterval(), lng: s1EmptyInterval() };
}

/** Returns a full LatLngRect (contains the entire sphere). */
export function fullLatLngRect(): LatLngRect {
  return {
    lat: { lo: -Math.PI / 2, hi: Math.PI / 2 },
    lng: s1FullInterval(),
  };
}

/**
 * Creates a LatLngRect containing a single point.
 *
 * @param lat - Latitude in radians
 * @param lng - Longitude in radians
 */
export function latLngRectFromLatLng(lat: number, lng: number): LatLngRect {
  return {
    lat: { lo: lat, hi: lat },
    lng: { lo: lng, hi: lng },
  };
}

/**
 * Creates the smallest LatLngRect containing two lat/lng points.
 * The order of the arguments does not matter.
 *
 * @param a - First point as `{ lat, lng }` in radians
 * @param b - Second point as `{ lat, lng }` in radians
 */
export function latLngRectFromPointPair(
  a: { readonly lat: number; readonly lng: number },
  b: { readonly lat: number; readonly lng: number },
): LatLngRect {
  const lat = r1IntervalFromPointPair(a.lat, b.lat);
  // For longitude we need to handle wrapping. Use s1.addPoint.
  let lng = s1EmptyInterval();
  lng = s1AddPoint(lng, a.lng);
  lng = s1AddPoint(lng, b.lng);
  return { lat, lng };
}

// ---------------------------------------------------------------------------
// Predicates
// ---------------------------------------------------------------------------

/**
 * Returns true if the rectangle is empty (contains no points).
 *
 * @param r - The rectangle to check
 */
export function isEmptyLatLngRect(r: LatLngRect): boolean {
  return r1IsEmpty(r.lat);
}

/**
 * Returns true if the rectangle covers the entire sphere.
 *
 * @param r - The rectangle to check
 */
export function isFullLatLngRect(r: LatLngRect): boolean {
  return r.lat.lo === -Math.PI / 2 && r.lat.hi === Math.PI / 2 && s1IsFull(r.lng);
}

// ---------------------------------------------------------------------------
// Containment and intersection
// ---------------------------------------------------------------------------

/**
 * Returns true if the rectangle contains the given lat/lng point.
 *
 * @param r - The rectangle
 * @param lat - Latitude in radians
 * @param lng - Longitude in radians
 */
export function latLngRectContainsLatLng(r: LatLngRect, lat: number, lng: number): boolean {
  return r1Contains(r.lat, lat) && s1Contains(r.lng, lng);
}

/**
 * Returns true if the rectangle contains the other rectangle entirely.
 *
 * @param r - The containing rectangle
 * @param other - The rectangle to check containment of
 */
export function latLngRectContainsRect(r: LatLngRect, other: LatLngRect): boolean {
  return r1ContainsInterval(r.lat, other.lat) && s1ContainsInterval(r.lng, other.lng);
}

/**
 * Returns true if the two rectangles have any points in common.
 *
 * @param r - First rectangle
 * @param other - Second rectangle
 */
export function latLngRectIntersectsRect(r: LatLngRect, other: LatLngRect): boolean {
  return r1Intersects(r.lat, other.lat) && s1Intersects(r.lng, other.lng);
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/**
 * Returns the smallest rectangle containing both rectangles.
 *
 * @param a - First rectangle
 * @param b - Second rectangle
 */
export function latLngRectUnion(a: LatLngRect, b: LatLngRect): LatLngRect {
  return {
    lat: r1Union(a.lat, b.lat),
    lng: s1Union(a.lng, b.lng),
  };
}

/**
 * Returns the smallest rectangle containing all common points.
 *
 * @param a - First rectangle
 * @param b - Second rectangle
 */
export function latLngRectIntersection(a: LatLngRect, b: LatLngRect): LatLngRect {
  const lat = r1Intersection(a.lat, b.lat);
  const lng = s1Intersection(a.lng, b.lng);

  if (r1IsEmpty(lat) || s1IsEmpty(lng)) {
    return emptyLatLngRect();
  }

  return { lat, lng };
}

/**
 * Returns the rectangle expanded to include the given lat/lng point.
 *
 * @param r - The rectangle to expand
 * @param lat - Latitude in radians
 * @param lng - Longitude in radians
 */
export function latLngRectAddLatLng(r: LatLngRect, lat: number, lng: number): LatLngRect {
  return {
    lat: r1AddPoint(r.lat, lat),
    lng: s1AddPoint(r.lng, lng),
  };
}

/**
 * Returns the surface area of the rectangle on the unit sphere.
 * Area = |sin(latHi) - sin(latLo)| * lngLength.
 *
 * @param r - The rectangle
 */
export function latLngRectArea(r: LatLngRect): number {
  if (isEmptyLatLngRect(r)) return 0;

  const lngLen = s1Length(r.lng);
  if (lngLen < 0) return 0;

  return Math.abs(Math.sin(r.lat.hi) - Math.sin(r.lat.lo)) * lngLen;
}

/**
 * Returns the center point of the rectangle as `{ lat, lng }` in radians.
 *
 * @param r - The rectangle
 */
export function latLngRectCenter(r: LatLngRect): { lat: number; lng: number } {
  return {
    lat: r1Center(r.lat),
    lng: s1Center(r.lng),
  };
}

/**
 * Returns the rectangle expanded by the given margin on each side.
 * The latitude margin is in radians; the longitude margin is also in radians.
 *
 * @param r - The rectangle to expand
 * @param margin - The margin as `{ lat, lng }` in radians
 */
export function latLngRectExpanded(r: LatLngRect, margin: { readonly lat: number; readonly lng: number }): LatLngRect {
  if (isEmptyLatLngRect(r)) return r;

  const lat = r1Expanded(r.lat, margin.lat);
  const lng = s1Expanded(r.lng, margin.lng);

  if (r1IsEmpty(lat) || s1IsEmpty(lng)) {
    return emptyLatLngRect();
  }

  // Clamp latitude to [-PI/2, PI/2].
  const clampedLat: R1Interval = {
    lo: Math.max(lat.lo, -Math.PI / 2),
    hi: Math.min(lat.hi, Math.PI / 2),
  };

  return { lat: clampedLat, lng };
}
