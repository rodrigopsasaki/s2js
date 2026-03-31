import { describe, it, expect } from "vitest";
import { normalize, vector } from "@s2js/r3";
import { convexHull } from "../src/convexHull.js";
import { numVertices } from "../src/loop.js";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("convexHull", () => {
  describe("basic cases", () => {
    it("should return an empty loop for no points", () => {
      const actual = convexHull([]);

      expect(numVertices(actual)).toBe(0);
    });

    it("should return a single-point loop for one point", () => {
      const p = normalize(vector(1, 0, 0));

      const actual = convexHull([p]);

      expect(numVertices(actual)).toBe(1);
    });

    it("should return a two-point loop for two points", () => {
      const p1 = normalize(vector(1, 0, 0));
      const p2 = normalize(vector(0, 1, 0));

      const actual = convexHull([p1, p2]);

      expect(numVertices(actual)).toBe(2);
    });
  });

  describe("triangle", () => {
    it("should return all three vertices for a triangle", () => {
      const p1 = normalize(vector(1, 0, 0.1));
      const p2 = normalize(vector(0, 1, 0.1));
      const p3 = normalize(vector(0, 0, 1));

      const actual = convexHull([p1, p2, p3]);

      expect(numVertices(actual)).toBe(3);
    });

    it("should return the same triangle when an interior point is added", () => {
      const p1 = normalize(vector(1, 0, 0.1));
      const p2 = normalize(vector(0, 1, 0.1));
      const p3 = normalize(vector(0, 0, 1));
      // Interior point: average of the three vertices, then normalized
      const interior = normalize(vector(1 / 3, 1 / 3, 1.1 / 3));

      const actual = convexHull([p1, p2, p3, interior]);

      expect(numVertices(actual)).toBe(3);
    });
  });

  describe("axis-aligned points", () => {
    it("should compute hull for axis-aligned unit vectors", () => {
      const points = [
        normalize(vector(1, 0, 0)),
        normalize(vector(0, 1, 0)),
        normalize(vector(0, 0, 1)),
        normalize(vector(-1, 0, 0)),
      ];

      const actual = convexHull(points);

      // All 4 points should be on the hull since they form a convex shape
      expect(numVertices(actual)).toBe(4);
    });
  });

  describe("duplicate points", () => {
    it("should handle duplicate points correctly", () => {
      const p1 = normalize(vector(1, 0, 0.1));
      const p2 = normalize(vector(0, 1, 0.1));
      const p3 = normalize(vector(0, 0, 1));

      const actual = convexHull([p1, p2, p3, p1, p2]);

      expect(numVertices(actual)).toBe(3);
    });

    it("should handle all identical points", () => {
      const p = normalize(vector(1, 0, 0));

      const actual = convexHull([p, p, p]);

      expect(numVertices(actual)).toBeLessThanOrEqual(1);
    });
  });

  describe("square", () => {
    it("should compute hull for a square near the north pole", () => {
      const points = [
        normalize(vector(0.1, 0.1, 1)),
        normalize(vector(-0.1, 0.1, 1)),
        normalize(vector(-0.1, -0.1, 1)),
        normalize(vector(0.1, -0.1, 1)),
      ];

      const actual = convexHull(points);

      // All 4 corner points should be on the hull
      expect(numVertices(actual)).toBe(4);
    });
  });

  describe("hull properties", () => {
    it("should include all extreme points", () => {
      const points = [
        normalize(vector(0.1, 0.1, 1)),
        normalize(vector(-0.1, 0.1, 1)),
        normalize(vector(-0.1, -0.1, 1)),
        normalize(vector(0.1, -0.1, 1)),
        normalize(vector(0, 0, 1)), // Interior point
      ];

      const hull = convexHull(points);

      // The hull should have 4 vertices (the corners), not 5
      expect(numVertices(hull)).toBe(4);
    });

    it("should produce a hull with at least 3 vertices for non-collinear input", () => {
      const points = [
        normalize(vector(1, 0, 0.5)),
        normalize(vector(0, 1, 0.5)),
        normalize(vector(-1, 0, 0.5)),
        normalize(vector(0, -1, 0.5)),
      ];

      const hull = convexHull(points);

      expect(numVertices(hull)).toBeGreaterThanOrEqual(3);
    });
  });
});
