import { describe, it, expect } from "vitest";
import { vector } from "@s2js/r3";
import { angleFromRadians, chordAngleFromAngle } from "@s2js/s1";
import {
  capAddCap,
  capAddPoint,
  capArea,
  capComplement,
  capContainsCap,
  capContainsPoint,
  capExpanded,
  capFromCenterAngle,
  capFromCenterArea,
  capFromCenterChordAngle,
  capFromCenterHeight,
  capIntersectsCap,
  emptyCap,
  fullCap,
  isEmptyCap,
  isFullCap,
} from "../src/index.js";

describe("s2.Cap", () => {
  describe("emptyCap", () => {
    it("should be empty", () => {
      expect(isEmptyCap(emptyCap())).toBe(true);
    });

    it("should not be full", () => {
      expect(isFullCap(emptyCap())).toBe(false);
    });

    it("should not contain any point", () => {
      expect(capContainsPoint(emptyCap(), vector(1, 0, 0))).toBe(false);
    });

    it("should have zero area", () => {
      expect(capArea(emptyCap())).toBe(0);
    });
  });

  describe("fullCap", () => {
    it("should be full", () => {
      expect(isFullCap(fullCap())).toBe(true);
    });

    it("should not be empty", () => {
      expect(isEmptyCap(fullCap())).toBe(false);
    });

    it("should contain any point", () => {
      expect(capContainsPoint(fullCap(), vector(1, 0, 0))).toBe(true);
      expect(capContainsPoint(fullCap(), vector(-1, 0, 0))).toBe(true);
      expect(capContainsPoint(fullCap(), vector(0, 1, 0))).toBe(true);
    });

    it("should have area equal to 4*PI", () => {
      expect(capArea(fullCap())).toBeCloseTo(4 * Math.PI, 10);
    });
  });

  describe("capFromCenterAngle", () => {
    it("should create a point cap for zero angle", () => {
      const cap = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(0));

      expect(isEmptyCap(cap)).toBe(false);
      expect(capContainsPoint(cap, vector(1, 0, 0))).toBe(true);
    });

    it("should create a hemisphere for PI/2 angle", () => {
      // Use slightly more than PI/2 to account for floating-point imprecision at boundary
      const cap = capFromCenterAngle(vector(0, 0, 1), angleFromRadians(Math.PI / 2 + 1e-14));

      expect(capContainsPoint(cap, vector(0, 0, 1))).toBe(true);
      expect(capContainsPoint(cap, vector(1, 0, 0))).toBe(true);
      expect(capContainsPoint(cap, vector(0, 0, -1))).toBe(false);
    });

    it("should create a full cap for PI angle", () => {
      const cap = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(Math.PI));

      expect(isFullCap(cap)).toBe(true);
    });
  });

  describe("capFromCenterChordAngle", () => {
    it("should create a cap with the given chord angle", () => {
      const ca = chordAngleFromAngle(angleFromRadians(Math.PI / 4));
      const cap = capFromCenterChordAngle(vector(1, 0, 0), ca);

      expect(isEmptyCap(cap)).toBe(false);
      expect(capContainsPoint(cap, vector(1, 0, 0))).toBe(true);
    });
  });

  describe("capFromCenterHeight", () => {
    it("should create a point cap for height 0", () => {
      const cap = capFromCenterHeight(vector(1, 0, 0), 0);

      expect(capContainsPoint(cap, vector(1, 0, 0))).toBe(true);
    });

    it("should create a full cap for height 2", () => {
      const cap = capFromCenterHeight(vector(1, 0, 0), 2);

      expect(isFullCap(cap)).toBe(true);
    });

    it("should create a hemisphere for height 1", () => {
      const cap = capFromCenterHeight(vector(0, 0, 1), 1);

      expect(capContainsPoint(cap, vector(0, 0, 1))).toBe(true);
      expect(capContainsPoint(cap, vector(1, 0, 0))).toBe(true);
    });
  });

  describe("capFromCenterArea", () => {
    it("should create a full cap for area 4*PI", () => {
      const cap = capFromCenterArea(vector(1, 0, 0), 4 * Math.PI);

      expect(isFullCap(cap)).toBe(true);
    });

    it("should create a hemisphere for area 2*PI", () => {
      const cap = capFromCenterArea(vector(0, 0, 1), 2 * Math.PI);

      expect(capArea(cap)).toBeCloseTo(2 * Math.PI, 10);
    });
  });

  describe("capContainsPoint", () => {
    it("should contain the center", () => {
      const cap = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(0.1));

      expect(capContainsPoint(cap, vector(1, 0, 0))).toBe(true);
    });

    it("should not contain the antipodal point for small caps", () => {
      const cap = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(0.1));

      expect(capContainsPoint(cap, vector(-1, 0, 0))).toBe(false);
    });
  });

  describe("capContainsCap", () => {
    it("full cap should contain any cap", () => {
      const cap = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(1));

      expect(capContainsCap(fullCap(), cap)).toBe(true);
    });

    it("should contain an empty cap", () => {
      const cap = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(0.1));

      expect(capContainsCap(cap, emptyCap())).toBe(true);
    });

    it("empty cap should not contain a non-empty cap", () => {
      const cap = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(0.1));

      expect(capContainsCap(emptyCap(), cap)).toBe(false);
    });

    it("should contain a smaller concentric cap", () => {
      const large = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(1));
      const small = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(0.5));

      expect(capContainsCap(large, small)).toBe(true);
    });

    it("should not contain a larger cap", () => {
      const large = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(1));
      const small = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(0.5));

      expect(capContainsCap(small, large)).toBe(false);
    });
  });

  describe("capIntersectsCap", () => {
    it("should intersect overlapping caps", () => {
      const a = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(1));
      const b = capFromCenterAngle(vector(0, 1, 0), angleFromRadians(1));

      expect(capIntersectsCap(a, b)).toBe(true);
    });

    it("should not intersect distant caps", () => {
      const a = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(0.1));
      const b = capFromCenterAngle(vector(-1, 0, 0), angleFromRadians(0.1));

      expect(capIntersectsCap(a, b)).toBe(false);
    });

    it("should not intersect with empty cap", () => {
      const cap = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(1));

      expect(capIntersectsCap(cap, emptyCap())).toBe(false);
    });

    it("full cap should intersect any non-empty cap", () => {
      const cap = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(0.1));

      expect(capIntersectsCap(fullCap(), cap)).toBe(true);
    });
  });

  describe("capComplement", () => {
    it("complement of full should be empty", () => {
      expect(isEmptyCap(capComplement(fullCap()))).toBe(true);
    });

    it("complement of empty should be full", () => {
      expect(isFullCap(capComplement(emptyCap()))).toBe(true);
    });

    it("complement should have the antipodal center", () => {
      const cap = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(1));
      const comp = capComplement(cap);

      expect(comp.center.x).toBeCloseTo(-1, 10);
      expect(comp.center.y).toBeCloseTo(0, 10);
      expect(comp.center.z).toBeCloseTo(0, 10);
    });
  });

  describe("capAddPoint", () => {
    it("should create a point cap from empty", () => {
      const cap = capAddPoint(emptyCap(), vector(1, 0, 0));

      expect(isEmptyCap(cap)).toBe(false);
      expect(capContainsPoint(cap, vector(1, 0, 0))).toBe(true);
    });

    it("should not change if point is already contained", () => {
      const cap = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(1));
      const expanded = capAddPoint(cap, vector(1, 0, 0));

      expect(expanded.radius).toBe(cap.radius);
    });

    it("should expand to include a new point", () => {
      const cap = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(0.1));
      const expanded = capAddPoint(cap, vector(0, 1, 0));

      expect(capContainsPoint(expanded, vector(0, 1, 0))).toBe(true);
      expect((expanded.radius as number) > (cap.radius as number)).toBe(true);
    });
  });

  describe("capAddCap", () => {
    it("should return other when first is empty", () => {
      const cap = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(0.5));
      const result = capAddCap(emptyCap(), cap);

      expect(result.center).toEqual(cap.center);
      expect(result.radius).toBe(cap.radius);
    });

    it("should return first when other is empty", () => {
      const cap = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(0.5));
      const result = capAddCap(cap, emptyCap());

      expect(result.center).toEqual(cap.center);
      expect(result.radius).toBe(cap.radius);
    });

    it("should return containter when one contains the other", () => {
      const large = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(1));
      const small = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(0.5));

      expect(capAddCap(large, small)).toBe(large);
    });
  });

  describe("capArea", () => {
    it("should return approximately PI * radius for small caps", () => {
      const angle = 0.5;
      const cap = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(angle));
      const expected = 2 * Math.PI * (1 - Math.cos(angle));
      const actual = capArea(cap);

      expect(actual).toBeCloseTo(expected, 10);
    });
  });

  describe("capExpanded", () => {
    it("should expand the cap", () => {
      const cap = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(0.5));
      const expanded = capExpanded(cap, angleFromRadians(0.5));

      expect((expanded.radius as number) > (cap.radius as number)).toBe(true);
    });

    it("should return empty when expanding empty cap", () => {
      expect(isEmptyCap(capExpanded(emptyCap(), angleFromRadians(1)))).toBe(true);
    });

    it("should return full when expanded past PI", () => {
      const cap = capFromCenterAngle(vector(1, 0, 0), angleFromRadians(2));
      const expanded = capExpanded(cap, angleFromRadians(2));

      expect(isFullCap(expanded)).toBe(true);
    });
  });
});
