/** Birth particulars, Avakahada, Panchang and Ghatak blocks. */
import { BlockContext, BlockOutput } from '../../../render/blocks';
import { formatDate, tex } from '../../../render/latex';
import { ordinal, planetName } from '../../../evidence/evidence-registry';
import { kundliExt } from '../extend';
import { localClock, localDateTime } from '../calc/vedic-day';
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

function yearsMonthsDays(years: number): string {
  const y = Math.floor(years);
  const monthsF = (years - y) * 12;
  const m = Math.floor(monthsF);
  const d = Math.floor((monthsF - m) * 30.436875);
  return `${y} y ${m} m ${d} d`;
}

export function kundliBirthDetails(ctx: BlockContext): BlockOutput {
  const { snapshot } = ctx;
  const { subject, natal } = snapshot;
  const k = kundliExt(ctx);
  const vd = k.vedicDay;
  const tz = subject.timezone;
  const nt = snapshot.raw.metadata.normalizedTime;
  const moon = planetOf(natal, 'Moon');
  const sun = planetOf(natal, 'Sun');
  const asc = natal.ascendant;
  const pairs: Array<[string, string]> = [
    ['Name', subject.name],
    ['Gender', subject.gender ? subject.gender[0].toUpperCase() + subject.gender.slice(1) : 'Not stated'],
    ['Date of birth', formatDate(subject.dateOfBirth)],
    ['Time of birth', subject.timeOfBirth ?? 'Not given'],
    ['Place of birth', subject.placeName],
    ['Latitude / Longitude', `${coord(subject.latitude, 'N', 'S')}, ${coord(subject.longitude, 'E', 'W')}`],
    ['Time zone', `${tz} (${offset(nt.timezoneOffsetMinutes)})`],
    ['Birth instant (UTC)', `${nt.utcIsoString.slice(0, 10)} ${nt.utcIsoString.slice(11, 16)}`],
    ['Local mean time', vd.localMeanTime],
    ['LMT correction', `${vd.lmtCorrectionMinutes >= 0 ? '+' : ''}${vd.lmtCorrectionMinutes.toFixed(1)} min`],
    ['Ayanamsa (Lahiri)', degMin(vd.ayanamsa)],
    ['Weekday (Vedic)', `${vd.varaWeekday} (${vd.varaName})`],
    ['Sunrise (day of birth)', localDateTime(vd.sunriseIso, tz)],
    ['Sunset', localClock(vd.sunsetIso, tz)],
    ['Day length', `${Math.floor(vd.dayLengthMinutes / 60)} h ${vd.dayLengthMinutes % 60} min`],
    ['Ishta kala (sunrise to birth)', vd.ishtaKala.text],
    ['Ascendant', `${asc.sign} ${degMin(asc.degree)}`],
    ['Ascendant lord', planetName(asc.lord)],
    ['Moon sign (Rashi)', moon.sign],
    ['Moon-sign lord', planetName(natal.houses.find((h) => h.rashiIndex === moon.rashiIndex)!.lord)],
    ['Birth nakshatra / pada', `${moon.nakshatra} / ${moon.pada}`],
    ['Nakshatra lord', planetName(moon.nakshatraLord)],
    ['Sun sign (sidereal)', `${sun.sign} ${degMin(sun.degree)}`],
    ['Sun sign (Western, tropical)', vd.westernSunSign],
    ['Ayana', vd.ayana],
    ['Gola', vd.gola],
    ['Ritu (season)', k.ritu],
    ['Vikram / Shaka Samvat', `${k.samvat.vikram} / ${k.samvat.shaka}`],
  ];
  const ids = ['asc.d1.sign', 'asc.d1.degree', 'asc.d1.lord', 'planet.moon.d1.sign', 'planet.moon.d1.nakshatra', 'planet.sun.d1.sign', 'kundli.vara', 'kundli.ritu', 'kundli.moon.pada'];
  return {
    tex: pairTable(pairs),
    evidenceIds: ids,
    method: 'Positions: sidereal zodiac, Lahiri ayanamsa, Whole Sign houses, mean nodes. The Vedic weekday runs from sunrise to sunrise, so a birth before sunrise belongs to the previous weekday. Local mean time = UTC + longitude x 4 min. Ayana and gola use the tropical Sun; ritu follows the amanta lunar month; Samvat years are Chaitradi.',
  };
}

