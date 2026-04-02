<p align="center">
  <img src="https://s2geometry.io/devguide/img/s2hierarchy.gif" alt="S2 Cell Hierarchy" width="300" />
</p>

<h1 align="center">@s2js</h1>

<p align="center">
  <strong>Pure TypeScript S2 Geometry for Node.js</strong>
</p>

<p align="center">
  Index locations. Find nearby points. Cover regions with cells. No native bindings.
</p>

<p align="center">
  <a href="#install">Install</a> &bull;
  <a href="#what-is-s2">What is S2</a> &bull;
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#api">API</a> &bull;
  <a href="#packages">Packages</a>
</p>

---

## Install

```bash
npm install @s2js/s2
```

```bash
npm install @s2js/earth   # real-world distance utilities
```

## What is S2

S2 is Google's spherical geometry library. It maps every point on Earth to a 64-bit integer — a **CellID** — by projecting the globe onto a cube and indexing the surface with a Hilbert curve.

The result is a hierarchy of cells at 31 levels of resolution (from 85 million km² at level 0 down to ~1 cm² at level 30):

```
level 0  ≈ face of a cube  (85,000,000 km²)
level 5  ≈ country         (    250,000 km²)
level 10 ≈ city            (      1,000 km²)
level 13 ≈ neighbourhood   (          1 km²)
level 20 ≈ city block      (       1200 m²)
level 30 ≈ thumbnail       (          1 cm²)
```

This gives you three things for free:

- **Spatial indexing** — store CellIDs in any ordered database; nearby places have nearby IDs.
- **Containment as arithmetic** — `parent.contains(child)` is a prefix check on the integer.
- **Region covering** — approximate any shape (polygon, cap, corridor) with a small set of cells, then query it as a range scan.

## Quick Start

### Index a location

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
const cellId = cellIDFromLatLngDegrees({ lat: 37.7749, lng: -122.4194 });

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

### Check if two places share a cell

<embedex source="examples/spatialContainment.ts">

```ts

import { cellIDFromLatLngDegrees, contains, parentAtLevel, toToken } from "@s2js/s2";

// Two locations in San Francisco
const mission = cellIDFromLatLngDegrees({ lat: 37.7599, lng: -122.4148 });
const soma = cellIDFromLatLngDegrees({ lat: 37.7785, lng: -122.3892 });

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

### Cover a region with cells

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
const target = parentAtLevel(cellIDFromLatLngDegrees({ lat: 35.6762, lng: 139.6503 }), 8);

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

## API

### CellID — the core type

```typescript
// From geographic coordinates
cellIDFromLatLngDegrees({ lat: 37.7749, lng: -122.4194 }); // degrees (most common)
cellIDFromLatLng({ lat: 0.659, lng: -2.136 });             // radians
cellIDFromPoint(x, y, z);                                  // unit sphere point
cellIDFromToken("89c25a3");                                // from stored token

// Hierarchy
parent(id);                    // one level up
parentAtLevel(id, level);      // jump to any level
children(id);                  // [4 children]
contains(id, other);           // THE elegant property — true when other is a descendant
intersects(id, other);

// Properties
face(id);   // 0–5
level(id);  // 0–30
isLeaf(id); // level === 30

// Traversal
next(id) / prev(id);           // Hilbert curve order
edgeNeighbors(id);             // 4 sharing-edge neighbors
allNeighbors(id, level);       // all cells at given level that touch this one
rangeMin(id) / rangeMax(id);   // leaf-cell range for database queries

// Conversion
toToken(id);           // hex string for storage
toPoint(id);           // { x, y, z } unit vector
toLatLng(id);          // { lat, lng } radians
toLatLngDegrees(id);   // { lat, lng } degrees
```

### Regions

```typescript
// Cap — spherical disc (center + angular radius)
capFromCenterAngle(center, angle);
capContainsPoint(cap, point);
capArea(cap);

// LatLngRect — lat/lng bounding box
latLngRectFromPointPair(a, b);
latLngRectContainsLatLng(rect, { lat, lng });
latLngRectArea(rect);

// CellUnion — normalized set of non-overlapping cells
cellUnionFromCellIDs(ids);
cellUnionContains(cu, id);
cellUnionUnion(a, b) / cellUnionIntersection(a, b) / cellUnionDifference(a, b);

// RegionCoverer — approximate any shape with cells
covering(region, { maxCells: 8, maxLevel: 15 });
interiorCovering(region, options);
```

### Geometry

```typescript
// Loop — closed polygon on the sphere
loopFromPoints(vertices);          // vertices are { x, y, z } unit vectors
loopContainsPoint(loop, point);
loopArea(loop);

// Polygon — loop with optional holes
polygonFromLoops(loops);
polygonContainsPoint(polygon, point);
polygonArea(polygon);

// Convex hull
convexHull(points);
```

### Queries

```typescript
// Distance
findClosestEdgeToPoint(loop, target);
findClosestEdgeInPolygon(polygon, target);
signedDistanceToLoop(loop, point);   // negative = inside
isDistanceLess(loop, target, limit);

// Boolean operations (cell-covering approximation)
polygonUnionApprox(a, b);
polygonIntersectionApprox(a, b);
polygonDifferenceApprox(a, b);
```

## Packages

This is a monorepo. You only need `@s2js/s2` for geographic work — the lower-level packages are for geometric primitives.

| Package | Description |
| --- | --- |
| [`@s2js/s2`](./packages/s2) | **Spherical geometry** — CellID, regions, polygons, queries |
| [`@s2js/earth`](./packages/earth) | Distance and area conversions (km ↔ angle) |
| [`@s2js/s1`](./packages/s1) | Angular intervals and chord angles |
| [`@s2js/r3`](./packages/r3) | 3D vectors |
| [`@s2js/r2`](./packages/r2) | 2D points and rectangles |
| [`@s2js/r1`](./packages/r1) | 1D intervals |

## Design

- **Functional** — pure functions on immutable data, no classes
- **No native bindings** — pure TypeScript, runs in Node.js, Deno, Bun, browsers, edge runtimes
- **Branded types** — `CellID`, `Angle`, and `ChordAngle` are distinct types at compile time; `{ lat, lng }` objects prevent coordinate-swap bugs
- **Strict TypeScript** — all strict flags including `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`
- **ESM-only** — targets Node.js 22+, ES2023

## Development

```bash
pnpm install
pnpm build       # build all packages
pnpm test        # run all tests
pnpm typecheck
pnpm lint
```

## License

[MIT](./LICENSE)
