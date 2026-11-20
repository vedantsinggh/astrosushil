import { BirthDetails } from '../../src/input/birth-details';
import { AstrologyConfig } from '../../src/configuration/astrology-config';
import { PlanetSymbol } from '../../src/planets/planet.types';

export interface ExpectedPlanetData {
  longitude: number;
  rashiIndex: number;
  rashiName: string;
  nakshatraIndex: number;
  nakshatraName: string;
  pada: number;
  isRetrograde: boolean;
}

export interface ReferenceChartFixture {
  id: string;
  description: string;
  birthDetails: BirthDetails;
  config: AstrologyConfig;
  expected: {
    julianDayUT: number;
    utcIsoString: string;
    planets: Record<string, ExpectedPlanetData>;
  };
  sourceReference: string; // e.g. "Verified Client Reference Chart #1"
}

/**
 * Independent source data for REF_CHART_001 (1990-05-15 09:00:00 UT = JD 2448026.875 UT).
 *
 * TROPICAL positions: NASA/JPL Horizons (https://ssd.jpl.nasa.gov/api/horizons.api), fetched 2026-11-20.
 * Exact query, one per body (COMMAND = 10 Sun, 301 Moon, 199 Mercury, 299 Venus, 499 Mars,
 * 599 Jupiter, 699 Saturn, 799 Uranus, 899 Neptune, 999 Pluto):
 *   https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND='<id>'&OBJ_DATA='NO'
 *     &MAKE_EPHEM='YES'&EPHEM_TYPE='OBSERVER'&CENTER='500@399'
 *     &TLIST='2448026.375','2448026.875','2448027.375'&TLIST_TYPE='JD'&TIME_TYPE='UT'
 *     &QUANTITIES='20,31'&ANG_FORMAT='DEG'&EXTRA_PREC='YES'
 * Quantity 31 = geocentric ecliptic-of-date longitude/latitude of the APPARENT position
 * (light-time, gravitational deflection, stellar aberration). `dailyMotion` is the
 * longitude difference between the 2448026.375 and 2448027.375 rows (1 day), which also
 * gives the retrograde flag (negative motion = retrograde).
 *
 * MEAN LUNAR NODE (Rahu/Ketu): Horizons does not publish a mean node, so it comes from the
 * published formula in Meeus, "Astronomical Algorithms" 2nd ed., eq. 47.7:
 *   Omega = 125.0445479 - 1934.1362891 T + 0.0020754 T^2 + T^3/467441 - T^4/60616000
 *   with T = (JD - 2451545.0) / 36525 = -0.0963210130  =>  Omega = 311.3425338 deg.
 * Sanity check: Horizons osculating Moon node (EPHEM_TYPE='ELEMENTS', COMMAND='301',
 * CENTER='500@399', REF_PLANE='ECLIPTIC', REF_SYSTEM='J2000') gives OM = 310.402 deg (J2000
 * ecliptic), i.e. within the ~1.7 deg mean-vs-true node envelope.
 *
 * LAHIRI AYANAMSA (true Chitrapaksha, client decision ADR-017): Indian Astronomical Ephemeris 2027
 * (Positional Astronomy Centre, Kolkata) p. 382 / p. 423: mean ayanamsa = 23°51'25".53 at J2000 +
 * IAU 2006 general precession pA (Capitaine et al. 2003); true = mean + nutation in longitude.
 * Evaluated independently in tests/fixtures/ayanamsa-reference.ts (Meeus ch. 22 nutation, 0.5")
 * at JD 2448026.875 (+57 s Delta T):  mean 23.7225449 deg, nutation +0.0032337 deg,
 * TRUE 23.7257785 deg. The planets (apparent, true equinox of date) use the TRUE value; the mean
 * node (Meeus, mean equinox of date) uses the MEAN value.
 * (Until engine 0.2.0 this fixture used 23.7270885 deg: the ICRC value 23°15'00".658 treated as a
 * mean ayanamsa and propagated with Newcomb's rate. The IAE states the 1956 value is a true
 * ayanamsa, so the old figure was 0.0013 deg too high for planets and 0.0045 deg for the nodes.)
 *
 * Fact checks: sidereal Sun 30.55 deg = 0.55 deg into Vrishabha, consistent with Vrishabha
 * Sankranti on 14/15 May 1990 (Sun moves ~0.96 deg/day). Moon - Sun elongation = 241.3 deg,
 * consistent with the waning Moon six days after the Full Moon of 1990-05-09.
 */
