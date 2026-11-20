export type EclipseBody = 'SOLAR' | 'LUNAR';
export type EclipseKindName = 'PENUMBRAL' | 'PARTIAL' | 'ANNULAR' | 'TOTAL';

export interface EclipseEvent {
  body: EclipseBody;
  kind: EclipseKindName;
  /** Instant of greatest eclipse (UT). */
  peakIso: string;
  /** Fraction of the Sun's / Moon's disc obscured at peak (0-1), when the ephemeris provides it. */
  obscuration?: number;
  /** Solar eclipses: geographic location of greatest eclipse. */
  peakLatitude?: number;
  peakLongitude?: number;
  /** Lunar eclipses: semi-durations of the penumbral / partial / total phases in minutes. */
  semiDurationPenumbralMinutes?: number;
  semiDurationPartialMinutes?: number;
  semiDurationTotalMinutes?: number;
  /** Sidereal (Lahiri, engine default) longitudes of the Sun and Moon at peak. */
  sunSiderealLongitude: number;
  moonSiderealLongitude: number;
  /** Sidereal sign (1-12) and nakshatra (1-27) of the eclipsed luminary at peak. */
  rashiIndex: number;
  nakshatraIndex: number;
}
