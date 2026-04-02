import { describe, it, expect } from "vitest";
import {
  emptyLatLngRect,
  fullLatLngRect,
  isEmptyLatLngRect,
  isFullLatLngRect,
  latLngRectAddLatLng,
  latLngRectArea,
  latLngRectCenter,
  latLngRectContainsLatLng,
  latLngRectContainsRect,
  latLngRectExpanded,
  latLngRectFromLatLng,
  latLngRectFromPointPair,
  latLngRectIntersection,
  latLngRectIntersectsRect,
  latLngRectUnion,
} from "../src/index.js";

describe("s2.LatLngRect", () => {
  describe("emptyLatLngRect", () => {
    it("should be empty", () => {
      expect(isEmptyLatLngRect(emptyLatLngRect())).toBe(true);
    });

    it("should not be full", () => {
      expect(isFullLatLngRect(emptyLatLngRect())).toBe(false);
    });

    it("should have zero area", () => {
      expect(latLngRectArea(emptyLatLngRect())).toBe(0);
    });
  });

  describe("fullLatLngRect", () => {
    it("should be full", () => {
      expect(isFullLatLngRect(fullLatLngRect())).toBe(true);
    });

    it("should not be empty", () => {
      expect(isEmptyLatLngRect(fullLatLngRect())).toBe(false);
    });

    it("should have area equal to 4*PI", () => {
      expect(latLngRectArea(fullLatLngRect())).toBeCloseTo(4 * Math.PI, 10);
    });
  });

  describe("latLngRectFromLatLng", () => {
    it("should create a point rect", () => {
      const rect = latLngRectFromLatLng({ lat: 0.5, lng: 1.0 });

      expect(isEmptyLatLngRect(rect)).toBe(false);
      expect(latLngRectContainsLatLng(rect, { lat: 0.5, lng: 1.0 })).toBe(true);
    });

    it("should not contain other points", () => {
      const rect = latLngRectFromLatLng({ lat: 0.5, lng: 1.0 });

      expect(latLngRectContainsLatLng(rect, { lat: 0.6, lng: 1.0 })).toBe(false);
      expect(latLngRectContainsLatLng(rect, { lat: 0.5, lng: 1.1 })).toBe(false);
    });
  });

  describe("latLngRectFromPointPair", () => {
    it("should create a rect containing both points", () => {
      const a = { lat: 0.1, lng: 0.2 };
      const b = { lat: 0.3, lng: 0.4 };
      const rect = latLngRectFromPointPair(a, b);

      expect(latLngRectContainsLatLng(rect, { lat: 0.1, lng: 0.2 })).toBe(true);
      expect(latLngRectContainsLatLng(rect, { lat: 0.3, lng: 0.4 })).toBe(true);
      expect(latLngRectContainsLatLng(rect, { lat: 0.2, lng: 0.3 })).toBe(true);
    });

    it("should handle reversed order", () => {
      const a = { lat: 0.3, lng: 0.4 };
      const b = { lat: 0.1, lng: 0.2 };
      const rect = latLngRectFromPointPair(a, b);

      expect(latLngRectContainsLatLng(rect, { lat: 0.2, lng: 0.3 })).toBe(true);
    });

    it("should create a point rect for identical points", () => {
      const p = { lat: 0.5, lng: 1.0 };
      const rect = latLngRectFromPointPair(p, p);

      expect(latLngRectContainsLatLng(rect, { lat: 0.5, lng: 1.0 })).toBe(true);
    });
  });

  describe("latLngRectContainsLatLng", () => {
    it("should contain interior points", () => {
      const rect = latLngRectFromPointPair({ lat: 0, lng: 0 }, { lat: 1, lng: 1 });

      expect(latLngRectContainsLatLng(rect, { lat: 0.5, lng: 0.5 })).toBe(true);
    });

    it("should contain boundary points", () => {
      const rect = latLngRectFromPointPair({ lat: 0, lng: 0 }, { lat: 1, lng: 1 });

      expect(latLngRectContainsLatLng(rect, { lat: 0, lng: 0 })).toBe(true);
      expect(latLngRectContainsLatLng(rect, { lat: 1, lng: 1 })).toBe(true);
    });

    it("should not contain points outside", () => {
      const rect = latLngRectFromPointPair({ lat: 0, lng: 0 }, { lat: 1, lng: 1 });

      expect(latLngRectContainsLatLng(rect, { lat: -0.1, lng: 0.5 })).toBe(false);
      expect(latLngRectContainsLatLng(rect, { lat: 0.5, lng: 1.5 })).toBe(false);
    });

    it("full rect should contain any point", () => {
      expect(latLngRectContainsLatLng(fullLatLngRect(), { lat: 0, lng: 0 })).toBe(true);
      expect(latLngRectContainsLatLng(fullLatLngRect(), { lat: Math.PI / 2, lng: Math.PI })).toBe(true);
      expect(latLngRectContainsLatLng(fullLatLngRect(), { lat: -Math.PI / 2, lng: -Math.PI })).toBe(true);
    });
  });

  describe("latLngRectContainsRect", () => {
    it("full should contain any rect", () => {
      const rect = latLngRectFromPointPair({ lat: 0, lng: 0 }, { lat: 1, lng: 1 });

      expect(latLngRectContainsRect(fullLatLngRect(), rect)).toBe(true);
    });

    it("should contain itself", () => {
      const rect = latLngRectFromPointPair({ lat: 0, lng: 0 }, { lat: 1, lng: 1 });

      expect(latLngRectContainsRect(rect, rect)).toBe(true);
    });

    it("should contain a smaller rect", () => {
      const outer = latLngRectFromPointPair({ lat: 0, lng: 0 }, { lat: 1, lng: 1 });
      const inner = latLngRectFromPointPair({ lat: 0.2, lng: 0.2 }, { lat: 0.8, lng: 0.8 });

      expect(latLngRectContainsRect(outer, inner)).toBe(true);
    });

    it("should not contain a larger rect", () => {
      const inner = latLngRectFromPointPair({ lat: 0.2, lng: 0.2 }, { lat: 0.8, lng: 0.8 });
      const outer = latLngRectFromPointPair({ lat: 0, lng: 0 }, { lat: 1, lng: 1 });

      expect(latLngRectContainsRect(inner, outer)).toBe(false);
    });
  });

  describe("latLngRectIntersectsRect", () => {
    it("should intersect overlapping rects", () => {
      const a = latLngRectFromPointPair({ lat: 0, lng: 0 }, { lat: 1, lng: 1 });
      const b = latLngRectFromPointPair({ lat: 0.5, lng: 0.5 }, { lat: 1.5, lng: 1.5 });

      expect(latLngRectIntersectsRect(a, b)).toBe(true);
    });

    it("should not intersect disjoint rects", () => {
      const a = latLngRectFromPointPair({ lat: 0, lng: 0 }, { lat: 0.1, lng: 0.1 });
      const b = latLngRectFromPointPair({ lat: 0.5, lng: 0.5 }, { lat: 1, lng: 1 });

      expect(latLngRectIntersectsRect(a, b)).toBe(false);
    });

    it("should intersect touching rects at boundary", () => {
      const a = latLngRectFromPointPair({ lat: 0, lng: 0 }, { lat: 0.5, lng: 0.5 });
      const b = latLngRectFromPointPair({ lat: 0.5, lng: 0.5 }, { lat: 1, lng: 1 });

      expect(latLngRectIntersectsRect(a, b)).toBe(true);
    });
  });

  describe("latLngRectUnion", () => {
    it("should return the other when one is empty", () => {
      const rect = latLngRectFromPointPair({ lat: 0, lng: 0 }, { lat: 1, lng: 1 });
      const result = latLngRectUnion(emptyLatLngRect(), rect);

      expect(latLngRectContainsLatLng(result, { lat: 0.5, lng: 0.5 })).toBe(true);
    });

    it("should combine two disjoint rects into a larger rect", () => {
      const a = latLngRectFromPointPair({ lat: 0, lng: 0 }, { lat: 0.1, lng: 0.1 });
      const b = latLngRectFromPointPair({ lat: 0.5, lng: 0.5 }, { lat: 0.6, lng: 0.6 });
      const result = latLngRectUnion(a, b);

      // Union should not be empty and should contain both original rects
      expect(isEmptyLatLngRect(result)).toBe(false);
      expect(latLngRectContainsLatLng(result, { lat: 0.05, lng: 0.05 })).toBe(true);
    });
  });

  describe("latLngRectIntersection", () => {
    it("should return overlapping region", () => {
      const a = latLngRectFromPointPair({ lat: 0, lng: 0 }, { lat: 1, lng: 1 });
      const b = latLngRectFromPointPair({ lat: 0.5, lng: 0.5 }, { lat: 1.5, lng: 1.5 });
      const result = latLngRectIntersection(a, b);

      expect(latLngRectContainsLatLng(result, { lat: 0.7, lng: 0.7 })).toBe(true);
      expect(latLngRectContainsLatLng(result, { lat: 0.2, lng: 0.2 })).toBe(false);
    });

    it("should return empty for disjoint rects", () => {
      const a = latLngRectFromPointPair({ lat: 0, lng: 0 }, { lat: 0.1, lng: 0.1 });
      const b = latLngRectFromPointPair({ lat: 0.5, lng: 0.5 }, { lat: 1, lng: 1 });
      const result = latLngRectIntersection(a, b);

      expect(isEmptyLatLngRect(result)).toBe(true);
    });
  });

  describe("latLngRectAddLatLng", () => {
    it("should expand empty rect to point rect", () => {
      const rect = latLngRectAddLatLng(emptyLatLngRect(), { lat: 0.5, lng: 1.0 });

      expect(latLngRectContainsLatLng(rect, { lat: 0.5, lng: 1.0 })).toBe(true);
    });

    it("should expand to include new point", () => {
      const rect = latLngRectFromLatLng({ lat: 0, lng: 0 });
      const expanded = latLngRectAddLatLng(rect, { lat: 1, lng: 1 });

      expect(latLngRectContainsLatLng(expanded, { lat: 0, lng: 0 })).toBe(true);
      expect(latLngRectContainsLatLng(expanded, { lat: 1, lng: 1 })).toBe(true);
      expect(latLngRectContainsLatLng(expanded, { lat: 0.5, lng: 0.5 })).toBe(true);
    });
  });

  describe("latLngRectArea", () => {
    it("should compute correct area for full rect", () => {
      expect(latLngRectArea(fullLatLngRect())).toBeCloseTo(4 * Math.PI, 10);
    });

    it("should compute correct area for a quarter sphere", () => {
      // Latitude [0, PI/2], longitude [0, PI] covers 1/4 of the sphere
      const rect = latLngRectFromPointPair({ lat: 0, lng: 0 }, { lat: Math.PI / 2, lng: Math.PI });
      // Area = |sin(PI/2) - sin(0)| * PI = 1 * PI = PI
      expect(latLngRectArea(rect)).toBeCloseTo(Math.PI, 10);
    });

    it("should return zero for empty rect", () => {
      expect(latLngRectArea(emptyLatLngRect())).toBe(0);
    });
  });

  describe("latLngRectCenter", () => {
    it("should return center of a symmetric rect", () => {
      const rect = latLngRectFromPointPair({ lat: -0.5, lng: -0.5 }, { lat: 0.5, lng: 0.5 });
      const c = latLngRectCenter(rect);

      expect(c.lat).toBeCloseTo(0, 10);
      expect(c.lng).toBeCloseTo(0, 10);
    });

    it("should return center of an offset rect", () => {
      const rect = latLngRectFromPointPair({ lat: 0.2, lng: 0.4 }, { lat: 0.8, lng: 1.2 });
      const c = latLngRectCenter(rect);

      expect(c.lat).toBeCloseTo(0.5, 10);
      expect(c.lng).toBeCloseTo(0.8, 10);
    });
  });

  describe("latLngRectExpanded", () => {
    it("should expand the rect", () => {
      const rect = latLngRectFromPointPair({ lat: 0, lng: 0 }, { lat: 0.5, lng: 0.5 });
      const expanded = latLngRectExpanded(rect, { lat: 0.1, lng: 0.1 });

      expect(latLngRectContainsLatLng(expanded, { lat: -0.05, lng: -0.05 })).toBe(true);
      expect(latLngRectContainsLatLng(expanded, { lat: 0.55, lng: 0.55 })).toBe(true);
    });

    it("should clamp latitude to valid range", () => {
      const rect = latLngRectFromPointPair({ lat: 1, lng: 0 }, { lat: 1.5, lng: 1 });
      const expanded = latLngRectExpanded(rect, { lat: 1, lng: 0 });

      expect(expanded.lat.hi).toBeLessThanOrEqual(Math.PI / 2);
    });

    it("should return empty when expanding empty rect", () => {
      const result = latLngRectExpanded(emptyLatLngRect(), { lat: 1, lng: 1 });

      expect(isEmptyLatLngRect(result)).toBe(true);
    });
  });
});