export function kundliAvakahada(ctx: BlockContext): BlockOutput {
  const k = kundliExt(ctx);
  const av = k.avakhada;
  const pairs: Array<[string, string]> = [
    ['Varna', av.varna],
    ['Vashya', av.vashya],
    ['Yoni', `${av.yoni} (${av.yoniGender.toLowerCase()})`],
    ['Gana', av.gana],
    ['Nadi', av.nadi],
    ['Tatwa (element)', av.tatwa],
    ['Paya (by Moon house)', av.paya],
    ['Yunja', av.yunja],
    ['Hansaka', av.hansaka],
    ['Name syllable (namakshara)', av.namakshara],
    ['Rashi / lord', `${av.rashi} / ${planetName(av.rashiLord)}`],
    ['Nakshatra / lord', `${av.nakshatra} / ${planetName(av.nakshatraLord)}`],
  ];
  return {
    tex: pairTable(pairs),
    evidenceIds: ['kundli.avakahada.gana', 'kundli.avakahada.yoni', 'kundli.avakahada.nadi', 'kundli.avakahada.varna', 'kundli.avakahada.vashya', 'kundli.avakahada.tatwa', 'kundli.avakahada.namakshara'],
    method: 'Avakahada Chakra from the Moon\'s sign, nakshatra and pada (classical tables used in matching and naming); Paya is counted from the Moon\'s house from the Ascendant.',
  };
}

export function kundliPanchangTable(ctx: BlockContext): BlockOutput {
  const k = kundliExt(ctx);
  const tz = ctx.snapshot.subject.timezone;
  const b = k.panchangBirth;
  const r = k.panchangSunrise;
  const ends = (iso?: string) => (iso ? `ends ${localDateTime(iso, tz)}` : '');
  const pk = (p: string) => (p === 'SUKLA' ? 'Shukla' : 'Krishna');
  const vd = k.vedicDay;
  const balance = ctx.snapshot.vimshottari;
  const pairs: Array<[string, string]> = [
    ['Vara (weekday)', `${vd.varaWeekday} (${vd.varaName}), lord ${planetName(vd.varaLord)}`],
    ['Civil weekday', vd.civilWeekday],
    ['Tithi at birth', `${pk(b.tithi.paksha)} ${b.tithi.name}; ${ends(b.tithi.endIso)}`],
    ['Tithi at sunrise', `${pk(r.tithi.paksha)} ${r.tithi.name}`],
    ['Nakshatra at birth', `${b.nakshatra.name} ${b.nakshatra.pada}; ${ends(b.nakshatra.endIso)}`],
    ['Nakshatra at sunrise', r.nakshatra.name],
    ['Yoga at birth', `${b.yoga.name}; ${ends(b.yoga.endIso)}`],
    ['Yoga at sunrise', r.yoga.name],
    ['Karana at birth', `${b.karana.name}; ${ends(b.karana.endIso)}`],
    ['Karana at sunrise', r.karana.name],
    ['Paksha', `${pk(b.tithi.paksha)} (${b.tithi.paksha === 'SUKLA' ? 'waxing' : 'waning'} Moon)`],
    ['Lunar month', `${b.hinduCalendar?.amantaMasa ?? ''} (amanta) / ${b.hinduCalendar?.purnimantaMasa ?? ''} (purnimanta)`],
    ['Bhayat / Bhabhog', k.bhayat ? `${k.bhayat.bhayat.text} / ${k.bhayat.bhabhog.text}` : 'Not available'],
    ['Balance of dasha at birth', `${planetName(balance.birthLord)} ${yearsMonthsDays(balance.balanceAtBirthYears)}`],
  ];
  const note = vd.engineWeekday !== vd.varaWeekday
    ? ` For this birth the calendar (UTC) weekday is ${vd.engineWeekday}, but the Vedic day of birth is ${vd.varaWeekday}; the Vedic value is used throughout.`
    : '';
  return {
    tex: pairTable(pairs),
    evidenceIds: ['kundli.vara', 'kundli.tithi', 'kundli.paksha', 'kundli.nitya-yoga', 'kundli.karana', 'dasha.birth-lord'],
    method: `Tithi, nakshatra, yoga and karana from the sidereal Sun and Moon at the birth instant and at the sunrise that began the day of birth; end times are local. Bhayat is the part of the birth nakshatra already elapsed at birth and Bhabhog its full length (1 ghati = 24 minutes, 1 pal = 24 seconds).${note}`,
  };
}

export function kundliGhatak(ctx: BlockContext): BlockOutput {
  const g = kundliExt(ctx).ghat;
  const pairs: Array<[string, string]> = [
    ['Month (masa)', g.ghatMasa],
    ['Tithi group', g.ghatTithi],
    ['Weekday', g.ghatVara],
    ['Nakshatra', g.ghatNakshatra],
    ['Prahar (watch of the day)', ordinal(g.ghatPrahar)],
    ['Lagna', g.ghatLagna],
  ];
  return {
    tex: pairTable(pairs) + '\n' + noteBox('asCard', 'How to use this table',
      'The Ghatak Chakra is a traditional almanac reference keyed to your Moon sign. Some families consult it when choosing dates for important beginnings. It describes no event in your life and carries no warning; Astro Sushil does not treat any day, star or month as unlucky for you.'),
    evidenceIds: ['planet.moon.d1.sign'],
    method: `Classical Ghatak Chakra for the Moon sign ${g.moonRashiName}, from the engine's Ghat Chakra table.`,
  };
}
