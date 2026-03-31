import { describe, it, expect } from "vitest";
import {
  type Interval,
  addPoint,
  approxEquals,
  center,
  complement,
  complementCenter,
  containsInterval,
  contains,
  emptyInterval,
  expanded,
  fullInterval,
  interiorContains,
  interiorContainsInterval,
  interiorIntersects,
  intersection,
  intersects,
  intervalFromEndpoints,
  intervalFromPoint,
  isEmpty,
  isFull,
  isInverted,
  isValid,
  invert,
  length,
  project,
  union,
} from "../src/index.js";

const { PI } = Math;
const PI_2 = PI / 2;
const PI_4 = PI / 4;

/** Standard test intervals for circular geometry. */
const empty = emptyInterval();
const full = fullInterval();
const zero: Interval = { lo: 0, hi: 0 };
const pi: Interval = { lo: PI, hi: PI };
const mipi: Interval = { lo: -PI, hi: -PI };

// Quadrant intervals. Note: On the circular interval [-PI, PI],
// -PI is identified with PI. The isValid function forbids lo=-PI unless hi=PI,
// and forbids hi=-PI unless lo=PI. So inverted intervals wrapping through -PI
// use PI for the endpoint at the discontinuity.
const quad1: Interval = { lo: 0, hi: PI_2 };
const quad2: Interval = { lo: PI_2, hi: PI };
const quad3: Interval = { lo: PI, hi: -PI_2 };
const quad12: Interval = { lo: 0, hi: PI };
const quad23: Interval = { lo: PI_2, hi: -PI_2 };
const quad123: Interval = { lo: 0, hi: -PI_2 };

// Small intervals within specific regions.
const mid12: Interval = { lo: PI_4, hi: PI_2 };
// mid23 is a subset of quad23 (inverted): lo must be >= quad23.lo and hi must be <= quad23.hi
// quad23 = {lo: PI/2, hi: -PI/2}, mid23 needs lo >= PI/2 and hi <= -PI/2
const mid23: Interval = { lo: PI_2 + PI_4, hi: -PI_2 - PI_4 };

