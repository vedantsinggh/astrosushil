/** Birth particulars, Avakahada, Panchang and Ghatak blocks. */
import { BlockContext, blockLang, BlockOutput } from '../../../render/blocks';
import { ordinal, planetName, SIGNS } from '../../../evidence/evidence-registry';
import { nakshatraLabel, pick, planetLabel, ReportLanguage, signLabel } from '../../../i18n/hindi';
import { kundliExt } from '../extend';
import { GhatiPala, localClock } from '../calc/vedic-day';
import {
  avakahadaIn, bracketed, dateIn, dateTimeIn, karanaIn, kl, masaIn, namaksharaIn, nityaYogaIn, sanskritSignIn, skyTermIn, tithiGroupIn, tithiIn, weekdayIn,
} from '../kundli.hindi';
import { degMin, noteBox, pairTable, planetOf } from './common';

function coord(v: number, pos: string, neg: string): string {
  const a = Math.abs(v);
  const d = Math.floor(a);
  const m = Math.round((a - d) * 60);
  return `${d}°${String(m).padStart(2, '0')}′ ${v >= 0 ? pos : neg}`;
}

function offset(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-';
  const a = Math.abs(minutes);
  return `UTC${sign}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(Math.round(a % 60)).padStart(2, '0')}`;
}

function yearsMonthsDays(years: number, lang: ReportLanguage): string {
  const y = Math.floor(years);
  const monthsF = (years - y) * 12;
  const m = Math.floor(monthsF);
  const d = Math.floor((monthsF - m) * 30.436875);
  return `${y} ${kl(lang, 'y')} ${m} ${kl(lang, 'm')} ${d} ${kl(lang, 'd')}`;
}

/** Ghati and pala of a duration ("12 gh 05 pal"). */
function ghatiPala(g: GhatiPala, lang: ReportLanguage): string {
  return lang === 'hi' ? `${g.ghati} घटी ${String(g.pala).padStart(2, '0')} पल` : g.text;
}

export function kundliBirthDetails(ctx: BlockContext): BlockOutput {
  const { snapshot } = ctx;
  const lang = blockLang(ctx);
  const L = (en: string) => kl(lang, en);
  const planet = (symbol: string) => planetLabel(lang, planetName(symbol));
  const { subject, natal } = snapshot;
  const k = kundliExt(ctx);
  const vd = k.vedicDay;
  const tz = subject.timezone;
  const nt = snapshot.raw.metadata.normalizedTime;
  const moon = planetOf(natal, 'Moon');
  const sun = planetOf(natal, 'Sun');
  const asc = natal.ascendant;
  const gender = subject.gender ? subject.gender[0].toUpperCase() + subject.gender.slice(1) : 'Not stated';
  const pairs: Array<[string, string]> = [
    ['Name', subject.name],
    ['Gender', lang === 'hi' ? L(gender) : gender],
    ['Date of birth', dateIn(lang, subject.dateOfBirth)],
    ['Time of birth', subject.timeOfBirth ?? L('Not given')],
    ['Place of birth', subject.placeName],
    ['Latitude / Longitude', `${coord(subject.latitude, L('N'), L('S'))}, ${coord(subject.longitude, L('E'), L('W'))}`],
    ['Time zone', `${tz} (${offset(nt.timezoneOffsetMinutes)})`],
    ['Birth instant (UTC)', `${nt.utcIsoString.slice(0, 10)} ${nt.utcIsoString.slice(11, 16)}`],
    ['Local mean time', vd.localMeanTime],
    ['LMT correction', `${vd.lmtCorrectionMinutes >= 0 ? '+' : ''}${vd.lmtCorrectionMinutes.toFixed(1)} ${L('min')}`],
    ['Ayanamsa (Lahiri)', degMin(vd.ayanamsa)],
    ['Weekday (Vedic)', pick(lang, `${vd.varaWeekday} (${vd.varaName})`, weekdayIn(lang, vd.varaWeekday))],
    ['Sunrise (day of birth)', dateTimeIn(lang, vd.sunriseIso, tz)],
    ['Sunset', localClock(vd.sunsetIso, tz)],
    ['Day length', `${Math.floor(vd.dayLengthMinutes / 60)} ${L('h')} ${vd.dayLengthMinutes % 60} ${L('min')}`],
    ['Ishta kala (sunrise to birth)', ghatiPala(vd.ishtaKala, lang)],
    ['Ascendant', `${signLabel(lang, asc.sign)} ${degMin(asc.degree)}`],
    ['Ascendant lord', planet(asc.lord)],
    ['Moon sign (Rashi)', signLabel(lang, moon.sign)],
    ['Moon-sign lord', planet(natal.houses.find((h) => h.rashiIndex === moon.rashiIndex)!.lord)],
    ['Birth nakshatra / pada', `${nakshatraLabel(lang, moon.nakshatra)} / ${moon.pada}`],
    ['Nakshatra lord', planet(moon.nakshatraLord)],
    ['Sun sign (sidereal)', `${signLabel(lang, sun.sign)} ${degMin(sun.degree)}`],
    ['Sun sign (Western, tropical)', signLabel(lang, vd.westernSunSign)],
    ['Ayana', skyTermIn(lang, vd.ayana)],
    ['Gola', skyTermIn(lang, vd.gola)],
    ['Ritu (season)', skyTermIn(lang, k.ritu)],
    ['Vikram / Shaka Samvat', `${k.samvat.vikram} / ${k.samvat.shaka}`],
  ];
  const ids = ['asc.d1.sign', 'asc.d1.degree', 'asc.d1.lord', 'planet.moon.d1.sign', 'planet.moon.d1.nakshatra', 'planet.sun.d1.sign', 'kundli.vara', 'kundli.ritu', 'kundli.moon.pada'];
  return {
    tex: pairTable(pairs.map(([key, value]) => [L(key), value]), undefined, lang),
    evidenceIds: ids,
    method: L('Positions: sidereal zodiac, Lahiri ayanamsa, Whole Sign houses, mean nodes. The Vedic weekday runs from sunrise to sunrise, so a birth before sunrise belongs to the previous weekday. Local mean time = UTC + longitude x 4 min. Ayana and gola use the tropical Sun; ritu follows the amanta lunar month; Samvat years are Chaitradi.'),
  };
}