export const REF_CHART_001_SOURCE = {
  julianDayUT: 2448026.875,
  horizonsTropical: {
    SUN: { longitude: 54.2755655, latitude: -0.0000283, distanceAU: 1.01087261572794, dailyMotion: 0.9642616 },
    MOON: { longitude: 295.6195136, latitude: -1.2783803, distanceAU: 0.00264653580377, dailyMotion: 12.3288368 },
    MERCURY: { longitude: 38.0280756, latitude: -2.495234, distanceAU: 0.60082839444154, dailyMotion: -0.1296287 },
    VENUS: { longitude: 12.6757335, latitude: -1.7932409, distanceAU: 1.03706198858343, dailyMotion: 1.1404351 },
    MARS: { longitude: 348.2409959, latitude: -1.7287412, distanceAU: 1.45735626646566, dailyMotion: 0.7427622 },
    JUPITER: { longitude: 99.5180914, latitude: 0.1424267, distanceAU: 5.86150539971964, dailyMotion: 0.1890378 },
    SATURN: { longitude: 295.2515022, latitude: 0.1552388, distanceAU: 9.48647205097934, dailyMotion: -0.0167064 },
    URANUS: { longitude: 279.1869306, latitude: -0.3147087, distanceAU: 18.6748914716288, dailyMotion: -0.0244994 },
    NEPTUNE: { longitude: 284.3547057, latitude: 0.8724093, distanceAU: 29.5486447698219, dailyMotion: -0.0146672 },
    PLUTO: { longitude: 226.1708513, latitude: 15.9918746, distanceAU: 28.6947622375686, dailyMotion: -0.0277212 },
  },
  meanNodeTropical: 311.3425338,
  /** True Lahiri ayanamsa (IAE), applied to the planets. */
  lahiriAyanamsa: 23.7257785,
  /** Mean Lahiri ayanamsa (IAE), applied to the mean node. */
  lahiriMeanAyanamsa: 23.7225449,
  /** Engine tropical positions vs Horizons (astronomy-engine VSOP87/ELP), degrees. */
  tropicalToleranceDeg: 0.01,
  /** Engine true Lahiri vs the IAE formula above (0.5" nutation series + margin), degrees. */
  ayanamsaToleranceDeg: 0.0003,
  /** Engine sidereal vs fixture sidereal = tropical + ayanamsa tolerances, degrees. */
  siderealToleranceDeg: 0.0103,
} as const;

/** Fixture sidereal longitude from the independent tropical value and the reference ayanamsa. */
function sidereal(tropical: number, ayanamsa: number = REF_CHART_001_SOURCE.lahiriAyanamsa): number {
  // planets: true ayanamsa (default); nodes pass REF_CHART_001_SOURCE.lahiriMeanAyanamsa
  return Math.round((((tropical - ayanamsa) % 360) + 360) % 360 * 1e6) / 1e6;
}

