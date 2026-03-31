import { describe, it, expect } from "vitest";
import { angleFromRadians } from "@s2js/s1";
import {
  EARTH_RADIUS_KM,
  EARTH_RADIUS_M,
  angleToKm,
  angleToM,
  kmToAngle,
  mToAngle,
  squaredKmToSteradians,
  steradiansToSquaredKm,
} from "../src/index.js";

describe("earth", () => {
  describe("constants", () => {
    it("should have correct Earth radius in km", () => {
      expect(EARTH_RADIUS_KM).toBe(6371.01);
    });

    it("should have correct Earth radius in meters", () => {
      expect(EARTH_RADIUS_M).toBe(6_371_010);
    });
  });

  describe("distance conversions", () => {
    it("kmToAngle and angleToKm should roundtrip", () => {
      const km = 100;
      const angle = kmToAngle(km);
      const actual = angleToKm(angle);

      expect(actual).toBeCloseTo(km, 10);
    });

    it("mToAngle and angleToM should roundtrip", () => {
      const m = 50_000;
      const angle = mToAngle(m);
      const actual = angleToM(angle);

      expect(actual).toBeCloseTo(m, 6);
    });

    it("should convert 0 km to 0 angle", () => {
      const angle = kmToAngle(0);

      expect(angle).toBe(0);
    });

    it("should convert Earth circumference to 2π", () => {
      const circumference = 2 * Math.PI * EARTH_RADIUS_KM;
      const angle = kmToAngle(circumference);

      expect(angle).toBeCloseTo(2 * Math.PI, 10);
    });

    it("should convert 1 radian to EARTH_RADIUS_KM km", () => {
      const angle = angleFromRadians(1);
      const km = angleToKm(angle);

      expect(km).toBe(EARTH_RADIUS_KM);
    });

    it("should convert 1 radian to EARTH_RADIUS_M meters", () => {
      const angle = angleFromRadians(1);
      const m = angleToM(angle);

      expect(m).toBe(EARTH_RADIUS_M);
    });
  });

  describe("area conversions", () => {
    it("squaredKmToSteradians and steradiansToSquaredKm should roundtrip", () => {
      const km2 = 1_000_000;
      const sr = squaredKmToSteradians(km2);
      const actual = steradiansToSquaredKm(sr);

      expect(actual).toBeCloseTo(km2, 6);
    });

    it("should convert 0 area correctly", () => {
      expect(squaredKmToSteradians(0)).toBe(0);
      expect(steradiansToSquaredKm(0)).toBe(0);
    });

    it("should convert full sphere area (4π steradians) to correct km²", () => {
      const fullSphereKm2 = steradiansToSquaredKm(4 * Math.PI);
      const expectedKm2 = 4 * Math.PI * EARTH_RADIUS_KM * EARTH_RADIUS_KM;

      expect(fullSphereKm2).toBeCloseTo(expectedKm2, 6);
    });
  });
});
