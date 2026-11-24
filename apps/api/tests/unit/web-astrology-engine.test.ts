/**
 * Website-compatible kundli and match-making: response shapes against a reference chart, the
 * timezone correction, the removed dosha sections, neutral wording, the chart SVG and the cache.
 *
 * Reference chart: REF-001 of reference-astrology-fixtures.test.ts (New Delhi, 1990-05-15
 * 14:30 IST). Every expected astrological value below is what the engine itself returns for it
 * through AstrologyService (POST /astrology/kundli, /astrology/matchmaking); the tests check that
 * the website shape carries those values unchanged.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

vi.mock('../../src/services/prisma.service', () => ({ prisma: {} }));

import {
  ManglikComparisonResult,
  ManglikStatus,
  MatchmakingCalculator,
  NormalizedChart,
  RASHIS,
  SadeSatiPeriodsResult,
  SaturnSignSegment,
} from '@astro/astrology-engine';
import { astrologyService } from '../../src/modules/astrology/astrology.service';
import { ResultCache, WebAstrologyService } from '../../src/modules/web-astrology/web-astrology.service';
import { webKundliQuerySchema, webMatchQuerySchema } from '../../src/modules/web-astrology/web-astrology.schemas';
import { mapManglik, mapMatchManglikReport, mapSadeSatiStatus } from '../../src/modules/web-astrology/web-astrology.mapper';
import {
  NORTH_INDIAN_HOUSES,
  occupantsByHouse,
  rashiNumberOfHouse,
  renderNorthIndianChartSvg,
} from '../../src/modules/web-astrology/web-astrology.chart-svg';
import { PlaceTimezoneMemo, TimezoneRequiredError } from '../../src/modules/web-astrology/web-astrology.timezone';

const NOW = new Date('2026-11-24T06:00:00.000Z');
const ALL_KUNDLI_LABELS =
  'astro_details,basic_panchang,planets,manglik,kalsarpa_details,pitra_dosha_report,sadhesati_current_status,vimshottri_major_vdasha,vimshottri_antar_vdasha,birth_chart';
const ALL_MATCH_LABELS =
  'match_ashtakoot_points,match_birth_details,match_astro_details,match_percentage,match_making_report,match_manglik_report,match_planet_details,match_dashakoot_points,match_obstructions';

const REF = { latitude: '28.6139', longitude: '77.2090', dob: '15-05-1990', hour: '14', min: '30' };
const REF_DIRECT = {
  name: 'Reference',
  dateOfBirth: '1990-05-15',
  timeOfBirth: '14:30:00',
  latitude: 28.6139,
  longitude: 77.209,
  timezone: 'Asia/Kolkata',
};
const GIRL_DIRECT = {
  name: 'Reference 2',
  dateOfBirth: '1992-08-21',
  timeOfBirth: '06:15:00',
  latitude: 19.076,
  longitude: 72.8777,
  timezone: 'Asia/Kolkata',
};

function newService(extra: { places?: Array<{ displayName: string; latitude: number; longitude: number; timezone: string }> } = {}) {
  const searchPlaces = vi.fn(async () =>
    (extra.places ?? []).map((p, i) => ({ id: `p${i}`, name: p.displayName, country: 'X', countryCode: 'XX', ...p }))
  );
  const getTodayPrediction = vi.fn(async (_userId: string | undefined, query?: unknown) => ({ data: { query } }));
  const service = new WebAstrologyService({
    now: () => NOW,
    places: { searchPlaces },
    horoscope: { getTodayPrediction },
    timezones: new PlaceTimezoneMemo({ get: async () => null, set: async () => undefined }),
    cache: new ResultCache(),
  });
  return { service, searchPlaces, getTodayPrediction };
}

type Json = Record<string, any>;

/** Words that would present a placement as an affliction. None may appear in any response. */
const AFFLICTION_WORDING = /dosha|\bdosh\b|afflict|curse|malefic|inauspicious|\bevil\b|danger|\bharm(s|ful|ed)?\b|suffer|bad luck|unlucky|problem/i;

