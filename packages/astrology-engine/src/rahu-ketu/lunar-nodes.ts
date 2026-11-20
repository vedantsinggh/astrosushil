import * as Astronomy from 'astronomy-engine';
import { julianDayUTtoTT, nutationInLongitudeDegrees } from '../ayanamsa/ayanamsa';

/**
 * Lunar nodes (Rahu = ascending node, Ketu = Rahu + 180°).
 *
 * Client decision 2026-11-20 (docs/decisions.md ADR-017): MEAN node by default, TRUE node selectable.
 * Both are returned as TROPICAL longitudes referred to the MEAN equinox of date, so the sidereal
 * value is `longitude - mean ayanamsa` (see ayanamsa.ts).
 *
 * MEAN NODE: Meeus, "Astronomical Algorithms" 2nd ed., eq. 47.7 (T = Julian centuries TT from J2000):
 *   Omega = 125.0445479 - 1934.1362891 T + 0.0020754 T^2 + T^3/467441 - T^4/60616000
 *
 * TRUE NODE: the osculating ascending node of the Moon's geocentric orbit on the ecliptic of date,
 * i.e. the node of the instantaneous orbital plane (normal = r x v) from astronomy-engine's
 * GeoMoonState. This is the definition used by JPL Horizons (osculating elements, OM) and by
 * the "true node" of astrological software. Verified against Horizons within 0.003° for
 * 1900-2068 (tests/unit/lunar-nodes.reference.test.ts). Meeus' 5-term periodic correction to the
 * mean node (p. 344) was evaluated and NOT used: it differs from the Horizons osculating node by
 * up to 0.40° on the same test dates.
 */

export type LunarNodeType = 'MEAN_NODE' | 'TRUE_NODE';

export interface LunarNodePosition {
  type: LunarNodeType;
  /** Tropical longitude of Rahu, mean equinox of date, degrees [0, 360). */
  rahuLongitude: number;
  /** Ketu = Rahu + 180°. */
  ketuLongitude: number;
  /** Daily motion of the node, degrees/day (negative = retrograde). */
  speedLongitude: number;
}

const DEG = Math.PI / 180;

function norm360(x: number): number {
  return ((x % 360) + 360) % 360;
}

/** Meeus eq. 47.7 mean ascending node, mean equinox of date (degrees). */
export function meanLunarNodeLongitudeTT(julianDayTT: number): number {
  const T = (julianDayTT - 2451545.0) / 36525;
  return norm360(
    125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441 - (T * T * T * T) / 60616000
  );
}

/** Mean node daily motion from eq. 47.7 (degrees/day). */
function meanLunarNodeSpeed(julianDayTT: number): number {
  const T = (julianDayTT - 2451545.0) / 36525;
  const dOmegaDT = -1934.1362891 + 2 * 0.0020754 * T + (3 * T * T) / 467441 - (4 * T * T * T) / 60616000;
  return dOmegaDT / 36525;
}

/** Osculating (true) ascending node, mean equinox of date (degrees), at a TT instant. */
export function trueLunarNodeLongitudeTT(julianDayTT: number): number {
  return osculatingNode(Astronomy.AstroTime.FromTerrestrialTime(julianDayTT - 2451545.0));
}

/**
 * Osculating node at an astronomy-engine time. Times are built from UT exactly as the ephemeris
 * adapter builds them (MakeTime(JD_UT - 2451545)), so astronomy-engine's internal nutation cache
 * sees bit-identical instants and results never depend on call order.
 */
function osculatingNode(time: Astronomy.AstroTime): number {
  const s = Astronomy.GeoMoonState(time);
  const hx = s.y * s.vz - s.z * s.vy;
  const hy = s.z * s.vx - s.x * s.vz;
  const hz = s.x * s.vy - s.y * s.vx;
  let h = new Astronomy.Vector(hx, hy, hz, time);
  h = Astronomy.RotateVector(Astronomy.Rotation_EQJ_EQD(time), h);
  h = Astronomy.RotateVector(Astronomy.Rotation_EQD_ECT(time), h);
  // Ascending node direction = z_ecliptic x h = (-h.y, h.x, 0).
  const nodeTrueEquinox = Math.atan2(h.x, -h.y) / DEG;
  return norm360(nodeTrueEquinox - nutationInLongitudeDegrees(time.tt + 2451545.0));
}

export function calculateLunarNodes(julianDayUT: number, type: LunarNodeType = 'MEAN_NODE'): LunarNodePosition {
  const jdTT = julianDayUTtoTT(julianDayUT);
  if (type === 'TRUE_NODE') {
    const at = (offsetDays: number) => osculatingNode(Astronomy.MakeTime(julianDayUT - 2451545.0 + offsetDays));
    const rahu = at(0);
    const h = 1 / 24;
    let delta = at(h) - at(-h);
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return { type, rahuLongitude: rahu, ketuLongitude: norm360(rahu + 180), speedLongitude: delta / (2 * h) };
  }
  const rahu = meanLunarNodeLongitudeTT(jdTT);
  return { type: 'MEAN_NODE', rahuLongitude: rahu, ketuLongitude: norm360(rahu + 180), speedLongitude: meanLunarNodeSpeed(jdTT) };
}
