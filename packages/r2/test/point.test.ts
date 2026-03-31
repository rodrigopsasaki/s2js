import { describe, it, expect } from "vitest";
import {
  point,
  pointAdd,
  pointSub,
  pointMul,
  pointOrtho,
  pointDot,
  crossProduct,
  pointNorm,
  pointNormalize,
} from "../src/index.js";

describe("r2.Point", () => {
  describe("ortho", () => {
    it.each([
      { p: point(0, 0), expected: point(0, 0) },
      { p: point(0, 1), expected: point(-1, 0) },
      { p: point(1, 1), expected: point(-1, 1) },
      { p: point(-4, 7), expected: point(-7, -4) },
      { p: point(1, Math.sqrt(3)), expected: point(-Math.sqrt(3), 1) },
    ])("ortho($p) should return $expected", ({ p, expected }) => {
      const actual = pointOrtho(p);

      expect(actual.x).toBeCloseTo(expected.x, 14);
      expect(actual.y).toBeCloseTo(expected.y, 14);
    });
  });

  describe("dot", () => {
    it.each([
      { a: point(0, 0), b: point(0, 0), expected: 0 },
      { a: point(0, 1), b: point(0, 0), expected: 0 },
      { a: point(1, 1), b: point(4, 3), expected: 7 },
      { a: point(-4, 7), b: point(1, 5), expected: 31 },
    ])("dot($a, $b) should return $expected", ({ a, b, expected }) => {
      expect(pointDot(a, b)).toBe(expected);
    });
  });

  describe("cross", () => {
    it.each([
      { a: point(0, 0), b: point(0, 0), expected: 0 },
      { a: point(0, 1), b: point(0, 0), expected: 0 },
      { a: point(1, 1), b: point(-1, -1), expected: 0 },
      { a: point(1, 1), b: point(4, 3), expected: -1 },
      { a: point(1, 5), b: point(-2, 3), expected: 13 },
    ])("cross($a, $b) should return $expected", ({ a, b, expected }) => {
      expect(crossProduct(a, b)).toBe(expected);
    });
  });

  describe("norm", () => {
    it.each([
      { p: point(0, 0), expected: 0 },
      { p: point(3, 4), expected: 5 },
      { p: point(2, 2), expected: 2 * Math.sqrt(2) },
      { p: point(1, 1e15), expected: 1e15 },
    ])("norm($p) should return $expected", ({ p, expected }) => {
      expect(pointNorm(p)).toBeCloseTo(expected, 10);
    });
  });

  describe("normalize", () => {
    it("should normalize (3,4) to (0.6, 0.8)", () => {
      const n = pointNormalize(point(3, 4));

      expect(n.x).toBeCloseTo(0.6, 14);
      expect(n.y).toBeCloseTo(0.8, 14);
    });

    it("should return zero for zero point", () => {
      expect(pointNormalize(point(0, 0))).toEqual(point(0, 0));
    });

    it("should normalize (7, 7*sqrt(3)) to (0.5, sqrt(3)/2)", () => {
      const n = pointNormalize(point(7, 7 * Math.sqrt(3)));

      expect(n.x).toBeCloseTo(0.5, 14);
      expect(n.y).toBeCloseTo(Math.sqrt(3) / 2, 14);
    });
  });

  describe("add", () => {
    it("should add two points", () => {
      expect(pointAdd(point(1, 2), point(3, 4))).toEqual(point(4, 6));
    });
  });

  describe("sub", () => {
    it("should subtract two points", () => {
      expect(pointSub(point(5, 7), point(3, 4))).toEqual(point(2, 3));
    });
  });

  describe("mul", () => {
    it("should scale a point", () => {
      expect(pointMul(point(2, 3), 4)).toEqual(point(8, 12));
    });
  });
});