describe('free kundli (REF-001)', () => {
  let out: Json;
  let engine: NormalizedChart;

  beforeAll(async () => {
    const { service } = newService();
    out = await service.kundli(webKundliQuerySchema.parse({ ...REF, timezone: 'Asia/Kolkata', label: ALL_KUNDLI_LABELS }));
    engine = (await astrologyService.calculateChartForDirectInput(REF_DIRECT)).normalizedChart as NormalizedChart;
  }, 60000);

  it('returns the sections our engine computes and never the Kalsarpa or Pitra sections', () => {
    expect(Object.keys(out).sort()).toEqual(
      [
        'astro_details',
        'basic_panchang',
        'birth_chart',
        'calculation',
        'manglik',
        'planets',
        'sadhesati_current_status',
        'vimshottri_antar_vdasha',
        'vimshottri_major_vdasha',
      ].sort()
    );
    const text = JSON.stringify(out).toLowerCase();
    expect(text).not.toContain('kalsarp');
    expect(text).not.toContain('kaal sarp');
    expect(text).not.toContain('pitra');
    expect(text).not.toContain('pitri');
  });

  it('astro_details carries the fields the website page reads, with the values of the engine chart', () => {
    const moon = engine.planets.find((p) => p.name === 'MOON')!;
    expect(out.astro_details).toMatchObject({
      // Fixture: values of the engine for REF-001.
      ascendant: 'Virgo',
      ascendant_lord: 'Mercury',
      sign: 'Capricorn',
      SignLord: 'Saturn',
      Naksahtra: 'Uttara Ashadha',
      NaksahtraLord: 'Sun',
      Charan: 2,
    });
    // ... and they are the engine's, not constants of this test.
    expect(out.astro_details.ascendant).toBe(RASHIS[engine.ascendant.rashiIndex - 1].englishName);
    expect(out.astro_details.ascendant_sanskrit).toBe(RASHIS[engine.ascendant.rashiIndex - 1].sanskritName);
    expect(out.astro_details.sign).toBe(RASHIS[moon.rashiIndex - 1].englishName);
    expect(out.astro_details.Naksahtra).toBe(moon.nakshatra);
    expect(out.astro_details.Charan).toBe(moon.pada);
    for (const key of ['Varna', 'Vashya', 'Yoni', 'Gan', 'Nadi', 'Yog', 'Karan', 'Tithi', 'yunja', 'tatva', 'name_alphabet', 'paya']) {
      expect(typeof out.astro_details[key], key).toBe('string');
      expect(out.astro_details[key].length, key).toBeGreaterThan(0);
    }
  });

  it('astro_details agrees with the Avakhada values of POST /astrology/avakhada', async () => {
    const { avakhada } = await astrologyService.calculateAvakhada({ birthDetails: REF_DIRECT } as never);
    expect(out.astro_details).toMatchObject({
      Varna: avakhada.varna,
      Vashya: avakhada.vashya,
      Yoni: avakhada.yoni,
      Gan: avakhada.gana,
      Nadi: avakhada.nadi,
      name_alphabet: avakhada.namakshara,
      paya: avakhada.paya,
      tatva: avakhada.tatwa,
      yunja: avakhada.yunja,
    });
  });

  it('planets: nine planets and the Ascendant, each value equal to the engine chart of POST /astrology/kundli', () => {
    expect(out.planets.map((p: Json) => p.name)).toEqual(['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu', 'Ascendant']);
    for (const row of out.planets.slice(0, 9) as Json[]) {
      const p = engine.planets.find((x) => x.name === row.name.toUpperCase())!;
      expect(row.fullDegree).toBeCloseTo(p.absoluteDegree, 4);
      expect(row.normDegree).toBeCloseTo(p.degree, 4);
      expect(row.speed).toBeCloseTo(p.speedLongitude as number, 6);
      expect(row.isRetro).toBe(p.retrograde);
      expect(row.house).toBe(p.house);
      expect(row.sign).toBe(RASHIS[p.rashiIndex - 1].englishName);
      expect(row.sign_lord.toUpperCase()).toBe(RASHIS[p.rashiIndex - 1].ruler);
      expect(row.nakshatra).toBe(p.nakshatra);
      expect(row.nakshatraLord.toUpperCase()).toBe(String(p.nakshatraLord).toUpperCase());
      expect(row.nakshatra_pad).toBe(p.pada);
      expect(typeof row.isRetro).toBe('boolean');
      expect(typeof row.id).toBe('number');
    }
    const asc = out.planets[9];
    expect(asc).toMatchObject({ name: 'Ascendant', house: 1, isRetro: false, sign: 'Virgo', sign_lord: 'Mercury', nakshatra_pad: engine.ascendant.pada });
    expect(asc.fullDegree).toBeCloseTo(engine.ascendant.absoluteDegree, 4);
    // Fixture (REF-001): the Sun is in Taurus, as the approved reference case expects.
    expect(out.planets[0].sign).toBe('Taurus');
  });

  it('basic_panchang has the vendor keys; sunrise and sunset are local times of the birth place', () => {
    expect(Object.keys(out.basic_panchang).sort()).toEqual(['day', 'karan', 'nakshatra', 'sunrise', 'sunset', 'tithi', 'yog'].sort());
    expect(out.basic_panchang.day).toBe('Tuesday'); // 1990-05-15
    expect(out.basic_panchang.nakshatra).toBe(out.astro_details.Naksahtra);
    expect(out.basic_panchang.sunrise).toMatch(/^05:\d\d:\d\d$/);
    expect(out.basic_panchang.sunset).toMatch(/^19:\d\d:\d\d$/);
  });

  it('Vimshottari: the periods of POST /astrology/dasha in the vendor shape', async () => {
    const dasha = await astrologyService.calculateDasha({ birthDetails: REF_DIRECT, dashaSystem: 'VIMSHOTTARI', maxLevel: 2 });
    const mahadashas = (dasha.tree as Json).mahadashas as Json[];
    expect(out.vimshottri_major_vdasha).toEqual(
      mahadashas.map((m) => ({ planet: m.lord.charAt(0) + m.lord.slice(1).toLowerCase(), start: m.startDateIso, end: m.endDateIso }))
    );
    expect(Object.keys(out.vimshottri_antar_vdasha)).toEqual(out.vimshottri_major_vdasha.map((m: Json) => m.planet));
    const firstLord = out.vimshottri_major_vdasha[0].planet;
    expect(out.vimshottri_antar_vdasha[firstLord]).toEqual(
      mahadashas[0].subPeriods.map((s: Json) => ({ planet: s.lord.charAt(0) + s.lord.slice(1).toLowerCase(), start: s.startDateIso, end: s.endDateIso }))
    );
    for (const list of Object.values(out.vimshottri_antar_vdasha) as Json[][]) {
      expect(list.length).toBeGreaterThan(0);
      expect(Object.keys(list[0]).sort()).toEqual(['end', 'planet', 'start']);
    }
  });

  it('Manglik is exactly the per-person result of the matchmaking engine, with its factors', async () => {
    const match = await astrologyService.calculateMatchmaking({ boy: { birthDetails: REF_DIRECT }, girl: { birthDetails: GIRL_DIRECT } } as never);
    const engineStatus = match.manglikComparison.personA;
    expect(out.manglik.is_present).toBe(engineStatus.effectiveManglik);
    expect(out.manglik.factors).toMatchObject({
      house_from_ascendant: engineStatus.marsPlacement.houseFromLagna,
      house_from_moon: engineStatus.marsPlacement.houseFromMoon,
      house_from_venus: engineStatus.marsPlacement.houseFromVenus,
      status_from_ascendant: engineStatus.statusFromLagna,
      status_from_moon: engineStatus.statusFromMoon,
      status_from_venus: engineStatus.statusFromVenus,
      exceptions: engineStatus.cancellationFactors,
    });
    for (const key of ['is_present', 'manglik_status', 'manglik_reason', 'manglik_report', 'consideration']) {
      expect(out.manglik, key).toHaveProperty(key);
    }
    // The engine computes no percentage, so none is invented.
    expect(out.manglik).not.toHaveProperty('percentage_manglik_present');
  });

  it('Sade Sati status has the fields the page reads and names the Moon sign of the chart', () => {
    const s = out.sadhesati_current_status;
    expect(typeof s.is_undergoing_sadhesati).toBe('boolean');
    expect(s.moon_sign).toBe(out.astro_details.sign);
    expect(Array.isArray(s.sadhesati_phases)).toBe(true);
    expect(s.as_of).toBe('2026-11-24');
    for (const key of ['sadhesati_phase', 'report', 'saturn_sign', 'is_sadhesati']) expect(s, key).toHaveProperty(key);
  });

  it('birth chart is an SVG image (inline and as a data URL) drawn from the same chart', () => {
    const { chart_url, svg } = out.birth_chart;
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(chart_url.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(Buffer.from(chart_url.split(',')[1], 'base64').toString('utf8')).toBe(svg);
    // Sign number of every house: the Ascendant's sign in house 1 and onwards.
    for (let house = 1; house <= 12; house++) {
      const number = ((engine.ascendant.rashiIndex + house - 2) % 12) + 1;
      const [x, y] = NORTH_INDIAN_HOUSES[house].rashiPos;
      expect(svg).toContain(`<text x="${x}" y="${y}" fill="#8a84b8" font-size="10" font-weight="700"`);
      expect(svg).toMatch(new RegExp(`<text x="${x}" y="${y}"[^>]*>${number}</text>`));
    }
    // Every planet is written in the house the engine placed it in.
    const occupants = occupantsByHouse({
      ascendantRashiIndex: engine.ascendant.rashiIndex,
      ascendantDegree: engine.ascendant.degree,
      planets: engine.planets.map((p) => ({ name: p.name, house: p.house, retrograde: p.retrograde, degree: p.degree })),
    });
    expect(occupants[1][0].label).toBe('As');
    for (const p of engine.planets) {
      const abbr = { SUN: 'Su', MOON: 'Mo', MARS: 'Ma', MERCURY: 'Me', JUPITER: 'Ju', VENUS: 'Ve', SATURN: 'Sa', RAHU: 'Ra', KETU: 'Ke' }[p.name as string]!;
      expect(occupants[p.house].map((o) => o.label)).toContain(p.retrograde ? `${abbr}(R)` : abbr);
    }
  });

  it('uses no wording that presents a placement as an affliction', () => {
    const { birth_chart, ...rest } = out;
    expect(JSON.stringify(rest)).not.toMatch(AFFLICTION_WORDING);
    expect(birth_chart.svg).not.toMatch(AFFLICTION_WORDING);
  });

  it('only the requested sections are calculated and returned', async () => {
    const { service } = newService();
    const one = await service.kundli(webKundliQuerySchema.parse({ ...REF, timezone: 'Asia/Kolkata', label: 'birth_chart' }));
    expect(Object.keys(one).sort()).toEqual(['birth_chart', 'calculation']);
  });
});

describe('timezone correction (the vendor assumed India time for every birth)', () => {
  const NEW_YORK = { latitude: '40.7128', longitude: '-74.0060', dob: '15-05-1990', hour: '14', min: '30', label: 'planets,astro_details' };

  it('a birth in New York is calculated in New York time, not UTC+5:30', async () => {
    const { service } = newService();
    const real: Json = await service.kundli(webKundliQuerySchema.parse({ ...NEW_YORK, timezone: 'America/New_York' }));
    const assumedIndia: Json = await service.kundli(webKundliQuerySchema.parse({ ...NEW_YORK, timezone: 'Asia/Kolkata' }));

    expect(real.calculation).toMatchObject({ timezone: 'America/New_York', source: 'request', utc_offset_minutes: -240 });
    expect(assumedIndia.calculation.utc_offset_minutes).toBe(330);

    // 9.5 hours apart: the Moon moves about 5 degrees and the Ascendant changes sign.
    const moon = (o: Json) => o.planets.find((p: Json) => p.name === 'Moon').fullDegree;
    expect(Math.abs(moon(real) - moon(assumedIndia))).toBeGreaterThan(3);
    expect(real.astro_details.ascendant).not.toBe(assumedIndia.astro_details.ascendant);

    // ... and it is the chart POST /astrology/kundli gives for the real zone.
    const engine = (
      await astrologyService.calculateChartForDirectInput({
        name: 'NY',
        dateOfBirth: '1990-05-15',
        timeOfBirth: '14:30:00',
        latitude: 40.7128,
        longitude: -74.006,
        timezone: 'America/New_York',
      })
    ).normalizedChart as NormalizedChart;
    expect(moon(real)).toBeCloseTo(engine.planets.find((p) => p.name === 'MOON')!.absoluteDegree, 4);
    expect(real.astro_details.ascendant).toBe(RASHIS[engine.ascendant.rashiIndex - 1].englishName);
  }, 60000);

  it('without a timezone the zone is never assumed: the request is refused', async () => {
    const { service } = newService();
    await expect(service.kundli(webKundliQuerySchema.parse(NEW_YORK))).rejects.toBeInstanceOf(TimezoneRequiredError);
    await expect(service.kundli(webKundliQuerySchema.parse(NEW_YORK))).rejects.toMatchObject({ statusCode: 422, code: 'TIMEZONE_REQUIRED' });
  });

  it('without a timezone, coordinates that came from our place search get that place\'s zone', async () => {
    const { service } = newService({
      places: [{ displayName: 'New York, New York, United States', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York' }],
    });
    const places = await service.geoDetails('New York');
    expect(places).toEqual([
      { formattedAddress: 'New York, New York, United States', location: { latitude: 40.7128, longitude: -74.006 }, timezone: 'America/New_York' },
    ]);
    // The page sends the coordinates back as text, exactly as it received them.
    const out: Json = await service.kundli(
      webKundliQuerySchema.parse({ ...NEW_YORK, latitude: String(places[0].location.latitude), longitude: String(places[0].location.longitude) })
    );
    expect(out.calculation).toMatchObject({ timezone: 'America/New_York', source: 'place-search', utc_offset_minutes: -240 });
  }, 60000);

  it('match-making needs a zone for each person and names the missing one', async () => {
    const { service } = newService();
    const query = webMatchQuerySchema.parse({
      male_lat: 28.6139, male_long: 77.209, male_dob: '15-05-1990', male_hour: 14, male_min: 30, male_timezone: 'Asia/Kolkata',
      female_lat: 19.076, female_long: 72.8777, female_dob: '21-08-1992', female_hour: 6, female_min: 15,
      label: 'match_ashtakoot_points',
    });
    await expect(service.matchMaking(query)).rejects.toMatchObject({ code: 'TIMEZONE_REQUIRED', details: [{ field: 'female_timezone' }] });
  });
});

describe('match-making (REF-001 with a second reference person)', () => {
  let out: Json;
  let engine: Json;

  beforeAll(async () => {
    const { service } = newService();
    out = await service.matchMaking(
      webMatchQuerySchema.parse({
        male_lat: '28.6139', male_long: '77.209', male_dob: '15-05-1990', male_hour: '14', male_min: '30', male_timezone: 'Asia/Kolkata', male_name: 'Boy',
        female_lat: '19.076', female_long: '72.8777', female_dob: '21-08-1992', female_hour: '6', female_min: '15', female_timezone: 'Asia/Kolkata', female_name: 'Girl',
        label: ALL_MATCH_LABELS,
      })
    );
    engine = await astrologyService.calculateMatchmaking({ boy: { birthDetails: REF_DIRECT }, girl: { birthDetails: GIRL_DIRECT } } as never);
  }, 60000);

  it('match_ashtakoot_points: every koota with description, both attributes, total and received points', () => {
    const points = out.match_ashtakoot_points;
    expect(Object.keys(points)).toEqual(['varna', 'vashya', 'tara', 'yoni', 'maitri', 'gan', 'bhakut', 'nadi', 'total', 'conclusion']);
    const map: Record<string, string> = { varna: 'varna', vashya: 'vashya', tara: 'tara', yoni: 'yoni', maitri: 'grahaMaitri', gan: 'gana', bhakut: 'bhakoot', nadi: 'nadi' };
    let sum = 0;
    for (const [webKey, engineKey] of Object.entries(map)) {
      const row = points[webKey];
      const koota = engine.ashtakoota.kootas[engineKey];
      expect(Object.keys(row).sort(), webKey).toEqual(['description', 'female_koot_attribute', 'male_koot_attribute', 'received_points', 'total_points']);
      // The engine's own text and points, unchanged.
      expect(row.description).toBe(koota.description);
      expect(row.total_points).toBe(koota.maxPoints);
      expect(row.received_points).toBe(koota.obtainedPoints);
      expect(row.male_koot_attribute.length).toBeGreaterThan(0);
      expect(row.female_koot_attribute.length).toBeGreaterThan(0);
      sum += row.received_points;
    }
    expect(points.total).toEqual({ total_points: 36, received_points: engine.ashtakoota.totalObtainedPoints, minimum_required: 18 });
    expect(sum).toBe(points.total.received_points);
    expect(points.conclusion.status).toBe(engine.ashtakoota.isCompatible);
    expect(points.conclusion.report).toContain(`${engine.ashtakoota.totalObtainedPoints} out of 36`);
    // Fixture: the engine's score for this pair.
    expect(points.total.received_points).toBe(14.5);
    // Person A is the boy: his Moon nakshatra and sign are in the male column.
    expect(points.tara.male_koot_attribute).toBe(engine.personA.nakshatraName);
    expect(points.tara.female_koot_attribute).toBe(engine.personB.nakshatraName);
    expect(points.bhakut.male_koot_attribute).toBe(RASHIS[engine.personA.rashiIndex - 1].englishName);
  });

  it('the minimum of 18 is the threshold the engine itself applies', () => {
    const calc = new MatchmakingCalculator();
    const profile = (moonLongitude: number) => calc.deriveMoonProfile({ planets: { MOON: { longitude: moonLongitude } } } as never, 'x');
    const seen = new Set<string>();
    for (let a = 5; a < 360; a += 13.3333) {
      for (let b = 5; b < 360; b += 13.3333) {
        const r = calc.calculateAshtakoota(profile(a), profile(b));
        expect(r.isCompatible).toBe(r.totalObtainedPoints >= 18);
        seen.add(String(r.isCompatible));
      }
    }
    expect(seen.size).toBe(2);
  });

  it('returns only what the engine has: no Dashakoot points, no obstructions, no overall percentage', () => {
    expect(out).not.toHaveProperty('match_dashakoot_points');
    expect(out).not.toHaveProperty('match_obstructions');
    expect(out.match_percentage).toEqual({ ashtakoota_percentage: Math.round((engine.ashtakoota.totalObtainedPoints / 36) * 10000) / 100 });
    expect(out.match_making_report).toEqual({ ashtakoota: { status: engine.ashtakoota.isCompatible, received_points: engine.ashtakoota.totalObtainedPoints } });
  });

  it('birth, astro and planet details of both people are present in the vendor keys', () => {
    expect(out.match_birth_details.male_astro_details).toMatchObject({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, timezone: 5.5, timezone_name: 'Asia/Kolkata' });
    expect(out.match_birth_details.female_astro_details).toMatchObject({ year: 1992, month: 8, day: 21, hour: 6, minute: 15, timezone: 5.5 });
    for (const who of ['male_astro_details', 'female_astro_details']) {
      for (const key of ['ascendant', 'sign', 'SignLord', 'Naksahtra', 'NaksahtraLord', 'Tithi', 'Yog', 'Karan', 'tatva', 'paya', 'Varna', 'Vashya', 'Yoni', 'Gan', 'Nadi', 'Charan']) {
        expect(out.match_astro_details[who], `${who}.${key}`).toHaveProperty(key);
      }
      expect(out.match_birth_details[who].sunrise).toMatch(/^\d\d:\d\d:\d\d$/);
    }
    expect(out.match_planet_details.male_planet_details).toHaveLength(9);
    expect(Object.keys(out.match_planet_details.female_planet_details[0])).toEqual(expect.arrayContaining(['name', 'sign', 'nakshatra', 'house', 'isRetro']));
    expect(typeof out.match_planet_details.female_planet_details[0].isRetro).toBe('boolean');
  });

  it('the Manglik comparison is the engine verdict, in neutral words', () => {
    expect(out.match_manglik_report.conclusion.verdict).toBe(engine.manglikComparison.verdict);
    expect(out.match_manglik_report.male.is_present).toBe(engine.manglikComparison.personA.effectiveManglik);
    expect(out.match_manglik_report.female.is_present).toBe(engine.manglikComparison.personB.effectiveManglik);
    expect(JSON.stringify(out)).not.toMatch(AFFLICTION_WORDING);
  });
});

describe('neutral wording for every engine outcome', () => {
  const status = (over: Partial<ManglikStatus>): ManglikStatus => ({
    isManglik: false,
    marsPlacement: { rashiIndex: 8, rashiName: 'Vrischika', longitude: 215, houseFromLagna: 7, houseFromMoon: 3, houseFromVenus: 8 },
    manglikHousesFromLagna: [],
    manglikHousesFromMoon: [],
    manglikHousesFromVenus: [],
    severity: 'NONE',
    cancellationFactors: [],
    isCancelled: false,
    effectiveManglik: false,
    isIndeterminate: false,
    statusFromLagna: 'NON_MANGLIK',
    statusFromMoon: 'NON_MANGLIK',
    statusFromVenus: 'MANGLIK',
    status: 'Not Present',
    ...over,
  });
  const present = status({ isManglik: true, effectiveManglik: true, severity: 'HIGH', statusFromLagna: 'MANGLIK', status: 'Present' });
  const excepted = status({
    isManglik: true,
    isCancelled: true,
    cancellationFactors: ['Jupiter conjoined with Mars in the same house'],
    statusFromLagna: 'MANGLIK',
  });
  const unknown = status({ isIndeterminate: true, severity: 'INDETERMINATE', statusFromLagna: 'INDETERMINATE', status: 'Indeterminate' });

  it('Manglik: present, with an exception, absent and undetermined', () => {
    expect(mapManglik(present)).toMatchObject({ is_present: true, manglik_status: 'Manglik', is_mars_manglik_cancelled: false });
    expect(mapManglik(present).manglik_reason).toBe('Mars is in Scorpio, in the 7th house from the Ascendant.');
    expect(mapManglik(excepted)).toMatchObject({ is_present: false, manglik_status: 'Manglik placement with an exception', is_mars_manglik_cancelled: true });
    expect(mapManglik(excepted).factors.exceptions).toEqual(['Jupiter conjoined with Mars in the same house']);
    expect(mapManglik(status({}))).toMatchObject({ is_present: false, manglik_status: 'Not Manglik' });
    expect(mapManglik(unknown)).toMatchObject({ is_present: false, manglik_status: 'Cannot be determined' });
    // The engine's severity grade is not passed on.
    for (const s of [present, excepted, unknown, status({})]) {
      const mapped = mapManglik(s);
      expect(JSON.stringify(mapped)).not.toMatch(AFFLICTION_WORDING);
      expect(JSON.stringify(mapped)).not.toMatch(/severity|HIGH|MEDIUM/);
    }
  });

  it('Manglik comparison: every verdict of the engine', () => {
    const verdicts: Array<[ManglikComparisonResult['verdict'], boolean]> = [
      ['BOTH_NON_MANGLIK', true],
      ['BOTH_MANGLIK', true],
      ['MANGLIK_MISMATCH', false],
      ['INDETERMINATE_BIRTH_TIME_REQUIRED', false],
    ];
    for (const [verdict, agrees] of verdicts) {
      const mapped = mapMatchManglikReport({
        personA: present,
        personB: status({}),
        verdict,
        isDoshaCancelledByMatch: agrees,
        explanation: 'Manglik Dosha friction exists.',
      });
      expect(mapped.conclusion).toMatchObject({ verdict, match: agrees });
      expect(mapped.conclusion.report.length).toBeGreaterThan(10);
      // The engine's explanation (which says "Dosha") is not copied.
      expect(JSON.stringify(mapped)).not.toMatch(AFFLICTION_WORDING);
    }
  });

  const seg = (rashiIndex: number, houseFromMoon: number, startIso: string, endIso: string): SaturnSignSegment => ({
    rashiIndex,
    rashiName: RASHIS[rashiIndex - 1].sanskritName,
    houseFromMoon,
    startIso,
    endIso,
    retrogradeEntry: false,
    startsBeforeRange: false,
    endsAfterRange: false,
  });
  const table = (cycles: SadeSatiPeriodsResult['cycles']): SadeSatiPeriodsResult => ({
    natalMoonRashiIndex: 12,
    natalMoonRashiName: 'Meena',
    rangeStartIso: '2016-11-24T00:00:00.000Z',
    rangeEndIso: '2036-11-24T00:00:00.000Z',
    cycles,
    fourthAndEighth: [],
    definition: 'Sade Sati: transiting Saturn in the 12th, 1st or 2nd sign from the natal Moon sign.',
    source: 'test',
  });
  const cycle = {
    cycle: 1,
    startIso: '2023-01-17T00:00:00.000Z',
    peakStartIso: '2025-03-29T00:00:00.000Z',
    peakEndIso: '2027-06-03T00:00:00.000Z',
    endIso: '2030-04-17T00:00:00.000Z',
    startsBeforeRange: false,
    endsAfterRange: false,
    segments: [
      seg(11, 12, '2023-01-17T00:00:00.000Z', '2025-03-29T00:00:00.000Z'),
      seg(12, 1, '2025-03-29T00:00:00.000Z', '2027-06-03T00:00:00.000Z'),
      seg(1, 2, '2027-06-03T00:00:00.000Z', '2030-04-17T00:00:00.000Z'),
    ],
  };

  it('Sade Sati: inside a cycle the segment containing today is the phase, with the cycle\'s own dates', () => {
    const mapped = mapSadeSatiStatus(table([cycle]), NOW);
    expect(mapped).toMatchObject({
      is_undergoing_sadhesati: true,
      is_sadhesati: true,
      sadhesati_phase: 'Saturn in the Moon sign (peak)',
      moon_sign: 'Pisces',
      saturn_sign: 'Pisces',
      cycle_start: '2023-01-17',
      cycle_end: '2030-04-17',
      cycle_is: 'current',
    });
    expect(mapped.sadhesati_phases).toEqual([
      { phase: 'Saturn in the 12th sign from the Moon: Aquarius', start: '2023-01-17', end: '2025-03-29', type: 'completed' },
      { phase: 'Saturn in the Moon sign (peak): Pisces', start: '2025-03-29', end: '2027-06-03', type: 'current' },
      { phase: 'Saturn in the 2nd sign from the Moon: Aries', start: '2027-06-03', end: '2030-04-17', type: 'upcoming' },
    ]);
    expect(JSON.stringify(mapped)).not.toMatch(AFFLICTION_WORDING);
  });

  it('Sade Sati: outside a cycle the status is false and the next cycle of the table is listed', () => {
    const future = { ...cycle, startIso: '2030-01-01T00:00:00.000Z', endIso: '2037-01-01T00:00:00.000Z', segments: [seg(11, 12, '2030-01-01T00:00:00.000Z', '2032-06-01T00:00:00.000Z')] };
    const mapped = mapSadeSatiStatus(table([future]), NOW);
    expect(mapped).toMatchObject({ is_undergoing_sadhesati: false, sadhesati_phase: null, saturn_sign: null, cycle_is: 'next', cycle_start: '2030-01-01' });
    expect(mapped.sadhesati_phases[0].type).toBe('upcoming');
    expect(mapSadeSatiStatus(table([]), NOW)).toMatchObject({ is_undergoing_sadhesati: false, cycle_is: null, sadhesati_phases: [] });
  });

  it('Sade Sati status of the service is the engine table for the chart\'s Moon (a Pisces Moon is in its peak phase in November 2026)', async () => {
    const { service } = newService();
    // 2024-03-10 18:00 IST: the Moon is in Pisces (new Moon in Aquarius/Pisces that day).
    const out: Json = await service.kundli(
      webKundliQuerySchema.parse({ latitude: 28.6139, longitude: 77.209, dob: '2024-03-11', hour: 12, min: 0, timezone: 'Asia/Kolkata', label: 'astro_details,sadhesati_current_status' })
    );
    expect(out.astro_details.sign).toBe('Pisces');
    expect(out.sadhesati_current_status).toMatchObject({ is_undergoing_sadhesati: true, moon_sign: 'Pisces', saturn_sign: 'Pisces', sadhesati_phase: 'Saturn in the Moon sign (peak)' });
  }, 60000);
});

describe('chart geometry', () => {
  it('is the geometry of the admin chart component', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../../admin/components/KundliChartSvg.tsx'), 'utf8');
    for (let house = 1; house <= 12; house++) {
      const def = NORTH_INDIAN_HOUSES[house];
      const line = `${house}: { center: [${def.center[0]}, ${def.center[1]}], rashiPos: [${def.rashiPos[0]}, ${def.rashiPos[1]}], points: '${def.points}' }`;
      expect(source, `house ${house}`).toContain(line);
    }
    expect(source).toContain('((ascendantRashiIndex + h - 2) % 12) + 1');
    expect(rashiNumberOfHouse(6, 1)).toBe(6);
    expect(rashiNumberOfHouse(6, 8)).toBe(1);
  });

  it('refuses an impossible Ascendant instead of drawing a default chart', () => {
    expect(() => renderNorthIndianChartSvg({ ascendantRashiIndex: 0, ascendantDegree: 0, planets: [] })).toThrow();
  });
});

describe('identical requests', () => {
  it('are calculated once (also when they arrive together)', async () => {
    const { service } = newService();
    const calculate = vi.spyOn(service, 'calculatePerson');
    const query = () => webKundliQuerySchema.parse({ ...REF, timezone: 'Asia/Kolkata', label: 'planets' });
    const [a, b] = await Promise.all([service.kundli(query()), service.kundli(query())]);
    const c = await service.kundli(query());
    expect(calculate).toHaveBeenCalledTimes(1);
    expect(b).toEqual(a);
    expect(c).toEqual(a);
    // A different request is a different calculation.
    await service.kundli(webKundliQuerySchema.parse({ ...REF, min: '31', timezone: 'Asia/Kolkata', label: 'planets' }));
    expect(calculate).toHaveBeenCalledTimes(2);
  }, 60000);

  it('the same input gives the same output (deterministic)', async () => {
    const first = await newService().service.kundli(webKundliQuerySchema.parse({ ...REF, timezone: 'Asia/Kolkata', label: ALL_KUNDLI_LABELS }));
    const second = await newService().service.kundli(webKundliQuerySchema.parse({ ...REF, timezone: 'Asia/Kolkata', label: ALL_KUNDLI_LABELS }));
    expect(second).toEqual(first);
  }, 60000);

  it('a failed calculation is not cached', async () => {
    const cache = new ResultCache();
    let calls = 0;
    const compute = async () => {
      calls += 1;
      if (calls === 1) throw new Error('boom');
      return 'ok';
    };
    await expect(cache.getOrCompute('k', compute)).rejects.toThrow('boom');
    expect(await cache.getOrCompute('k', compute)).toEqual({ value: 'ok', cached: false });
    expect(await cache.getOrCompute('k', compute)).toEqual({ value: 'ok', cached: true });
  });

  it('place search and the daily horoscope are passed to our own services', async () => {
    const { service, searchPlaces, getTodayPrediction } = newService({
      places: [{ displayName: 'Pune, Maharashtra, India', latitude: 18.5196, longitude: 73.8553, timezone: 'Asia/Kolkata' }],
    });
    await service.geoDetails('Pune');
    await service.geoDetails('  pune ');
    expect(searchPlaces).toHaveBeenCalledTimes(1);

    await service.dailyHoroscope({ sign: 'Aries', language: 'hi', date: '2026-11-24' });
    expect(getTodayPrediction).toHaveBeenLastCalledWith(undefined, { rashiIndex: undefined, rashi: 'Aries', date: '2026-11-24', language: 'hi' });
    await service.dailyHoroscope({ rashiIndex: 4, lang: 'en', zodiac: 'ignored' });
    expect(getTodayPrediction).toHaveBeenLastCalledWith(undefined, { rashiIndex: 4, rashi: undefined, date: undefined, language: 'en' });
  });
});
