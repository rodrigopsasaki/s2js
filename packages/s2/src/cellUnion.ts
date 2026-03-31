/**
 * CellUnion represents a region as a sorted, normalized collection of CellIDs.
 *
 * A CellUnion is "normalized" if it satisfies the following constraints:
 * - All CellIDs are valid.
 * - No CellID is contained by another.
 * - No four sibling CellIDs can be replaced by their parent.
 *
 * @module
 */

import { type CellID, contains, intersects, level, lsb, parent, rangeMax, rangeMin } from "./cellId.js";

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

/** A CellUnion is a sorted, normalized collection of CellIDs representing a region. */
export type CellUnion = readonly CellID[];

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

/**
 * Creates a normalized CellUnion from an array of CellIDs.
 * The input IDs are sorted and merged into canonical form.
 *
 * @param ids - The CellIDs to include in the union
 */
export function cellUnionFromCellIDs(ids: readonly CellID[]): CellUnion {
  return normalize([...ids]);
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Returns the canonical (normalized) form of a CellUnion.
 *
 * The normalization algorithm:
 * 1. Sort by CellID value.
 * 2. Remove any cell contained by a previous cell.
 * 3. Replace four consecutive siblings with their parent (iteratively).
 *
 * @param cu - The CellUnion to normalize
 */
export function normalize(cu: CellUnion): CellUnion {
  const sorted = [...cu].sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });

  const output: CellID[] = [];

  for (const id of sorted) {
    // Skip cells contained by the last output cell.
    if (output.length > 0 && contains(output[output.length - 1]!, id)) {
      continue;
    }

    // Remove previous cells contained by the current cell.
    while (output.length > 0 && contains(id, output[output.length - 1]!)) {
      output.pop();
    }

    // Check if we can merge four siblings into a parent.
    while (output.length >= 3) {
      if (!areSiblings(output[output.length - 3]!, output[output.length - 2]!, output[output.length - 1]!, id)) {
        break;
      }
      // Replace three siblings + current with their parent.
      output.pop();
      output.pop();
      output.pop();
      const merged = parent(id);
      // Continue checking if the parent can be merged further.
      output.push(merged);
      // We need to re-check the last 3 entries, but since the parent might
      // also form a sibling group, we loop again. However, the new "id" is
      // now the parent that was just pushed. We need to pop and re-try.
      // Actually, let's use a simpler approach: push the parent and re-check.
    }

    if (output.length === 0 || output[output.length - 1] !== id) {
      // The merge loop may have already pushed a parent in place of id.
      // Only push id if it wasn't replaced.
      const last = output.length > 0 ? output[output.length - 1]! : undefined;
      if (last === undefined || !contains(last, id)) {
        output.push(id);
      }
    }
  }

  return output;
}

// ---------------------------------------------------------------------------
// Containment and intersection
// ---------------------------------------------------------------------------

/**
 * Returns true if the CellUnion contains the given CellID.
 * A CellUnion contains a CellID if any member cell contains it.
 *
 * @param cu - The CellUnion to search
 * @param id - The CellID to check
 */
export function cellUnionContains(cu: CellUnion, id: CellID): boolean {
  // Binary search for the first cell >= id.
  const idx = lowerBound(cu, id);

  // Check if the cell at idx contains id.
  if (idx < cu.length && rangeMin(cu[idx]!) <= id && id <= rangeMax(cu[idx]!)) {
    return true;
  }

  // Check if the previous cell contains id.
  if (idx > 0 && rangeMin(cu[idx - 1]!) <= id && id <= rangeMax(cu[idx - 1]!)) {
    return true;
  }

  return false;
}

/**
 * Returns true if the CellUnion contains every cell in the other CellUnion.
 *
 * @param cu - The CellUnion to check containment in
 * @param other - The CellUnion that should be contained
 */
export function cellUnionContainsCellUnion(cu: CellUnion, other: CellUnion): boolean {
  for (const id of other) {
    if (!cellUnionContains(cu, id)) {
      return false;
    }
  }
  return true;
}

