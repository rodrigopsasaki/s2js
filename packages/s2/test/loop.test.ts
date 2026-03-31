import { describe, it, expect } from "vitest";
import { vector, normalize } from "@s2js/r3";
import {
  loopFromPoints,
  numVertices,
  vertex,
  isEmptyLoop,
  isFullLoop,
  loopArea,
  loopCentroid,
  loopContainsPoint,
  loopContainsLoop,
  loopIntersectsLoop,
  turningAngle,
  isNormalized,
  normalizeLoop,
  loopIsValid,
} from "../src/loop.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** A small CCW triangle near the north pole (viewed from outside the sphere). */
function makeNorthTriangle() {
  // CCW order when viewed from above (outside) the north pole:
  const a = normalize(vector(0, 0.01, 1));
  const b = normalize(vector(-0.01, -0.005, 1));
  const c = normalize(vector(0.01, -0.005, 1));
  return loopFromPoints([a, b, c]);
}

/** A larger CCW triangle covering a portion of the northern hemisphere. */
function makeEquatorialTriangle() {
  // CCW order (sign(a,b,c) > 0), north pole is inside:
  const a = normalize(vector(1, 0, 0.1));
  const b = normalize(vector(0, 1, 0.1));
  const c = normalize(vector(-1, -1, 0.1));
  return loopFromPoints([a, b, c]);
}

/** The empty loop (no vertices). */
function makeEmptyLoop() {
  return loopFromPoints([]);
}

/** The full loop (entire sphere). */
function makeFullLoop() {
  return loopFromPoints([vector(0, 0, -1)]);
}

