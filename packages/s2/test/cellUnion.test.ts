import { describe, it, expect } from "vitest";
import {
  cellIDFromFace,
  cellIDFromFacePosLevel,
  cellUnionContains,
  cellUnionContainsCellUnion,
  cellUnionDifference,
  cellUnionFromCellIDs,
  cellUnionIntersection,
  cellUnionIntersects,
  cellUnionIntersectsCellUnion,
  cellUnionUnion,
  children,
  contains,
  level,
  normalize,
} from "../src/index.js";

describe("s2.CellUnion", () => {
  describe("cellUnionFromCellIDs", () => {
    it("should return an empty union for empty input", () => {
      const cu = cellUnionFromCellIDs([]);

      expect(cu).toHaveLength(0);
    });

    it("should return a single cell for a single input", () => {
      const id = cellIDFromFace(0);
      const cu = cellUnionFromCellIDs([id]);

      expect(cu).toHaveLength(1);
      expect(cu[0]).toBe(id);
    });

    it("should sort cells in ascending order", () => {
      const ids = [cellIDFromFace(3), cellIDFromFace(1), cellIDFromFace(5)];
      const cu = cellUnionFromCellIDs(ids);

      for (let i = 1; i < cu.length; i++) {
        expect(cu[i]! > cu[i - 1]!).toBe(true);
      }
    });

    it("should remove cells contained by other cells", () => {
      const faceCell = cellIDFromFace(0);
      const childCell = children(faceCell)[0]!;
      const cu = cellUnionFromCellIDs([faceCell, childCell]);

      expect(cu).toHaveLength(1);
      expect(cu[0]).toBe(faceCell);
    });

    it("should remove duplicate cells", () => {
      const id = cellIDFromFace(2);
      const cu = cellUnionFromCellIDs([id, id, id]);

      expect(cu).toHaveLength(1);
    });
  });

  describe("normalize", () => {
    it("should merge four siblings into their parent", () => {
      const p = cellIDFromFacePosLevel(0, 0n, 5);
      const ch = children(p);
      const cu = normalize([...ch]);

      expect(cu).toHaveLength(1);
      expect(cu[0]).toBe(p);
    });

    it("should not merge fewer than four siblings", () => {
      const p = cellIDFromFacePosLevel(0, 0n, 5);
      const ch = children(p);
      const cu = normalize([ch[0]!, ch[1]!, ch[2]!]);

      expect(cu).toHaveLength(3);
    });

    it("should handle mixed levels correctly", () => {
      const faceCell = cellIDFromFace(1);
      const otherFaceCell = cellIDFromFace(3);
      const cu = normalize([faceCell, otherFaceCell]);

      expect(cu).toHaveLength(2);
    });
  });

  describe("cellUnionContains", () => {
    it("should contain a cell that is in the union", () => {
      const id = cellIDFromFace(0);
      const cu = cellUnionFromCellIDs([id]);

      expect(cellUnionContains(cu, id)).toBe(true);
    });

    it("should contain a descendant of a cell in the union", () => {
      const faceCell = cellIDFromFace(0);
      const cu = cellUnionFromCellIDs([faceCell]);
      const descendant = cellIDFromFacePosLevel(0, 0n, 10);

      expect(cellUnionContains(cu, descendant)).toBe(true);
    });

    it("should not contain a cell from a different face", () => {
      const cu = cellUnionFromCellIDs([cellIDFromFace(0)]);

      expect(cellUnionContains(cu, cellIDFromFace(1))).toBe(false);
    });

    it("should not contain a parent of a cell in the union", () => {
      const child = cellIDFromFacePosLevel(0, 0n, 10);
      const cu = cellUnionFromCellIDs([child]);

      expect(cellUnionContains(cu, cellIDFromFace(0))).toBe(false);
    });

    it("should handle empty union", () => {
      const cu = cellUnionFromCellIDs([]);

      expect(cellUnionContains(cu, cellIDFromFace(0))).toBe(false);
    });
  });

  describe("cellUnionContainsCellUnion", () => {
    it("should contain an empty union", () => {
      const cu = cellUnionFromCellIDs([cellIDFromFace(0)]);
      const empty = cellUnionFromCellIDs([]);

      expect(cellUnionContainsCellUnion(cu, empty)).toBe(true);
    });

    it("should contain itself", () => {
      const cu = cellUnionFromCellIDs([cellIDFromFace(0), cellIDFromFace(1)]);

      expect(cellUnionContainsCellUnion(cu, cu)).toBe(true);
    });

    it("should contain a subset", () => {
      const cu = cellUnionFromCellIDs([cellIDFromFace(0), cellIDFromFace(1)]);
      const subset = cellUnionFromCellIDs([cellIDFromFace(0)]);

      expect(cellUnionContainsCellUnion(cu, subset)).toBe(true);
    });

    it("should not contain a superset", () => {
      const cu = cellUnionFromCellIDs([cellIDFromFace(0)]);
      const superset = cellUnionFromCellIDs([cellIDFromFace(0), cellIDFromFace(1)]);

      expect(cellUnionContainsCellUnion(cu, superset)).toBe(false);
    });
  });

  describe("cellUnionIntersects", () => {
    it("should intersect with a cell in the union", () => {
      const id = cellIDFromFace(0);
      const cu = cellUnionFromCellIDs([id]);

      expect(cellUnionIntersects(cu, id)).toBe(true);
    });

    it("should intersect with a descendant", () => {
      const cu = cellUnionFromCellIDs([cellIDFromFace(0)]);
      const descendant = cellIDFromFacePosLevel(0, 0n, 15);

      expect(cellUnionIntersects(cu, descendant)).toBe(true);
    });

    it("should intersect with an ancestor", () => {
      const child = cellIDFromFacePosLevel(0, 0n, 10);
      const cu = cellUnionFromCellIDs([child]);

      expect(cellUnionIntersects(cu, cellIDFromFace(0))).toBe(true);
    });

    it("should not intersect with a disjoint cell", () => {
      const cu = cellUnionFromCellIDs([cellIDFromFace(0)]);

      expect(cellUnionIntersects(cu, cellIDFromFace(3))).toBe(false);
    });
  });

  describe("cellUnionIntersectsCellUnion", () => {
    it("should intersect with overlapping unions", () => {
      const a = cellUnionFromCellIDs([cellIDFromFace(0), cellIDFromFace(1)]);
      const b = cellUnionFromCellIDs([cellIDFromFace(1), cellIDFromFace(2)]);

      expect(cellUnionIntersectsCellUnion(a, b)).toBe(true);
    });

    it("should not intersect with disjoint unions", () => {
      const a = cellUnionFromCellIDs([cellIDFromFace(0)]);
      const b = cellUnionFromCellIDs([cellIDFromFace(3)]);

      expect(cellUnionIntersectsCellUnion(a, b)).toBe(false);
    });

    it("should not intersect with empty union", () => {
      const a = cellUnionFromCellIDs([cellIDFromFace(0)]);
      const b = cellUnionFromCellIDs([]);

      expect(cellUnionIntersectsCellUnion(a, b)).toBe(false);
    });
  });

  describe("cellUnionUnion", () => {
    it("should combine two disjoint unions", () => {
      const a = cellUnionFromCellIDs([cellIDFromFace(0)]);
      const b = cellUnionFromCellIDs([cellIDFromFace(3)]);
      const result = cellUnionUnion(a, b);

      expect(result).toHaveLength(2);
      expect(cellUnionContains(result, cellIDFromFace(0))).toBe(true);
      expect(cellUnionContains(result, cellIDFromFace(3))).toBe(true);
    });

    it("should merge overlapping unions", () => {
      const faceCell = cellIDFromFace(0);
      const childCell = children(faceCell)[0]!;
      const a = cellUnionFromCellIDs([faceCell]);
      const b = cellUnionFromCellIDs([childCell]);
      const result = cellUnionUnion(a, b);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(faceCell);
    });

    it("union with empty should return original", () => {
      const a = cellUnionFromCellIDs([cellIDFromFace(0)]);
      const b = cellUnionFromCellIDs([]);
      const result = cellUnionUnion(a, b);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(cellIDFromFace(0));
    });
  });

  describe("cellUnionIntersection", () => {
    it("should return common cells", () => {
      const shared = cellIDFromFace(1);
      const a = cellUnionFromCellIDs([cellIDFromFace(0), shared]);
      const b = cellUnionFromCellIDs([shared, cellIDFromFace(2)]);
      const result = cellUnionIntersection(a, b);

      expect(cellUnionContains(result, shared)).toBe(true);
    });

    it("should return empty for disjoint unions", () => {
      const a = cellUnionFromCellIDs([cellIDFromFace(0)]);
      const b = cellUnionFromCellIDs([cellIDFromFace(3)]);
      const result = cellUnionIntersection(a, b);

      expect(result).toHaveLength(0);
    });

    it("should return the smaller cell when one contains the other", () => {
      const faceCell = cellIDFromFace(0);
      const childCell = children(faceCell)[0]!;
      const a = cellUnionFromCellIDs([faceCell]);
      const b = cellUnionFromCellIDs([childCell]);
      const result = cellUnionIntersection(a, b);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(childCell);
    });
  });

  describe("cellUnionDifference", () => {
    it("should return the original when subtracting empty", () => {
      const a = cellUnionFromCellIDs([cellIDFromFace(0)]);
      const b = cellUnionFromCellIDs([]);
      const result = cellUnionDifference(a, b);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(cellIDFromFace(0));
    });

    it("should return empty when subtracting a superset", () => {
      const a = cellUnionFromCellIDs([children(cellIDFromFace(0))[0]!]);
      const b = cellUnionFromCellIDs([cellIDFromFace(0)]);
      const result = cellUnionDifference(a, b);

      expect(result).toHaveLength(0);
    });

    it("should return original when subtracting disjoint set", () => {
      const a = cellUnionFromCellIDs([cellIDFromFace(0)]);
      const b = cellUnionFromCellIDs([cellIDFromFace(3)]);
      const result = cellUnionDifference(a, b);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(cellIDFromFace(0));
    });

    it("should return parts not covered by the other union", () => {
      const p = cellIDFromFacePosLevel(0, 0n, 1);
      const ch = children(p);
      const a = cellUnionFromCellIDs([p]);
      const b = cellUnionFromCellIDs([ch[0]!]);
      const result = cellUnionDifference(a, b);

      // The result should contain the 3 remaining children.
      expect(result).toHaveLength(3);
      for (const id of result) {
        expect(level(id)).toBe(2);
        expect(contains(p, id)).toBe(true);
        expect(id).not.toBe(ch[0]);
      }
    });
  });
});
