import { describe, it, expect } from "vitest";
import {
  type Rect,
  point,
  addPoint,
  addRect,
  approxEquals,
  center,
  clampPoint,
  containsPoint,
  containsRect,
  emptyRect,
  expanded,
  expandedByMargin,
  hi,
  interiorContainsPoint,
  interiorContainsRect,
  interiorIntersectsRect,
  intersection,
  intersectsRect,
  isEmpty,
  isValid,
  lo,
  rectFromCenterSize,
  rectFromPoints,
  size,
  union,
  vertices,
} from "../src/index.js";

const empty = emptyRect();
const sw = point(0, 0.25);
const ne = point(0.5, 0.75);
const rect: Rect = { x: { lo: 0, hi: 0.5 }, y: { lo: 0.25, hi: 0.75 } };

describe("r2.Rect", () => {
  describe("constructors", () => {
    it("emptyRect should be empty", () => {
      expect(isEmpty(empty)).toBe(true);
      expect(isValid(empty)).toBe(true);
    });

    it("rectFromPoints should create bounding rect", () => {
      const r = rectFromPoints(point(1, 2), point(3, 5), point(0, 0));

      expect(r.x.lo).toBe(0);
      expect(r.x.hi).toBe(3);
      expect(r.y.lo).toBe(0);
      expect(r.y.hi).toBe(5);
    });

    it("rectFromCenterSize should create correct rect", () => {
      const r = rectFromCenterSize(point(1, 2), point(4, 6));

      expect(r.x.lo).toBe(-1);
      expect(r.x.hi).toBe(3);
      expect(r.y.lo).toBe(-1);
      expect(r.y.hi).toBe(5);
    });
  });

  describe("accessors", () => {
    it("lo and hi should return corners", () => {
      expect(lo(rect)).toEqual(sw);
      expect(hi(rect)).toEqual(ne);
    });

    it("center should return midpoint", () => {
      expect(center(rect)).toEqual(point(0.25, 0.5));
    });

    it("size should return dimensions", () => {
      expect(size(rect)).toEqual(point(0.5, 0.5));
    });

    it("vertices should return four corners", () => {
      const v = vertices(rect);

      expect(v[0]).toEqual(point(0, 0.25));
      expect(v[1]).toEqual(point(0.5, 0.25));
      expect(v[2]).toEqual(point(0.5, 0.75));
      expect(v[3]).toEqual(point(0, 0.75));
    });
  });

  describe("containsPoint", () => {
    it.each([
      { p: point(0.2, 0.4), expected: true },
      { p: point(0, 0.25), expected: true },
      { p: point(0.5, 0.75), expected: true },
      { p: point(-0.1, 0.4), expected: false },
      { p: point(0.6, 0.4), expected: false },
      { p: point(0.2, 0.1), expected: false },
      { p: point(0.2, 0.8), expected: false },
    ])("containsPoint(rect, $p) should return $expected", ({ p, expected }) => {
      expect(containsPoint(rect, p)).toBe(expected);
    });
  });

  describe("interiorContainsPoint", () => {
    it("should contain interior points", () => {
      expect(interiorContainsPoint(rect, point(0.2, 0.4))).toBe(true);
    });

    it("should not contain boundary points", () => {
      expect(interiorContainsPoint(rect, point(0, 0.25))).toBe(false);
      expect(interiorContainsPoint(rect, point(0.5, 0.75))).toBe(false);
    });
  });

  describe("containsRect", () => {
    it("should contain itself", () => {
      expect(containsRect(rect, rect)).toBe(true);
    });

    it("should contain smaller rect", () => {
      const smaller: Rect = { x: { lo: 0.1, hi: 0.4 }, y: { lo: 0.3, hi: 0.6 } };

      expect(containsRect(rect, smaller)).toBe(true);
    });

    it("should not contain larger rect", () => {
      const larger: Rect = { x: { lo: -1, hi: 2 }, y: { lo: -1, hi: 2 } };

      expect(containsRect(rect, larger)).toBe(false);
    });

    it("should contain empty rect", () => {
      expect(containsRect(rect, empty)).toBe(true);
    });
  });

  describe("interiorContainsRect", () => {
    it("should not interior-contain itself", () => {
      expect(interiorContainsRect(rect, rect)).toBe(false);
    });

    it("should interior-contain strictly smaller rect", () => {
      const smaller: Rect = { x: { lo: 0.1, hi: 0.4 }, y: { lo: 0.3, hi: 0.6 } };

      expect(interiorContainsRect(rect, smaller)).toBe(true);
    });
  });

  describe("intersectsRect", () => {
    it("should intersect overlapping rects", () => {
      const other: Rect = { x: { lo: 0.25, hi: 0.75 }, y: { lo: 0.5, hi: 1.0 } };

      expect(intersectsRect(rect, other)).toBe(true);
    });

    it("should not intersect non-overlapping rects", () => {
      const other: Rect = { x: { lo: 2, hi: 3 }, y: { lo: 2, hi: 3 } };

      expect(intersectsRect(rect, other)).toBe(false);
    });

    it("should intersect touching rects", () => {
      const touching: Rect = { x: { lo: 0.5, hi: 1 }, y: { lo: 0.25, hi: 0.75 } };

      expect(intersectsRect(rect, touching)).toBe(true);
    });
  });

  describe("interiorIntersectsRect", () => {
    it("should not interior-intersect touching rects", () => {
      const touching: Rect = { x: { lo: 0.5, hi: 1 }, y: { lo: 0.25, hi: 0.75 } };

      expect(interiorIntersectsRect(rect, touching)).toBe(false);
    });
  });

  describe("clampPoint", () => {
    it.each([
      { p: point(0.2, 0.4), expected: point(0.2, 0.4) },
      { p: point(-0.5, 0.4), expected: point(0, 0.4) },
      { p: point(1.0, 0.4), expected: point(0.5, 0.4) },
      { p: point(0.2, 0.0), expected: point(0.2, 0.25) },
      { p: point(0.2, 1.0), expected: point(0.2, 0.75) },
    ])("clampPoint(rect, $p) should return $expected", ({ p, expected }) => {
      expect(clampPoint(rect, p)).toEqual(expected);
    });
  });

  describe("addPoint", () => {
    it("should expand empty rect to single point", () => {
      const r = addPoint(empty, point(1, 2));

      expect(r.x.lo).toBe(1);
      expect(r.x.hi).toBe(1);
      expect(r.y.lo).toBe(2);
      expect(r.y.hi).toBe(2);
    });

    it("should expand rect to include external point", () => {
      const r = addPoint(rect, point(1, 1));

      expect(r.x.hi).toBe(1);
      expect(r.y.hi).toBe(1);
    });
  });

  describe("addRect", () => {
    it("should union two rects", () => {
      const other: Rect = { x: { lo: -1, hi: 0 }, y: { lo: -1, hi: 0 } };
      const r = addRect(rect, other);

      expect(r.x.lo).toBe(-1);
      expect(r.x.hi).toBe(0.5);
      expect(r.y.lo).toBe(-1);
      expect(r.y.hi).toBe(0.75);
    });
  });

  describe("expanded", () => {
    it("should expand by margin", () => {
      const r = expanded(rect, point(0.1, 0.2));

      expect(r.x.lo).toBeCloseTo(-0.1, 14);
      expect(r.x.hi).toBeCloseTo(0.6, 14);
      expect(r.y.lo).toBeCloseTo(0.05, 14);
      expect(r.y.hi).toBeCloseTo(0.95, 14);
    });

    it("should return empty when contracted too much", () => {
      const r = expanded(rect, point(-0.3, 0));

      expect(isEmpty(r)).toBe(true);
    });
  });

  describe("expandedByMargin", () => {
    it("should expand equally on all sides", () => {
      const r = expandedByMargin(rect, 0.1);

      expect(r.x.lo).toBeCloseTo(-0.1, 14);
      expect(r.x.hi).toBeCloseTo(0.6, 14);
      expect(r.y.lo).toBeCloseTo(0.15, 14);
      expect(r.y.hi).toBeCloseTo(0.85, 14);
    });
  });

  describe("union", () => {
    it("should return smallest containing rect", () => {
      const other: Rect = { x: { lo: 0.25, hi: 0.75 }, y: { lo: 0.5, hi: 1.0 } };
      const r = union(rect, other);

      expect(r.x.lo).toBe(0);
      expect(r.x.hi).toBe(0.75);
      expect(r.y.lo).toBe(0.25);
      expect(r.y.hi).toBe(1.0);
    });
  });

  describe("intersection", () => {
    it("should return overlapping region", () => {
      const other: Rect = { x: { lo: 0.25, hi: 0.75 }, y: { lo: 0.5, hi: 1.0 } };
      const r = intersection(rect, other);

      expect(r.x.lo).toBe(0.25);
      expect(r.x.hi).toBe(0.5);
      expect(r.y.lo).toBe(0.5);
      expect(r.y.hi).toBe(0.75);
    });

    it("should return empty for non-overlapping rects", () => {
      const other: Rect = { x: { lo: 2, hi: 3 }, y: { lo: 2, hi: 3 } };

      expect(isEmpty(intersection(rect, other))).toBe(true);
    });
  });

  describe("approxEquals", () => {
    it("should consider identical rects equal", () => {
      expect(approxEquals(rect, rect)).toBe(true);
    });

    it("should consider empty rects equal", () => {
      expect(approxEquals(empty, empty)).toBe(true);
    });
  });
});
