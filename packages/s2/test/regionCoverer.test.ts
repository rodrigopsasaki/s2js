import { describe, it, expect } from "vitest";
import {
  type CellID,
  type Region,
  cellIDFromFace,
  cellIDFromLatLng,
  contains,
  covering,
  interiorCovering,
  level,
  parentAtLevel,
} from "../src/index.js";

// ---------------------------------------------------------------------------
// Test region implementations
// ---------------------------------------------------------------------------

/**
 * A region that contains exactly one leaf cell and all its ancestors.
 * Useful for testing the basic covering algorithm.
 */
class PointRegion implements Region {
  constructor(private readonly targetId: CellID) {}

  containsCell(id: CellID): boolean {
    return contains(id, this.targetId) && level(id) >= level(this.targetId);
  }

  mayIntersect(id: CellID): boolean {
    return contains(id, this.targetId) || contains(this.targetId, id);
  }
}

/**
 * A region that contains an entire face cell and all its descendants.
 */
class FaceRegion implements Region {
  private readonly faceId: CellID;

  constructor(faceNumber: number) {
    this.faceId = cellIDFromFace(faceNumber);
  }

  containsCell(id: CellID): boolean {
    return contains(this.faceId, id);
  }

  mayIntersect(id: CellID): boolean {
    return contains(this.faceId, id) || contains(id, this.faceId);
  }
}

/**
 * A region that matches a cell at a specific level and all its descendants.
 */
class CellRegion implements Region {
  constructor(private readonly cellId: CellID) {}

  containsCell(id: CellID): boolean {
    return contains(this.cellId, id);
  }

