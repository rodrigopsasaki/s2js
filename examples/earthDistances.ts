// embedex: README.md

import { kmToAngle, angleToKm, mToAngle, angleToM, EARTH_RADIUS_KM } from "@s2js/earth";

// Convert distances to angles and back
const angle100km = kmToAngle(100);
console.log(angleToKm(angle100km)); // 100

const angle500m = mToAngle(500);
console.log(angleToM(angle500m)); // 500

// Earth's circumference
const circumference = 2 * Math.PI * EARTH_RADIUS_KM;
console.log(`${circumference.toFixed(0)} km`); // ~40030 km