/**
 * Returns true if the CellUnion intersects the given CellID.
 *
 * @param cu - The CellUnion to check
 * @param id - The CellID to check intersection with
 */
export function cellUnionIntersects(cu: CellUnion, id: CellID): boolean {
  const idx = lowerBound(cu, id);

  // Check if cell at idx intersects id.
  if (idx < cu.length && intersects(cu[idx]!, id)) {
    return true;
  }

  // Check if the previous cell intersects id.
  if (idx > 0 && intersects(cu[idx - 1]!, id)) {
    return true;
  }

  return false;
}

/**
 * Returns true if the two CellUnions have any cells in common.
 *
 * @param cu - First CellUnion
 * @param other - Second CellUnion
 */
export function cellUnionIntersectsCellUnion(cu: CellUnion, other: CellUnion): boolean {
  for (const id of other) {
    if (cellUnionIntersects(cu, id)) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Set operations
// ---------------------------------------------------------------------------

/**
 * Returns a CellUnion representing the union of two CellUnions.
 *
 * @param a - First CellUnion
 * @param b - Second CellUnion
 */
export function cellUnionUnion(a: CellUnion, b: CellUnion): CellUnion {
  return normalize([...a, ...b]);
}

/**
 * Returns a CellUnion representing the intersection of two CellUnions.
 * The result contains all cells from both unions that overlap.
 *
 * @param a - First CellUnion
 * @param b - Second CellUnion
 */
export function cellUnionIntersection(a: CellUnion, b: CellUnion): CellUnion {
  const result: CellID[] = [];

  for (const idA of a) {
    for (const idB of b) {
      if (contains(idA, idB)) {
        result.push(idB);
      } else if (contains(idB, idA)) {
        result.push(idA);
      }
    }
  }

  return normalize(result);
}

/**
 * Returns a CellUnion representing cells in `a` that are not in `b`.
 *
 * @param a - CellUnion to subtract from
 * @param b - CellUnion to subtract
 */
export function cellUnionDifference(a: CellUnion, b: CellUnion): CellUnion {
  const result: CellID[] = [];

  for (const idA of a) {
    cellUnionDifferenceInternal(idA, b, result);
  }

  return normalize(result);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Recursively computes the difference of a single cell against a CellUnion.
 * Subdivides the cell as needed, adding non-overlapping parts to the result.
 */
function cellUnionDifferenceInternal(id: CellID, cu: CellUnion, result: CellID[]): void {
  if (!cellUnionIntersects(cu, id)) {
    result.push(id);
    return;
  }

  if (cellUnionContains(cu, id)) {
    return;
  }

  // Subdivide and recurse on children.
  const childLsb = lsb(id) >> 2n;
  const child0 = (id - lsb(id) + childLsb) as CellID;
  const step = lsb(id) >> 1n;

  cellUnionDifferenceInternal(child0, cu, result);
  cellUnionDifferenceInternal((child0 + step) as CellID, cu, result);
  cellUnionDifferenceInternal((child0 + step * 2n) as CellID, cu, result);
  cellUnionDifferenceInternal((child0 + step * 3n) as CellID, cu, result);
}

/** Binary search: returns the index of the first element >= target. */
function lowerBound(cu: CellUnion, target: CellID): number {
  let lo = 0;
  let hi = cu.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (cu[mid]! < target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/**
 * Returns true if four CellIDs are siblings (share the same parent and
 * together cover the parent exactly). Assumes a, b, c are sorted and d >= c.
 */
function areSiblings(a: CellID, b: CellID, c: CellID, d: CellID): boolean {
  // Quick check: siblings must share the same parent.
  // parent(x) at level-1 is cheaper than calling level() on each cell.
  const lvl = level(a);
  if (lvl === 0) return false;

  // All must have the same lsb (same level) — cheap bigint AND
  const aLsb = lsb(a);
  if (lsb(b) !== aLsb || lsb(c) !== aLsb || lsb(d) !== aLsb) return false;

  // They must share the same parent.
  const pa = parent(a);
  if (parent(b) !== pa || parent(c) !== pa || parent(d) !== pa) return false;

  // And they must all be distinct.
  return a !== b && b !== c && c !== d;
}
