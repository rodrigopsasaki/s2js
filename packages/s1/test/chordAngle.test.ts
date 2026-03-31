import { describe, it, expect } from "vitest";
import {
  angleFromDegrees,
  angleFromRadians,
  chordAngleFromAngle,
  chordAngleFromSquaredLength,
  chordAngleToAngle,
  toRadians,
  negativeChordAngle,
  rightChordAngle,
  straightChordAngle,
  infChordAngle,
  zeroChordAngle,
  isInfinityChordAngle,
  isNegativeChordAngle,
  isSpecialChordAngle,
  isValidChordAngle,
  successorChordAngle,
  predecessorChordAngle,
  addChordAngle,
  subChordAngle,
  sinChordAngle,
  cosChordAngle,
  tanChordAngle,
  sin2ChordAngle,
  infAngle,
} from "../src/index.js";

describe("s1.ChordAngle", () => {
  describe("constants", () => {
    it("should return -1 for negativeChordAngle", () => {
      expect(negativeChordAngle() as number).toBe(-1);
    });

    it("should return 2 for rightChordAngle (90 degrees)", () => {
      expect(rightChordAngle() as number).toBe(2);
    });

    it("should return 4 for straightChordAngle (180 degrees)", () => {
      expect(straightChordAngle() as number).toBe(4);
    });

    it("should return Infinity for infChordAngle", () => {
      expect(infChordAngle() as number).toBe(Infinity);
    });

    it("should return 0 for zeroChordAngle", () => {
      expect(zeroChordAngle() as number).toBe(0);
    });
  });

  describe("chordAngleFromSquaredLength", () => {
    it("should create chord angle from valid squared length", () => {
      const actual = chordAngleFromSquaredLength(2);

      expect(actual as number).toBe(2);
    });

    it("should clamp to straight when squared length exceeds 4", () => {
      const actual = chordAngleFromSquaredLength(5);

      expect(actual as number).toBe(4);
    });

    it("should allow zero", () => {
      const actual = chordAngleFromSquaredLength(0);

      expect(actual as number).toBe(0);
    });

    it("should allow negative values without clamping", () => {
      const actual = chordAngleFromSquaredLength(-1);

      expect(actual as number).toBe(-1);
    });
  });

  describe("chordAngleFromAngle", () => {
    it("should return negative chord angle for negative angle", () => {
      const actual = chordAngleFromAngle(angleFromRadians(-1));

      expect(actual as number).toBe(-1);
    });

    it("should return inf chord angle for infinite angle", () => {
      const actual = chordAngleFromAngle(infAngle());

      expect(isInfinityChordAngle(actual)).toBe(true);
    });

    it("should return straight chord angle for angle > pi", () => {
      const actual = chordAngleFromAngle(angleFromRadians(Math.PI + 0.1));

      expect(actual as number).toBe(4);
    });

    it("should return zero for zero angle", () => {
      const actual = chordAngleFromAngle(angleFromRadians(0));

      expect(actual as number).toBe(0);
    });

    it("should return 2 for 90-degree angle", () => {
      const actual = chordAngleFromAngle(angleFromDegrees(90));

      expect(actual as number).toBeCloseTo(2, 14);
    });

    it("should return 4 for 180-degree angle", () => {
      const actual = chordAngleFromAngle(angleFromDegrees(180));

      expect(actual as number).toBeCloseTo(4, 14);
    });
  });

  describe("chordAngleToAngle", () => {
    it.each([
      { degrees: 0, label: "0 degrees" },
      { degrees: 45, label: "45 degrees" },
      { degrees: 90, label: "90 degrees" },
      { degrees: 180, label: "180 degrees" },
    ])("should roundtrip through Angle at $label", ({ degrees }) => {
      const angle = angleFromDegrees(degrees);
      const chord = chordAngleFromAngle(angle);

      const actual = chordAngleToAngle(chord);

      expect(toRadians(actual)).toBeCloseTo(toRadians(angle), 12);
    });

    it("should return -1 radian for negative chord angle", () => {
      const actual = chordAngleToAngle(negativeChordAngle());

      expect(toRadians(actual)).toBe(-1);
    });

    it("should return Infinity for inf chord angle", () => {
      const actual = chordAngleToAngle(infChordAngle());

      expect(toRadians(actual)).toBe(Infinity);
    });

    it("should return pi for straight chord angle", () => {
      const actual = chordAngleToAngle(straightChordAngle());

      expect(toRadians(actual)).toBeCloseTo(Math.PI, 14);
    });
  });

  describe("isInfinityChordAngle", () => {
    it("should return true for inf chord angle", () => {
      expect(isInfinityChordAngle(infChordAngle())).toBe(true);
    });

    it.each([
      { value: zeroChordAngle(), label: "zero" },
      { value: rightChordAngle(), label: "right" },
      { value: straightChordAngle(), label: "straight" },
      { value: negativeChordAngle(), label: "negative" },
    ])("should return false for $label chord angle", ({ value }) => {
      expect(isInfinityChordAngle(value)).toBe(false);
    });
  });

  describe("isNegativeChordAngle", () => {
    it("should return true for negative chord angle", () => {
      expect(isNegativeChordAngle(negativeChordAngle())).toBe(true);
    });

    it.each([
      { value: zeroChordAngle(), label: "zero" },
      { value: rightChordAngle(), label: "right" },
      { value: infChordAngle(), label: "inf" },
    ])("should return false for $label chord angle", ({ value }) => {
      expect(isNegativeChordAngle(value)).toBe(false);
    });
  });

  describe("isSpecialChordAngle", () => {
    it("should return true for negative chord angle", () => {
      expect(isSpecialChordAngle(negativeChordAngle())).toBe(true);
    });

    it("should return true for inf chord angle", () => {
      expect(isSpecialChordAngle(infChordAngle())).toBe(true);
    });

    it.each([
      { value: zeroChordAngle(), label: "zero" },
      { value: rightChordAngle(), label: "right" },
      { value: straightChordAngle(), label: "straight" },
    ])("should return false for $label chord angle", ({ value }) => {
      expect(isSpecialChordAngle(value)).toBe(false);
    });
  });

  describe("isValidChordAngle", () => {
    it.each([
      { value: zeroChordAngle(), label: "zero" },
      { value: rightChordAngle(), label: "right" },
      { value: straightChordAngle(), label: "straight" },
      { value: negativeChordAngle(), label: "negative" },
      { value: infChordAngle(), label: "inf" },
    ])("should return true for $label chord angle", ({ value }) => {
      expect(isValidChordAngle(value)).toBe(true);
    });

    it("should return true for a value between 0 and 4", () => {
      expect(isValidChordAngle(chordAngleFromSquaredLength(1.5))).toBe(true);
    });

    it("should return false for a value greater than 4 that is not infinity", () => {
      const invalid = 5 as ReturnType<typeof zeroChordAngle>;

      expect(isValidChordAngle(invalid)).toBe(false);
    });
  });

  describe("successorChordAngle", () => {
    it("should return a positive value for zero", () => {
      const actual = successorChordAngle(zeroChordAngle());

      expect(actual as number).toBeGreaterThan(0);
    });

    it("should return a larger value for a positive chord angle", () => {
      const input = chordAngleFromSquaredLength(1);

      const actual = successorChordAngle(input);

      expect(actual as number).toBeGreaterThan(input as number);
    });

    it("should return inf for straight chord angle", () => {
      const actual = successorChordAngle(straightChordAngle());

      expect(isInfinityChordAngle(actual)).toBe(true);
    });

    it("should return inf for inf chord angle", () => {
      const actual = successorChordAngle(infChordAngle());

      expect(isInfinityChordAngle(actual)).toBe(true);
    });

    it("should return zero for negative chord angle", () => {
      const actual = successorChordAngle(negativeChordAngle());

      expect(actual as number).toBe(0);
    });
  });

  describe("predecessorChordAngle", () => {
    it("should return negative for zero", () => {
      const actual = predecessorChordAngle(zeroChordAngle());

      expect(isNegativeChordAngle(actual)).toBe(true);
    });

    it("should return a smaller value for a positive chord angle", () => {
      const input = chordAngleFromSquaredLength(1);

      const actual = predecessorChordAngle(input);

      expect(actual as number).toBeLessThan(input as number);
      expect(actual as number).toBeGreaterThan(0);
    });

    it("should return straight for inf chord angle", () => {
      const actual = predecessorChordAngle(infChordAngle());

      expect(actual as number).toBe(4);
    });

    it("should return negative for negative chord angle", () => {
      const actual = predecessorChordAngle(negativeChordAngle());

      expect(isNegativeChordAngle(actual)).toBe(true);
    });
  });

  describe("addChordAngle", () => {
    it("should add two chord angles", () => {
      const a = chordAngleFromSquaredLength(1);
      const b = chordAngleFromSquaredLength(1);

      const actual = addChordAngle(a, b);

      expect(actual as number).toBeCloseTo(2, 14);
    });

    it("should clamp at straight when sum exceeds 4", () => {
      const a = chordAngleFromSquaredLength(3);
      const b = chordAngleFromSquaredLength(3);

      const actual = addChordAngle(a, b);

      expect(actual as number).toBe(4);
    });

    it("should return inf when either operand is inf", () => {
      const actual = addChordAngle(infChordAngle(), chordAngleFromSquaredLength(1));

      expect(isInfinityChordAngle(actual)).toBe(true);
    });

    it("should return negative when either operand is negative and none is inf", () => {
      const actual = addChordAngle(negativeChordAngle(), chordAngleFromSquaredLength(1));

      expect(isNegativeChordAngle(actual)).toBe(true);
    });

    it("should return zero when adding two zeros", () => {
      const actual = addChordAngle(zeroChordAngle(), zeroChordAngle());

      expect(actual as number).toBe(0);
    });
  });

  describe("subChordAngle", () => {
    it("should subtract two chord angles", () => {
      const a = chordAngleFromSquaredLength(3);
      const b = chordAngleFromSquaredLength(1);

      const actual = subChordAngle(a, b);

      expect(actual as number).toBeCloseTo(2, 14);
    });

    it("should clamp at zero when result is negative", () => {
      const a = chordAngleFromSquaredLength(1);
      const b = chordAngleFromSquaredLength(3);

      const actual = subChordAngle(a, b);

      expect(actual as number).toBe(0);
    });

    it("should return zero when subtracting equal values", () => {
      const a = chordAngleFromSquaredLength(2);

      const actual = subChordAngle(a, a);

      expect(actual as number).toBe(0);
    });
  });

  describe("trigonometric functions", () => {
    describe("sinChordAngle", () => {
      it("should return 0 for zero chord angle (0 degrees)", () => {
        const actual = sinChordAngle(zeroChordAngle());

        expect(actual).toBeCloseTo(0, 14);
      });

      it("should return 1 for right chord angle (90 degrees)", () => {
        const actual = sinChordAngle(rightChordAngle());

        expect(actual).toBeCloseTo(1, 14);
      });

      it("should return 0 for straight chord angle (180 degrees)", () => {
        const actual = sinChordAngle(straightChordAngle());

        expect(actual).toBeCloseTo(0, 14);
      });
    });

    describe("sin2ChordAngle", () => {
      it("should return 0 for zero chord angle", () => {
        const actual = sin2ChordAngle(zeroChordAngle());

        expect(actual).toBeCloseTo(0, 14);
      });

      it("should return 1 for right chord angle (90 degrees)", () => {
        const actual = sin2ChordAngle(rightChordAngle());

        expect(actual).toBeCloseTo(1, 14);
      });

      it("should return 0 for straight chord angle (180 degrees)", () => {
        const actual = sin2ChordAngle(straightChordAngle());

        expect(actual).toBeCloseTo(0, 14);
      });

      it("should equal sin squared for the chord angle formula: c * (1 - 0.25 * c)", () => {
        const c = chordAngleFromSquaredLength(1.5);

        const actual = sin2ChordAngle(c);

        const expected = 1.5 * (1 - 0.25 * 1.5);
        expect(actual).toBeCloseTo(expected, 14);
      });
    });

    describe("cosChordAngle", () => {
      it("should return 1 for zero chord angle (0 degrees)", () => {
        const actual = cosChordAngle(zeroChordAngle());

        expect(actual).toBeCloseTo(1, 14);
      });

      it("should return 0 for right chord angle (90 degrees)", () => {
        const actual = cosChordAngle(rightChordAngle());

        expect(actual).toBeCloseTo(0, 14);
      });

      it("should return -1 for straight chord angle (180 degrees)", () => {
        const actual = cosChordAngle(straightChordAngle());

        expect(actual).toBeCloseTo(-1, 14);
      });
    });

    describe("tanChordAngle", () => {
      it("should return 0 for zero chord angle (0 degrees)", () => {
        const actual = tanChordAngle(zeroChordAngle());

        expect(actual).toBeCloseTo(0, 14);
      });

      it("should approach infinity for right chord angle (90 degrees)", () => {
        const actual = tanChordAngle(rightChordAngle());

        expect(Math.abs(actual)).toBeGreaterThan(1e10);
      });

      it("should return 0 for straight chord angle (180 degrees)", () => {
        const actual = tanChordAngle(straightChordAngle());

        expect(actual).toBeCloseTo(0, 14);
      });

      it("should equal sin/cos for a general chord angle", () => {
        const c = chordAngleFromSquaredLength(1);

        const actual = tanChordAngle(c);

        const expected = sinChordAngle(c) / cosChordAngle(c);
        expect(actual).toBeCloseTo(expected, 14);
      });
    });
  });
});