export function kundliAvakahada(ctx: BlockContext): BlockOutput {
  const k = kundliExt(ctx);
  const lang = blockLang(ctx);
  const L = (en: string) => kl(lang, en);
  const A = (en: string) => avakahadaIn(lang, en);
  const av = k.avakhada;
  const pairs: Array<[string, string]> = [
    ['Varna', A(av.varna)],
    ['Vashya', A(av.vashya)],
    ['Yoni', `${A(av.yoni)} (${A(av.yoniGender.toLowerCase())})`],
    ['Gana', A(av.gana)],
    ['Nadi', A(av.nadi)],
    ['Tatwa (element)', A(av.tatwa)],
    ['Paya (by Moon house)', A(av.paya)],
    ['Yunja', A(av.yunja)],
    ['Hansaka', A(av.hansaka)],
    ['Name syllable (namakshara)', namaksharaIn(lang, av.namakshara, av.nakshatra, av.pada)],
    ['Rashi / lord', `${sanskritSignIn(lang, av.rashi)} / ${planetLabel(lang, planetName(av.rashiLord))}`],
    ['Nakshatra / lord', `${nakshatraLabel(lang, av.nakshatra)} / ${planetLabel(lang, planetName(av.nakshatraLord))}`],
  ];
  return {
    tex: pairTable(pairs.map(([key, value]) => [L(key), value]), undefined, lang),
    evidenceIds: ['kundli.avakahada.gana', 'kundli.avakahada.yoni', 'kundli.avakahada.nadi', 'kundli.avakahada.varna', 'kundli.avakahada.vashya', 'kundli.avakahada.tatwa', 'kundli.avakahada.namakshara'],
    method: L('Avakahada Chakra from the Moon\'s sign, nakshatra and pada (classical tables used in matching and naming); Paya is counted from the Moon\'s house from the Ascendant.'),
  };
}

