/**
 * Rashi Bhavishya in Hindi — offline only (OfflineTestProvider; no network, no paid API).
 * Same facts as English; Hindi names, Hindi deterministic wording, Hindi narrative
 * validated as strictly as the English one.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { reportPlatform } from '@astro/report-engine';
import { NAKSHATRAS, REPEATING_KARANAS, TITHI_NAMES, VARA_LORDS, YOGA_NAMES } from '@astro/astrology-engine';
// Read-only: the report platform's glossary and Hindi editorial rules (not part of its public API).
import { NAKSHATRA_HI as PLATFORM_NAKSHATRA_HI, PLANET_HI as PLATFORM_PLANET_HI, SIGN_HI as PLATFORM_SIGN_HI } from '../../../../packages/report-engine/src/platform/i18n/hindi';
import { validateEditorial } from '../../../../packages/report-engine/src/platform/validation/editorial-validator';
import { RashiGocharaEngine, RashiDailyFacts, DailySky, factsForRashi, signRef } from '../../src/modules/rashi-bhavishya/rashi-gochara.engine';
import { PLANET_DISPLAY_NAMES } from '../../src/modules/rashi-bhavishya/rashi-gochara.tables';
import {
  RASHI_NARRATIVE_VERSION,
  RASHI_NARRATIVE_VERSION_HI,
  RashiNarrator,
  RashiNarrativeError,
  buildRashiEvidence,
  checkTransitProse,
} from '../../src/modules/rashi-bhavishya/rashi-bhavishya.narrator';
import { buildPlainNarrative } from '../../src/modules/rashi-bhavishya/rashi-bhavishya.plain';
import {
  KARANA_HI,
  NAKSHATRA_HI,
  PLANET_NAME_HI,
  SIGN_HI,
  TITHI_HI,
  VARA_HI,
  YOGA_HI,
  dateHi,
  ordinalHi,
} from '../../src/modules/rashi-bhavishya/rashi-bhavishya.hindi';
import { RashiBhavishyaService } from '../../src/modules/rashi-bhavishya/rashi-bhavishya.service';
import { InMemoryRashiHoroscopeStore } from '../../src/modules/rashi-bhavishya/rashi-bhavishya.store';
import { rashiBhavishyaAllQuerySchema, rashiBhavishyaQuerySchema } from '../../src/modules/rashi-bhavishya/rashi-bhavishya.schemas';

const NOW = () => new Date('2026-11-18T05:00:00Z'); // 10:30 IST on 2026-11-18
const fastConfig = { config: { backoffBaseMs: 1, maxTransportRetries: 0 } };
const LATIN = /[A-Za-z]/;

type Topics = { topics: Array<Record<string, unknown>> };
function offlineNarrator(mutate?: (json: Topics) => void) {
  const provider = new reportPlatform.OfflineTestProvider(mutate);
  return { provider, narrator: new RashiNarrator(provider, fastConfig) };
}
function service(narrator: RashiNarrator | null, store = new InMemoryRashiHoroscopeStore()) {
  return { store, svc: new RashiBhavishyaService({ store, requestNarrator: narrator, jobNarrator: narrator, now: NOW }) };
}
const narrativeText = (n: { summary: string; sections: Array<{ title: string; lead: string; paragraphs: string[]; bullets: string[]; takeaway?: string }> }) =>
  [n.summary, ...n.sections.flatMap((s) => [s.title, s.lead, ...s.paragraphs, ...s.bullets, s.takeaway ?? ''])].join('\n');

let sky: DailySky;
let ariesFacts: RashiDailyFacts;
beforeAll(async () => {
  sky = await new RashiGocharaEngine().computeDailySky('2026-11-18');
  ariesFacts = factsForRashi(sky, 1);
});

describe('Hindi names', () => {
  it('cover every name the engine can produce', () => {
    for (const n of NAKSHATRAS) expect(NAKSHATRA_HI[n.name], n.name).toBeTruthy();
    for (const t of [...TITHI_NAMES, 'Amavasya']) expect(TITHI_HI[t], t).toBeTruthy();
    for (const y of YOGA_NAMES) expect(YOGA_HI[y], y).toBeTruthy();
    for (const k of [...REPEATING_KARANAS, 'Shakuni', 'Chatushpada', 'Naga', 'Kimstughna']) expect(KARANA_HI[k], k).toBeTruthy();
    for (const v of VARA_LORDS) expect(VARA_HI[v.name], v.name).toBeTruthy();
    for (const p of Object.values(PLANET_DISPLAY_NAMES)) expect(PLANET_NAME_HI[p], p).toBeTruthy();
    expect(SIGN_HI).toHaveLength(12);
    for (let n = 1; n <= 12; n++) expect(ordinalHi(n)).not.toMatch(LATIN);
    expect(dateHi('2026-11-18')).toBe('18 नवंबर 2026');
  });

  it('spell planets, signs and nakshatras exactly as the report platform glossary does', () => {
    for (const [en, hi] of Object.entries(PLANET_NAME_HI)) expect(hi).toBe(PLATFORM_PLANET_HI[en]);
    for (let i = 1; i <= 12; i++) expect(SIGN_HI[i - 1]).toBe(PLATFORM_SIGN_HI[signRef(i).englishName]);
    expect(NAKSHATRA_HI).toEqual(PLATFORM_NAKSHATRA_HI);
  });
});

describe('checkTransitProse (Hindi)', () => {
  // 2026-11-18 from Aries: Saturn in Pisces (12th), Jupiter in Leo (5th), Moon in Aquarius (11th).
  it('accepts Hindi sentences that match the day', () => {
    for (const s of [
      'शनि मीन राशि में है, जो आपकी चंद्र राशि से बारहवाँ भाव है।',
      'गुरु सिंह राशि में आपकी चंद्र राशि मेष से पाँचवें भाव में गोचर कर रहे हैं।',
      'आपकी चंद्र राशि मेष से ग्यारहवें भाव में चंद्र आज कुंभ राशि में है।',
      'जिनका जन्म चंद्र के मेष राशि में रहते हुआ, उनके लिए आज चंद्रमा कुंभ में है।',
      'बृहस्पति 5वें भाव में हैं और शनि 12वें भाव में।',
    ]) expect(checkTransitProse(s, ariesFacts, 'hi'), s).toEqual([]);
  });

  it('does not mistake weekdays, the tithi दशमी, the tenth house or मनोदशा for a planet or a dasha', () => {
    for (const s of [
      'आज मंगलवार है और सुबह शुक्ल दशमी तिथि 07:16 बजे तक रहेगी।',
      'दशम भाव कार्यक्षेत्र का भाव है।',
      'आज आपकी मनोदशा शांत रह सकती है।',
      'नवम भाव भाग्य और गुरुजनों का भाव है, जबकि शनि बारहवें भाव में है।',
    ]) expect(checkTransitProse(s, ariesFacts, 'hi'), s).toEqual([]);
  });

  it('rejects a wrong sign, a wrong house and forbidden content in Hindi', () => {
    expect(checkTransitProse('शनि आज मेष राशि में गोचर कर रहा है।', ariesFacts, 'hi')[0]).toMatch(/Saturn in मेष/);
    expect(checkTransitProse('गुरु आपकी चंद्र राशि से नौवें भाव में है।', ariesFacts, 'hi')[0]).toMatch(/Jupiter in the 9th house/);
    expect(checkTransitProse('बृहस्पति नवम भाव में विराजमान हैं।', ariesFacts, 'hi')[0]).toMatch(/9th house/);
    expect(checkTransitProse('आपकी चंद्र राशि से नौवें भाव में स्थित गुरु शुभ फल देते हैं।', ariesFacts, 'hi')[0]).toMatch(/Jupiter in the 9th house/);
    expect(checkTransitProse('शनि 3वें भाव में है।', ariesFacts, 'hi')[0]).toMatch(/3rd house/);
    expect(checkTransitProse('आपका शुभ अंक 7 है।', ariesFacts, 'hi')[0]).toMatch(/शुभ अंक/);
    expect(checkTransitProse('आज का शुभ रंग लाल है।', ariesFacts, 'hi')[0]).toMatch(/शुभ रंग/);
    expect(checkTransitProse('आपके लग्न का स्वामी बलवान है।', ariesFacts, 'hi')[0]).toMatch(/लग्न/);
    expect(checkTransitProse('आपकी वर्तमान महादशा इसमें सहायक है।', ariesFacts, 'hi')[0]).toMatch(/महादशा/);
    expect(checkTransitProse('सफलता की 70 प्रतिशत संभावना है।', ariesFacts, 'hi')[0]).toMatch(/प्रतिशत/);
    // Today's Moon is in Aquarius; "चंद्र मेष में" is only allowed when it speaks about the birth Moon.
    expect(checkTransitProse('आज चंद्र मेष राशि में है।', ariesFacts, 'hi')).toHaveLength(1);
    // English statements inside a Hindi narrative (its claims stay English) are still checked.
    expect(checkTransitProse('Saturn transits Aries today.', ariesFacts, 'hi')[0]).toMatch(/Saturn in Aries/);
  });

  it('leaves the English check unchanged', () => {
    expect(checkTransitProse('शनि आज मेष राशि में गोचर कर रहा है।', ariesFacts)).toEqual([]);
    expect(checkTransitProse('Saturn transits Aries today.', ariesFacts)[0]).toMatch(/Saturn in Aries/);
  });
});

describe('deterministic Hindi wording', () => {
  it('has the same sections, paragraphs and bullets as English, in Hindi, and agrees with the facts for every sign', () => {
    for (let rashi = 1; rashi <= 12; rashi++) {
      const facts = factsForRashi(sky, rashi);
      const en = buildPlainNarrative(facts);
      const hi = buildPlainNarrative(facts, 'hi');
      expect(buildPlainNarrative(facts, 'en')).toEqual(en);
      expect(hi.sections.map((s) => [s.id, s.paragraphs.length, s.bullets.length])).toEqual(en.sections.map((s) => [s.id, s.paragraphs.length, s.bullets.length]));
      const text = narrativeText(hi);
      expect(text, `sign ${rashi}`).not.toMatch(LATIN);
      expect(checkTransitProse(text, facts, 'hi'), `sign ${rashi}`).toEqual([]);
      // Equal content: every planet's sign and house, the count, and the panchang are stated.
      for (const p of facts.planets) {
        expect(text).toContain(`${PLANET_NAME_HI[p.name]} ${SIGN_HI[p.sign.index - 1]} राशि में है`);
        expect(text).toContain(`${PLANET_NAME_HI[p.name]}: ${ordinalHi(p.house)} भाव`);
      }
      expect(hi.summary).toContain(`${facts.tally.total} में से ${facts.tally.favourable} ग्रह`);
      expect(text).toContain(NAKSHATRA_HI[facts.sky.panchang.nakshatra.name]);
      expect(text).toContain(VARA_HI[facts.sky.panchang.vara.name]);
      // The platform's Hindi editorial rules (fear language, guarantees, script) find nothing.
      for (const s of hi.sections) {
        const issues = validateEditorial(
          { topicId: s.id, lead: s.lead, paragraphs: s.paragraphs, bullets: s.bullets, claims: [] } as unknown as Parameters<typeof validateEditorial>[0],
          { language: 'hi' }
        );
        expect(issues.filter((i) => i.code !== 'REPEATED_SENTENCE'), `sign ${rashi} ${s.id}`).toEqual([]);
      }
    }
  });

  it('states a sign change and the week\'s events in Hindi with the same times', () => {
    const withChange = [1, 2, 3].map((r) => factsForRashi(sky, r)).find((f) => f.planets.some((p) => p.changesTo));
    const facts = withChange ?? ariesFacts;
    const hi = narrativeText(buildPlainNarrative(facts, 'hi'));
    for (const p of facts.planets) if (p.changesTo) expect(hi).toContain(`${dateHi(p.changesTo.dateIst)} को ${p.changesTo.timeIst} बजे (भारतीय समय)`);
    const en = buildPlainNarrative(facts);
    const hiSections = buildPlainNarrative(facts, 'hi').sections;
    expect(hiSections[1].bullets).toHaveLength(en.sections[1].bullets.length);
    hiSections[1].bullets.forEach((b) => expect(b).toMatch(/\d{2}:\d{2} बजे \(भारतीय समय\)/));
  });
});

describe('RashiNarrator (Hindi)', () => {
  it('writes Hindi from the same evidence with one call, under its own stored version', async () => {
    const { provider, narrator } = offlineNarrator();
    const prompts: string[] = [];
    const generate = provider.generate.bind(provider);
    provider.generate = async (prompt, options) => {
      prompts.push(prompt);
      return generate(prompt, options);
    };
    const hi = await narrator.generate(ariesFacts, 'hi');
    const en = await narrator.generate(ariesFacts);
    expect(provider.calls).toBe(2);
    expect(hi.promptVersion).toBe(RASHI_NARRATIVE_VERSION_HI);
    expect(en.promptVersion).toBe(RASHI_NARRATIVE_VERSION);
    expect(hi.model).toBe(en.model);
    expect(hi.narrative.sections.map((s) => s.id)).toEqual(en.narrative.sections.map((s) => s.id));
    expect(hi.narrative.sections.map((s) => s.title)).toEqual(['आज का चंद्र', 'ग्रहों की व्यापक स्थिति', 'आज के दिन का सदुपयोग']);
    expect(hi.narrative.verifiedEvidenceIds).toContain('transit.moon.house');
    // Same evidence lines in both prompts: the facts are not re-worded or re-derived for Hindi.
    const evidenceLines = (p: string) => p.split('\n').filter((l) => /^\s+\[[a-z0-9.-]+\] /.test(l)).sort();
    expect(evidenceLines(prompts[0])).toEqual(evidenceLines(prompts[1]));
    expect(evidenceLines(prompts[0]).length).toBeGreaterThan(buildRashiEvidence(ariesFacts).items.length / 2);
    expect(prompts[0]).toContain('LANGUAGE: Write lead, paragraphs, bullets and takeaway in natural, warm Hindi');
    expect(prompts[0]).toContain('favourable = अनुकूल');
    expect(prompts[1]).not.toMatch(/[ऀ-ॿ]/);
  });

  const mutated = (fn: (json: Topics) => void) => offlineNarrator(fn).narrator.generate(ariesFacts, 'hi');

  it('fails when Hindi prose contradicts a transit', async () => {
    await expect(mutated((j) => { (j.topics[1].paragraphs as string[])[0] = 'आज शनि मिथुन राशि में गोचर कर रहा है, और यह अनुच्छेद बाक़ी हर तरह से सामान्य दिखता है तथा पढ़ने में सहज है।'; }))
      .rejects.toThrow(/contradicted/);
    await expect(mutated((j) => { (j.topics[0].paragraphs as string[])[0] = 'आज गुरु आपकी चंद्र राशि से नौवें भाव में है, और यह अनुच्छेद बाक़ी हर तरह से सामान्य दिखता है तथा पढ़ने में सहज है।'; }))
      .rejects.toBeInstanceOf(RashiNarrativeError);
  });

  it('fails when Hindi prose mentions a lucky number or the ascendant', async () => {
    await expect(mutated((j) => { (j.topics[2].bullets as string[])[0] = 'आज आपका शुभ अंक सात है।'; })).rejects.toThrow(/contradicted/);
    await expect(mutated((j) => { (j.topics[2].bullets as string[])[1] = 'लग्न के स्वामी पर ध्यान दें।'; })).rejects.toThrow(/contradicted/);
  });

  it('fails on Hindi fear language, a Hindi guarantee, and prose that is not Hindi', async () => {
    await expect(mutated((j) => { (j.topics[2].paragraphs as string[])[0] = 'आज का दिन आपके लिए एक श्राप की तरह है, इसलिए घर पर ही रहें और कोई नया काम शुरू करने से बचें।'; })).rejects.toThrow(/validation/);
    await expect(mutated((j) => { (j.topics[2].paragraphs as string[])[0] = 'इस गोचर में आपको सफलता की पूरी गारंटी है और हर काम अपने आप बन जाएगा, बस आगे बढ़ते रहें।'; })).rejects.toThrow(/validation/);
    await expect(mutated((j) => { (j.topics[0].paragraphs as string[])[0] = 'Today the Moon moves through the eleventh house from your Moon sign and the day feels supportive for friendships.'; })).rejects.toThrow(/validation/);
    await expect(mutated((j) => { (j.topics[0].paragraphs as string[])[0] = 'Aaj Chandra aapki rashi se gyarahve bhav mein hai aur din mitron ke liye anukool rahega, isliye milna-julna achha hai.'; })).rejects.toThrow(/validation/);
  });

  it('fails when a claim cites evidence that does not exist', async () => {
    await expect(mutated((j) => { (j.topics[0].claims as Array<{ statement: string; evidenceIds: string[] }>).push({ statement: 'Mars is exalted in Capricorn', evidenceIds: ['planet.mars.d1.sign'] }); }))
      .rejects.toThrow(/validation/);
  });
});

describe('RashiBhavishyaService (Hindi)', () => {
  it('keeps English as the default and stores each language once, with identical facts', async () => {
    const { provider, narrator } = offlineNarrator();
    const { svc, store } = service(narrator);
    const en = await svc.getTodayPrediction(undefined, { rashiIndex: 1 });
    const hi = await svc.getTodayPrediction(undefined, { rashiIndex: 1, language: 'hi' });
    const hiAgain = await svc.getTodayPrediction(undefined, { rashiIndex: 1, language: 'hi' });
    const enExplicit = await svc.getTodayPrediction(undefined, { rashiIndex: 1, language: 'en' });
    expect(provider.calls).toBe(2);
    expect(store.rows.size).toBe(2);
    expect(enExplicit).toEqual(en);
    expect(hiAgain).toEqual(hi);
    expect(en.data.language).toBe('en');
    expect(en.data.prediction.language).toBe('en');
    expect(hi.data.language).toBe('hi');
    expect(hi.data.prediction.language).toBe('hi');
    expect(hi.data.narrativeSource).toBe('validated-llm');
    const rows = [...store.rows.values()];
    expect(rows.map((r) => r.language).sort()).toEqual(['en', 'hi']);
    expect(rows[0].facts).toEqual(rows[1].facts);
    expect(rows[0].factsHash).toBe(rows[1].factsHash);
    expect(rows[0].promptVersion).not.toBe(rows[1].promptVersion);
    // The stored facts never carry display names.
    expect(JSON.stringify(rows.find((r) => r.language === 'hi')!.facts)).not.toMatch(/[ऀ-ॿ]/);
  });

  it('returns the same numbers and codes in Hindi, with Hindi names for what the reader sees', async () => {
    const { svc } = service(null);
    const en = (await svc.getTodayPrediction(undefined, { rashiIndex: 1 })).data;
    const hi = (await svc.getTodayPrediction(undefined, { rashiIndex: 1, language: 'hi' })).data;
    expect(en.rashi.hindiName).toBeUndefined();
    expect(JSON.stringify(en)).not.toMatch(/[ऀ-ॿ]/);
    expect(hi.rashi).toEqual({ ...en.rashi, hindiName: 'मेष' });
    expect(hi.facts.reference).toEqual(en.facts.reference);
    expect(hi.facts.planets.map((p) => [p.planet, p.sign.index, p.sign.englishName, p.house, p.classification, p.degreeInSign, p.isRetrograde, p.favourableHouses]))
      .toEqual(en.facts.planets.map((p) => [p.planet, p.sign.index, p.sign.englishName, p.house, p.classification, p.degreeInSign, p.isRetrograde, p.favourableHouses]));
    expect(hi.facts.tally).toMatchObject({ favourable: en.facts.tally.favourable, demanding: en.facts.tally.demanding, total: 9 });
    expect(hi.facts.events.map((e) => [e.type, e.planet, e.timestampIso, e.dateIst, e.timeIst])).toEqual(en.facts.events.map((e) => [e.type, e.planet, e.timestampIso, e.dateIst, e.timeIst]));
    expect(hi.facts.panchang.tithi.paksha).toBe(en.facts.panchang.tithi.paksha);
    expect(hi.facts.panchang.nakshatra.pada).toBe(en.facts.panchang.nakshatra.pada);
    expect(hi.method.version).toBe(en.method.version);
    expect(hi.method.vedha).toBe('not-applied');

    const saturn = hi.facts.planets.find((p) => p.planet === 'SATURN')!;
    expect(saturn).toMatchObject({ name: 'शनि', classificationLabel: 'ध्यान देने योग्य', sign: { hindiName: 'मीन', englishName: 'Pisces' } });
    expect(hi.facts.moon.name).toBe('चंद्र');
    for (const p of hi.facts.planets) {
      for (const shown of [p.name, p.houseTheme, p.planetTheme, p.classificationLabel!, p.sign.hindiName!]) expect(shown).not.toMatch(LATIN);
    }
    const pan = hi.facts.panchang;
    for (const shown of [pan.vara.name, pan.vara.lord, pan.tithi.name, pan.tithi.label, pan.nakshatra.name, pan.nakshatra.lord, pan.yoga.name, pan.karana.name]) {
      expect(shown).not.toMatch(LATIN);
    }
    expect(pan.vara.name).toBe(VARA_HI[en.facts.panchang.vara.name]);
    for (const shown of [...hi.facts.tally.favourablePlanets, ...hi.facts.tally.demandingPlanets, hi.facts.tally.method, hi.method.summary, ...hi.method.sources]) {
      expect(shown).not.toMatch(LATIN);
    }
    for (const e of hi.facts.events) expect(e.planetName).not.toMatch(LATIN);

    // Deterministic Hindi fallback: Hindi text, never stored, same structure as the English fallback.
    expect(hi.narrativeSource).toBe('deterministic');
    expect(hi.generation).toMatchObject({ provider: 'deterministic', promptVersion: 'rb-plain-hi-1' });
    expect(en.generation.promptVersion).toBe('rb-plain-1');
    expect(narrativeText(hi.prediction)).not.toMatch(LATIN);
    expect(hi.prediction.sections.map((s) => s.id)).toEqual(en.prediction.sections.map((s) => s.id));
  });

  it('falls back to Hindi plain wording when the Hindi narrative fails validation, and does not store it', async () => {
    const { narrator } = offlineNarrator((json) => {
      (json.topics[2].bullets as string[])[0] = 'आज आपका शुभ अंक सात है।';
    });
    const { svc, store } = service(narrator);
    const res = await svc.getTodayPrediction(undefined, { rashiIndex: 3, language: 'hi' });
    expect(res.data.narrativeSource).toBe('deterministic');
    expect(res.data.language).toBe('hi');
    expect(narrativeText(res.data.prediction)).not.toMatch(LATIN);
    expect(store.rows.size).toBe(0);
  });

  it('keeps the on-demand cooldown per language', async () => {
    let failHindi = true;
    const provider = new reportPlatform.OfflineTestProvider((json) => {
      if (failHindi && JSON.stringify(json).match(/[ऀ-ॿ]/)) json.topics.splice(0, json.topics.length);
    });
    const { svc } = service(new RashiNarrator(provider, fastConfig));
    expect((await svc.getTodayPrediction(undefined, { rashiIndex: 3, language: 'hi' })).data.narrativeSource).toBe('deterministic');
    const calls = provider.calls;
    // English for the same sign is not blocked by the Hindi failure…
    expect((await svc.getTodayPrediction(undefined, { rashiIndex: 3 })).data.narrativeSource).toBe('validated-llm');
    expect(provider.calls).toBe(calls + 1);
    // …and Hindi fails fast without another call during its cooldown.
    failHindi = false;
    expect((await svc.getTodayPrediction(undefined, { rashiIndex: 3, language: 'hi' })).data.narrativeSource).toBe('deterministic');
    expect(provider.calls).toBe(calls + 1);
  });

  it('ensureDate prepares both languages (24 calls), English first, then nothing more; /all is per language', async () => {
    const { provider, narrator } = offlineNarrator();
    const { svc } = service(narrator);
    const first = await svc.ensureDate('2026-11-18');
    expect(provider.calls).toBe(24);
    expect(first.failed).toEqual([]);
    expect(first.generated.slice(0, 12).every((g) => g.language === 'en')).toBe(true);
    expect(first.generated.slice(12).map((g) => [g.rashiIndex, g.language])).toEqual(Array.from({ length: 12 }, (_, i) => [i + 1, 'hi']));
    const second = await svc.ensureDate('2026-11-18');
    expect(second.existing).toHaveLength(24);
    expect(provider.calls).toBe(24);

    const en = await svc.getAllPredictions('2026-11-18');
    const hi = await svc.getAllPredictions('2026-11-18', 'hi');
    expect(en.data.language).toBe('en');
    expect(en.data.items).toHaveLength(12);
    expect(en.data.items.every((i) => i.language === 'en')).toBe(true);
    expect(hi.data.language).toBe('hi');
    expect(hi.data.items).toHaveLength(12);
    expect(hi.data.items.every((i) => i.language === 'hi' && i.prediction.language === 'hi' && i.rashi.hindiName)).toBe(true);
    expect(hi.data.unavailableRashiIndexes).toEqual([]);
    expect(provider.calls).toBe(24);
  });

  it('/all in Hindi lists only Hindi rows and never generates', async () => {
    const { provider, narrator } = offlineNarrator();
    const { svc } = service(narrator);
    await svc.getTodayPrediction(undefined, { rashiIndex: 5 });
    await expect(svc.getAllPredictions(undefined, 'hi')).rejects.toMatchObject({ code: 'RASHI_BHAVISHYA_UNAVAILABLE' });
    await svc.getTodayPrediction(undefined, { rashiIndex: 7, language: 'hi' });
    expect((await svc.getAllPredictions(undefined, 'hi')).data.items.map((i) => i.rashi.index)).toEqual([7]);
    expect((await svc.getAllPredictions()).data.items.map((i) => i.rashi.index)).toEqual([5]);
    expect(provider.calls).toBe(2);
  });
});

describe('query schemas', () => {
  it('accept language=en|hi, leave it undefined when omitted, and reject anything else', () => {
    expect(rashiBhavishyaQuerySchema.parse({ rashiIndex: '1' }).language).toBeUndefined();
    expect(rashiBhavishyaQuerySchema.parse({ rashiIndex: '1', language: 'hi' }).language).toBe('hi');
    expect(rashiBhavishyaAllQuerySchema.parse({ language: 'en' }).language).toBe('en');
    expect(() => rashiBhavishyaQuerySchema.parse({ rashiIndex: '1', language: 'mr' })).toThrow(/language must be/);
    expect(() => rashiBhavishyaAllQuerySchema.parse({ language: 'HI' })).toThrow();
  });
});
