/**
 * Axis-aligned rectangles in 2D Cartesian coordinates.
 *
 * A Rect is represented as two r1.Intervals (one for each axis).
 * An empty rectangle has empty X and Y intervals.
 *
 * @module
 */

import {
  type Interval,
  emptyInterval,
  isEmpty as isEmptyInterval,
  contains as intervalContains,
  containsInterval as intervalContainsInterval,
  interiorContains as intervalInteriorContains,
  interiorContainsInterval as intervalInteriorContainsInterval,
  intersects as intervalIntersects,
  interiorIntersects as intervalInteriorIntersects,
  intersection as intervalIntersection,
  union as intervalUnion,
  addPoint as intervalAddPoint,
  expanded as intervalExpanded,
  clampPoint as intervalClampPoint,
  center as intervalCenter,
  length as intervalLength,
  approxEquals as intervalApproxEquals,
} from "@s2js/r1";
import { type Point, point } from "./point.js";

/** An axis-aligned rectangle in 2D space. */
export interface Rect {
  readonly x: Interval;
  readonly y: Interval;
}

/** Returns an empty rectangle. */
export function emptyRect(): Rect {
  return { x: emptyInterval(), y: emptyInterval() };
}

/** Returns the smallest rectangle containing all given points. */
export function rectFromPoints(...pts: readonly Point[]): Rect {
  let r = emptyRect();
  for (const p of pts) {
    r = addPoint(r, p);
  }
  return r;
}

/** Returns a rectangle from center and size (width, height). */
export function rectFromCenterSize(center: Point, size: Point): Rect {
  return {
    x: { lo: center.x - size.x / 2, hi: center.x + size.x / 2 },
    y: { lo: center.y - size.y / 2, hi: center.y + size.y / 2 },
  };
}

/** Returns true if the rectangle is valid (both intervals empty or both non-empty). */
export function isValid(r: Rect): boolean {
  return isEmptyInterval(r.x) === isEmptyInterval(r.y);
}

/** Returns true if the rectangle is empty. */
export function isEmpty(r: Rect): boolean {
  return isEmptyInterval(r.x);
}

/** Returns the four vertices of the rectangle in counterclockwise order. */
export function vertices(r: Rect): [Point, Point, Point, Point] {
  return [point(r.x.lo, r.y.lo), point(r.x.hi, r.y.lo), point(r.x.hi, r.y.hi), point(r.x.lo, r.y.hi)];
}

/** Returns the vertex at the given i,j position (0 or 1 for each axis). */
export function vertexIJ(r: Rect, i: number, j: number): Point {
  const x = i === 0 ? r.x.lo : r.x.hi;
  const y = j === 0 ? r.y.lo : r.y.hi;
  return point(x, y);
}

/** Returns the lower-left corner. */
export function lo(r: Rect): Point {
  return point(r.x.lo, r.y.lo);
}

/** Returns the upper-right corner. */
export function hi(r: Rect): Point {
  return point(r.x.hi, r.y.hi);
}

/** Returns the center of the rectangle. */
export function center(r: Rect): Point {
  return point(intervalCenter(r.x), intervalCenter(r.y));
}

/** Returns the width and height of the rectangle. */
export function size(r: Rect): Point {
  return point(intervalLength(r.x), intervalLength(r.y));
}

/** Returns true if the rectangle contains the given point. */
export function containsPoint(r: Rect, p: Point): boolean {
  return intervalContains(r.x, p.x) && intervalContains(r.y, p.y);
}

/** Returns true if the interior of the rectangle contains the given point. */
export function interiorContainsPoint(r: Rect, p: Point): boolean {
  return intervalInteriorContains(r.x, p.x) && intervalInteriorContains(r.y, p.y);
}

/** Returns true if the rectangle contains every point of the other rectangle. */
export function containsRect(r: Rect, other: Rect): boolean {
  return intervalContainsInterval(r.x, other.x) && intervalContainsInterval(r.y, other.y);
}

/** Returns true if the interior of the rectangle contains every point of the other. */
export function interiorContainsRect(r: Rect, other: Rect): boolean {
  return intervalInteriorContainsInterval(r.x, other.x) && intervalInteriorContainsInterval(r.y, other.y);
}

/** Returns true if the rectangles share any common points. */
export function intersectsRect(r: Rect, other: Rect): boolean {
  return intervalIntersects(r.x, other.x) && intervalIntersects(r.y, other.y);
}

/** Returns true if the interior of the rectangle intersects the other. */
export function interiorIntersectsRect(r: Rect, other: Rect): boolean {
  return intervalInteriorIntersects(r.x, other.x) && intervalInteriorIntersects(r.y, other.y);
}

/** Returns the rectangle expanded to include the given point. */
export function addPoint(r: Rect, p: Point): Rect {
  return {
    x: intervalAddPoint(r.x, p.x),
    y: intervalAddPoint(r.y, p.y),
  };
}

/** Returns the smallest rectangle containing both rectangles. */
export function addRect(r: Rect, other: Rect): Rect {
  return {
    x: intervalUnion(r.x, other.x),
    y: intervalUnion(r.y, other.y),
  };
}

/** Returns the point closest to p that is within the rectangle. */
export function clampPoint(r: Rect, p: Point): Point {
  return point(intervalClampPoint(r.x, p.x), intervalClampPoint(r.y, p.y));
}

/** Returns the rectangle expanded by the given margins (x, y). */
export function expanded(r: Rect, margin: Point): Rect {
  const xx = intervalExpanded(r.x, margin.x);
  const yy = intervalExpanded(r.y, margin.y);
  if (isEmptyInterval(xx) || isEmptyInterval(yy)) {
    return emptyRect();
  }
  return { x: xx, y: yy };
}

/** Returns the rectangle expanded equally on all sides by the given margin. */
export function expandedByMargin(r: Rect, margin: number): Rect {
  return expanded(r, point(margin, margin));
}

/** Returns the smallest rectangle containing both rectangles. */
export function union(r: Rect, other: Rect): Rect {
  return {
    x: intervalUnion(r.x, other.x),
    y: intervalUnion(r.y, other.y),
  };
}

/** Returns the rectangle containing all points common to both rectangles. */
export function intersection(r: Rect, other: Rect): Rect {
  const xx = intervalIntersection(r.x, other.x);
  const yy = intervalIntersection(r.y, other.y);
  if (isEmptyInterval(xx) || isEmptyInterval(yy)) {
    return emptyRect();
  }
  return { x: xx, y: yy };
}

/** Returns true if the two rectangles are approximately equal. */
export function approxEquals(a: Rect, b: Rect): boolean {
  return intervalApproxEquals(a.x, b.x) && intervalApproxEquals(a.y, b.y);
}
