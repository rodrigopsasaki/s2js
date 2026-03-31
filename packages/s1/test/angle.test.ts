import { describe, it, expect } from "vitest";
import {
  angleFromRadians,
  angleFromDegrees,
  angleFromE5,
  angleFromE6,
  angleFromE7,
  toDegrees,
  toRadians,
  toE5,
  toE6,
  toE7,
  absAngle,
  normalized,
  isInfAngle,
  approxEqualAngle,
  infAngle,
} from "../src/index.js";

describe("s1.Angle", () => {
  describe("angleFromRadians", () => {
    it.each([
      { input: 0, expected: 0 },
      { input: Math.PI, expected: Math.PI },
      { input: -Math.PI, expected: -Math.PI },
      { input: 1.5, expected: 1.5 },
    ])("should create angle from $input radians", ({ input, expected }) => {
      const actual = angleFromRadians(input);

      expect(toRadians(actual)).toBe(expected);
    });
  });

  describe("angleFromDegrees", () => {
    it.each([
      { degrees: 0, expectedRadians: 0 },
      { degrees: 45, expectedRadians: Math.PI / 4 },
      { degrees: 90, expectedRadians: Math.PI / 2 },
      { degrees: 180, expectedRadians: Math.PI },
      { degrees: 360, expectedRadians: 2 * Math.PI },
      { degrees: -90, expectedRadians: -Math.PI / 2 },
    ])("should create angle from $degrees degrees", ({ degrees, expectedRadians }) => {
      const actual = angleFromDegrees(degrees);

      expect(toRadians(actual)).toBeCloseTo(expectedRadians, 14);
    });
  });

  describe("toDegrees / toRadians roundtrip", () => {
    it.each([0, 45, 90, 180, 360, -90, -180, 1, 270])("should roundtrip %d degrees", (degrees) => {
      const angle = angleFromDegrees(degrees);

      const actual = toDegrees(angle);

      expect(actual).toBeCloseTo(degrees, 10);
    });

    it.each([0, Math.PI / 4, Math.PI / 2, Math.PI, 2 * Math.PI, -Math.PI])("should roundtrip %d radians", (radians) => {
      const angle = angleFromRadians(radians);

      const actual = toRadians(angle);

      expect(actual).toBe(radians);
    });
  });

  describe("angleFromE5 / toE5 roundtrip", () => {
    it.each([
      { e5: 0, expectedDegrees: 0 },
      { e5: 9000000, expectedDegrees: 90 },
      { e5: 18000000, expectedDegrees: 180 },
      { e5: -4500000, expectedDegrees: -45 },
    ])("should roundtrip e5=$e5", ({ e5, expectedDegrees }) => {
      const angle = angleFromE5(e5);

      expect(toDegrees(angle)).toBeCloseTo(expectedDegrees, 5);
      expect(toE5(angle)).toBe(e5);
    });
  });

  describe("angleFromE6 / toE6 roundtrip", () => {
    it.each([
      { e6: 0, expectedDegrees: 0 },
      { e6: 90000000, expectedDegrees: 90 },
      { e6: 180000000, expectedDegrees: 180 },
      { e6: -45000000, expectedDegrees: -45 },
    ])("should roundtrip e6=$e6", ({ e6, expectedDegrees }) => {
      const angle = angleFromE6(e6);

      expect(toDegrees(angle)).toBeCloseTo(expectedDegrees, 6);
      expect(toE6(angle)).toBe(e6);
    });
  });

  describe("angleFromE7 / toE7 roundtrip", () => {
    it.each([
      { e7: 0, expectedDegrees: 0 },
      { e7: 900000000, expectedDegrees: 90 },
      { e7: 1800000000, expectedDegrees: 180 },
      { e7: -450000000, expectedDegrees: -45 },
    ])("should roundtrip e7=$e7", ({ e7, expectedDegrees }) => {
      const angle = angleFromE7(e7);

      expect(toDegrees(angle)).toBeCloseTo(expectedDegrees, 7);
      expect(toE7(angle)).toBe(e7);
    });
  });

  describe("absAngle", () => {
    it.each([
      { input: Math.PI, expected: Math.PI },
      { input: -Math.PI, expected: Math.PI },
      { input: 0, expected: 0 },
      { input: -2.5, expected: 2.5 },
      { input: 1.0, expected: 1.0 },
    ])("should return $expected for input $input", ({ input, expected }) => {
      const actual = absAngle(angleFromRadians(input));

      expect(toRadians(actual)).toBeCloseTo(expected, 14);
    });
  });

  describe("normalized", () => {
    it.each([
      { input: 0, expected: 0 },
      { input: Math.PI, expected: Math.PI },
      { input: 2 * Math.PI, expected: 0 },
      { input: -Math.PI, expected: Math.PI },
      { input: 3 * Math.PI, expected: Math.PI },
      { input: -3 * Math.PI, expected: Math.PI },
      { input: Math.PI / 2, expected: Math.PI / 2 },
      { input: -Math.PI / 2, expected: -Math.PI / 2 },
      { input: 4 * Math.PI, expected: 0 },
    ])("should normalize $input to $expected", ({ input, expected }) => {
      const actual = normalized(angleFromRadians(input));

      expect(toRadians(actual)).toBeCloseTo(expected, 10);
    });
  });

  describe("isInfAngle", () => {
    it("should return true for positive infinity", () => {
      expect(isInfAngle(infAngle())).toBe(true);
    });

    it("should return true for negative infinity", () => {
      expect(isInfAngle(angleFromRadians(-Infinity))).toBe(true);
    });

    it("should return true for NaN", () => {
      expect(isInfAngle(angleFromRadians(NaN))).toBe(true);
    });

    it.each([0, Math.PI, -Math.PI, 1, -1])("should return false for finite value %d", (value) => {
      expect(isInfAngle(angleFromRadians(value))).toBe(false);
    });
  });

  describe("approxEqualAngle", () => {
    it("should return true for exactly equal angles", () => {
      const a = angleFromDegrees(90);
      const b = angleFromDegrees(90);

      expect(approxEqualAngle(a, b)).toBe(true);
    });

    it("should return true for near-equal angles within epsilon", () => {
      const a = angleFromRadians(1.0);
      const b = angleFromRadians(1.0 + 1e-16);

      expect(approxEqualAngle(a, b)).toBe(true);
    });

    it("should return false for clearly different angles", () => {
      const a = angleFromDegrees(90);
      const b = angleFromDegrees(91);

      expect(approxEqualAngle(a, b)).toBe(false);
    });

    it("should return true for zero angles", () => {
      const a = angleFromRadians(0);
      const b = angleFromRadians(0);

      expect(approxEqualAngle(a, b)).toBe(true);
    });
  });

  describe("infAngle", () => {
    it("should return an infinite angle", () => {
      const actual = infAngle();

      expect(isInfAngle(actual)).toBe(true);
      expect(toRadians(actual)).toBe(Infinity);
    });
  });
});
