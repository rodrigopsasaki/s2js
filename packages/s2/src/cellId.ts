/**
 * S2 Cell Identifiers.
 *
 * A CellID uniquely identifies a cell in the S2 cell decomposition.
 * It is a 64-bit integer (represented as a branded bigint) encoding:
 * - Bits 63-61: face number (0-5)
 * - Bits 60-0: Hilbert curve position
 * - The lowest set bit encodes the level: for level k, the LSB is at bit 2*(30-k)
 *
 * @module
 */

import { type Vector, vector, normalize } from "@s2js/r3";

// ---------------------------------------------------------------------------
// Public constants
// ---------------------------------------------------------------------------

/** Maximum subdivision level for S2 cells. */
export const MAX_LEVEL = 30;

/** Number of faces on the S2 cube. */
export const NUM_FACES = 6;

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const POS_BITS = 2 * MAX_LEVEL + 1; // 61
const MAX_SIZE = 1 << MAX_LEVEL; // 1073741824

const LOOKUP_BITS = 4;
const SWAP_MASK = 0x01;
const INVERT_MASK = 0x02;

/**
 * Hilbert curve orientation tables.
 * For each of the 4 orientations, maps child position to (i,j) offsets.
 */
const POS_TO_IJ: readonly (readonly [number, number, number, number])[] = [
  [0, 1, 3, 2],
  [0, 2, 3, 1],
  [3, 2, 0, 1],
  [3, 1, 0, 2],
];

/** Orientation delta for each child position. */
const POS_TO_ORIENTATION = [SWAP_MASK, 0, 0, SWAP_MASK | INVERT_MASK] as const;

// ---------------------------------------------------------------------------
// Lookup tables for Hilbert curve <-> (i,j) conversions
// ---------------------------------------------------------------------------

const LOOKUP_TABLE_SIZE = 1 << (2 * LOOKUP_BITS + 2);
const lookupPos = new Int32Array(LOOKUP_TABLE_SIZE);
const lookupIJ = new Int32Array(LOOKUP_TABLE_SIZE);

function initLookupCell(
  level: number,
  i: number,
  j: number,
  origOrientation: number,
  pos: number,
  orientation: number,
): void {
  if (level === LOOKUP_BITS) {
    const ij = (i << LOOKUP_BITS) | j;
    lookupPos[(ij << 2) | origOrientation] = (pos << 2) | orientation;
    lookupIJ[(pos << 2) | origOrientation] = (ij << 2) | orientation;
    return;
  }

  const nextLevel = level + 1;
  const r = POS_TO_IJ[orientation];
  if (!r) return;

  const r0 = r[0];
  const r1 = r[1];
  const r2 = r[2];
  const r3 = r[3];

  initLookupCell(
    nextLevel,
    (i << 1) + (r0 >> 1),
    (j << 1) + (r0 & 1),
    origOrientation,
    pos * 4,
    orientation ^ POS_TO_ORIENTATION[0],
  );
  initLookupCell(
    nextLevel,
    (i << 1) + (r1 >> 1),
    (j << 1) + (r1 & 1),
    origOrientation,
    pos * 4 + 1,
    orientation ^ POS_TO_ORIENTATION[1],
  );
  initLookupCell(
    nextLevel,
    (i << 1) + (r2 >> 1),
    (j << 1) + (r2 & 1),
    origOrientation,
    pos * 4 + 2,
    orientation ^ POS_TO_ORIENTATION[2],
  );
  initLookupCell(
    nextLevel,
    (i << 1) + (r3 >> 1),
    (j << 1) + (r3 & 1),
    origOrientation,
    pos * 4 + 3,
    orientation ^ POS_TO_ORIENTATION[3],
  );
}

for (let i = 0; i < 4; i++) {
  initLookupCell(0, 0, 0, i, 0, i);
}

// ---------------------------------------------------------------------------
// Branded type
// ---------------------------------------------------------------------------

/** A branded bigint representing an S2 cell identifier. */
export type CellID = bigint & { readonly __brand: "s2.CellID" };

// ---------------------------------------------------------------------------
// Bit-level helpers
// ---------------------------------------------------------------------------

/**
 * Returns the least-significant bit for a given level.
 * For level k, this is `1n << 2*(30-k)`.
 */
export function lsbForLevel(level: number): bigint {
  return 1n << BigInt(2 * (MAX_LEVEL - level));
}

