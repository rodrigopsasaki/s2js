import { describe, it, expect } from "vitest";
import { vector, normalize } from "@s2js/r3";
import { loopFromPoints } from "../src/loop.js";
import { polygonFromLoops, polygonFromLoop } from "../src/polygon.js";
import {
  queryLoopContainsPoint,
  queryPolygonContainsPoint,
  findClosestEdgeToPoint,
  findClosestEdgeInPolygon,
  signedDistanceToLoop,
  isDistanceLess,
} from "../src/queries.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** A CCW triangle near the equator tilted slightly above z=0. */
const triA = normalize(vector(1, 0, 0.1));
const triB = normalize(vector(0, 1, 0.1));
const triC = normalize(vector(-1, -1, 0.1));
const testLoop = loopFromPoints([triA, triB, triC]);

/** A point clearly inside the test triangle (centroid direction). */
const insidePoint = normalize(vector(0, 0, 1));

/** A point clearly outside the test triangle (opposite hemisphere). */
const outsidePoint = normalize(vector(0, 0, -1));

/** A small CCW triangle near the north pole. */
function makeNorthTriangle() {
  const a = normalize(vector(0, 0.01, 1));
  const b = normalize(vector(-0.01, -0.005, 1));
  const c = normalize(vector(0.01, -0.005, 1));
  return loopFromPoints([a, b, c]);
}