  mayIntersect(id: CellID): boolean {
    return contains(this.cellId, id) || contains(id, this.cellId);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RegionCoverer", () => {
  describe("covering", () => {
    it("should return a single cell at maxLevel for a point region", () => {
      const leafCell = cellIDFromLatLng(0.1, 0.2);
      const region = new PointRegion(leafCell);

      const actual = covering(region, { maxCells: 8 });

      expect(actual.length).toBe(1);
      expect(actual[0]).toBe(leafCell);
    });

    it("should return a single cell when maxCells is 1", () => {
      const leafCell = cellIDFromLatLng(0.5, 1.0);
      const region = new PointRegion(leafCell);

      const actual = covering(region, { maxCells: 1 });

      expect(actual.length).toBe(1);
      // The single cell should contain our target.
      expect(contains(actual[0]!, leafCell)).toBe(true);
    });

    it("should only return cells at level >= minLevel", () => {
      const leafCell = cellIDFromLatLng(0.3, -0.5);
      const region = new PointRegion(leafCell);
      const inputMinLevel = 5;

      const actual = covering(region, { minLevel: inputMinLevel, maxCells: 8 });

      for (const id of actual) {
        expect(level(id)).toBeGreaterThanOrEqual(inputMinLevel);
      }
      expect(actual.length).toBeGreaterThanOrEqual(1);
    });

    it("should respect maxLevel constraint", () => {
      const leafCell = cellIDFromLatLng(0.1, 0.2);
      const region = new PointRegion(leafCell);
      const inputMaxLevel = 10;

      const actual = covering(region, { maxLevel: inputMaxLevel, maxCells: 8 });

      for (const id of actual) {
        expect(level(id)).toBeLessThanOrEqual(inputMaxLevel);
      }
      expect(actual.length).toBeGreaterThanOrEqual(1);
    });

    it("should return the face cell for a face region with maxLevel=0", () => {
      const region = new FaceRegion(0);

      const actual = covering(region, { maxLevel: 0, maxCells: 8 });

      expect(actual.length).toBe(1);
      expect(actual[0]).toBe(cellIDFromFace(0));
    });

    it("should cover a face region with the face cell itself", () => {
      const region = new FaceRegion(2);

      const actual = covering(region, { maxLevel: 1, maxCells: 100 });

      // The face cell itself should be in the result since it fully contains the region.
      expect(actual.length).toBe(1);
      expect(level(actual[0]!)).toBe(0);
    });

    it("should respect levelMod constraint", () => {
      const leafCell = cellIDFromLatLng(0.1, 0.2);
      const region = new PointRegion(leafCell);
      const inputLevelMod = 2;

      const actual = covering(region, { levelMod: inputLevelMod, maxCells: 100 });

      for (const id of actual) {
        expect(level(id) % inputLevelMod).toBe(0);
      }
      expect(actual.length).toBeGreaterThanOrEqual(1);
    });

    it("should return cells that collectively contain the target point", () => {
      const leafCell = cellIDFromLatLng(-0.7, 2.1);
      const region = new PointRegion(leafCell);

      const actual = covering(region, { maxCells: 4 });

      const isContained = actual.some((id) => contains(id, leafCell));
      expect(isContained).toBe(true);
    });

    it("should cover a cell region with the cell itself", () => {
      const targetCell = parentAtLevel(cellIDFromLatLng(0.5, 0.5), 10);
      const region = new CellRegion(targetCell);

      const actual = covering(region, { maxCells: 8, maxLevel: 10 });

      expect(actual.length).toBe(1);
      expect(actual[0]).toBe(targetCell);
    });

    it("should handle children of a cell region at deeper levels", () => {
      const targetCell = parentAtLevel(cellIDFromLatLng(0.5, 0.5), 5);
      const region = new CellRegion(targetCell);

      const actual = covering(region, { maxCells: 100, minLevel: 6, maxLevel: 6 });

      // The 4 children at level 6 get normalized (merged) back to their level-5 parent.
      expect(actual.length).toBe(1);
      expect(actual[0]).toBe(targetCell);
    });
  });

  describe("interiorCovering", () => {
    it("should return cells fully contained by a face region", () => {
      const region = new FaceRegion(3);

      const actual = interiorCovering(region, { maxCells: 8 });

      expect(actual.length).toBeGreaterThanOrEqual(1);
      // Every cell in the interior covering must be fully contained.
      for (const id of actual) {
        expect(region.containsCell(id)).toBe(true);
      }
    });

    it("should return the face cell for a full face region", () => {
      const region = new FaceRegion(1);

      const actual = interiorCovering(region, { maxLevel: 0, maxCells: 8 });

      expect(actual.length).toBe(1);
      expect(actual[0]).toBe(cellIDFromFace(1));
    });

    it("should return an empty result for a point region at maxLevel=0", () => {
      const leafCell = cellIDFromLatLng(0.1, 0.2);
      const region = new PointRegion(leafCell);

      const actual = interiorCovering(region, { maxLevel: 0, maxCells: 8 });

      // A point region at maxLevel=0 cannot be fully contained by any face cell.
      expect(actual.length).toBe(0);
    });

    it("should return the leaf cell for a point region at maxLevel=MAX_LEVEL", () => {
      const leafCell = cellIDFromLatLng(0.1, 0.2);
      const region = new PointRegion(leafCell);

      const actual = interiorCovering(region, { maxCells: 8 });

      expect(actual.length).toBe(1);
      expect(actual[0]).toBe(leafCell);
    });

    it("should return the parent cell when all 4 children are covered", () => {
      const targetCell = parentAtLevel(cellIDFromLatLng(0.5, 0.5), 5);
      const region = new CellRegion(targetCell);

      const actual = interiorCovering(region, { maxCells: 100, minLevel: 6, maxLevel: 6 });

      // The 4 children at level 6 get normalized (merged) back to the level-5 parent.
      expect(actual.length).toBe(1);
      expect(actual[0]).toBe(targetCell);
    });
  });

  describe("normalization", () => {
    it("should return a sorted result", () => {
      const leafCell = cellIDFromLatLng(0.3, 0.7);
      const targetCell = parentAtLevel(leafCell, 3);
      const region = new CellRegion(targetCell);

      const actual = covering(region, { maxCells: 100, maxLevel: 5 });

      for (let i = 1; i < actual.length; i++) {
        expect(actual[i]! > actual[i - 1]!).toBe(true);
      }
    });

    it("should not contain duplicate cells", () => {
      const leafCell = cellIDFromLatLng(0.1, 0.1);
      const region = new PointRegion(leafCell);

      const actual = covering(region, { maxCells: 8 });

      const uniqueSet = new Set(actual.map((id) => id.toString()));
      expect(uniqueSet.size).toBe(actual.length);
    });
  });

  describe("edge cases", () => {
    it("should handle minLevel equal to maxLevel", () => {
      const leafCell = cellIDFromLatLng(0.1, 0.2);
      const region = new PointRegion(leafCell);
      const inputLevel = 15;

      const actual = covering(region, { minLevel: inputLevel, maxLevel: inputLevel, maxCells: 8 });

      expect(actual.length).toBe(1);
      expect(level(actual[0]!)).toBe(inputLevel);
      expect(contains(actual[0]!, leafCell)).toBe(true);
    });

    it("should handle maxCells=0 gracefully", () => {
      const leafCell = cellIDFromLatLng(0.1, 0.2);
      const region = new PointRegion(leafCell);

      const actual = covering(region, { maxCells: 0 });

      // With maxCells=0, the first face cell that intersects gets added.
      expect(actual.length).toBeGreaterThanOrEqual(1);
    });

    it("should return empty for a region that intersects nothing", () => {
      const emptyRegion: Region = {
        containsCell: () => false,
        mayIntersect: () => false,
      };

      const actual = covering(emptyRegion);

      expect(actual.length).toBe(0);
    });

    it("should cover the entire sphere with 6 face cells", () => {
      const wholeSphere: Region = {
        containsCell: () => true,
        mayIntersect: () => true,
      };

      const actual = covering(wholeSphere, { maxLevel: 0 });

      expect(actual.length).toBe(6);
      for (let f = 0; f < 6; f++) {
        expect(actual).toContainEqual(cellIDFromFace(f));
      }
    });
  });
});