export const BENCHMARK_REFERENCE_CHARTS: ReferenceChartFixture[] = [
  {
    id: 'REF_CHART_001',
    description: 'Reference Natal Chart #1 - New Delhi, India (IST)',
    birthDetails: {
      date: { year: 1990, month: 5, day: 15 },
      time: { hour: 14, minute: 30, second: 0 },
      timezone: 'Asia/Kolkata',
      latitude: 28.6139,
      longitude: 77.209,
      placeName: 'New Delhi, India',
    },
    config: {
      zodiacType: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
      nodeCalculation: 'MEAN_NODE',
      planetaryCalculationMode: 'GEOCENTRIC',
      precisionDegrees: 0.0001,
      roundingRule: 'NEAREST',
      dashaSystem: 'VIMSHOTTARI',
    },
    expected: {
      julianDayUT: 2448026.875,
      utcIsoString: '1990-05-15T09:00:00.000Z',
      // Sidereal (true Lahiri, ADR-017) longitude = REF_CHART_001_SOURCE tropical - lahiriAyanamsa
      // (23.7257785; nodes - lahiriMeanAyanamsa 23.7225449), i.e. Sun 30.549787, Moon 271.893735,
      // Mars 324.515217, Mercury 14.302297, Jupiter 75.792313, Venus 348.949955, Saturn 271.525724,
      // Rahu 287.619989, Ketu 107.619989 (each 0.0013 deg / nodes 0.0045 deg above the pre-0.2.0
      // values; no sign, nakshatra or pada changes).
      // The source of truth is TROPICAL + an explicit ayanamsa, so sidereal values can be recomputed
      // if the ayanamsa definition changes (e.g. true Chitrapaksha). Every value is >= 0.5 deg from a rashi/nakshatra/pada boundary, so the sign, nakshatra
      // and pada below do not depend on the ayanamsa tolerance.
      planets: {
        [PlanetSymbol.SUN]: {
          longitude: sidereal(REF_CHART_001_SOURCE.horizonsTropical.SUN.longitude), rashiIndex: 2, rashiName: 'Vrishabha',
          nakshatraIndex: 3, nakshatraName: 'Krittika', pada: 2, isRetrograde: false,
        },
        [PlanetSymbol.MOON]: {
          longitude: sidereal(REF_CHART_001_SOURCE.horizonsTropical.MOON.longitude), rashiIndex: 10, rashiName: 'Makara',
          nakshatraIndex: 21, nakshatraName: 'Uttara Ashadha', pada: 2, isRetrograde: false,
        },
        [PlanetSymbol.MARS]: {
          longitude: sidereal(REF_CHART_001_SOURCE.horizonsTropical.MARS.longitude), rashiIndex: 11, rashiName: 'Kumbha',
          nakshatraIndex: 25, nakshatraName: 'Purva Bhadrapada', pada: 2, isRetrograde: false,
        },
        [PlanetSymbol.MERCURY]: {
          longitude: sidereal(REF_CHART_001_SOURCE.horizonsTropical.MERCURY.longitude), rashiIndex: 1, rashiName: 'Mesha',
          nakshatraIndex: 2, nakshatraName: 'Bharani', pada: 1, isRetrograde: true,
        },
        [PlanetSymbol.JUPITER]: {
          longitude: sidereal(REF_CHART_001_SOURCE.horizonsTropical.JUPITER.longitude), rashiIndex: 3, rashiName: 'Mithuna',
          nakshatraIndex: 6, nakshatraName: 'Ardra', pada: 3, isRetrograde: false,
        },
        [PlanetSymbol.VENUS]: {
          longitude: sidereal(REF_CHART_001_SOURCE.horizonsTropical.VENUS.longitude), rashiIndex: 12, rashiName: 'Meena',
          nakshatraIndex: 27, nakshatraName: 'Revati', pada: 1, isRetrograde: false,
        },
        [PlanetSymbol.SATURN]: {
          longitude: sidereal(REF_CHART_001_SOURCE.horizonsTropical.SATURN.longitude), rashiIndex: 10, rashiName: 'Makara',
          nakshatraIndex: 21, nakshatraName: 'Uttara Ashadha', pada: 2, isRetrograde: true,
        },
        [PlanetSymbol.RAHU]: {
          longitude: sidereal(REF_CHART_001_SOURCE.meanNodeTropical, REF_CHART_001_SOURCE.lahiriMeanAyanamsa), rashiIndex: 10, rashiName: 'Makara',
          nakshatraIndex: 22, nakshatraName: 'Shravana', pada: 3, isRetrograde: true,
        },
        [PlanetSymbol.KETU]: {
          longitude: sidereal(REF_CHART_001_SOURCE.meanNodeTropical + 180, REF_CHART_001_SOURCE.lahiriMeanAyanamsa), rashiIndex: 4, rashiName: 'Karka',
          nakshatraIndex: 9, nakshatraName: 'Ashlesha', pada: 1, isRetrograde: true,
        },
      },
    },
    sourceReference:
      'JPL Horizons apparent geocentric ecliptic-of-date positions + Meeus mean node + IAE true/mean Lahiri ayanamsa (see REF_CHART_001_SOURCE)',
  },
];
