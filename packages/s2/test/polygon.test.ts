import { describe, it, expect } from "vitest";
import { vector, normalize } from "@s2js/r3";
import { loopFromPoints, loopArea } from "../src/loop.js";
import {
  polygonFromLoops,
  polygonFromLoop,
  polygonFromVertices,
  numLoops,
  numVerticesPolygon,
  polygonArea,
  polygonCentroid,
  polygonContainsPoint,
  polygonIsValid,
} from "../src/polygon.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Creates a CCW triangle near the north pole. */
function makeNorthTriangleVertices() {
  return [normalize(vector(0, 0.01, 1)), normalize(vector(-0.01, -0.005, 1)), normalize(vector(0.01, -0.005, 1))];
}

/** Creates a larger CCW triangle covering much of the northern hemisphere. */
function _makeEquatorialTriangleVertices() {
  return [normalize(vector(1, 0, 0.1)), normalize(vector(-1, -1, 0.1)), normalize(vector(0, 1, 0.1))];
}

/** Creates a very small CCW triangle inside the north triangle (for use as a hole). */
function makeTinyNorthTriangleVertices() {
  return [normalize(vector(0, 0.002, 1)), normalize(vector(-0.002, -0.001, 1)), normalize(vector(0.002, -0.001, 1))];
}

describe("s2.polygon", () => {
  describe("polygonFromLoop", () => {
    it("should create a polygon with a single loop", () => {
      const loop = loopFromPoints(makeNorthTriangleVertices());

      const polygon = polygonFromLoop(loop);

      expect(numLoops(polygon)).toBe(1);
    });
  });

  describe("polygonFromLoops", () => {
    it("should create a polygon with multiple loops", () => {
      const outer = loopFromPoints(makeNorthTriangleVertices());
      const hole = loopFromPoints(makeTinyNorthTriangleVertices());

      const polygon = polygonFromLoops([outer, hole]);

      expect(numLoops(polygon)).toBe(2);
    });
  });

  describe("polygonFromVertices", () => {
    it("should create a single-loop polygon from vertices", () => {
      const polygon = polygonFromVertices(makeNorthTriangleVertices());

      expect(numLoops(polygon)).toBe(1);
      expect(numVerticesPolygon(polygon)).toBe(3);
    });
  });

  describe("numLoops", () => {
    it("should return the number of loops", () => {
      const outer = loopFromPoints(makeNorthTriangleVertices());
      const hole = loopFromPoints(makeTinyNorthTriangleVertices());

      expect(numLoops(polygonFromLoops([outer, hole]))).toBe(2);
      expect(numLoops(polygonFromLoops([]))).toBe(0);
    });
  });

  describe("numVerticesPolygon", () => {
    it("should return total vertices across all loops", () => {
      const outer = loopFromPoints(makeNorthTriangleVertices());
      const hole = loopFromPoints(makeTinyNorthTriangleVertices());
      const polygon = polygonFromLoops([outer, hole]);

      expect(numVerticesPolygon(polygon)).toBe(6);
    });

    it("should return 0 for an empty polygon", () => {
      expect(numVerticesPolygon(polygonFromLoops([]))).toBe(0);
    });
  });

  describe("polygonArea", () => {
    it("should return 0 for an empty polygon", () => {
      expect(polygonArea(polygonFromLoops([]))).toBe(0);
    });

    it("should return a positive area for a single-loop polygon", () => {
      const polygon = polygonFromVertices(makeNorthTriangleVertices());

      const area = polygonArea(polygon);

      expect(area).toBeGreaterThan(0);
    });

    it("should have area equal to the loop area for a single-loop polygon", () => {
      const vertices = makeNorthTriangleVertices();
      const polygon = polygonFromVertices(vertices);
      const loop = loopFromPoints(vertices);

      expect(polygonArea(polygon)).toBeCloseTo(loopArea(loop), 10);
    });

    it("should subtract hole area from the total", () => {
      const outerVertices = makeNorthTriangleVertices();
      const holeVertices = makeTinyNorthTriangleVertices();
      const outer = loopFromPoints(outerVertices);
      const hole = loopFromPoints(holeVertices);
      const polygon = polygonFromLoops([outer, hole]);

      const outerArea = loopArea(outer);
      const holeArea = loopArea(hole);
      const polyArea = polygonArea(polygon);

      expect(polyArea).toBeCloseTo(outerArea - holeArea, 10);
      expect(polyArea).toBeLessThan(outerArea);
      expect(polyArea).toBeGreaterThan(0);
    });
  });

  describe("polygonCentroid", () => {
    it("should return zero vector for an empty polygon", () => {
      const c = polygonCentroid(polygonFromLoops([]));

      expect(c.x).toBe(0);
      expect(c.y).toBe(0);
      expect(c.z).toBe(0);
    });

    it("should return a centroid near the north pole for the north triangle polygon", () => {
      const polygon = polygonFromVertices(makeNorthTriangleVertices());
      const c = polygonCentroid(polygon);
      const cn = normalize(c);

      expect(cn.z).toBeGreaterThan(0);
    });
  });

  describe("polygonContainsPoint", () => {
    it("should return false for an empty polygon", () => {
      expect(polygonContainsPoint(polygonFromLoops([]), vector(0, 0, 1))).toBe(false);
    });

    it("should return true for a point inside the polygon", () => {
      const polygon = polygonFromVertices(makeNorthTriangleVertices());
      const northPole = vector(0, 0, 1);

      expect(polygonContainsPoint(polygon, northPole)).toBe(true);
    });

    it("should return false for a point outside the polygon", () => {
      const polygon = polygonFromVertices(makeNorthTriangleVertices());
      const southPole = vector(0, 0, -1);

      expect(polygonContainsPoint(polygon, southPole)).toBe(false);
    });

    it("should return false for a point inside a hole", () => {
      const outer = loopFromPoints(makeNorthTriangleVertices());
      const hole = loopFromPoints(makeTinyNorthTriangleVertices());
      const polygon = polygonFromLoops([outer, hole]);
      const northPole = vector(0, 0, 1);

      // The north pole is inside the outer loop but also inside the hole
      expect(polygonContainsPoint(polygon, northPole)).toBe(false);
    });

    it("should return true for a point between the outer loop and hole", () => {
      const outer = loopFromPoints(makeNorthTriangleVertices());
      const hole = loopFromPoints(makeTinyNorthTriangleVertices());
      const polygon = polygonFromLoops([outer, hole]);

      // A point close to the edge of the outer triangle but outside the tiny hole
      const edgePoint = normalize(vector(0.007, -0.003, 1));

      // This point should be inside the outer loop but outside the hole
      expect(polygonContainsPoint(polygon, edgePoint)).toBe(true);
    });
  });

  describe("polygonIsValid", () => {
    it("should return true for an empty polygon", () => {
      expect(polygonIsValid(polygonFromLoops([]))).toBe(true);
    });

    it("should return true for a valid single-loop polygon", () => {
      expect(polygonIsValid(polygonFromVertices(makeNorthTriangleVertices()))).toBe(true);
    });

    it("should return true for a valid polygon with a hole", () => {
      const outer = loopFromPoints(makeNorthTriangleVertices());
      const hole = loopFromPoints(makeTinyNorthTriangleVertices());

      expect(polygonIsValid(polygonFromLoops([outer, hole]))).toBe(true);
    });

    it("should return false for a polygon with an invalid loop", () => {
      const invalid = loopFromPoints([vector(1, 0, 0), vector(1, 0, 0), vector(0, 0, 1)]);

      expect(polygonIsValid(polygonFromLoop(invalid))).toBe(false);
    });
  });
});
