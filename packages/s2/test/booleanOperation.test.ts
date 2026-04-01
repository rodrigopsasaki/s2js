import { describe, it, expect } from "vitest";
import { normalize, vector } from "@s2js/r3";
import { polygonFromVertices } from "../src/polygon.js";
import { cellUnionContainsCellUnion } from "../src/cellUnion.js";
import {
  polygonUnionApprox,
  polygonIntersectionApprox,
  polygonDifferenceApprox,
  polygonSymmetricDifferenceApprox,
} from "../src/booleanOperation.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Creates a CCW triangle near the north pole centered around (0, 0, 1). */
function makeNorthTriangle() {
  return polygonFromVertices([
    normalize(vector(0, 0.1, 1)),
    normalize(vector(-0.1, -0.05, 1)),
    normalize(vector(0.1, -0.05, 1)),
  ]);
}

/** Creates a CCW triangle near the north pole, shifted slightly in the +y direction. */
function makeOverlappingTriangle() {
  return polygonFromVertices([
    normalize(vector(0, 0.15, 1)),
    normalize(vector(-0.1, 0.0, 1)),
    normalize(vector(0.1, 0.0, 1)),
  ]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("booleanOperation", () => {
  const maxLevel = 10;

  describe("polygonUnionApprox", () => {
    it("should return a non-empty CellUnion for two overlapping polygons", () => {
      const a = makeNorthTriangle();
      const b = makeOverlappingTriangle();

      const actual = polygonUnionApprox(a, b, maxLevel);

      expect(actual.length).toBeGreaterThan(0);
    });

    it("should produce a union at least as large as either input covering", () => {
      const a = makeNorthTriangle();
      const b = makeOverlappingTriangle();

      const union = polygonUnionApprox(a, b, maxLevel);
      const coverA = polygonUnionApprox(a, a, maxLevel);

      // The union should contain the covering of a
      expect(cellUnionContainsCellUnion(union, coverA)).toBe(true);
    });
  });

  describe("polygonIntersectionApprox", () => {
    it("should return a non-empty CellUnion for overlapping polygons", () => {
      const a = makeNorthTriangle();
      const b = makeOverlappingTriangle();

      const actual = polygonIntersectionApprox(a, b, maxLevel);

      expect(actual.length).toBeGreaterThan(0);
    });

    it("should be a subset of the union", () => {
      const a = makeNorthTriangle();
      const b = makeOverlappingTriangle();

      const intersection = polygonIntersectionApprox(a, b, maxLevel);
      const union = polygonUnionApprox(a, b, maxLevel);

      expect(cellUnionContainsCellUnion(union, intersection)).toBe(true);
    });

    it("should be contained within each polygon's individual covering", () => {
      const a = makeNorthTriangle();
      const b = makeOverlappingTriangle();

      // coverA/coverB = the covering of each polygon individually.
      // The intersection of two coverings must be a subset of each input covering.
      // (Cell-count comparison is not a valid invariant: normalize() can merge the
      // union into fewer, larger ancestor cells while the intersection retains many
      // small common cells — all of which are still contained within those ancestors.)
      const coverA = polygonUnionApprox(a, a, maxLevel);
      const coverB = polygonUnionApprox(b, b, maxLevel);
      const intersection = polygonIntersectionApprox(a, b, maxLevel);

      expect(cellUnionContainsCellUnion(coverA, intersection)).toBe(true);
      expect(cellUnionContainsCellUnion(coverB, intersection)).toBe(true);
    });
  });

  describe("polygonDifferenceApprox", () => {
    it("should return a CellUnion that is a subset of the first polygon covering", () => {
      const a = makeNorthTriangle();
      const b = makeOverlappingTriangle();

      const difference = polygonDifferenceApprox(a, b, maxLevel);
      const coverA = polygonUnionApprox(a, a, maxLevel);

      // Difference a-b should be a subset of a's covering
      expect(cellUnionContainsCellUnion(coverA, difference)).toBe(true);
    });
  });

  describe("polygonSymmetricDifferenceApprox", () => {
    it("should be a subset of the union", () => {
      const a = makeNorthTriangle();
      const b = makeOverlappingTriangle();

      const symDiff = polygonSymmetricDifferenceApprox(a, b, maxLevel);
      const union = polygonUnionApprox(a, b, maxLevel);

      expect(cellUnionContainsCellUnion(union, symDiff)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle a polygon with itself", () => {
      const a = makeNorthTriangle();

      const intersection = polygonIntersectionApprox(a, a, maxLevel);
      const union = polygonUnionApprox(a, a, maxLevel);

      expect(intersection.length).toBeGreaterThan(0);
      expect(union.length).toBeGreaterThan(0);
      // Self-intersection should equal self-union
      expect(cellUnionContainsCellUnion(union, intersection)).toBe(true);
      expect(cellUnionContainsCellUnion(intersection, union)).toBe(true);
    });

    it("should produce a non-empty union for any non-empty polygon", () => {
      const a = makeNorthTriangle();

      const union = polygonUnionApprox(a, a, maxLevel);

      expect(union.length).toBeGreaterThan(0);
    });
  });
});