export function kundliPanchangTable(ctx: BlockContext): BlockOutput {
  const k = kundliExt(ctx);
  const lang = blockLang(ctx);
  const L = (en: string) => kl(lang, en);
  const tz = ctx.snapshot.subject.timezone;
  const b = k.panchangBirth;
  const r = k.panchangSunrise;
  const ends = (iso?: string) => (iso ? pick(lang, `ends ${dateTimeIn(lang, iso, tz)}`, `${dateTimeIn(lang, iso, tz)} पर समाप्त`) : '');
  const pk = (p: string) => L(p === 'SUKLA' ? 'Shukla' : 'Krishna');
  const tithi = (t: { paksha: string; name: string }) => `${pk(t.paksha)} ${tithiIn(lang, t.name)}`;
  const vd = k.vedicDay;
  const balance = ctx.snapshot.vimshottari;
  const varaLord = planetLabel(lang, planetName(vd.varaLord));
  const pairs: Array<[string, string]> = [
    ['Vara (weekday)', pick(lang, `${vd.varaWeekday} (${vd.varaName}), lord ${varaLord}`, `${weekdayIn(lang, vd.varaWeekday)}, स्वामी ${varaLord}`)],
    ['Civil weekday', weekdayIn(lang, vd.civilWeekday)],
    ['Tithi at birth', `${tithi(b.tithi)}; ${ends(b.tithi.endIso)}`],
    ['Tithi at sunrise', tithi(r.tithi)],
    ['Nakshatra at birth', `${nakshatraLabel(lang, b.nakshatra.name)} ${b.nakshatra.pada}; ${ends(b.nakshatra.endIso)}`],
    ['Nakshatra at sunrise', nakshatraLabel(lang, r.nakshatra.name)],
    ['Yoga at birth', `${nityaYogaIn(lang, b.yoga.name)}; ${ends(b.yoga.endIso)}`],
    ['Yoga at sunrise', nityaYogaIn(lang, r.yoga.name)],
    ['Karana at birth', `${karanaIn(lang, b.karana.name)}; ${ends(b.karana.endIso)}`],
    ['Karana at sunrise', karanaIn(lang, r.karana.name)],
    ['Paksha', pick(lang, `${pk(b.tithi.paksha)} (${b.tithi.paksha === 'SUKLA' ? 'waxing' : 'waning'} Moon)`, `${pk(b.tithi.paksha)} (${L(b.tithi.paksha === 'SUKLA' ? 'waxing' : 'waning')} चंद्र)`)],
    ['Lunar month', pick(lang,
      `${b.hinduCalendar?.amantaMasa ?? ''} (amanta) / ${b.hinduCalendar?.purnimantaMasa ?? ''} (purnimanta)`,
      `${masaIn(lang, b.hinduCalendar?.amantaMasa ?? '')} (अमांत) / ${masaIn(lang, b.hinduCalendar?.purnimantaMasa ?? '')} (पूर्णिमांत)`)],
    ['Bhayat / Bhabhog', k.bhayat ? `${ghatiPala(k.bhayat.bhayat, lang)} / ${ghatiPala(k.bhayat.bhabhog, lang)}` : L('Not available')],
    ['Balance of dasha at birth', `${planetLabel(lang, planetName(balance.birthLord))} ${yearsMonthsDays(balance.balanceAtBirthYears, lang)}`],
  ];
  const note = vd.engineWeekday !== vd.varaWeekday
    ? pick(lang,
      ` For this birth the calendar (UTC) weekday is ${vd.engineWeekday}, but the Vedic day of birth is ${vd.varaWeekday}; the Vedic value is used throughout.`,
      ` इस जन्म के लिए कैलेंडर (UTC) का वार ${weekdayIn(lang, vd.engineWeekday)} है, पर जन्म का वैदिक वार ${weekdayIn(lang, vd.varaWeekday)} है; पूरी रिपोर्ट में वैदिक वार ही लिया गया है।`)
    : '';
  return {
    tex: pairTable(pairs.map(([key, value]) => [L(key), value]), undefined, lang),
    evidenceIds: ['kundli.vara', 'kundli.tithi', 'kundli.paksha', 'kundli.nitya-yoga', 'kundli.karana', 'dasha.birth-lord'],
    method: pick(lang,
      `Tithi, nakshatra, yoga and karana from the sidereal Sun and Moon at the birth instant and at the sunrise that began the day of birth; end times are local. Bhayat is the part of the birth nakshatra already elapsed at birth and Bhabhog its full length (1 ghati = 24 minutes, 1 pal = 24 seconds).${note}`,
      `तिथि, नक्षत्र, योग और करण जन्म के क्षण तथा जन्म दिवस आरंभ करने वाले सूर्योदय के समय के निरयण सूर्य और चंद्र से निकाले गए हैं; समाप्ति समय स्थानीय हैं। भयात जन्म नक्षत्र का वह भाग है जो जन्म तक बीत चुका था और भभोग उसकी पूरी अवधि है (1 घटी = 24 मिनट, 1 पल = 24 सेकंड)।${note}`),
  };
}

export function kundliGhatak(ctx: BlockContext): BlockOutput {
  const g = kundliExt(ctx).ghat;
  const lang = blockLang(ctx);
  const L = (en: string) => kl(lang, en);
  const pairs: Array<[string, string]> = [
    ['Month (masa)', masaIn(lang, g.ghatMasa)],
    ['Tithi group', tithiGroupIn(lang, g.ghatTithi)],
    ['Weekday', pick(lang, g.ghatVara, weekdayIn(lang, bracketed(g.ghatVara)))],
    ['Nakshatra', nakshatraLabel(lang, g.ghatNakshatra)],
    ['Prahar (watch of the day)', pick(lang, ordinal(g.ghatPrahar), String(g.ghatPrahar))],
    ['Lagna', pick(lang, g.ghatLagna, signLabel(lang, bracketed(g.ghatLagna)))],
  ];
  const moonSign = pick(lang, g.moonRashiName, signLabel(lang, SIGNS[g.moonRashiIndex - 1]));
  return {
    tex: pairTable(pairs.map(([key, value]) => [L(key), value]), undefined, lang) + '\n' + noteBox('asCard', L('How to use this table'),
      L('The Ghatak Chakra is a traditional almanac reference keyed to your Moon sign. Some families consult it when choosing dates for important beginnings. It describes no event in your life and carries no warning; Astro Sushil does not treat any day, star or month as unlucky for you.')),
    evidenceIds: ['planet.moon.d1.sign'],
    method: pick(lang,
      `Classical Ghatak Chakra for the Moon sign ${g.moonRashiName}, from the engine's Ghat Chakra table.`,
      `चंद्र राशि ${moonSign} के लिए शास्त्रीय घातक चक्र, गणना-इंजन की घातक चक्र सारणी से।`),
  };
}
