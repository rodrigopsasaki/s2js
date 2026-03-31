import { describe, it, expect } from "vitest";
import {
  cellIDFromFace,
  cellIDFromFacePosLevel,
  cellIDFromLatLng,
  cellIDFromPoint,
  cellIDFromToken,
  children,
  contains,
  edgeNeighbors,
  face,
  intersects,
  isFace,
  isLeaf,
  isValid,
  level,
  lsbForLevel,
  MAX_LEVEL,
  next,
  NONE,
  NUM_FACES,
  parent,
  parentAtLevel,
  prev,
  rangeMax,
  rangeMin,
  stToUV,
  toLatLng,
  toPoint,
  toToken,
  uvToST,
} from "../src/index.js";

describe("s2.CellID", () => {
  describe("constants", () => {
    it("should have correct max level", () => {
      expect(MAX_LEVEL).toBe(30);
    });

    it("should have correct number of faces", () => {
      expect(NUM_FACES).toBe(6);
    });

    it("NONE should not be valid", () => {
      expect(isValid(NONE)).toBe(false);
    });
  });

  describe("face cells", () => {
    it.each([0, 1, 2, 3, 4, 5])("cellIDFromFace(%i) should create level-0 cell", (f) => {
      const id = cellIDFromFace(f);

      expect(isValid(id)).toBe(true);
      expect(face(id)).toBe(f);
      expect(level(id)).toBe(0);
      expect(isFace(id)).toBe(true);
      expect(isLeaf(id)).toBe(false);
    });
  });

  describe("level", () => {
    it("face cells should be level 0", () => {
      for (let f = 0; f < 6; f++) {
        expect(level(cellIDFromFace(f))).toBe(0);
      }
    });

    it("should detect all levels from lsbForLevel", () => {
      for (let l = 0; l <= MAX_LEVEL; l++) {
        const id = cellIDFromFacePosLevel(0, 0n, l);

        expect(level(id)).toBe(l);
      }
    });

    it("leaf cells should be level 30", () => {
      const id = cellIDFromFacePosLevel(0, 0n, MAX_LEVEL);

      expect(level(id)).toBe(MAX_LEVEL);
      expect(isLeaf(id)).toBe(true);
    });
  });

  describe("hierarchy", () => {
    it("parent should go up one level", () => {
      const leaf = cellIDFromFacePosLevel(0, 0n, MAX_LEVEL);
      const p = parent(leaf);

      expect(level(p)).toBe(MAX_LEVEL - 1);
      expect(contains(p, leaf)).toBe(true);
    });

    it("parentAtLevel should go to specific level", () => {
      const leaf = cellIDFromFacePosLevel(3, 0n, MAX_LEVEL);
      const p = parentAtLevel(leaf, 5);

      expect(level(p)).toBe(5);
      expect(face(p)).toBe(3);
      expect(contains(p, leaf)).toBe(true);
    });

    it("children should produce 4 valid cells at next level", () => {
      const p = cellIDFromFace(0);
      const ch = children(p);

      expect(ch).toHaveLength(4);
      for (const c of ch) {
        expect(isValid(c)).toBe(true);
        expect(level(c)).toBe(1);
        expect(face(c)).toBe(0);
        expect(contains(p, c)).toBe(true);
      }
    });

    it("children should cover the parent completely", () => {
      const p = cellIDFromFacePosLevel(2, 0n, 10);
      const ch = children(p);

      expect(rangeMin(ch[0]!)).toBe(rangeMin(p));
      expect(rangeMax(ch[3]!)).toBe(rangeMax(p));
    });

    it("parent(child) should return original", () => {
      const p = cellIDFromFacePosLevel(1, 0n, 5);
      const ch = children(p);

      for (const c of ch) {
        expect(parent(c)).toBe(p);
      }
    });
  });

  describe("contains and intersects", () => {
    it("a cell should contain itself", () => {
      const id = cellIDFromFace(0);

      expect(contains(id, id)).toBe(true);
    });

    it("a face cell should contain all its descendants", () => {
      const faceCell = cellIDFromFace(0);
      let id = cellIDFromFacePosLevel(0, 0n, MAX_LEVEL);

      for (let l = MAX_LEVEL; l >= 0; l--) {
        expect(contains(faceCell, id)).toBe(true);
        id = parentAtLevel(id, l > 0 ? l - 1 : 0);
      }
    });

    it("a child should not contain its parent", () => {
      const p = cellIDFromFacePosLevel(0, 0n, 10);
      const ch = children(p);

      expect(contains(ch[0]!, p)).toBe(false);
    });

    it("siblings should not contain each other", () => {
      const p = cellIDFromFace(0);
      const ch = children(p);

      expect(contains(ch[0]!, ch[1]!)).toBe(false);
      expect(contains(ch[1]!, ch[0]!)).toBe(false);
    });

    it("intersects should be true for overlapping cells", () => {
      const p = cellIDFromFace(0);
      const ch = children(p);

      expect(intersects(p, ch[0]!)).toBe(true);
      expect(intersects(ch[0]!, p)).toBe(true);
    });

    it("intersects should be false for non-overlapping cells", () => {
      const ch = children(cellIDFromFace(0));

      expect(intersects(ch[0]!, ch[1]!)).toBe(false);
    });
  });

  describe("next and prev", () => {
    it("next then prev should return the original", () => {
      const id = cellIDFromFacePosLevel(0, 0n, 10);

      expect(prev(next(id))).toBe(id);
    });

    it("prev then next should return the original", () => {
      const id = cellIDFromFacePosLevel(3, 0n, 15);

      expect(next(prev(id))).toBe(id);
    });
  });

  describe("token serialization", () => {
    it("should roundtrip face cells", () => {
      for (let f = 0; f < 6; f++) {
        const id = cellIDFromFace(f);
        const token = toToken(id);
        const restored = cellIDFromToken(token);

        expect(restored).toBe(id);
      }
    });

    it("should produce non-empty tokens", () => {
      const id = cellIDFromFacePosLevel(3, 0n, 15);

      expect(toToken(id).length).toBeGreaterThan(0);
    });

    it("known token values for face cells", () => {
      expect(toToken(cellIDFromFace(0))).toBe("1");
      expect(toToken(cellIDFromFace(1))).toBe("3");
      expect(toToken(cellIDFromFace(2))).toBe("5");
      expect(toToken(cellIDFromFace(3))).toBe("7");
      expect(toToken(cellIDFromFace(4))).toBe("9");
      expect(toToken(cellIDFromFace(5))).toBe("b");
    });

    it("should roundtrip a leaf cell", () => {
      const id = cellIDFromFacePosLevel(0, 0n, MAX_LEVEL);
      const token = toToken(id);
      const restored = cellIDFromToken(token);

      expect(restored).toBe(id);
    });
  });

  describe("coordinate conversions", () => {
    it("stToUV and uvToST should roundtrip", () => {
      for (const s of [0, 0.25, 0.5, 0.75, 1]) {
        expect(uvToST(stToUV(s))).toBeCloseTo(s, 14);
      }
    });

    it("stToUV at 0.5 should return 0", () => {
      expect(stToUV(0.5)).toBeCloseTo(0, 14);
    });

    it("uvToST at 0 should return 0.5", () => {
      expect(uvToST(0)).toBeCloseTo(0.5, 14);
    });
  });

  describe("cellIDFromLatLng", () => {
    it("should create valid leaf cells for known locations", () => {
      // Equator, prime meridian
      const id = cellIDFromLatLng(0, 0);

      expect(isValid(id)).toBe(true);
      expect(isLeaf(id)).toBe(true);
    });

    it("toLatLng should roundtrip to within cell resolution", () => {
      const testCases = [
        { lat: 0.5, lng: 0.7 },
        { lat: Math.PI / 4, lng: Math.PI / 4 },
        { lat: -Math.PI / 3, lng: Math.PI / 2 },
      ];

      for (const { lat, lng } of testCases) {
        const id = cellIDFromLatLng(lat, lng);
        const { lat: lat2, lng: lng2 } = toLatLng(id);

        // At leaf level, cell center offset is within ~1e-9 radians (~6mm)
        expect(lat2).toBeCloseTo(lat, 8);
        expect(lng2).toBeCloseTo(lng, 8);
      }
    });

    it("poles should roundtrip approximately", () => {
      const north = cellIDFromLatLng(Math.PI / 2, 0);
      const south = cellIDFromLatLng(-Math.PI / 2, 0);

      expect(face(north)).toBe(2);
      expect(face(south)).toBe(5);
      expect(toLatLng(north).lat).toBeCloseTo(Math.PI / 2, 5);
      expect(toLatLng(south).lat).toBeCloseTo(-Math.PI / 2, 5);
    });
  });

  describe("cellIDFromPoint and toPoint", () => {
    it("should roundtrip to a nearby point on the same face", () => {
      const testPoints = [
        { x: 1, y: 0, z: 0, expectedFace: 0 },
        { x: 0, y: 1, z: 0, expectedFace: 1 },
        { x: 0, y: 0, z: 1, expectedFace: 2 },
        { x: -1, y: 0, z: 0, expectedFace: 3 },
        { x: 0, y: -1, z: 0, expectedFace: 4 },
        { x: 0, y: 0, z: -1, expectedFace: 5 },
      ];

      for (const p of testPoints) {
        const id = cellIDFromPoint(p.x, p.y, p.z);

        expect(face(id)).toBe(p.expectedFace);
        expect(isValid(id)).toBe(true);
        expect(isLeaf(id)).toBe(true);
      }
    });

    it("should roundtrip non-axis-aligned points to nearby cells", () => {
      const p = { x: 0.5, y: 0.6, z: 0.7 };
      const norm = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
      const id = cellIDFromPoint(p.x, p.y, p.z);
      const result = toPoint(id);

      // Result should be a unit vector near the original direction
      const resultNorm = Math.sqrt(result.x * result.x + result.y * result.y + result.z * result.z);
      expect(resultNorm).toBeCloseTo(1, 10);

      // The dot product with the normalized input should be very close to 1
      const dotProduct = (p.x * result.x + p.y * result.y + p.z * result.z) / norm;
      expect(dotProduct).toBeCloseTo(1, 10);
    });

    it("axis-aligned points should map to expected faces", () => {
      expect(face(cellIDFromPoint(1, 0, 0))).toBe(0);
      expect(face(cellIDFromPoint(0, 1, 0))).toBe(1);
      expect(face(cellIDFromPoint(0, 0, 1))).toBe(2);
      expect(face(cellIDFromPoint(-1, 0, 0))).toBe(3);
      expect(face(cellIDFromPoint(0, -1, 0))).toBe(4);
      expect(face(cellIDFromPoint(0, 0, -1))).toBe(5);
    });
  });

  describe("edge neighbors", () => {
    it("should return 4 neighbors at the same level", () => {
      const id = cellIDFromFacePosLevel(0, 0n, 10);
      const neighbors = edgeNeighbors(id);

      expect(neighbors).toHaveLength(4);
      for (const n of neighbors) {
        expect(isValid(n)).toBe(true);
        expect(level(n)).toBe(10);
      }
    });

    it("neighbors should not contain the original cell", () => {
      const id = cellIDFromFacePosLevel(2, 0n, 15);
      const neighbors = edgeNeighbors(id);

      for (const n of neighbors) {
        expect(n).not.toBe(id);
      }
    });

    it("face cell neighbors should be other face cells", () => {
      const id = cellIDFromFace(0);
      const neighbors = edgeNeighbors(id);

      for (const n of neighbors) {
        expect(isFace(n)).toBe(true);
      }
    });
  });

  describe("lsbForLevel", () => {
    it("level 0 should have the largest lsb", () => {
      const l0 = lsbForLevel(0);
      const l1 = lsbForLevel(1);

      expect(l0 > l1).toBe(true);
    });

    it("level 30 should have lsb = 1", () => {
      expect(lsbForLevel(MAX_LEVEL)).toBe(1n);
    });

    it("each level should have lsb = 4 * next level lsb", () => {
      for (let l = 0; l < MAX_LEVEL; l++) {
        expect(lsbForLevel(l)).toBe(lsbForLevel(l + 1) * 4n);
      }
    });
  });
});
