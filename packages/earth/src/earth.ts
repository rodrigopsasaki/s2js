/**
 * Conversions between angles/steradians and real-world distances/areas
 * using the Earth as a sphere with the standard NASA radius.
 *
 * @module
 */

import { type Angle, angleFromRadians } from "@s2js/s1";

/** Mean radius of Earth in kilometers (NASA standard). */
export const EARTH_RADIUS_KM = 6371.01;

/** Mean radius of Earth in meters. */
export const EARTH_RADIUS_M = 6_371_010;

/** Converts a distance in kilometers to an s1.Angle. */
export function kmToAngle(km: number): Angle {
  return angleFromRadians(km / EARTH_RADIUS_KM);
}

/** Converts an s1.Angle to a distance in kilometers. */
export function angleToKm(a: Angle): number {
  return (a as number) * EARTH_RADIUS_KM;
}

/** Converts a distance in meters to an s1.Angle. */
export function mToAngle(m: number): Angle {
  return angleFromRadians(m / EARTH_RADIUS_M);
}

/** Converts an s1.Angle to a distance in meters. */
export function angleToM(a: Angle): number {
  return (a as number) * EARTH_RADIUS_M;
}

/** Converts an area in squared kilometers to steradians. */
export function squaredKmToSteradians(km2: number): number {
  return km2 / (EARTH_RADIUS_KM * EARTH_RADIUS_KM);
}

/** Converts an area in steradians to squared kilometers. */
export function steradiansToSquaredKm(sr: number): number {
  return sr * EARTH_RADIUS_KM * EARTH_RADIUS_KM;
}
