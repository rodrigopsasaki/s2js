// embedex: README.md

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
