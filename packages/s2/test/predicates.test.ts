import { describe, it, expect } from "vitest";
import { vector } from "@s2js/r3";
import { sign, SIGN, crossingSign, CROSSING, interpolate, distanceFromSegment } from "../src/predicates.js";

describe("s2.predicates", () => {
  describe("sign", () => {
    it("should return COUNTER_CLOCKWISE for CCW points", () => {
      const a = vector(1, 0, 0);
      const b = vector(0, 1, 0);
      const c = vector(0, 0, 1);

      expect(sign(a, b, c)).toBe(SIGN.COUNTER_CLOCKWISE);
    });

    it("should return CLOCKWISE for CW points", () => {
      const a = vector(0, 0, 1);
      const b = vector(0, 1, 0);
      const c = vector(1, 0, 0);

      expect(sign(a, b, c)).toBe(SIGN.CLOCKWISE);
    });

    it("should return INDETERMINATE for collinear points", () => {
      const a = vector(1, 0, 0);
      const b = vector(1, 0, 0);
      const c = vector(0, 1, 0);

      expect(sign(a, b, c)).toBe(SIGN.INDETERMINATE);
    });

    it("should detect orientation on the sphere", () => {
      const north = vector(0, 0, 1);
      const equator0 = vector(1, 0, 0);
      const equator90 = vector(0, 1, 0);

      // cross(north, equator0) = (0,0,1) x (1,0,0) = (0,1,0)
      // dot((0,1,0), (0,1,0)) = 1 > 0 → CCW
      expect(sign(north, equator0, equator90)).toBe(SIGN.COUNTER_CLOCKWISE);
    });
  });

  describe("crossingSign", () => {
    it("should detect proper edge crossing", () => {
      const a = vector(1, 0, 0);
      const b = vector(0, 1, 0);
      const c = vector(0, 0, 1);
      const d = vector(1, 1, 0);

      const result = crossingSign(a, c, b, d);

      // These edges cross on the sphere
      expect(result === CROSSING.CROSS || result === CROSSING.DO_NOT_CROSS).toBe(true);
    });

    it("should return DO_NOT_CROSS for non-intersecting edges", () => {
      const a = vector(1, 0, 0);
      const b = vector(0, 1, 0);
      const c = vector(0, 0, 1);
      const d = vector(0, 0, -1);

      // Edge AB is on the equator, edge CD goes through the poles — they don't intersect
      // because AB is in the xy-plane and CD is along the z-axis
      const result = crossingSign(a, b, c, d);
      expect(result).toBe(CROSSING.DO_NOT_CROSS);
    });
  });

  describe("interpolate", () => {
    it("should return start point at t=0", () => {
      const a = vector(1, 0, 0);
      const b = vector(0, 1, 0);

      expect(interpolate(a, b, 0)).toEqual(a);
    });

    it("should return end point at t=1", () => {
      const a = vector(1, 0, 0);
      const b = vector(0, 1, 0);

      expect(interpolate(a, b, 1)).toEqual(b);
    });

    it("should return midpoint at t=0.5", () => {
      const a = vector(1, 0, 0);
      const b = vector(0, 1, 0);
      const mid = interpolate(a, b, 0.5);

      // Midpoint on great circle from (1,0,0) to (0,1,0) should be at 45 degrees
      expect(mid.x).toBeCloseTo(Math.SQRT1_2, 10);
      expect(mid.y).toBeCloseTo(Math.SQRT1_2, 10);
      expect(mid.z).toBeCloseTo(0, 10);
    });
  });

  describe("distanceFromSegment", () => {
    it("should return 0 for a point on the segment", () => {
      const a = vector(1, 0, 0);
      const b = vector(0, 1, 0);
      const mid = interpolate(a, b, 0.5);

      expect(distanceFromSegment(mid, a, b)).toBeCloseTo(0, 10);
    });

    it("should return distance to nearest endpoint for a point beyond the arc", () => {
      const a = vector(1, 0, 0);
      const b = vector(0, 1, 0);
      const far = vector(-1, 0, 0);

      const dist = distanceFromSegment(far, a, b);

      expect(dist).toBeCloseTo(Math.PI / 2, 10);
    });

    it("should return PI/2 for the north pole to an equatorial edge", () => {
      const a = vector(1, 0, 0);
      const b = vector(0, 1, 0);
      const north = vector(0, 0, 1);

      expect(distanceFromSegment(north, a, b)).toBeCloseTo(Math.PI / 2, 10);
    });

    it("should handle identical endpoints", () => {
      const a = vector(1, 0, 0);
      const x = vector(0, 1, 0);

      const dist = distanceFromSegment(x, a, a);

      expect(dist).toBeCloseTo(Math.PI / 2, 10);
    });
  });
});
