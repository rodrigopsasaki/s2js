import { describe, it, expect } from "vitest";
import {
  type Interval,
  addPoint,
  approxEquals,
  center,
  clampPoint,
  contains,
  containsInterval,
  directedHausdorffDistance,
  emptyInterval,
  equals,
  expanded,
  interiorContains,
  interiorContainsInterval,
  interiorIntersects,
  intersection,
  intersects,
  intervalFromPoint,
  intervalFromPointPair,
  isEmpty,
  length,
  union,
} from "../src/index.js";

/** Standard test intervals matching Go test suite. */
const unit: Interval = { lo: 0, hi: 1 };
const negunit: Interval = { lo: -1, hi: 0 };
const half: Interval = { lo: 0.5, hi: 0.5 };
const empty = emptyInterval();
const zero: Interval = { lo: 0, hi: 0 };

describe("r1.Interval", () => {
  describe("constructors", () => {
    it("emptyInterval should create an interval with lo > hi", () => {
      const i = emptyInterval();

      expect(i.lo).toBeGreaterThan(i.hi);
      expect(isEmpty(i)).toBe(true);
    });

    it("intervalFromPoint should create a single-point interval", () => {
      const i = intervalFromPoint(3);

      expect(i.lo).toBe(3);
      expect(i.hi).toBe(3);
      expect(isEmpty(i)).toBe(false);
    });

    it.each([
      { a: 2, b: 4, expected: { lo: 2, hi: 4 } },
      { a: 4, b: 2, expected: { lo: 2, hi: 4 } },
      { a: 3, b: 3, expected: { lo: 3, hi: 3 } },
    ])("intervalFromPointPair($a, $b) should return $expected", ({ a, b, expected }) => {
      const actual = intervalFromPointPair(a, b);

      expect(actual).toEqual(expected);
    });
  });

  describe("isEmpty", () => {
    it.each([
      { input: unit, expected: false },
      { input: half, expected: false },
      { input: empty, expected: true },
      { input: zero, expected: false },
    ])("isEmpty($input) should return $expected", ({ input, expected }) => {
      expect(isEmpty(input)).toBe(expected);
    });
  });

  describe("center", () => {
    it.each([
      { input: unit, expected: 0.5 },
      { input: negunit, expected: -0.5 },
      { input: half, expected: 0.5 },
    ])("center($input) should return $expected", ({ input, expected }) => {
      expect(center(input)).toBe(expected);
    });
  });

  describe("length", () => {
    it.each([
      { input: unit, expected: 1 },
      { input: negunit, expected: 1 },
      { input: half, expected: 0 },
    ])("length($input) should return $expected", ({ input, expected }) => {
      expect(length(input)).toBe(expected);
    });

    it("should return a negative value for empty intervals", () => {
      expect(length(empty)).toBeLessThan(0);
    });
  });

  describe("contains", () => {
    it.each([
      { interval: unit, point: 0.5, expected: true },
      { interval: unit, point: 0, expected: true },
      { interval: unit, point: 1, expected: true },
      { interval: unit, point: -0.1, expected: false },
      { interval: unit, point: 1.1, expected: false },
    ])("contains($interval, $point) should return $expected", ({ interval, point, expected }) => {
      expect(contains(interval, point)).toBe(expected);
    });
  });

  describe("interiorContains", () => {
    it.each([
      { interval: unit, point: 0.5, expected: true },
      { interval: unit, point: 0, expected: false },
      { interval: unit, point: 1, expected: false },
    ])("interiorContains($interval, $point) should return $expected", ({ interval, point, expected }) => {
      expect(interiorContains(interval, point)).toBe(expected);
    });
  });

  describe("interval operations", () => {
    /**
     * Test table ported from Go's TestIntervalOperations.
     * Each row tests: containsInterval, interiorContainsInterval, intersects, interiorIntersects
     */
    it.each([
      {
        i: empty,
        j: empty,
        containsJ: true,
        interiorContainsJ: true,
        intersectsJ: false,
        interiorIntersectsJ: false,
      },
      {
        i: empty,
        j: unit,
        containsJ: false,
        interiorContainsJ: false,
        intersectsJ: false,
        interiorIntersectsJ: false,
      },
      {
        i: unit,
        j: half,
        containsJ: true,
        interiorContainsJ: true,
        intersectsJ: true,
        interiorIntersectsJ: true,
      },
      {
        i: unit,
        j: unit,
        containsJ: true,
        interiorContainsJ: false,
        intersectsJ: true,
        interiorIntersectsJ: true,
      },
      {
        i: unit,
        j: empty,
        containsJ: true,
        interiorContainsJ: true,
        intersectsJ: false,
        interiorIntersectsJ: false,
      },
      {
        i: unit,
        j: negunit,
        containsJ: false,
        interiorContainsJ: false,
        intersectsJ: true,
        interiorIntersectsJ: false,
      },
      {
        i: unit,
        j: { lo: 0, hi: 0.5 },
        containsJ: true,
        interiorContainsJ: false,
        intersectsJ: true,
        interiorIntersectsJ: true,
      },
      {
        i: half,
        j: { lo: 0, hi: 0.5 },
        containsJ: false,
        interiorContainsJ: false,
        intersectsJ: true,
        interiorIntersectsJ: false,
      },
    ])(
      "containsInterval/interiorContainsInterval/intersects/interiorIntersects for ($i, $j)",
      ({ i, j, containsJ, interiorContainsJ, intersectsJ, interiorIntersectsJ }) => {
        expect(containsInterval(i, j)).toBe(containsJ);
        expect(interiorContainsInterval(i, j)).toBe(interiorContainsJ);
        expect(intersects(i, j)).toBe(intersectsJ);
        expect(interiorIntersects(i, j)).toBe(interiorIntersectsJ);
      },
    );
  });

  describe("intersection", () => {
    it.each([
      { i: unit, j: half, expected: half },
      { i: unit, j: negunit, expected: zero },
      { i: negunit, j: half, expectedEmpty: true },
      { i: unit, j: empty, expectedEmpty: true },
      { i: empty, j: unit, expectedEmpty: true },
    ])("intersection($i, $j)", ({ i, j, expected, expectedEmpty }) => {
      const actual = intersection(i, j);

      if (expectedEmpty) {
        expect(isEmpty(actual)).toBe(true);
      } else {
        expect(actual).toEqual(expected);
      }
    });
  });

  describe("union", () => {
    it.each([
      { i: { lo: 99, hi: 100 }, j: empty, expected: { lo: 99, hi: 100 } },
      { i: empty, j: { lo: 99, hi: 100 }, expected: { lo: 99, hi: 100 } },
      { i: unit, j: unit, expected: unit },
      { i: unit, j: negunit, expected: { lo: -1, hi: 1 } },
      { i: negunit, j: unit, expected: { lo: -1, hi: 1 } },
      { i: half, j: unit, expected: unit },
    ])("union($i, $j) should return $expected", ({ i, j, expected }) => {
      const actual = union(i, j);

      expect(actual).toEqual(expected);
    });

    it("should return empty when both inputs are empty", () => {
      const actual = union(emptyInterval(), emptyInterval());

      expect(isEmpty(actual)).toBe(true);
    });
  });

  describe("addPoint", () => {
    it("should build up an interval incrementally", () => {
      let i = emptyInterval();

      i = addPoint(i, 5);
      expect(i).toEqual({ lo: 5, hi: 5 });

      i = addPoint(i, -1);
      expect(i).toEqual({ lo: -1, hi: 5 });

      i = addPoint(i, 0);
      expect(i).toEqual({ lo: -1, hi: 5 });

      i = addPoint(i, 6);
      expect(i).toEqual({ lo: -1, hi: 6 });
    });
  });

  describe("clampPoint", () => {
    it.each([
      { interval: { lo: 0.1, hi: 0.4 }, point: 0.3, expected: 0.3 },
      { interval: { lo: 0.1, hi: 0.4 }, point: -7.0, expected: 0.1 },
      { interval: { lo: 0.1, hi: 0.4 }, point: 0.6, expected: 0.4 },
    ])("clampPoint($interval, $point) should return $expected", ({ interval, point, expected }) => {
      expect(clampPoint(interval, point)).toBe(expected);
    });
  });

  describe("expanded", () => {
    it.each([
      { interval: empty, margin: 0.45, expectedEmpty: true },
      { interval: unit, margin: 0.5, expected: { lo: -0.5, hi: 1.5 } },
      { interval: unit, margin: -0.5, expected: { lo: 0.5, hi: 0.5 } },
      { interval: unit, margin: -0.51, expectedEmpty: true },
    ])("expanded($interval, $margin)", ({ interval, margin, expected, expectedEmpty }) => {
      const actual = expanded(interval, margin);

      if (expectedEmpty) {
        expect(isEmpty(actual)).toBe(true);
      } else {
        expect(actual).toEqual(expected);
      }
    });
  });

  describe("equals", () => {
    it("should consider two empty intervals equal", () => {
      expect(equals(empty, empty)).toBe(true);
    });

    it("should consider identical intervals equal", () => {
      expect(equals(unit, unit)).toBe(true);
    });

    it("should consider different intervals not equal", () => {
      expect(equals(unit, negunit)).toBe(false);
    });

    it("should not consider empty equal to non-empty", () => {
      expect(equals(empty, unit)).toBe(false);
    });
  });

  describe("approxEquals", () => {
    /**
     * Default epsilon is 1e-15. Tests use values just within and just outside this tolerance.
     * lo = 0.5e-15 (within tolerance), hi = 1.5e-15 (outside tolerance)
     */
    const lo = 0.5e-15;
    const hi = 1.5e-15;

    it.each([
      // empty/empty
      { a: empty, b: empty, expected: true },
      // empty vs zero-length (within tolerance since length=0 <= 2*epsilon)
      { a: { lo: 0, hi: 0 }, b: empty, expected: true },
      { a: empty, b: { lo: 0, hi: 0 }, expected: true },
      // empty vs small interval (length=2*lo=1e-15 <= 2*1e-15=2e-15)
      { a: { lo: 1, hi: 1 + 2 * lo }, b: empty, expected: true },
      { a: empty, b: { lo: 1, hi: 1 + 2 * lo }, expected: true },
      // empty vs larger interval (length=2*hi=3e-15 > 2*1e-15=2e-15)
      { a: { lo: 1, hi: 1 + 2 * hi }, b: empty, expected: false },
      { a: empty, b: { lo: 1, hi: 1 + 2 * hi }, expected: false },
      // same intervals
      { a: { lo: 1, hi: 2 }, b: { lo: 1, hi: 2 }, expected: true },
      // endpoint shifted by lo (within tolerance)
      { a: { lo: 1, hi: 2 }, b: { lo: 1 + lo, hi: 2 }, expected: true },
      { a: { lo: 1, hi: 2 }, b: { lo: 1, hi: 2 + lo }, expected: true },
      // endpoint shifted by hi (outside tolerance)
      { a: { lo: 1, hi: 2 }, b: { lo: 1 + hi, hi: 2 }, expected: false },
      { a: { lo: 1, hi: 2 }, b: { lo: 1, hi: 2 + hi }, expected: false },
      // negative direction shifts
      { a: { lo: 1, hi: 2 }, b: { lo: 1 - lo, hi: 2 }, expected: true },
      { a: { lo: 1, hi: 2 }, b: { lo: 1, hi: 2 - lo }, expected: true },
      { a: { lo: 1, hi: 2 }, b: { lo: 1 - hi, hi: 2 }, expected: false },
      { a: { lo: 1, hi: 2 }, b: { lo: 1, hi: 2 - hi }, expected: false },
    ])("approxEquals($a, $b) should return $expected", ({ a, b, expected }) => {
      expect(approxEquals(a, b)).toBe(expected);
    });

    it("should accept custom maxError", () => {
      const a: Interval = { lo: 1, hi: 2 };
      const b: Interval = { lo: 1.01, hi: 2 };

      expect(approxEquals(a, b, 0.02)).toBe(true);
      expect(approxEquals(a, b, 0.001)).toBe(false);
    });
  });

  describe("directedHausdorffDistance", () => {
    it("should return 0 for empty interval", () => {
      expect(directedHausdorffDistance(empty, unit)).toBe(0);
    });

    it("should return Infinity when other is empty", () => {
      expect(directedHausdorffDistance(unit, empty)).toBe(Infinity);
    });

    it("should return 0 for identical intervals", () => {
      expect(directedHausdorffDistance(unit, unit)).toBe(0);
    });

    it("should return 0 when contained", () => {
      expect(directedHausdorffDistance(half, unit)).toBe(0);
    });

    it("should compute distance for non-overlapping intervals", () => {
      const i: Interval = { lo: 2, hi: 4 };
      const j: Interval = { lo: 0, hi: 1 };

      expect(directedHausdorffDistance(i, j)).toBe(3);
    });

    it("should compute distance for partially overlapping intervals", () => {
      const i: Interval = { lo: 0, hi: 4 };
      const j: Interval = { lo: 1, hi: 2 };

      expect(directedHausdorffDistance(i, j)).toBe(2);
    });
  });
});
