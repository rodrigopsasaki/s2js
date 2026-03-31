/**
 * RegionCoverer generates cell coverings for arbitrary regions.
 *
 * A "covering" of a region is a set of cells that collectively contain
 * every point in the region. The cells in the covering may overlap.
 * An "interior covering" is a set of cells that are fully contained
 * within the region.
 *
 * @module
 */

import { type CellID, cellIDFromFace, children, level, MAX_LEVEL, NUM_FACES } from "./cellId.js";
import { type CellUnion, normalize } from "./cellUnion.js";

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

/** A region is anything that can test cell containment and intersection. */
export interface Region {
  /** Returns true if the region contains the given cell entirely. */
  containsCell(id: CellID): boolean;
  /** Returns true if the region may intersect the given cell. */
  mayIntersect(id: CellID): boolean;
}

/** Options for the RegionCoverer. */
export interface RegionCovererOptions {
  /** Minimum cell level (default: 0). */
  readonly minLevel?: number;
  /** Maximum cell level (default: MAX_LEVEL). */
  readonly maxLevel?: number;
  /** Maximum number of cells in the covering (default: 8). */
  readonly maxCells?: number;
  /** Level mod constraint: only levels that are multiples of this value, offset by minLevel, are used (default: 1). */
  readonly levelMod?: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface ResolvedOptions {
  readonly minLevel: number;
  readonly maxLevel: number;
  readonly maxCells: number;
  readonly levelMod: number;
}

function resolveOptions(options?: RegionCovererOptions): ResolvedOptions {
  const minLevel = options?.minLevel ?? 0;
  const maxLevel = options?.maxLevel ?? MAX_LEVEL;
  const maxCells = options?.maxCells ?? 8;
  const levelMod = options?.levelMod ?? 1;

  return { minLevel, maxLevel, maxCells, levelMod };
}

/**
 * Returns true if the given level is a valid candidate level given the options.
 * A level is valid when `(lvl - minLevel)` is a non-negative multiple of `levelMod`.
 */
function isValidLevel(lvl: number, opts: ResolvedOptions): boolean {
  return lvl >= opts.minLevel && lvl <= opts.maxLevel && (lvl - opts.minLevel) % opts.levelMod === 0;
}

/**
 * Recursively covers a region, collecting cells into result.
 *
 * @param region - The region to cover
 * @param id - Current candidate cell
 * @param result - Accumulator for covering cells
 * @param opts - Resolved options
 * @param interiorOnly - When true, only adds cells fully contained by the region
 */
function coveringInternal(
  region: Region,
  id: CellID,
  result: CellID[],
  opts: ResolvedOptions,
  interiorOnly: boolean,
): void {
  if (!region.mayIntersect(id)) {
    return;
  }

  const lvl = level(id);

  if (region.containsCell(id)) {
    if (isValidLevel(lvl, opts)) {
      result.push(id);
      return;
    }
  }

  if (lvl >= opts.maxLevel) {
    if (!interiorOnly) {
      result.push(id);
    }
    return;
  }

  // If we already have enough cells, add this cell as an approximation.
  if (result.length >= opts.maxCells && !interiorOnly) {
    result.push(id);
    return;
  }

  // Refine: recurse into children.
  for (const child of children(id)) {
    coveringInternal(region, child, result, opts, interiorOnly);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a CellUnion that covers the given region.
 *
 * The covering is guaranteed to contain every point of the region,
 * but may also contain points outside the region. The number of cells
 * is approximately bounded by `maxCells`.
 *
 * @param region - The region to cover
 * @param options - Covering options
 */
export function covering(region: Region, options?: RegionCovererOptions): CellUnion {
  const opts = resolveOptions(options);

  const result: CellID[] = [];
  for (let f = 0; f < NUM_FACES; f++) {
    coveringInternal(region, cellIDFromFace(f), result, opts, false);
  }

  return normalize(result);
}

/**
 * Returns a CellUnion that is contained within the given region.
 *
 * Every cell in the result is fully contained by the region.
 * The result may not cover the entire region, especially near boundaries.
 *
 * @param region - The region to cover from the interior
 * @param options - Covering options
 */
export function interiorCovering(region: Region, options?: RegionCovererOptions): CellUnion {
  const opts = resolveOptions(options);

  const result: CellID[] = [];
  for (let f = 0; f < NUM_FACES; f++) {
    coveringInternal(region, cellIDFromFace(f), result, opts, true);
  }

  return normalize(result);
}
