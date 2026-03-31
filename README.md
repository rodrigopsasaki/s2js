<p align="center">
  <img src="https://s2geometry.io/devguide/img/s2hierarchy.gif" alt="S2 Cell Hierarchy" width="300" />
</p>

<h1 align="center">@s2js</h1>

<p align="center">
  <strong>Pure TypeScript S2 Geometry Library for Node.js</strong>
</p>

<p align="center">
  A comprehensive port of Google's <a href="https://s2geometry.io">S2 Geometry Library</a>, matching the <a href="https://github.com/golang/geo">Go reference implementation</a> head to head.
</p>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#packages">Packages</a> &bull;
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#why-s2">Why S2</a> &bull;
  <a href="#api-overview">API Overview</a>
</p>

---

## Features

- **Pure TypeScript** &mdash; no native bindings, no compilation step. Works in Node.js, Deno, Bun, browsers, and edge runtimes.
- **Full S2 API** &mdash; CellID, CellUnion, Cap, LatLngRect, Loop, Polygon, RegionCoverer, spatial queries, boolean operations, convex hull.
- **CellID as `bigint`** &mdash; full 64-bit precision for all bit operations (parent, children, level, contains).
- **Zero runtime dependencies.**
- **Strict TypeScript** &mdash; branded types for `Angle`, `ChordAngle`, and `CellID` prevent mixing representations at compile time.

## Packages

| Package                           | Description                                                 |
| --------------------------------- | ----------------------------------------------------------- |
| [`@s2js/r1`](./packages/r1)       | One-dimensional intervals                                   |
| [`@s2js/r2`](./packages/r2)       | Two-dimensional Cartesian geometry (points, rectangles)     |
| [`@s2js/r3`](./packages/r3)       | Three-dimensional vectors                                   |
| [`@s2js/s1`](./packages/s1)       | Angular geometry (angles, chord angles, circular intervals) |
| [`@s2js/s2`](./packages/s2)       | **Spherical geometry** &mdash; the main package             |
| [`@s2js/earth`](./packages/earth) | Real-world distance and area conversions                    |

The dependency graph mirrors the Go library exactly:

```
@s2js/earth ──▸ @s2js/s1
@s2js/s2 ────▸ @s2js/s1, @s2js/r1, @s2js/r2, @s2js/r3
@s2js/s1 ────▸ @s2js/r1
@s2js/r2 ────▸ @s2js/r1
@s2js/r3 ────▸ (none)
@s2js/r1 ────▸ (none)
```

## Quick Start

```bash
npm install @s2js/s2 @s2js/earth
```

### CellID basics

<embedex source="examples/cellIdBasics.ts">

```ts

import {
  cellIDFromLatLngDegrees,
  toToken,
  face,
  level,
  parentAtLevel,
  contains,
  children,
  toLatLngDegrees,
} from "@s2js/s2";

// San Francisco
const cellId = cellIDFromLatLngDegrees(37.7749, -122.4194);

console.log(toToken(cellId)); // leaf cell token
console.log(face(cellId)); // 4
console.log(level(cellId)); // 30 (leaf)

// Navigate the hierarchy
const level10 = parentAtLevel(cellId, 10);
console.log(toToken(level10)); // coarser ~10km cell

// The elegant property: containment is a prefix check
console.log(contains(level10, cellId)); // true

// Get the 4 children of a cell
const kids = children(level10);
console.log(kids.length); // 4

// Convert back to lat/lng
const center = toLatLngDegrees(level10);
console.log(center.lat, center.lng); // degrees
```

</embedex>

### Spatial containment

<embedex source="examples/spatialContainment.ts">

```ts

import { cellIDFromLatLngDegrees, contains, parentAtLevel, toToken } from "@s2js/s2";

// Two locations in San Francisco
const mission = cellIDFromLatLngDegrees(37.7599, -122.4148);
const soma = cellIDFromLatLngDegrees(37.7785, -122.3892);

// At leaf level (level 30), they are distinct cells
console.log(contains(mission, soma)); // false

// At level 13 (~1km), they are in different cells
const missionL13 = parentAtLevel(mission, 13);
const somaL13 = parentAtLevel(soma, 13);
console.log(toToken(missionL13) === toToken(somaL13)); // false

// At level 9 (~20km), they are in the SAME cell
const missionL9 = parentAtLevel(mission, 9);
const somaL9 = parentAtLevel(soma, 9);
console.log(toToken(missionL9) === toToken(somaL9)); // true

// Containment: the coarse cell contains both fine cells
console.log(contains(missionL9, mission)); // true
console.log(contains(missionL9, soma)); // true
```

</embedex>

### Region covering

<embedex source="examples/regionCovering.ts">

