import { describe, expect, it } from 'vitest';
import { parseTransitInstant } from '../../src/transit/transit-calculator';

// Regression: offset-less timestamps were parsed with the host timezone, so a
// UTC server shifted Asia/Kolkata transits by 5h30m. Run under any TZ.
describe('parseTransitInstant', () => {
  it('reads an offset-less timestamp as wall-clock time in the given IANA timezone', () => {
    expect(parseTransitInstant('2026-09-24T06:00:00', 'Asia/Kolkata').toISOString()).toBe('2026-09-24T00:30:00.000Z');
    expect(parseTransitInstant('2026-09-24T06:00', 'Asia/Kolkata').toISOString()).toBe('2026-09-24T00:30:00.000Z');
    expect(parseTransitInstant('2026-07-01T12:00:00', 'America/New_York').toISOString()).toBe('2026-07-01T16:00:00.000Z');
  });

  it('treats timestamps with Z or an explicit offset as absolute instants', () => {
    expect(parseTransitInstant('2026-09-24T00:30:00.000Z', 'America/New_York').toISOString()).toBe('2026-09-24T00:30:00.000Z');
    expect(parseTransitInstant('2026-09-24T06:00:00+05:30', 'UTC').toISOString()).toBe('2026-09-24T00:30:00.000Z');
  });

  it('rejects invalid timestamps', () => {
    expect(() => parseTransitInstant('not-a-date', 'Asia/Kolkata')).toThrow(/Invalid timestamp/);
  });
});
