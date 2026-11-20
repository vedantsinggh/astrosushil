import { BirthInput } from '../src/protocol';

/**
 * Same birth data as the engine fixture REF_CHART_001
 * (packages/astrology-engine/tests/fixtures/reference-charts.ts): New Delhi, 1990-05-15 14:30 IST.
 * Only the time conversion values (UTC instant, Julian Day) are taken from that fixture; they are
 * independently checkable (14:30 IST = 09:00 UTC; JD of 1990-05-15 09:00 UT = 2448026.875).
 * NOTE: the fixture's planet longitudes (e.g. Sun 50.2541) do NOT match the real sky for this
 * date and are not asserted anywhere in the engine suite against real ephemeris; we do not use them.
 */
export const REF_BIRTH: BirthInput = {
  name: 'Reference Chart 001',
  date: '1990-05-15',
  time: '14:30:00',
  timezone: 'Asia/Kolkata',
  latitude: 28.6139,
  longitude: 77.209,
  placeName: 'New Delhi, India',
};
export const REF_UTC = '1990-05-15T09:00:00.000Z';
export const REF_JD = 2448026.875;