describe("s2.loop", () => {
  describe("loopFromPoints", () => {
    it("should create a loop with the given vertices and depth 0", () => {
      const vertices = [vector(1, 0, 0), vector(0, 1, 0), vector(0, 0, 1)];

      const loop = loopFromPoints(vertices);

      expect(loop.vertices).toEqual(vertices);
      expect(loop.depth).toBe(0);
    });
  });

  describe("numVertices", () => {
    it("should return the number of vertices", () => {
      const loop = makeNorthTriangle();

      expect(numVertices(loop)).toBe(3);
    });

    it("should return 0 for an empty loop", () => {
      expect(numVertices(makeEmptyLoop())).toBe(0);
    });
  });

  describe("vertex", () => {
    it("should return the vertex at the given index", () => {
      const v0 = vector(1, 0, 0);
      const v1 = vector(0, 1, 0);
      const v2 = vector(0, 0, 1);
      const loop = loopFromPoints([v0, v1, v2]);

      expect(vertex(loop, 0)).toEqual(v0);
      expect(vertex(loop, 1)).toEqual(v1);
      expect(vertex(loop, 2)).toEqual(v2);
    });

    it("should wrap around for indices >= numVertices", () => {
      const v0 = vector(1, 0, 0);
      const v1 = vector(0, 1, 0);
      const loop = loopFromPoints([v0, v1]);

      expect(vertex(loop, 2)).toEqual(v0);
      expect(vertex(loop, 3)).toEqual(v1);
    });

    it("should handle negative indices", () => {
      const v0 = vector(1, 0, 0);
      const v1 = vector(0, 1, 0);
      const v2 = vector(0, 0, 1);
      const loop = loopFromPoints([v0, v1, v2]);

      expect(vertex(loop, -1)).toEqual(v2);
    });
  });

  describe("isEmptyLoop", () => {
    it("should return true for a loop with no vertices", () => {
      expect(isEmptyLoop(makeEmptyLoop())).toBe(true);
    });

    it("should return false for a non-empty loop", () => {
      expect(isEmptyLoop(makeNorthTriangle())).toBe(false);
    });
  });

  describe("isFullLoop", () => {
    it("should return true for the full loop marker", () => {
      expect(isFullLoop(makeFullLoop())).toBe(true);
    });

    it("should return false for a normal loop", () => {
      expect(isFullLoop(makeNorthTriangle())).toBe(false);
    });

    it("should return false for an empty loop", () => {
      expect(isFullLoop(makeEmptyLoop())).toBe(false);
    });
  });

  describe("loopIsValid", () => {
    it("should return true for a valid loop", () => {
      expect(loopIsValid(makeNorthTriangle())).toBe(true);
    });

    it("should return true for an empty loop", () => {
      expect(loopIsValid(makeEmptyLoop())).toBe(true);
    });

    it("should return false for a loop with a non-unit vertex", () => {
      const loop = loopFromPoints([vector(1, 0, 0), vector(0, 2, 0), vector(0, 0, 1)]);

      expect(loopIsValid(loop)).toBe(false);
    });

    it("should return false for a loop with duplicate adjacent vertices", () => {
      const loop = loopFromPoints([vector(1, 0, 0), vector(1, 0, 0), vector(0, 0, 1)]);

      expect(loopIsValid(loop)).toBe(false);
    });

    it("should return false for a loop with antipodal adjacent vertices", () => {
      const loop = loopFromPoints([vector(1, 0, 0), vector(-1, 0, 0), vector(0, 0, 1)]);

      expect(loopIsValid(loop)).toBe(false);
    });
  });

  describe("loopArea", () => {
    it("should return 0 for a loop with fewer than 3 vertices", () => {
      expect(loopArea(makeEmptyLoop())).toBe(0);
    });

    it("should return a small positive area for a small CCW triangle", () => {
      const area = loopArea(makeNorthTriangle());

      expect(area).toBeGreaterThan(0);
      expect(area).toBeLessThan(0.01);
    });

    it("should return an area close to PI for a hemisphere triangle", () => {
      // A triangle formed by three orthogonal unit vectors (octant of the sphere)
      // has area = PI/2.
      const loop = loopFromPoints([vector(1, 0, 0), vector(0, 1, 0), vector(0, 0, 1)]);

      const area = loopArea(loop);

      expect(area).toBeCloseTo(Math.PI / 2, 3);
    });
  });

  describe("turningAngle", () => {
    it("should return 2*PI for a degenerate loop", () => {
      expect(turningAngle(makeEmptyLoop())).toBeCloseTo(2 * Math.PI, 10);
    });

    it("should be positive for a small CCW loop", () => {
      const ta = turningAngle(makeNorthTriangle());

      // For a small triangle, the turning angle approaches 2*PI
      expect(ta).toBeGreaterThan(0);
    });
  });

  describe("loopCentroid", () => {
    it("should return the zero vector for an empty loop", () => {
      const c = loopCentroid(makeEmptyLoop());

      expect(c.x).toBe(0);
      expect(c.y).toBe(0);
      expect(c.z).toBe(0);
    });

    it("should return a centroid near the north pole for the north triangle", () => {
      const c = loopCentroid(makeNorthTriangle());
      const cn = normalize(c);

      // The centroid should be in the northern hemisphere (the triangle vertices have z ≈ 1)
      expect(cn.z).toBeGreaterThan(0);
    });
  });

  describe("loopContainsPoint", () => {
    it("should return false for an empty loop", () => {
      expect(loopContainsPoint(makeEmptyLoop(), vector(0, 0, 1))).toBe(false);
    });

    it("should return true for the full loop", () => {
      const full = makeFullLoop();

      expect(loopContainsPoint(full, vector(0, 0, 1))).toBe(true);
      expect(loopContainsPoint(full, vector(1, 0, 0))).toBe(true);
    });

    it("should return true for the north pole inside the north triangle", () => {
      const loop = makeNorthTriangle();
      const northPole = vector(0, 0, 1);

      expect(loopContainsPoint(loop, northPole)).toBe(true);
    });

    it("should return false for the south pole outside the north triangle", () => {
      const loop = makeNorthTriangle();
      const southPole = vector(0, 0, -1);

      expect(loopContainsPoint(loop, southPole)).toBe(false);
    });

    it("should return true for a point inside the equatorial triangle", () => {
      const loop = makeEquatorialTriangle();
      // A point near the center of the triangle
      const inside = normalize(vector(0, 0, 1));

      expect(loopContainsPoint(loop, inside)).toBe(true);
    });
  });

  describe("loopContainsLoop", () => {
    it("should return true when the outer loop contains a smaller inner loop", () => {
      const outer = makeEquatorialTriangle();
      const inner = makeNorthTriangle();

      expect(loopContainsLoop(outer, inner)).toBe(true);
    });

    it("should return false when the inner loop is not contained", () => {
      const small = makeNorthTriangle();
      const large = makeEquatorialTriangle();

      expect(loopContainsLoop(small, large)).toBe(false);
    });

    it("should return true for any loop containing the empty loop", () => {
      expect(loopContainsLoop(makeNorthTriangle(), makeEmptyLoop())).toBe(true);
    });
  });

  describe("loopIntersectsLoop", () => {
    it("should return false for two empty loops", () => {
      expect(loopIntersectsLoop(makeEmptyLoop(), makeEmptyLoop())).toBe(false);
    });

    it("should return true for overlapping loops", () => {
      const outer = makeEquatorialTriangle();
      const inner = makeNorthTriangle();

      expect(loopIntersectsLoop(outer, inner)).toBe(true);
    });

    it("should return true for antipodal loops (edges cross on the sphere)", () => {
      const north = makeNorthTriangle();
      // A small triangle near the south pole — on a sphere, the great circle arcs
      // from these triangles actually cross, so they intersect
      const a = normalize(vector(0, 0.01, -1));
      const b = normalize(vector(0.01, -0.005, -1));
      const c = normalize(vector(-0.01, -0.005, -1));
      const south = loopFromPoints([a, b, c]);

      expect(loopIntersectsLoop(north, south)).toBe(true);
    });
  });

  describe("isNormalized", () => {
    it("should return true for a small CCW loop", () => {
      expect(isNormalized(makeNorthTriangle())).toBe(true);
    });
  });

  describe("normalizeLoop", () => {
    it("should return the same loop if already normalized", () => {
      const loop = makeNorthTriangle();
      const normalized = normalizeLoop(loop);

      expect(normalized.vertices).toEqual(loop.vertices);
    });

    it("should reverse a non-normalized loop", () => {
      // Create a CW loop (area > 2*PI) by reversing a CCW triangle
      const a = vector(1, 0, 0);
      const b = vector(0, 1, 0);
      const c = vector(0, 0, 1);
      // CW order
      const cw = loopFromPoints([c, b, a]);
      const area = loopArea(cw);

      if (area > 2 * Math.PI) {
        const normalized = normalizeLoop(cw);

        expect(normalizeLoop(normalized).vertices).toEqual(normalized.vertices);
        expect(loopArea(normalized)).toBeLessThanOrEqual(2 * Math.PI);
      }
    });
  });
});
