import { describe, it, expect } from "vitest";
import {
  type Vector,
  AXIS,
  abs,
  add,
  angle,
  approxEqual,
  cmp,
  cross,
  distance,
  dot,
  isUnit,
  largestComponent,
  mul,
  norm,
  norm2,
  normalize,
  ortho,
  smallestComponent,
  sub,
  vector,
} from "../src/index.js";

describe("r3.Vector", () => {
  describe("norm", () => {
    it.each([
      { v: vector(0, 0, 0), expected: 0 },
      { v: vector(0, 1, 0), expected: 1 },
      { v: vector(3, -4, 12), expected: 13 },
      { v: vector(1, 1e-16, 1e-32), expected: 1 },
    ])("norm($v) should return $expected", ({ v, expected }) => {
      expect(norm(v)).toBeCloseTo(expected, 14);
    });
  });

  describe("norm2", () => {
    it.each([
      { v: vector(0, 0, 0), expected: 0 },
      { v: vector(0, 1, 0), expected: 1 },
      { v: vector(1, 1, 1), expected: 3 },
      { v: vector(1, 2, 3), expected: 14 },
      { v: vector(3, -4, 12), expected: 169 },
    ])("norm2($v) should return $expected", ({ v, expected }) => {
      expect(norm2(v)).toBe(expected);
    });
  });

  describe("normalize", () => {
    it.each([
      vector(1, 0, 0),
      vector(0, 1, 0),
      vector(0, 0, 1),
      vector(1, 1, 1),
      vector(1, 1e-16, 1e-32),
      vector(12.34, 56.78, 91.01),
    ])("normalize(%j) should produce a unit vector", (v) => {
      const n = normalize(v);

      expect(norm(n)).toBeCloseTo(1, 14);
    });

    it("should return the zero vector when given the zero vector", () => {
      const n = normalize(vector(0, 0, 0));

      expect(n).toEqual(vector(0, 0, 0));
    });
  });

  describe("isUnit", () => {
    it.each([
      { v: vector(0, 0, 0), expected: false },
      { v: vector(0, 1, 0), expected: true },
      { v: vector(1 + 2e-14, 0, 0), expected: true },
      { v: vector(1, 1, 1), expected: false },
      { v: vector(1, 1e-16, 1e-32), expected: true },
    ])("isUnit($v) should return $expected", ({ v, expected }) => {
      expect(isUnit(v)).toBe(expected);
    });
  });

  describe("abs", () => {
    it("should return absolute values of all components", () => {
      const actual = abs(vector(-1, -2, -3));

      expect(actual).toEqual(vector(1, 2, 3));
    });
  });

  describe("add", () => {
    it.each([
      { a: vector(0, 0, 0), b: vector(0, 0, 0), expected: vector(0, 0, 0) },
      { a: vector(1, 0, 0), b: vector(0, 0, 0), expected: vector(1, 0, 0) },
      { a: vector(1, 2, 3), b: vector(4, 5, 7), expected: vector(5, 7, 10) },
      { a: vector(1, -3, 5), b: vector(1, -6, -6), expected: vector(2, -9, -1) },
    ])("add($a, $b) should return $expected", ({ a, b, expected }) => {
      expect(add(a, b)).toEqual(expected);
    });
  });

  describe("sub", () => {
    it.each([
      { a: vector(0, 0, 0), b: vector(0, 0, 0), expected: vector(0, 0, 0) },
      { a: vector(1, 0, 0), b: vector(0, 0, 0), expected: vector(1, 0, 0) },
      { a: vector(1, 2, 3), b: vector(4, 5, 7), expected: vector(-3, -3, -4) },
      { a: vector(1, -3, 5), b: vector(1, -6, -6), expected: vector(0, 3, 11) },
    ])("sub($a, $b) should return $expected", ({ a, b, expected }) => {
      expect(sub(a, b)).toEqual(expected);
    });
  });

  describe("mul", () => {
    it.each([
      { v: vector(0, 0, 0), m: 3, expected: vector(0, 0, 0) },
      { v: vector(1, 0, 0), m: 1, expected: vector(1, 0, 0) },
      { v: vector(1, 0, 0), m: 0, expected: vector(0, 0, 0) },
      { v: vector(1, 0, 0), m: 3, expected: vector(3, 0, 0) },
      { v: vector(1, -3, 5), m: -1, expected: vector(-1, 3, -5) },
      { v: vector(1, -3, 5), m: 2, expected: vector(2, -6, 10) },
    ])("mul($v, $m) should return $expected", ({ v, m, expected }) => {
      expect(mul(v, m)).toEqual(expected);
    });
  });

  describe("dot", () => {
    it.each([
      { a: vector(1, 0, 0), b: vector(1, 0, 0), expected: 1 },
      { a: vector(1, 0, 0), b: vector(0, 1, 0), expected: 0 },
      { a: vector(1, 0, 0), b: vector(0, 1, 1), expected: 0 },
      { a: vector(1, 1, 1), b: vector(-1, -1, -1), expected: -3 },
      { a: vector(1, 2, 2), b: vector(-0.3, 0.4, -1.2), expected: -1.9 },
    ])("dot($a, $b) should return $expected", ({ a, b, expected }) => {
      expect(dot(a, b)).toBeCloseTo(expected, 14);
    });
  });

  describe("cross", () => {
    it.each([
      { a: vector(1, 0, 0), b: vector(1, 0, 0), expected: vector(0, 0, 0) },
      { a: vector(1, 0, 0), b: vector(0, 1, 0), expected: vector(0, 0, 1) },
      { a: vector(0, 1, 0), b: vector(1, 0, 0), expected: vector(0, 0, -1) },
      { a: vector(1, 2, 3), b: vector(-4, 5, -6), expected: vector(-27, -6, 13) },
    ])("cross($a, $b) should return $expected", ({ a, b, expected }) => {
      expect(cross(a, b)).toEqual(expected);
    });
  });

  describe("distance", () => {
    it.each([
      { a: vector(1, 0, 0), b: vector(1, 0, 0), expected: 0 },
      { a: vector(1, 0, 0), b: vector(0, 1, 0), expected: Math.sqrt(2) },
      { a: vector(1, 0, 0), b: vector(0, 1, 1), expected: Math.sqrt(3) },
      { a: vector(1, 1, 1), b: vector(-1, -1, -1), expected: 2 * Math.sqrt(3) },
    ])("distance($a, $b) should return $expected", ({ a, b, expected }) => {
      expect(distance(a, b)).toBeCloseTo(expected, 14);
    });
  });

  describe("angle", () => {
    it.each([
      { a: vector(1, 0, 0), b: vector(1, 0, 0), expected: 0 },
      { a: vector(1, 0, 0), b: vector(0, 1, 0), expected: Math.PI / 2 },
      { a: vector(1, 0, 0), b: vector(0, 1, 1), expected: Math.PI / 2 },
      { a: vector(1, 0, 0), b: vector(-1, 0, 0), expected: Math.PI },
      { a: vector(1, 2, 3), b: vector(2, 3, -1), expected: 1.2055891055045298 },
    ])("angle($a, $b) should return $expected", ({ a, b, expected }) => {
      expect(angle(a, b)).toBeCloseTo(expected, 14);
    });
  });

  describe("ortho", () => {
    it.each([vector(1, 0, 0), vector(0, 1, 0), vector(0, 0, 1), vector(1, 1, 1), vector(1, 2, 3), vector(1, -2, -5)])(
      "ortho(%j) should produce a unit vector perpendicular to input",
      (v) => {
        const o = ortho(v);

        expect(isUnit(o)).toBe(true);
        expect(dot(v, o)).toBeCloseTo(0, 14);
      },
    );

    it.each([
      { v: vector(1, 0, 0), expected: vector(0, -1, 0) },
      { v: vector(0, 1, 0), expected: vector(0, 0, -1) },
      { v: vector(0, 0, 1), expected: vector(-1, 0, 0) },
    ])("ortho($v) should return $expected for axis-aligned inputs", ({ v, expected }) => {
      const o = ortho(v);

      expect(approxEqual(o, expected)).toBe(true);
    });
  });

  describe("largestComponent", () => {
    it.each([
      { v: vector(0, 0, 0), expected: AXIS.Z },
      { v: vector(1, 0, 0), expected: AXIS.X },
      { v: vector(1, -1, 0), expected: AXIS.Y },
      { v: vector(-1, -1.1, -1.1), expected: AXIS.Z },
      { v: vector(0.5, -0.4, -0.5), expected: AXIS.Z },
      { v: vector(1e-15, 1e-14, 1e-13), expected: AXIS.Z },
    ])("largestComponent($v) should return $expected", ({ v, expected }) => {
      expect(largestComponent(v)).toBe(expected);
    });
  });

  describe("smallestComponent", () => {
    it.each([
      { v: vector(0, 0, 0), expected: AXIS.Z },
      { v: vector(1, 0, 0), expected: AXIS.Z },
      { v: vector(1, -1, 0), expected: AXIS.Z },
      { v: vector(-1, -1.1, -1.1), expected: AXIS.X },
      { v: vector(0.5, -0.4, -0.5), expected: AXIS.Y },
      { v: vector(1e-15, 1e-14, 1e-13), expected: AXIS.X },
    ])("smallestComponent($v) should return $expected", ({ v, expected }) => {
      expect(smallestComponent(v)).toBe(expected);
    });
  });

  describe("approxEqual", () => {
    it("should return true for identical vectors", () => {
      expect(approxEqual(vector(1, 2, 3), vector(1, 2, 3))).toBe(true);
    });

    it("should return false for different vectors", () => {
      expect(approxEqual(vector(1, 2, 3), vector(1, 2, 4))).toBe(false);
    });
  });

  describe("cmp", () => {
    it.each([
      { a: vector(0, 0, 0), b: vector(0, 0, 0), expected: 0 },
      { a: vector(0, 0, 0), b: vector(1, 0, 0), expected: -1 },
      { a: vector(1, 0, 0), b: vector(0, 0, 0), expected: 1 },
      { a: vector(0, 0, 0), b: vector(0, 1, 0), expected: -1 },
      { a: vector(0, 1, 0), b: vector(0, 0, 0), expected: 1 },
      { a: vector(0, 0, 0), b: vector(0, 0, 1), expected: -1 },
      { a: vector(0, 0, 1), b: vector(0, 0, 0), expected: 1 },
      { a: vector(1, 2, 3), b: vector(2, 3, 4), expected: -1 },
      { a: vector(2, 3, 4), b: vector(1, 2, 3), expected: 1 },
    ])("cmp($a, $b) should return $expected", ({ a, b, expected }) => {
      expect(cmp(a, b)).toBe(expected);
    });
  });

  describe("mathematical identities", () => {
    const vectors: [Vector, Vector][] = [
      [vector(1, 0, 0), vector(0, 1, 0)],
      [vector(1, 0, 0), vector(0, 0, 1)],
      [vector(0, 1, 0), vector(0, 0, 1)],
      [vector(1, 2, 3), vector(-4, 5, -6)],
      [vector(1, -2, -5), vector(4, 0, -5)],
      [vector(3, -1, 2), vector(-1, 2, -4)],
    ];

    it("angle should be commutative", () => {
      for (const [a, b] of vectors) {
        expect(angle(a, b)).toBeCloseTo(angle(b, a), 14);
      }
    });

    it("dot should be commutative", () => {
      for (const [a, b] of vectors) {
        expect(dot(a, b)).toBeCloseTo(dot(b, a), 14);
      }
    });

    it("cross should be anti-commutative", () => {
      for (const [a, b] of vectors) {
        const ab = cross(a, b);
        const ba = cross(b, a);

        expect(ab.x).toBeCloseTo(-ba.x, 14);
        expect(ab.y).toBeCloseTo(-ba.y, 14);
        expect(ab.z).toBeCloseTo(-ba.z, 14);
      }
    });

    it("cross product should be orthogonal to both inputs", () => {
      for (const [a, b] of vectors) {
        const c = cross(a, b);

        expect(dot(a, c)).toBeCloseTo(0, 10);
        expect(dot(b, c)).toBeCloseTo(0, 10);
      }
    });
  });
});