/**
 * Returns the lowest set bit of a CellID.
 * Equivalent to `id & (-id)` in unsigned arithmetic.
 */
export function lsb(id: CellID): bigint {
  return id & -id;
}

// ---------------------------------------------------------------------------
// Core property accessors
// ---------------------------------------------------------------------------

/** Returns the face number (0-5) of the cell. */
export function face(id: CellID): number {
  return Number(id >> BigInt(POS_BITS));
}

/**
 * Returns the subdivision level of the cell (0-30).
 * Level 0 is a face cell; level 30 is a leaf cell.
 */
/**
 * Lookup table: trailing zero count for bytes 0-255.
 * -1 means no set bit in this byte (all zeros).
 */
const CTZ_TABLE = new Int8Array(256);
{
  CTZ_TABLE[0] = -1;
  for (let i = 1; i < 256; i++) {
    CTZ_TABLE[i] = 0;
    if ((i & 0x01) === 0) CTZ_TABLE[i]!++;
    if ((i & 0x03) === 0) CTZ_TABLE[i]!++;
    if ((i & 0x07) === 0) CTZ_TABLE[i]!++;
    if ((i & 0x0f) === 0) CTZ_TABLE[i]!++;
    if ((i & 0x1f) === 0) CTZ_TABLE[i]!++;
    if ((i & 0x3f) === 0) CTZ_TABLE[i]!++;
    if ((i & 0x7f) === 0) CTZ_TABLE[i]!++;
  }
}

export function level(id: CellID): number {
  if (isLeaf(id)) return MAX_LEVEL;

  // Fast path: extract low 32 bits to Number. If non-zero, we can count
  // trailing zeros entirely in Number land (10-100x faster than BigInt).
  const low32 = Number(id & 0xffffffffn);
  if (low32 !== 0) {
    // Count trailing zeros in the low 32 bits using byte-level lookup
    let tz: number;
    const b0 = low32 & 0xff;
    if (b0 !== 0) {
      tz = CTZ_TABLE[b0]!;
    } else {
      const b1 = (low32 >>> 8) & 0xff;
      if (b1 !== 0) {
        tz = 8 + CTZ_TABLE[b1]!;
      } else {
        const b2 = (low32 >>> 16) & 0xff;
        if (b2 !== 0) {
          tz = 16 + CTZ_TABLE[b2]!;
        } else {
          tz = 24 + CTZ_TABLE[(low32 >>> 24) & 0xff]!;
        }
      }
    }
    return MAX_LEVEL - (tz >> 1);
  }

  // Slow path: low 32 bits are all zero (level 0-14). Use BigInt.
  let tz = 32;
  let bits = id >> 32n;
  if ((bits & 0xffffn) === 0n) {
    bits >>= 16n;
    tz += 16;
  }
  if ((bits & 0xffn) === 0n) {
    bits >>= 8n;
    tz += 8;
  }
  if ((bits & 0xfn) === 0n) {
    bits >>= 4n;
    tz += 4;
  }
  if ((bits & 0x3n) === 0n) {
    bits >>= 2n;
    tz += 2;
  }
  if ((bits & 0x1n) === 0n) {
    tz += 1;
  }

  return MAX_LEVEL - (tz >> 1);
}

/**
 * Returns true if the CellID is valid.
 * A valid cell has face in [0,5] and has its lowest set bit in a valid position.
 */
export function isValid(id: CellID): boolean {
  const f = face(id);
  const lowestBit = lsb(id);
  return f >= 0 && f <= 5 && (lowestBit & 0x1555555555555555n) !== 0n;
}

/** Returns true if the cell is a leaf cell (level 30). */
export function isLeaf(id: CellID): boolean {
  return (id & 1n) !== 0n;
}

