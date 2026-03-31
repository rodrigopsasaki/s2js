// embedex: README.md

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