```ts

import {
  cellIDFromLatLngDegrees,
  parentAtLevel,
  contains,
  covering,
  level,
  toToken,
  type Region,
  type CellID,
} from "@s2js/s2";

// Define a region as a level-8 cell (~20km) around Tokyo
const target = parentAtLevel(cellIDFromLatLngDegrees(35.6762, 139.6503), 8);

const region: Region = {
  containsCell: (id: CellID) => contains(target, id),
  mayIntersect: (id: CellID) => contains(target, id) || contains(id, target),
};

// Cover the region with at most 8 cells at level 10
const cells = covering(region, { maxCells: 8, maxLevel: 10 });

for (const cell of cells) {
  console.log(toToken(cell), "level", level(cell));
}
```

</embedex>

### Earth distances

<embedex source="examples/earthDistances.ts">

```ts

import { kmToAngle, angleToKm, mToAngle, angleToM, EARTH_RADIUS_KM } from "@s2js/earth";

// Convert distances to angles and back
const angle100km = kmToAngle(100);
console.log(angleToKm(angle100km)); // 100

const angle500m = mToAngle(500);
console.log(angleToM(angle500m)); // 500

// Earth's circumference
const circumference = 2 * Math.PI * EARTH_RADIUS_KM;
console.log(`${circumference.toFixed(0)} km`); // ~40030 km
```

</embedex>

## Why S2

S2 maps the Earth's surface onto a cube, then uses the **Hilbert curve** to create a one-dimensional index of cells at 31 levels of resolution (from ~10,000km down to ~1cm). This design produces an elegant set of properties:

| Property                    | What it means                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| **Prefix containment**      | `parent.contains(child)` is a prefix check on the cell ID &mdash; no geometry needed        |
| **Resolution = truncation** | Lower resolutions are just shorter tokens of the same location                              |
| **Range scans**             | Nearby cells have numerically close IDs &mdash; spatial queries become database range scans |
| **Hierarchical**            | Every cell has exactly 4 children and 1 parent, forming a clean quadtree                    |
| **Uniform**                 | Cell areas at the same level vary by at most a factor of ~2.1                               |

These properties make S2 strictly superior to H3 for indexing, containment, and hierarchical operations &mdash; H3's hexagons can't nest cleanly, so parent-child relationships require lookup tables rather than bit manipulation.

## API Overview

### CellID &mdash; The Core

```typescript
// Construction
cellIDFromLatLng(latRad, lngRad); // leaf cell from coordinates
cellIDFromPoint(x, y, z); // leaf cell from unit sphere point
cellIDFromToken(token); // from hex token string
cellIDFromFace(face); // face cell (level 0)

// Properties
face(id); // 0-5
level(id); // 0-30
isValid(id) / isLeaf(id) / isFace(id);

// Hierarchy
parent(id) / parentAtLevel(id, level);
children(id); // [4 children]
contains(id, other); // THE elegant property
intersects(id, other);

// Traversal
next(id) / prev(id); // Hilbert curve order
edgeNeighbors(id); // 4 adjacent cells
rangeMin(id) / rangeMax(id); // leaf cell range

// Conversion
toToken(id); // hex string
toPoint(id); // unit sphere {x, y, z}
toLatLng(id); // {lat, lng} radians
```

### Regions

```typescript
// CellUnion — normalized set of cells
cellUnionFromCellIDs(ids);
cellUnionContains(cu, id) / cellUnionIntersects(cu, id);
cellUnionUnion(a, b) / cellUnionIntersection(a, b) / cellUnionDifference(a, b);

// Cap — spherical disc
capFromCenterAngle(center, angle);
capContainsPoint(cap, point);
capArea(cap);

// LatLngRect — lat/lng rectangle
latLngRectFromPointPair(a, b);
latLngRectContainsLatLng(rect, lat, lng);
latLngRectArea(rect);
```

### Geometry

```typescript
// Loop — closed boundary on the sphere
loopFromPoints(vertices);
loopContainsPoint(loop, point);
loopArea(loop);

// Polygon — collection of loops (supports holes)
polygonFromLoops(loops);
polygonContainsPoint(polygon, point);
polygonArea(polygon);

// RegionCoverer — approximate regions with cells
covering(region, { maxCells: 8, maxLevel: 15 });
interiorCovering(region, options);
```

### Queries

```typescript
// Closest edge
findClosestEdgeToPoint(loop, target);
findClosestEdgeInPolygon(polygon, target);
signedDistanceToLoop(loop, point);
isDistanceLess(loop, target, limit);

// Boolean operations (cell-based approximation)
polygonUnionApprox(a, b);
polygonIntersectionApprox(a, b);
polygonDifferenceApprox(a, b);

// Convex hull
convexHull(points);
```

## Development

```bash
# Install
pnpm install

# Build all packages
pnpm build

# Run all tests (978 tests)
pnpm test

# Lint
pnpm lint

# Type check
pnpm typecheck
```

## Architecture

- **Functional-first** &mdash; pure functions operating on immutable interfaces, no classes
- **Branded types** &mdash; `Angle`, `ChordAngle`, and `CellID` are branded to prevent accidental mixing
- **ESM-only** &mdash; targets Node.js 22+, ES2023
- **Strict TypeScript** &mdash; all strict flags enabled including `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`
- **Monorepo** &mdash; pnpm workspaces + Nx for build orchestration

## License

[MIT](./LICENSE)