describe("s2.queries", () => {
  // -------------------------------------------------------------------------
  // ContainsPointQuery
  // -------------------------------------------------------------------------

  describe("queryLoopContainsPoint", () => {
    it("should return true for a point inside the loop", () => {
      const actual = queryLoopContainsPoint(testLoop, insidePoint);

      expect(actual).toBe(true);
    });

    it("should return false for a point outside the loop", () => {
      const actual = queryLoopContainsPoint(testLoop, outsidePoint);

      expect(actual).toBe(false);
    });

    it("should return false for an empty loop", () => {
      const emptyLoop = loopFromPoints([]);

      const actual = queryLoopContainsPoint(emptyLoop, insidePoint);

      expect(actual).toBe(false);
    });
  });

  describe("queryPolygonContainsPoint", () => {
    it("should return true for a point inside the polygon", () => {
      const polygon = polygonFromLoop(testLoop);

      const actual = queryPolygonContainsPoint(polygon, insidePoint);

      expect(actual).toBe(true);
    });

    it("should return false for a point outside the polygon", () => {
      const polygon = polygonFromLoop(testLoop);

      const actual = queryPolygonContainsPoint(polygon, outsidePoint);

      expect(actual).toBe(false);
    });

    it("should return false for a point inside a hole", () => {
      const outerLoop = testLoop;
      const hole = makeNorthTriangle();
      const polygon = polygonFromLoops([outerLoop, hole]);
      const pointInHole = normalize(vector(0, 0.001, 1));

      const actual = queryPolygonContainsPoint(polygon, pointInHole);

      expect(actual).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // ClosestEdgeQuery
  // -------------------------------------------------------------------------

  describe("findClosestEdgeToPoint", () => {
    it("should find the closest edge to a point inside the loop", () => {
      const results = findClosestEdgeToPoint(testLoop, insidePoint);

      expect(results).toHaveLength(1);
      expect(results[0]!.distance).toBeGreaterThan(0);
      expect(results[0]!.loopIndex).toBe(0);
      expect(results[0]!.edgeIndex).toBeGreaterThanOrEqual(0);
      expect(results[0]!.edgeIndex).toBeLessThan(3);
    });

    it("should find the closest edge to a point outside the loop", () => {
      const results = findClosestEdgeToPoint(testLoop, outsidePoint);

      expect(results).toHaveLength(1);
      expect(results[0]!.distance).toBeGreaterThan(0);
    });

    it("should return multiple results when maxResults is greater than 1", () => {
      const results = findClosestEdgeToPoint(testLoop, insidePoint, { maxResults: 3 });

      expect(results).toHaveLength(3);
      expect(results[0]!.distance).toBeLessThanOrEqual(results[1]!.distance);
      expect(results[1]!.distance).toBeLessThanOrEqual(results[2]!.distance);
    });

    it("should respect maxDistance option", () => {
      const verySmallDistance = 0.001;

      const results = findClosestEdgeToPoint(testLoop, outsidePoint, {
        maxDistance: verySmallDistance,
        maxResults: 10,
      });

      expect(results).toHaveLength(0);
    });

    it("should return an empty array for an empty loop", () => {
      const emptyLoop = loopFromPoints([]);

      const results = findClosestEdgeToPoint(emptyLoop, insidePoint);

      expect(results).toHaveLength(0);
    });

    it("should return distance near zero for a point on an edge vertex", () => {
      const results = findClosestEdgeToPoint(testLoop, triA);

      expect(results).toHaveLength(1);
      expect(results[0]!.distance).toBeLessThan(1e-10);
    });
  });

  describe("findClosestEdgeInPolygon", () => {
    it("should find the closest edge across multiple loops", () => {
      const outerLoop = testLoop;
      const hole = makeNorthTriangle();
      const polygon = polygonFromLoops([outerLoop, hole]);
      const pointNearHole = normalize(vector(0, 0.02, 1));

      const results = findClosestEdgeInPolygon(polygon, pointNearHole);

      expect(results).toHaveLength(1);
      expect(results[0]!.distance).toBeGreaterThan(0);
    });

    it("should return the correct loopIndex for edges in different loops", () => {
      const outerLoop = testLoop;
      const hole = makeNorthTriangle();
      const polygon = polygonFromLoops([outerLoop, hole]);
      const pointNearHole = normalize(vector(0, 0.02, 1));

      const results = findClosestEdgeInPolygon(polygon, pointNearHole, { maxResults: 10 });

      const loopIndices = new Set(results.map((r) => r.loopIndex));
      expect(loopIndices.size).toBeGreaterThanOrEqual(1);
    });

    it("should respect maxDistance in polygon queries", () => {
      const polygon = polygonFromLoop(testLoop);

      const results = findClosestEdgeInPolygon(polygon, outsidePoint, {
        maxDistance: 0.001,
        maxResults: 10,
      });

      expect(results).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // signedDistanceToLoop
  // -------------------------------------------------------------------------

  describe("signedDistanceToLoop", () => {
    it("should return a negative value for a point inside the loop", () => {
      const actual = signedDistanceToLoop(testLoop, insidePoint);

      expect(actual).toBeLessThan(0);
    });

    it("should return a positive value for a point outside the loop", () => {
      const actual = signedDistanceToLoop(testLoop, outsidePoint);

      expect(actual).toBeGreaterThan(0);
    });

    it("should return Infinity for an empty loop", () => {
      const emptyLoop = loopFromPoints([]);

      const actual = signedDistanceToLoop(emptyLoop, insidePoint);

      expect(actual).toBe(Infinity);
    });

    it("should return a value near zero for a point on a vertex", () => {
      const actual = signedDistanceToLoop(testLoop, triA);

      expect(Math.abs(actual)).toBeLessThan(1e-10);
    });

    it("should have magnitude equal to the closest edge distance", () => {
      const signed = signedDistanceToLoop(testLoop, insidePoint);
      const closestResults = findClosestEdgeToPoint(testLoop, insidePoint);

      expect(Math.abs(signed)).toBeCloseTo(closestResults[0]!.distance, 10);
    });
  });

  // -------------------------------------------------------------------------
  // isDistanceLess
  // -------------------------------------------------------------------------

  describe("isDistanceLess", () => {
    it("should return true when a nearby edge is within the limit", () => {
      const actual = isDistanceLess(testLoop, triA, 0.1);

      expect(actual).toBe(true);
    });

    it("should return false when no edge is within the limit", () => {
      const actual = isDistanceLess(testLoop, outsidePoint, 0.001);

      expect(actual).toBe(false);
    });

    it("should return false for an empty loop", () => {
      const emptyLoop = loopFromPoints([]);

      const actual = isDistanceLess(emptyLoop, insidePoint, 10);

      expect(actual).toBe(false);
    });

    it("should return true for a large enough limit", () => {
      const actual = isDistanceLess(testLoop, outsidePoint, Math.PI);

      expect(actual).toBe(true);
    });
  });
});