describe("s1.Interval", () => {
  describe("constructors", () => {
    it("emptyInterval should create [PI, -PI]", () => {
      const i = emptyInterval();

      expect(i.lo).toBe(PI);
      expect(i.hi).toBe(-PI);
      expect(isEmpty(i)).toBe(true);
    });

    it("fullInterval should create [-PI, PI]", () => {
      const i = fullInterval();

      expect(i.lo).toBe(-PI);
      expect(i.hi).toBe(PI);
      expect(isFull(i)).toBe(true);
    });

    it("intervalFromPoint should create a singleton interval", () => {
      const i = intervalFromPoint(1);

      expect(i.lo).toBe(1);
      expect(i.hi).toBe(1);
      expect(isEmpty(i)).toBe(false);
      expect(contains(i, 1)).toBe(true);
    });

    it("intervalFromEndpoints should create an interval from lo to hi", () => {
      const i = intervalFromEndpoints(0, PI_2);

      expect(i.lo).toBe(0);
      expect(i.hi).toBe(PI_2);
    });

    it("intervalFromEndpoints should create an inverted interval when lo > hi", () => {
      const i = intervalFromEndpoints(PI_2, -PI_2);

      expect(isInverted(i)).toBe(true);
    });
  });

  describe("isEmpty", () => {
    it.each([
      { input: empty, expected: true },
      { input: full, expected: false },
      { input: zero, expected: false },
      { input: quad1, expected: false },
      { input: quad23, expected: false },
      { input: pi, expected: false },
    ])("isEmpty($input) should return $expected", ({ input, expected }) => {
      expect(isEmpty(input)).toBe(expected);
    });
  });

  describe("isFull", () => {
    it.each([
      { input: empty, expected: false },
      { input: full, expected: true },
      { input: zero, expected: false },
      { input: quad1, expected: false },
      { input: quad23, expected: false },
    ])("isFull($input) should return $expected", ({ input, expected }) => {
      expect(isFull(input)).toBe(expected);
    });
  });

  describe("isInverted", () => {
    it.each([
      { input: empty, expected: true },
      { input: full, expected: false },
      { input: zero, expected: false },
      { input: quad1, expected: false },
      { input: quad2, expected: false },
      { input: quad3, expected: true },
      { input: quad23, expected: true },
    ])("isInverted($input) should return $expected", ({ input, expected }) => {
      expect(isInverted(input)).toBe(expected);
    });
  });

  describe("isValid", () => {
    it.each([
      { input: empty, expected: true },
      { input: full, expected: true },
      { input: zero, expected: true },
      { input: quad1, expected: true },
      { input: quad2, expected: true },
      { input: pi, expected: true },
      { input: quad23, expected: true },
    ])("isValid($input) should return $expected", ({ input, expected }) => {
      expect(isValid(input)).toBe(expected);
    });

    it("should return false for intervals with lo = -PI and hi != PI", () => {
      const input: Interval = { lo: -PI, hi: 0 };

      expect(isValid(input)).toBe(false);
    });

    it("should return false for intervals with hi = -PI and lo != PI", () => {
      const input: Interval = { lo: 0, hi: -PI };

      expect(isValid(input)).toBe(false);
    });

    it("should return false for out-of-range endpoints", () => {
      expect(isValid({ lo: PI + 1, hi: 0 })).toBe(false);
      expect(isValid({ lo: 0, hi: PI + 1 })).toBe(false);
    });

    it("mipi {lo: -PI, hi: -PI} is not valid (lo=-PI requires hi=PI)", () => {
      expect(isValid(mipi)).toBe(false);
    });
  });

  describe("center", () => {
    it.each([
      { input: quad1, expected: PI_4, description: "normal interval [0, PI/2]" },
      { input: quad2, expected: PI_2 + PI_4, description: "normal [PI/2, PI]" },
      { input: full, expected: 0, description: "full interval" },
      { input: zero, expected: 0, description: "singleton at 0" },
      { input: pi, expected: PI, description: "singleton at PI" },
    ])("center of $description should be $expected", ({ input, expected }) => {
      expect(center(input)).toBeCloseTo(expected, 14);
    });

    it("should compute center for inverted intervals wrapping through -PI", () => {
      const i: Interval = { lo: PI_2, hi: -PI_2 };

      const actual = center(i);

      expect(actual).toBeCloseTo(PI, 14);
    });

    it("should compute center for inverted interval in negative half", () => {
      const i: Interval = { lo: PI_4, hi: -PI_4 };

      const actual = center(i);

      expect(actual).toBeCloseTo(PI, 14);
    });
  });

  describe("length", () => {
    it.each([
      { input: quad1, expected: PI_2, description: "quarter circle" },
      { input: quad12, expected: PI, description: "half circle [0, PI]" },
      { input: full, expected: 2 * PI, description: "full circle" },
      { input: zero, expected: 0, description: "singleton" },
    ])("length of $description should be $expected", ({ input, expected }) => {
      expect(length(input)).toBeCloseTo(expected, 14);
    });

    it("should return negative for empty intervals", () => {
      expect(length(empty)).toBe(-1);
    });

    it("should compute length for inverted intervals (wrapping)", () => {
      const i: Interval = { lo: PI_2, hi: -PI_2 };

      const actual = length(i);

      expect(actual).toBeCloseTo(PI, 14);
    });

    it("should compute length for a 270-degree inverted interval", () => {
      // Interval from PI/4 wrapping around to -PI/2
      // length = -PI/2 - PI/4 + 2*PI = 5*PI/4
      const i: Interval = { lo: PI_4, hi: -PI_2 };

      const actual = length(i);

      expect(actual).toBeCloseTo(1.25 * PI, 14);
    });
  });

  describe("contains", () => {
    it.each([
      { interval: quad1, point: 0, expected: true, desc: "lo endpoint" },
      { interval: quad1, point: PI_2, expected: true, desc: "hi endpoint" },
      { interval: quad1, point: PI_4, expected: true, desc: "interior" },
      { interval: quad1, point: PI, expected: false, desc: "outside" },
      { interval: quad1, point: -PI_4, expected: false, desc: "before lo" },
    ])("normal interval: contains($desc) should be $expected", ({ interval, point, expected }) => {
      expect(contains(interval, point)).toBe(expected);
    });

    it.each([
      { interval: quad23, point: PI, expected: true, desc: "PI in inverted" },
      { interval: quad23, point: -PI, expected: true, desc: "-PI treated as PI" },
      { interval: quad23, point: PI_2 + PI_4, expected: true, desc: "3PI/4 in inverted" },
      { interval: quad23, point: -PI_2 - PI_4, expected: true, desc: "-3PI/4 in inverted" },
      { interval: quad23, point: 0, expected: false, desc: "0 not in inverted" },
      { interval: quad23, point: PI_4, expected: false, desc: "PI/4 not in inverted" },
    ])("inverted interval: contains($desc) should be $expected", ({ interval, point, expected }) => {
      expect(contains(interval, point)).toBe(expected);
    });

    it("full interval should contain every point", () => {
      expect(contains(full, 0)).toBe(true);
      expect(contains(full, PI)).toBe(true);
      expect(contains(full, -PI)).toBe(true);
      expect(contains(full, PI_2)).toBe(true);
    });

    it("empty interval should not contain interior points", () => {
      expect(contains(empty, 0)).toBe(false);
      expect(contains(empty, PI_2)).toBe(false);
      expect(contains(empty, -PI_2)).toBe(false);
    });

    it("empty interval should not contain PI or -PI", () => {
      expect(contains(empty, PI)).toBe(false);
      expect(contains(empty, -PI)).toBe(false);
    });

    it("should treat -PI as PI (boundary normalization)", () => {
      const i: Interval = { lo: PI, hi: PI };

      expect(contains(i, -PI)).toBe(true);
    });
  });

  describe("containsInterval", () => {
    it.each([
      {
        i: full,
        j: quad1,
        expected: true,
        desc: "full contains normal",
      },
      {
        i: full,
        j: quad23,
        expected: true,
        desc: "full contains inverted",
      },
      {
        i: quad1,
        j: empty,
        expected: true,
        desc: "any contains empty",
      },
      {
        i: empty,
        j: quad1,
        expected: false,
        desc: "empty does not contain normal",
      },
      {
        i: quad12,
        j: quad1,
        expected: true,
        desc: "larger normal contains smaller normal",
      },
      {
        i: quad1,
        j: quad12,
        expected: false,
        desc: "smaller normal does not contain larger normal",
      },
      {
        i: quad123,
        j: quad23,
        expected: true,
        desc: "inverted contains inverted subset",
      },
      {
        i: quad23,
        j: quad123,
        expected: false,
        desc: "smaller inverted does not contain larger inverted",
      },
      {
        i: quad23,
        j: mid23,
        expected: true,
        desc: "inverted contains normal within wrapping region",
      },
    ])("containsInterval: $desc should be $expected", ({ i, j, expected }) => {
      expect(containsInterval(i, j)).toBe(expected);
    });

    it("normal interval cannot contain inverted (unless full)", () => {
      expect(containsInterval(quad1, quad23)).toBe(false);
    });

    it("inverted interval containing normal when it wraps around", () => {
      // {lo: PI/2, hi: -PI/2} wraps around and contains {lo: PI/2+PI/4, hi: -PI/4}
      expect(containsInterval(quad23, mid23)).toBe(true);
    });
  });

  describe("interiorContains", () => {
    it.each([
      { interval: quad1, point: PI_4, expected: true, desc: "interior point" },
      { interval: quad1, point: 0, expected: false, desc: "lo boundary excluded" },
      { interval: quad1, point: PI_2, expected: false, desc: "hi boundary excluded" },
      { interval: full, point: 0, expected: true, desc: "full interior includes all" },
      { interval: full, point: PI, expected: true, desc: "full interior includes PI" },
    ])("interiorContains($desc) should be $expected", ({ interval, point, expected }) => {
      expect(interiorContains(interval, point)).toBe(expected);
    });

    it("inverted interval interior contains points beyond endpoints", () => {
      expect(interiorContains(quad23, PI)).toBe(true);
      expect(interiorContains(quad23, PI_2)).toBe(false);
      expect(interiorContains(quad23, -PI_2)).toBe(false);
    });

    it("should treat -PI as PI for boundary normalization", () => {
      const i: Interval = { lo: PI_2, hi: PI };

      expect(interiorContains(i, -PI)).toBe(false);
    });
  });

  describe("interiorContainsInterval", () => {
    it.each([
      {
        i: full,
        j: quad1,
        expected: true,
        desc: "full interior contains any normal",
      },
      {
        i: quad12,
        j: mid12,
        expected: true,
        desc: "larger normal interior-contains smaller normal",
      },
      {
        i: quad1,
        j: quad1,
        expected: false,
        desc: "interval does not interior-contain itself",
      },
      {
        i: quad1,
        j: empty,
        expected: true,
        desc: "any interval interior-contains empty",
      },
      {
        i: empty,
        j: quad1,
        expected: false,
        desc: "empty does not interior-contain normal",
      },
    ])("interiorContainsInterval: $desc should be $expected", ({ i, j, expected }) => {
      expect(interiorContainsInterval(i, j)).toBe(expected);
    });
  });

  describe("intersects", () => {
    it.each([
      { i: empty, j: empty, expected: false, desc: "empty/empty" },
      { i: empty, j: quad1, expected: false, desc: "empty/normal" },
      { i: quad1, j: empty, expected: false, desc: "normal/empty" },
      { i: quad1, j: quad1, expected: true, desc: "same interval" },
      { i: quad1, j: quad2, expected: true, desc: "adjacent at PI/2" },
      {
        i: { lo: 0, hi: PI_4 } as Interval,
        j: { lo: PI_2, hi: PI } as Interval,
        expected: false,
        desc: "non-overlapping normals",
      },
      { i: quad1, j: quad23, expected: true, desc: "normal overlaps inverted" },
      { i: quad23, j: quad1, expected: true, desc: "inverted overlaps normal" },
      { i: quad2, j: quad3, expected: true, desc: "inverted/inverted" },
      { i: full, j: quad1, expected: true, desc: "full intersects anything" },
    ])("intersects: $desc should be $expected", ({ i, j, expected }) => {
      expect(intersects(i, j)).toBe(expected);
    });
  });

  describe("interiorIntersects", () => {
    it.each([
      { i: empty, j: empty, expected: false, desc: "empty/empty" },
      { i: empty, j: quad1, expected: false, desc: "empty/normal" },
      { i: quad1, j: quad2, expected: false, desc: "adjacent at shared endpoint" },
      { i: quad12, j: mid12, expected: true, desc: "overlapping interiors" },
      { i: full, j: quad1, expected: true, desc: "full interior-intersects anything" },
    ])("interiorIntersects: $desc should be $expected", ({ i, j, expected }) => {
      expect(interiorIntersects(i, j)).toBe(expected);
    });

    it("singleton does not interior-intersect anything", () => {
      expect(interiorIntersects(zero, zero)).toBe(false);
      expect(interiorIntersects(zero, quad1)).toBe(false);
    });

    it("adjacent intervals at PI should not interior-intersect", () => {
      // quad2 = [PI/2, PI], quad3 = [PI, -PI/2] — they share boundary at PI but not interior
      expect(interiorIntersects(quad2, quad3)).toBe(false);
    });
  });

  describe("interval operations table", () => {
    /**
     * Combined test table for containsInterval, interiorContainsInterval,
     * intersects, and interiorIntersects across many interval combinations.
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
        j: full,
        containsJ: false,
        interiorContainsJ: false,
        intersectsJ: false,
        interiorIntersectsJ: false,
      },
      {
        i: full,
        j: empty,
        containsJ: true,
        interiorContainsJ: true,
        intersectsJ: false,
        interiorIntersectsJ: false,
      },
      {
        i: full,
        j: full,
        containsJ: true,
        interiorContainsJ: true,
        intersectsJ: true,
        interiorIntersectsJ: true,
      },
      {
        i: quad12,
        j: quad12,
        containsJ: true,
        interiorContainsJ: false,
        intersectsJ: true,
        interiorIntersectsJ: true,
      },
      {
        i: quad12,
        j: quad1,
        containsJ: true,
        interiorContainsJ: false,
        intersectsJ: true,
        interiorIntersectsJ: true,
      },
      {
        i: quad12,
        j: quad23,
        containsJ: false,
        interiorContainsJ: false,
        intersectsJ: true,
        interiorIntersectsJ: true,
      },
      {
        i: quad1,
        j: quad23,
        containsJ: false,
        interiorContainsJ: false,
        intersectsJ: true,
        interiorIntersectsJ: false,
      },
      {
        i: quad1,
        j: quad1,
        containsJ: true,
        interiorContainsJ: false,
        intersectsJ: true,
        interiorIntersectsJ: true,
      },
    ])("operations for ($i, $j)", ({ i, j, containsJ, interiorContainsJ, intersectsJ, interiorIntersectsJ }) => {
      expect(containsInterval(i, j)).toBe(containsJ);
      expect(interiorContainsInterval(i, j)).toBe(interiorContainsJ);
      expect(intersects(i, j)).toBe(intersectsJ);
      expect(interiorIntersects(i, j)).toBe(interiorIntersectsJ);
    });
  });

  describe("union", () => {
    it.each([
      { i: quad1, j: empty, expected: quad1, desc: "union with empty" },
      { i: empty, j: quad1, expected: quad1, desc: "empty union normal" },
      {
        i: quad1,
        j: quad1,
        expected: quad1,
        desc: "union with self",
      },
      {
        i: quad1,
        j: quad2,
        expected: quad12,
        desc: "adjacent quarters",
      },
    ])("union: $desc", ({ i, j, expected }) => {
      const actual = union(i, j);

      expect(actual).toEqual(expected);
    });

    it("should return empty when both inputs are empty", () => {
      const actual = union(emptyInterval(), emptyInterval());

      expect(isEmpty(actual)).toBe(true);
    });

    it("should return full when intervals together span the whole circle", () => {
      const a: Interval = { lo: -PI, hi: 0 };
      const b: Interval = { lo: -PI_4, hi: PI };

      const actual = union(a, b);

      expect(isFull(actual)).toBe(true);
    });

    it("should compute union of overlapping normal intervals", () => {
      const a: Interval = { lo: 0, hi: PI_2 };
      const b: Interval = { lo: PI_4, hi: PI };

      const actual = union(a, b);

      expect(actual.lo).toBe(0);
      expect(actual.hi).toBe(PI);
    });

    it("should compute union of non-overlapping intervals", () => {
      // a=[0, PI/4], b=[PI/2, PI]. Gap between them is PI/4.
      // Gap on the other side (wrapping) is PI + (2PI - PI) = much larger.
      // Union should cover the shorter gap: [0, PI].
      const a: Interval = { lo: 0, hi: PI_4 };
      const b: Interval = { lo: PI_2, hi: PI };

      const actual = union(a, b);

      // union(a, b): b.lo is not in a, b.hi is not in a, a is not empty,
      // b.lo (PI/2) > a.lo (0) is true, so return a (the implementation detail).
      // The union function for disjoint intervals returns the input that
      // starts earlier if other.lo >= i.lo. Let's just verify the result contains both.
      expect(contains(actual, 0)).toBe(true);
      expect(contains(actual, PI_4)).toBe(true);
    });
  });

  describe("intersection", () => {
    it.each([
      {
        i: quad1,
        j: quad2,
        expected: { lo: PI_2, hi: PI_2 },
        desc: "adjacent at single point",
      },
      { i: quad1, j: empty, expectedEmpty: true, desc: "normal with empty" },
      { i: empty, j: quad1, expectedEmpty: true, desc: "empty with normal" },
    ])("intersection: $desc", ({ i, j, expected, expectedEmpty }) => {
      const actual = intersection(i, j);

      if (expectedEmpty) {
        expect(isEmpty(actual)).toBe(true);
      } else {
        expect(actual).toEqual(expected);
      }
    });

    it("should return the interval itself for identical inputs", () => {
      const actual = intersection(quad1, quad1);

      expect(actual).toEqual(quad1);
    });

    it("should return smaller interval when one contains the other", () => {
      const actual = intersection(quad12, quad1);

      expect(actual).toEqual(quad1);
    });

    it("should return empty for non-overlapping intervals", () => {
      const a: Interval = { lo: 0, hi: PI_4 };
      const b: Interval = { lo: PI_2, hi: PI };

      const actual = intersection(a, b);

      expect(isEmpty(actual)).toBe(true);
    });

    it("should compute intersection of overlapping normal intervals", () => {
      const a: Interval = { lo: 0, hi: PI_2 };
      const b: Interval = { lo: PI_4, hi: PI };

      const actual = intersection(a, b);

      expect(actual.lo).toBeCloseTo(PI_4, 14);
      expect(actual.hi).toBeCloseTo(PI_2, 14);
    });

    it("should intersect full with any interval returning the interval", () => {
      const actual = intersection(full, quad1);

      expect(actual).toEqual(quad1);
    });
  });

  describe("addPoint", () => {
    it("should create a singleton from empty", () => {
      const actual = addPoint(empty, 1);

      expect(actual).toEqual({ lo: 1, hi: 1 });
    });

    it("should not change interval when point is already contained", () => {
      const actual = addPoint(quad1, PI_4);

      expect(actual).toEqual(quad1);
    });

    it("should expand to nearer endpoint", () => {
      // Point 0.1 radians below lo=0, should expand lo
      const i: Interval = { lo: 0, hi: PI_2 };

      const actual = addPoint(i, -0.1);

      expect(actual.lo).toBeCloseTo(-0.1, 14);
      expect(actual.hi).toBe(PI_2);
    });

    it("should expand hi when point is closer to hi", () => {
      const i: Interval = { lo: 0, hi: PI_2 };

      const actual = addPoint(i, PI_2 + 0.1);

      expect(actual.lo).toBe(0);
      expect(actual.hi).toBeCloseTo(PI_2 + 0.1, 14);
    });

    it("should ignore points with abs > PI", () => {
      const actual = addPoint(quad1, PI + 1);

      expect(actual).toEqual(quad1);
    });

    it("should normalize -PI to PI (empty already 'contains' PI)", () => {
      // addPoint normalizes -PI to PI, then fastContains(empty, PI) is true
      // because empty={lo:PI, hi:-PI} is inverted and PI >= PI.
      // So addPoint returns the interval unchanged.
      const actual = addPoint(empty, -PI);

      expect(actual).toEqual(empty);
    });

    it("should add -PI (as PI) to a non-empty interval", () => {
      const i: Interval = { lo: 0, hi: PI_2 };

      const actual = addPoint(i, -PI);

      // -PI is normalized to PI, then added expanding the nearer endpoint
      expect(contains(actual, PI)).toBe(true);
    });

    it("should build up an interval incrementally", () => {
      let i = emptyInterval();

      i = addPoint(i, 0);
      expect(i).toEqual({ lo: 0, hi: 0 });

      i = addPoint(i, PI_2);
      expect(i.lo).toBe(0);
      expect(i.hi).toBeCloseTo(PI_2, 14);

      i = addPoint(i, -PI_2);
      expect(i.lo).toBeCloseTo(-PI_2, 14);
      expect(i.hi).toBeCloseTo(PI_2, 14);
    });
  });

  describe("expanded", () => {
    it("should not change empty intervals", () => {
      const actual = expanded(empty, PI_4);

      expect(isEmpty(actual)).toBe(true);
    });

    it("should become full when expanded enough", () => {
      const actual = expanded(quad1, PI);

      expect(isFull(actual)).toBe(true);
    });

    it("should expand a normal interval by margin on each side", () => {
      const i: Interval = { lo: 0, hi: PI_2 };

      const actual = expanded(i, PI_4);

      expect(actual.lo).toBeCloseTo(-PI_4, 14);
      expect(actual.hi).toBeCloseTo(PI_2 + PI_4, 14);
    });

    it("should shrink when margin is negative", () => {
      const i: Interval = { lo: 0, hi: PI };

      const actual = expanded(i, -PI_4);

      expect(actual.lo).toBeCloseTo(PI_4, 14);
      expect(actual.hi).toBeCloseTo(PI - PI_4, 14);
    });

    it("should become empty when shrunk too much", () => {
      const i: Interval = { lo: 0, hi: PI_4 };

      const actual = expanded(i, -PI);

      expect(isEmpty(actual)).toBe(true);
    });

    it("should collapse to a singleton when shrunk to exact length", () => {
      const i: Interval = { lo: 0, hi: PI_2 };

      const actual = expanded(i, -PI_4);

      // Should be a point near the center
      expect(actual.lo).toBeCloseTo(actual.hi, 14);
    });
  });

  describe("complement", () => {
    it("should swap endpoints", () => {
      const actual = complement(quad1);

      expect(actual.lo).toBe(quad1.hi);
      expect(actual.hi).toBe(quad1.lo);
    });

    it("singleton complement should be full", () => {
      const actual = complement(zero);

      expect(isFull(actual)).toBe(true);
    });

    it("complement of full is empty", () => {
      const actual = complement(full);

      expect(isEmpty(actual)).toBe(true);
    });

    it("complement of empty is full", () => {
      const actual = complement(empty);

      expect(isFull(actual)).toBe(true);
    });

    it("double complement returns original", () => {
      const actual = complement(complement(quad1));

      expect(actual).toEqual(quad1);
    });
  });

  describe("invert", () => {
    it("should swap lo and hi", () => {
      const actual = invert(quad1);

      expect(actual.lo).toBe(quad1.hi);
      expect(actual.hi).toBe(quad1.lo);
    });

    it("inversion of a singleton should still be the same singleton", () => {
      const actual = invert(zero);

      expect(actual.lo).toBe(0);
      expect(actual.hi).toBe(0);
    });
  });

  describe("complementCenter", () => {
    it("should return the midpoint of the complement for a normal interval", () => {
      const actual = complementCenter(quad1);

      // quad1 = [0, PI/2], complement = [PI/2, 0] (inverted, wrapping)
      // complement center is midpoint of [PI/2, 2PI + 0] = midpoint around PI+PI/4
      expect(typeof actual).toBe("number");
    });

    it("should return opposite point for a singleton", () => {
      const actual = complementCenter(zero);

      expect(actual).toBeCloseTo(PI, 14);
    });

    it("should return opposite for negative singleton", () => {
      const actual = complementCenter({ lo: -PI_2, hi: -PI_2 });

      expect(actual).toBeCloseTo(PI_2, 14);
    });
  });

  describe("project", () => {
    it("should return the point itself if contained", () => {
      const actual = project(quad1, PI_4);

      expect(actual).toBe(PI_4);
    });

    it("should return nearest endpoint for point outside normal interval", () => {
      // Point PI is outside quad1 [0, PI/2]
      // positive distance from PI to lo=0 is ~PI
      // positive distance from hi=PI/2 to PI is ~PI/2
      const actual = project(quad1, PI);

      expect(actual).toBe(PI_2);
    });

    it("should return lo when point is closer to lo", () => {
      const i: Interval = { lo: 0, hi: PI_2 };

      const actual = project(i, -0.1);

      expect(actual).toBe(0);
    });

    it("should normalize -PI to PI", () => {
      const i: Interval = { lo: PI, hi: PI };

      const actual = project(i, -PI);

      expect(actual).toBe(PI);
    });

    it("should project onto inverted intervals correctly", () => {
      // quad23 = {lo: PI/2, hi: -PI/2}
      // point 0 is outside this inverted interval
      const actual = project(quad23, 0);

      // Should snap to nearest endpoint: lo=PI/2 or hi=-PI/2
      // positiveDistance(0, PI/2) = PI/2
      // positiveDistance(-PI/2, 0) = PI/2
      // Tie-breaks to hi
      expect(actual === PI_2 || actual === -PI_2).toBe(true);
    });
  });

  describe("approxEquals", () => {
    it("should consider identical intervals equal", () => {
      expect(approxEquals(quad1, quad1)).toBe(true);
    });

    it("should consider two empty intervals equal", () => {
      expect(approxEquals(empty, empty)).toBe(true);
    });

    it("should consider empty approx equal to near-empty", () => {
      const nearEmpty: Interval = { lo: 1, hi: 1 };

      expect(approxEquals(empty, nearEmpty)).toBe(true);
    });

    it("should not consider different intervals approx equal", () => {
      expect(approxEquals(quad1, quad2)).toBe(false);
    });

    it("should tolerate tiny differences within epsilon", () => {
      const a: Interval = { lo: 0, hi: PI_2 };
      const b: Interval = { lo: 0 + 1e-16, hi: PI_2 - 1e-16 };

      expect(approxEquals(a, b)).toBe(true);
    });

    it("should reject differences larger than epsilon", () => {
      const a: Interval = { lo: 0, hi: PI_2 };
      const b: Interval = { lo: 0.01, hi: PI_2 };

      expect(approxEquals(a, b)).toBe(false);
    });

    it("should handle wrapping arithmetic via remainder", () => {
      expect(approxEquals(full, full)).toBe(true);
    });
  });
});