/** Returns true if the cell is a face cell (level 0). */
export function isFace(id: CellID): boolean {
  return (id & (lsbForLevel(0) - 1n)) === 0n;
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

/** Creates a CellID for a given face at level 0. */
export function cellIDFromFace(f: number): CellID {
  return ((BigInt(f) << BigInt(POS_BITS)) + lsbForLevel(0)) as CellID;
}

/**
 * Creates a CellID from a face, Hilbert curve position, and level.
 *
 * @param f - Face number (0-5)
 * @param pos - Hilbert curve position within the face
 * @param lvl - Subdivision level (0-30)
 */
export function cellIDFromFacePosLevel(f: number, pos: bigint, lvl: number): CellID {
  const rawId = (BigInt(f) << BigInt(POS_BITS)) | pos | 1n;
  return parentAtLevel(rawId as CellID, lvl);
}

// ---------------------------------------------------------------------------
// Hierarchy navigation
// ---------------------------------------------------------------------------

/**
 * Returns the immediate parent cell (one level up).
 * Panics if called on a face cell.
 */
export function parent(id: CellID): CellID {
  return parentAtLevel(id, level(id) - 1);
}

/**
 * Returns the ancestor cell at the given level.
 *
 * @param id - The cell to navigate from
 * @param lvl - Target level (must be <= current level)
 */
export function parentAtLevel(id: CellID, lvl: number): CellID {
  const newLsb = lsbForLevel(lvl);
  return ((id & -newLsb) | newLsb) as CellID;
}

/**
 * Returns the four child cells of this cell.
 * The children are ordered according to the Hilbert curve.
 */
export function children(id: CellID): readonly [CellID, CellID, CellID, CellID] {
  const l = lsb(id);
  const childLsb = l >> 2n;
  const child0 = (id - l + childLsb) as CellID;
  const step = l >> 1n;
  return [child0, (child0 + step) as CellID, (child0 + step * 2n) as CellID, (child0 + step * 3n) as CellID];
}

// ---------------------------------------------------------------------------
// Range queries
// ---------------------------------------------------------------------------

/** Returns the minimum CellID covered by this cell (at leaf level). */
export function rangeMin(id: CellID): CellID {
  return (id - (lsb(id) - 1n)) as CellID;
}

/** Returns the maximum CellID covered by this cell (at leaf level). */
export function rangeMax(id: CellID): CellID {
  return (id + (lsb(id) - 1n)) as CellID;
}

/** Returns true if this cell contains the other cell. */
export function contains(id: CellID, other: CellID): boolean {
  return rangeMin(id) <= other && other <= rangeMax(id);
}

/** Returns true if this cell intersects the other cell. */
export function intersects(id: CellID, other: CellID): boolean {
  return rangeMin(other) <= rangeMax(id) && rangeMax(other) >= rangeMin(id);
}

// ---------------------------------------------------------------------------
// Iteration
// ---------------------------------------------------------------------------

/** Mask for unsigned 64-bit arithmetic. */
const UINT64_MASK = (1n << 64n) - 1n;

/** Returns the next cell at the same level along the Hilbert curve. */
export function next(id: CellID): CellID {
  return ((id + (lsb(id) << 1n)) & UINT64_MASK) as CellID;
}

/** Returns the previous cell at the same level along the Hilbert curve. */
export function prev(id: CellID): CellID {
  return ((id - (lsb(id) << 1n)) & UINT64_MASK) as CellID;
}

// ---------------------------------------------------------------------------
// Token representation
// ---------------------------------------------------------------------------

/**
 * Converts a CellID to its hex token string representation.
 * Trailing zeros are removed for compactness.
 */
export function toToken(id: CellID): string {
  if (id === 0n) return "X";
  const hex = id.toString(16).padStart(16, "0");
  return hex.replace(/0+$/, "") || "0";
}

/**
 * Parses a CellID from a hex token string.
 *
 * @param token - Hex token (as returned by {@link toToken})
 */
export function cellIDFromToken(token: string): CellID {
  if (token === "X" || token.length === 0) return 0n as CellID;
  if (token.length > 16) return 0n as CellID;
  const padded = token.padEnd(16, "0");
  return BigInt(`0x${padded}`) as CellID;
}

// ---------------------------------------------------------------------------
// Coordinate conversions: ST <-> UV (quadratic projection)
// ---------------------------------------------------------------------------

/**
 * Converts an ST coordinate to UV using the quadratic projection.
 * ST is in [0,1]; UV is in [-1,1].
 */
export function stToUV(s: number): number {
  if (s >= 0.5) {
    return (1 / 3) * (4 * s * s - 1);
  }
  return (1 / 3) * (1 - 4 * (1 - s) * (1 - s));
}

/**
 * Converts a UV coordinate to ST using the inverse quadratic projection.
 * UV is in [-1,1]; ST is in [0,1].
 */
export function uvToST(u: number): number {
  if (u >= 0) {
    return 0.5 * Math.sqrt(1 + 3 * u);
  }
  return 1 - 0.5 * Math.sqrt(1 - 3 * u);
}

// ---------------------------------------------------------------------------
// Coordinate conversions: ST <-> IJ
// ---------------------------------------------------------------------------

/**
 * Converts an ST coordinate to the integer IJ coordinate.
 * Clamps the result to [0, MAX_SIZE - 1].
 */
export function stToIJ(s: number): number {
  return Math.max(0, Math.min(MAX_SIZE - 1, Math.floor(MAX_SIZE * s)));
}

/** Converts an SI/TI integer coordinate to ST. */
export function siTiToST(si: number): number {
  return (1.0 / (2 * MAX_SIZE)) * si;
}

// ---------------------------------------------------------------------------
// Face/UV from XYZ
// ---------------------------------------------------------------------------

/** Returns the face (0-5) containing the given point. */
export function faceFromXYZ(x: number, y: number, z: number): number {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const az = Math.abs(z);

  if (ax > ay) {
    if (ax > az) {
      return x < 0 ? 3 : 0;
    }
    return z < 0 ? 5 : 2;
  }
  if (ay > az) {
    return y < 0 ? 4 : 1;
  }
  return z < 0 ? 5 : 2;
}

/** Returns the face, u, and v coordinates for a given XYZ point on the unit sphere. */
export function faceUVFromXYZ(x: number, y: number, z: number): { face: number; u: number; v: number } {
  const f = faceFromXYZ(x, y, z);
  let u: number;
  let v: number;

  switch (f) {
    case 0:
      u = y / x;
      v = z / x;
      break;
    case 1:
      u = -x / y;
      v = z / y;
      break;
    case 2:
      u = -x / z;
      v = -y / z;
      break;
    case 3:
      u = z / x;
      v = y / x;
      break;
    case 4:
      u = z / y;
      v = -x / y;
      break;
    case 5:
      u = -y / z;
      v = -x / z;
      break;
    default:
      u = 0;
      v = 0;
      break;
  }

  return { face: f, u, v };
}

/** Returns the XYZ point on the unit sphere for a given face and UV coordinates. */
function faceUVToXYZ(f: number, u: number, v: number): Vector {
  switch (f) {
    case 0:
      return vector(1, u, v);
    case 1:
      return vector(-u, 1, v);
    case 2:
      return vector(-u, -v, 1);
    case 3:
      return vector(-1, -v, -u);
    case 4:
      return vector(v, -1, -u);
    case 5:
      return vector(v, u, -1);
    default:
      return vector(0, 0, 0);
  }
}

// ---------------------------------------------------------------------------
// cellIDFromFaceIJ / faceIJFromCellID
// ---------------------------------------------------------------------------

/**
 * Constructs a leaf CellID from face and integer (i,j) coordinates.
 * Uses the Hilbert curve lookup tables for the mapping.
 */
export function cellIDFromFaceIJ(f: number, i: number, j: number): CellID {
  let n = BigInt(f) << BigInt(POS_BITS - 1);
  let bits = f & SWAP_MASK;

  for (let k = 7; k >= 0; k--) {
    const mask = (1 << LOOKUP_BITS) - 1;
    bits += ((i >> (k * LOOKUP_BITS)) & mask) << (LOOKUP_BITS + 2);
    bits += ((j >> (k * LOOKUP_BITS)) & mask) << 2;
    bits = lookupPos[bits] ?? 0;
    n |= BigInt((bits >> 2) & ((1 << (2 * LOOKUP_BITS)) - 1)) << BigInt(k * 2 * LOOKUP_BITS);
    bits &= SWAP_MASK | INVERT_MASK;
  }

  return (n * 2n + 1n) as CellID;
}

/** Result of decomposing a CellID into face, i, j, and orientation. */
export interface FaceIJ {
  readonly face: number;
  readonly i: number;
  readonly j: number;
  readonly orientation: number;
}

/**
 * Extracts the face, (i,j) coordinates, and orientation from a CellID.
 * This is the inverse of {@link cellIDFromFaceIJ}.
 */
export function faceIJFromCellID(id: CellID): FaceIJ {
  const f = face(id);
  let bits = f & SWAP_MASK;
  let i = 0;
  let j = 0;

  for (let k = 7; k >= 0; k--) {
    const nbits = k === 7 ? MAX_LEVEL - 7 * LOOKUP_BITS : LOOKUP_BITS;
    bits += Number((id >> BigInt(k * 2 * LOOKUP_BITS + 1)) & BigInt((1 << (2 * nbits)) - 1)) << 2;
    bits = lookupIJ[bits] ?? 0;
    i = (i << LOOKUP_BITS) + ((bits >> (LOOKUP_BITS + 2)) & ((1 << LOOKUP_BITS) - 1));
    j = (j << LOOKUP_BITS) + ((bits >> 2) & ((1 << LOOKUP_BITS) - 1));
    bits &= SWAP_MASK | INVERT_MASK;
  }

  const lsbVal = lsb(id);
  if ((lsbVal & 0x1111111111111110n) !== 0n) {
    bits ^= SWAP_MASK;
  }

  return { face: f, i, j, orientation: bits };
}

// ---------------------------------------------------------------------------
// Point / LatLng conversions
// ---------------------------------------------------------------------------

/**
 * A geographic coordinate pair.
 * When used as input to or output from S2 functions, `lat` and `lng` are
 * in radians unless the function name ends in `Degrees`.
 */
export interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

/**
 * Creates a leaf CellID from a point on the unit sphere.
 *
 * @param x - X component of the unit vector
 * @param y - Y component of the unit vector
 * @param z - Z component of the unit vector
 */
export function cellIDFromPoint(x: number, y: number, z: number): CellID {
  const { face: f, u, v } = faceUVFromXYZ(x, y, z);
  const i = stToIJ(uvToST(u));
  const j = stToIJ(uvToST(v));
  return cellIDFromFaceIJ(f, i, j);
}

/**
 * Creates a leaf CellID from a `{ lat, lng }` coordinate in radians.
 *
 * @param ll - Latitude and longitude in radians
 */
export function cellIDFromLatLng({ lat, lng }: LatLng): CellID {
  const cosPhi = Math.cos(lat);
  return cellIDFromPoint(cosPhi * Math.cos(lng), cosPhi * Math.sin(lng), Math.sin(lat));
}

/** Degrees-to-radians conversion factor. */
const DEG_TO_RAD = Math.PI / 180;

/**
 * Creates a leaf CellID from a `{ lat, lng }` coordinate in degrees.
 *
 * This is the most convenient entry point for geographic coordinates.
 *
 * @param ll - Latitude in degrees (-90 to 90) and longitude in degrees (-180 to 180)
 */
export function cellIDFromLatLngDegrees({ lat, lng }: LatLng): CellID {
  return cellIDFromLatLng({ lat: lat * DEG_TO_RAD, lng: lng * DEG_TO_RAD });
}

/**
 * Returns the center of the cell as a point on the unit sphere.
 *
 * @param id - The CellID to convert
 */
export function toPoint(id: CellID): Vector {
  const { face: f, i, j } = faceIJFromCellID(id);
  const lvl = level(id);
  let delta: number;
  if (isLeaf(id)) {
    delta = 1;
  } else {
    delta = ((i >>> (MAX_LEVEL - lvl - 1)) & 1) !== 0 ? 2 : 0;
  }
  const si = 2 * i + delta;
  const ti = 2 * j + delta;
  return normalize(faceUVToXYZ(f, stToUV(siTiToST(si)), stToUV(siTiToST(ti))));
}

/**
 * Returns the center of the cell as latitude and longitude in radians.
 *
 * @param id - The CellID to convert
 * @returns An object with `lat` and `lng` in radians
 */
export function toLatLng(id: CellID): LatLng {
  const p = toPoint(id);
  return {
    lat: Math.atan2(p.z, Math.sqrt(p.x * p.x + p.y * p.y)),
    lng: Math.atan2(p.y, p.x),
  };
}

/** Radians-to-degrees conversion factor. */
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Returns the center of the cell as latitude and longitude in degrees.
 *
 * @param id - The CellID to convert
 * @returns An object with `lat` and `lng` in degrees
 */
export function toLatLngDegrees(id: CellID): LatLng {
  const ll = toLatLng(id);
  return { lat: ll.lat * RAD_TO_DEG, lng: ll.lng * RAD_TO_DEG };
}

// ---------------------------------------------------------------------------
// Edge neighbors
// ---------------------------------------------------------------------------

/**
 * Returns the four edge-adjacent cells at the same level.
 * Cells are returned in the order: bottom, right, top, left
 * (corresponding to decreasing j, increasing i, increasing j, decreasing i).
 *
 * @param id - The CellID whose edge neighbors to find
 */
export function edgeNeighbors(id: CellID): readonly [CellID, CellID, CellID, CellID] {
  const lvl = level(id);
  const size = sizeIJ(lvl);
  const { face: f, i, j } = faceIJFromCellID(id);

  return [
    parentAtLevel(cellIDFromFaceIJWrap(f, i, j - size), lvl),
    parentAtLevel(cellIDFromFaceIJWrap(f, i + size, j), lvl),
    parentAtLevel(cellIDFromFaceIJWrap(f, i, j + size), lvl),
    parentAtLevel(cellIDFromFaceIJWrap(f, i - size, j), lvl),
  ];
}

/**
 * Returns all neighbors of this cell at the given level.
 *
 * This includes the 4 edge neighbors plus the diagonal (vertex) neighbors,
 * giving the full ring of cells surrounding this cell. Handles face
 * boundary transitions correctly.
 *
 * @param id - The CellID whose neighbors to find
 * @param nbrLevel - The level at which to return neighbors
 */
export function allNeighbors(id: CellID, nbrLevel: number): readonly CellID[] {
  const { face: f, i, j } = faceIJFromCellID(id);
  const lvl = level(id);

  const result: CellID[] = [];
  const seen = new Set<bigint>();
  const selfId = parentAtLevel(id, nbrLevel) as bigint;

  function addCell(ci: number, cj: number): void {
    const nbrId = parentAtLevel(cellIDFromFaceIJWrap(f, ci, cj), nbrLevel);
    const nbrBigint = nbrId as bigint;
    if (!seen.has(nbrBigint) && nbrBigint !== selfId) {
      seen.add(nbrBigint);
      result.push(nbrId);
    }
  }

  // Size of the current cell and neighbor cell in IJ coordinates.
  const mySize = sizeIJ(lvl);
  const nbrSize = sizeIJ(nbrLevel);

  // Walk a grid of neighbor-level cells around the boundary.
  // We need to cover the full perimeter: one cell width outside each edge.
  const iMin = i - mySize / 2;
  const jMin = j - mySize / 2;
  const iMax = i + mySize / 2;
  const jMax = j + mySize / 2;

  // Bottom edge (j = jMin - nbrSize) and top edge (j = jMax)
  for (let ci = iMin - nbrSize; ci <= iMax; ci += nbrSize) {
    addCell(ci, jMin - nbrSize);
    addCell(ci, jMax);
  }

  // Left edge (i = iMin - nbrSize) and right edge (i = iMax)
  // Skip corners already covered above.
  for (let cj = jMin; cj < jMax; cj += nbrSize) {
    addCell(iMin - nbrSize, cj);
    addCell(iMax, cj);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Internal helpers for edge neighbors
// ---------------------------------------------------------------------------

/** Returns the size in IJ coordinates for a given level. */
function sizeIJ(lvl: number): number {
  return 1 << (MAX_LEVEL - lvl);
}

/**
 * Constructs a CellID from face and IJ coordinates that may be out of range,
 * wrapping to the appropriate neighboring face as needed.
 */
function cellIDFromFaceIJWrap(f: number, i: number, j: number): CellID {
  const scale = 1.0 / MAX_SIZE;
  const limit = MAX_SIZE;

  // If the coordinates are within range, use the fast path.
  if (i >= 0 && i < limit && j >= 0 && j < limit) {
    return cellIDFromFaceIJ(f, i, j);
  }

  // Convert to ST then UV then XYZ and re-project.
  const u = stToUV(scale * (i + 0.5));
  const v = stToUV(scale * (j + 0.5));
  const p = faceUVToXYZ(f, u, v);
  const { face: newFace, u: newU, v: newV } = faceUVFromXYZ(p.x, p.y, p.z);
  return cellIDFromFaceIJ(newFace, stToIJ(uvToST(newU)), stToIJ(uvToST(newV)));
}

// ---------------------------------------------------------------------------
// Sentinel
// ---------------------------------------------------------------------------

/** The sentinel value representing no cell. */
export const NONE = 0n as CellID;
