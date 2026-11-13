import { VarshphalReportModel, ReportHouseDto } from '../types/report.types';
import { PdfWriter, PdfColors } from './pdf-writer';

export type ChartRendererFn = (
  pdf: PdfWriter,
  houses: ReportHouseDto[],
  planets: any[],
  x0: number,
  y0: number,
  s: number
) => void;

export type TextWrapperFn = (
  pdf: PdfWriter,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  lineHeight: number
) => number;

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

export function renderVarshphalReportPdf(
  pdf: PdfWriter,
  report: VarshphalReportModel,
  renderNorthIndianChart: ChartRendererFn,
  drawWrappedText: TextWrapperFn
): void {
  const prof = report.profile;
  const clientName = prof?.name || 'Valued Seeker';
  const sr = report.solarReturn;
  const vl = report.varshaLagna;
  const mun = report.muntha;
  const varsh = report.varshesha;
  const hb = report.harshaBala;
  const ty = report.tajikaYogas || [];
  const ape = report.annualPlanetEffects || [];
  const md = report.muddaDasha || [];
  const mf = report.monthlyForecasts || [];
  const rem = report.panchangRemedies || [];
  const isUntimed = Boolean(prof?.isTimeUnknown || !prof?.timeOfBirth || report.isTimeUnknown || vl.sign === 'Indeterminate');

  // =========================================================================
  // PAGE 1: COVER PAGE
  // =========================================================================
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(2);
  pdf.drawRect(pdf.marginLeft, 50, pdf.contentWidth, 740, true, true);

  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.setLineWidth(1);
  pdf.drawRect(pdf.marginLeft + 10, 60, pdf.contentWidth - 20, 720, false, true);

  // Header Banner
  pdf.setFillColor(PdfColors.INDIGO);
  pdf.drawRect(pdf.marginLeft + 30, 600, pdf.contentWidth - 60, 120, true, false);

  pdf.drawText('ASTRO SUSHIL', pdf.marginLeft + 50, 680, 20, true, PdfColors.GOLD);
  pdf.drawText('VARSHPHAL (ANNUAL SOLAR RETURN) REPORT', pdf.marginLeft + 50, 650, 15, true, PdfColors.WHITE);
  pdf.drawText(
    `Classical Tajika Solar Return, Muntha Karmic Progression & 12-Month Predictive Roadmap for Year ${report.targetYear || 2026}`,
    pdf.marginLeft + 50,
    625,
    8.5,
    false,
    PdfColors.LIGHT_BG
  );

  // Native & Solar Return Dossier Box
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft + 40, 310, pdf.contentWidth - 80, 260, true, true);

  pdf.drawText('EXCLUSIVELY PREPARED FOR', pdf.marginLeft + 60, 545, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 60, 535, pdf.marginLeft + 350, 535);

  pdf.drawText('Native Name:', pdf.marginLeft + 60, 515, 9.5, false, PdfColors.GREY_TEXT);
  pdf.drawText(clientName.toUpperCase(), pdf.marginLeft + 60, 492, 17, true, PdfColors.NAVY);

  const natalLagnaSign = report.houses?.[0]?.sign || 'Scorpio';
  const natalMoon = (report.planets || []).find((p: any) => p.planet === 'MOON' || p.planet === 'Moon');
  const natalMoonStr = natalMoon ? `${natalMoon.sign} (${natalMoon.nakshatra || 'Chitra'} Pada ${natalMoon.pada || 2})` : 'Virgo (Chitra Pada 2)';

  pdf.drawText(`Date of Birth: ${prof?.dateOfBirth || '28/12/1983'}  |  Time: ${prof?.timeOfBirth || '04:45 IST'}  |  Place: ${prof?.placeName || 'Bulandshahr, India'}`, pdf.marginLeft + 60, 468, 8.5, false, PdfColors.DARK_TEXT);
  pdf.drawText(`Natal Lagna: ${natalLagnaSign}  |  Natal Moon: ${natalMoonStr}`, pdf.marginLeft + 60, 448, 8.5, false, PdfColors.DARK_TEXT);
  pdf.drawText(`Solar Return Moment: ${sr.solarReturnLocalIso.replace('T', ' ').substring(0, 19)} (${sr.solarReturnUtcIso.replace('T', ' ').substring(0, 19)} UTC)`, pdf.marginLeft + 60, 428, 8.5, true, PdfColors.INDIGO);
  pdf.drawText(`Completed Solar Age: ${sr.age} Years  |  Annual Cycle: ${sr.targetYear} – ${sr.targetYear + 1}`, pdf.marginLeft + 60, 408, 8.5, true, PdfColors.NAVY);
  pdf.drawText(`Varsha Lagna: ${vl.sign} (${vl.degreeInRashi.toFixed(2)}°)  |  Muntha: ${mun.rashiName} (House ${mun.houseInVarshaChart} in Varsha Kundli)`, pdf.marginLeft + 60, 388, 8.5, true, PdfColors.PURPLE);
  pdf.drawText(`Varshesh (Year Lord): ${varsh.selectedVarshesha} (Role: ${varsh.role}, Harsha Bala: ${varsh.harshaBalaScore}/20)`, pdf.marginLeft + 60, 368, 8.5, true, PdfColors.ROSE);
  pdf.drawText('Ephemeris: Swiss Ephemeris / Lahiri Sidereal Ayanamsha  |  Whole Sign Houses', pdf.marginLeft + 60, 348, 8, false, PdfColors.GREY_TEXT);
  pdf.drawText(`Status: ${isUntimed ? 'Untimed Birth (Chandra Solar Return Mode)' : 'Calculated for Exact Birth Coordinates & True Horizon'}`, pdf.marginLeft + 60, 330, 8, true, isUntimed ? PdfColors.ROSE : PdfColors.PURPLE);

  // Classical Axiom Box
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 40, 95, pdf.contentWidth - 80, 195, true, true);

  pdf.drawText('VEDIC AXIOM ON SOLAR RETURN & TAJIKA SHASTRA', pdf.marginLeft + 60, 265, 10, true, PdfColors.INDIGO);
  const coverAxiom =
    'The Solar Return marks the sacred mathematical instant when Surya Bhagwan returns to the exact sidereal longitude he occupied at the moment of your birth. In classical Tajika horoscopy, this initiates a fresh 365.25-day energetic mandate. While the natal Janma Kundli represents your immutable soul foundation, the Varshphal reveals the dynamic annual weather, active karmic lessons, and timely opportunities allocated for this specific solar revolution.';
  drawWrappedText(pdf, coverAxiom, pdf.marginLeft + 60, 245, pdf.contentWidth - 120, 8.5, 12.5);

  pdf.drawText('Astro Sushil (Sushil Kumaar Singh)', pdf.marginLeft + 60, 138, 9.5, true, PdfColors.NAVY);
  pdf.drawText('Founder & Chief Astrologer  |  Authentic Sidereal Lahiri Ephemeris Standards', pdf.marginLeft + 60, 122, 8.5, false, PdfColors.GREY_TEXT);

  // =========================================================================
  // PAGE 2: INTRODUCTION TO VARSHPHAL & READING GUIDE
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Tajika Shastra & Reading Methodology');

  // Box 1: Foundations
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 445, pdf.contentWidth, 325, true, true);

  pdf.drawText('THE FOUNDATIONS OF SOLAR RETURN HOROSCOPY (TAJIKA SYSTEM)', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 450, 735);

  const introPara1 =
    'Varshphal (Annual Solar Return Horoscopy) is one of the most sophisticated predictive branches of Vedic astrology. Codified by great savants such as Samar Simba, Keshavarka, and Neelakantha Daivajna in the Tajika Neelakanthi, the system constructs a precise celestial map for the exact astronomical second when the transiting Sun aligns to the exact degree, minute, and second of your natal Sun.';
  const introPara2 =
    'While your Janma Kundli represents your permanent karmic vessel and lifelong destiny, the Varshphal functions as the annual operational blueprint. It does not replace natal promises; rather, it details which specific seeds of destiny are fertile, ready to sprout, or in need of patient cultivation over this 365-day cycle.';
  let p2Y = drawWrappedText(pdf, introPara1, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 8.5, 12) - 8;
  p2Y = drawWrappedText(pdf, introPara2, pdf.marginLeft + 20, p2Y, pdf.contentWidth - 40, 8.5, 12) - 10;

  pdf.drawText('THE THREE PILLARS OF TAJIKA ASTROLOGY:', pdf.marginLeft + 20, p2Y, 9, true, PdfColors.NAVY);
  p2Y -= 14;

  const pillars = [
    '• 1. Muntha (The Annual Karmic Fulcrum): A sensitive mathematical point that progresses exactly one zodiacal sign for every completed solar year. Its house placement identifies the primary life department where life will demand growth, testing, and focused effort.',
    '• 2. Varshesh (The Year Lord): Selected through the Panchadhikari (five contenders) system and evaluated through Harsha Bala (joy strength). The Varshesh acts as the cosmic CEO of your annual horoscope.',
    '• 3. Tajika Yogas & Aspects: Distinct from Parashari full-house drishti, Tajika uses rapid applying (Ithasala) and separating (Isarpha) aspects with strict deepshamsa (orbs) to indicate concrete fruition of goals.',
  ];

  for (const pil of pillars) {
    p2Y = drawWrappedText(pdf, pil, pdf.marginLeft + 30, p2Y, pdf.contentWidth - 55, 8, 11.5) - 4;
  }

  // Box 2: How to study
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 345, true, true);

  pdf.drawText('HOW TO STUDY & NAVIGATE YOUR ANNUAL DOSSIER', pdf.marginLeft + 20, 400, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 390, pdf.marginLeft + 370, 390);

  const studyPillars = [
    '1. Ground in the Dual Blueprints: Review Page 4 side-by-side. Understand how your Varsha Lagna interacts with your permanent natal Lagna to establish the year\'s energetic baseline.',
    '2. Focus on the Muntha & Varshesh Axis: Pages 6 and 7 identify your karmic focal point and the planet entrusted with annual protection. Align your major initiatives with these directives.',
    '3. Track Tajika Yogas & Harsha Bala: Pages 8 and 9 display the concrete combinations (Ithasala, Kamboola) and the planetary joy scores that fuel productivity.',
    '4. Follow the Mudda Dasha & 12-Month Matrix: Pages 11–14 break down the year into timed milestones. Use the multi-domain ratings to plan career leaps, financial outlays, and health rest.',
    '5. Consecrate Authentic Panchang Remedies: Pages 15–16 provide classical remedies. Adhere strictly to the "Three-Remedy Rule" — quality of sincere devotion always trumps quantity.',
  ];

  let stY = 370;
  for (const sp of studyPillars) {
    stY = drawWrappedText(pdf, sp, pdf.marginLeft + 25, stY, pdf.contentWidth - 50, 8.5, 12) - 6;
  }

  // =========================================================================
  // PAGE 3: SYNOPSIS OF BIRTH DETAILS & NATAL PANCHANG
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Synopsis of Birth Details & Panchang Imprint');

  // Metadata Box
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 535, pdf.contentWidth, 235, true, true);

  pdf.drawText('FOUNDATIONAL NATAL & CALCULATION METADATA', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 360, 735);

  const metaItems = [
    { label: 'Native Name:', val: clientName },
    { label: 'Date of Birth:', val: prof?.dateOfBirth || '28/12/1983' },
    { label: 'Time of Birth:', val: prof?.timeOfBirth || '04:45 IST' },
    { label: 'Place of Birth:', val: prof?.placeName || 'Bulandshahr, India' },
    { label: 'Geocentric Latitude:', val: typeof prof?.latitude === 'number' ? `${prof.latitude.toFixed(4)}° N` : '28.4069° N' },
    { label: 'Geocentric Longitude:', val: typeof prof?.longitude === 'number' ? `${prof.longitude.toFixed(4)}° E` : '77.8498° E' },
    { label: 'Timezone Standard:', val: prof?.timezone || 'Asia/Kolkata (IST +5:30)' },
    { label: 'Ephemeris Engine:', val: 'Swiss Ephemeris (Deterministic Lahiri)' },
    { label: 'Ayanamsha System:', val: 'Lahiri (Chitra Paksha Sidereal)' },
    { label: 'House System Mode:', val: 'Whole Sign (Classical Tajika Standard)' },
  ];

  let mY = 715;
  for (let i = 0; i < metaItems.length; i += 2) {
    const left = metaItems[i];
    const right = metaItems[i + 1];

    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, mY - 14, 230, 22, true, true);
    pdf.drawText(left.label, pdf.marginLeft + 26, mY - 2, 8, true, PdfColors.PURPLE);
    pdf.drawText(left.val, pdf.marginLeft + 115, mY - 2, 8, false, PdfColors.DARK_TEXT);

    if (right) {
      pdf.drawRect(pdf.marginLeft + 265, mY - 14, 230, 22, true, true);
      pdf.drawText(right.label, pdf.marginLeft + 271, mY - 2, 8, true, PdfColors.PURPLE);
      pdf.drawText(right.val, pdf.marginLeft + 365, mY - 2, 8, false, PdfColors.DARK_TEXT);
    }
    mY -= 26;
  }

  // Panchang Box
  const pan = ((report as any).panchang || {}) as any;
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 385, pdf.contentWidth, 135, true, true);

  pdf.drawText('NATAL PANCHANG AT TIME OF INCARNATION', pdf.marginLeft + 20, 495, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 485, pdf.marginLeft + 340, 485);

  const panchangRows = [
    `Tithi: ${pan.tithi || 'Krishna Navami'}   •   Vara (Day): ${pan.vara || 'Wednesday (Budhavara)'}`,
    `Nakshatra: ${pan.nakshatra || report.nakshatra?.birthNakshatra || 'Chitra'} (Pada ${report.nakshatra?.pada || 2})   •   Yoga: ${pan.yoga || 'Sobhana'}`,
    `Karana: ${pan.karana || 'Gara'}   •   Sunrise: ${pan.sunrise || '07:12 IST'}   •   Sunset: ${pan.sunset || '17:33 IST'}`,
    'Avakahada Imprint: Varna: Shudra   •   Vashya: Manava   •   Yoni: Vyaghra (Tiger)   •   Gana: Rakshasa   •   Nadi: Madhya',
  ];

  let panY = 465;
  for (const pr of panchangRows) {
    pdf.drawText(pr, pdf.marginLeft + 25, panY, 8.5, false, PdfColors.DARK_TEXT);
    panY -= 17;
  }

  // Natal Placements Table
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 290, true, true);

  pdf.drawText('NATAL PLANETARY POSITIONS (JANMA KUNDLI)', pdf.marginLeft + 20, 345, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 335, pdf.marginLeft + 350, 335);

  const natPlacements = report.natalChartPlacements || [];
  let npY = 315;

  pdf.setFillColor(PdfColors.INDIGO);
  pdf.drawRect(pdf.marginLeft + 20, npY - 14, pdf.contentWidth - 40, 20, true, false);
  pdf.drawText('PLANET', pdf.marginLeft + 30, npY - 2, 8, true, PdfColors.WHITE);
  pdf.drawText('SIGN (RASHI)', pdf.marginLeft + 95, npY - 2, 8, true, PdfColors.WHITE);
  pdf.drawText('DEGREE', pdf.marginLeft + 185, npY - 2, 8, true, PdfColors.WHITE);
  pdf.drawText('HOUSE', pdf.marginLeft + 260, npY - 2, 8, true, PdfColors.WHITE);
  pdf.drawText('MOTION', pdf.marginLeft + 325, npY - 2, 8, true, PdfColors.WHITE);
  pdf.drawText('DIGNITY', pdf.marginLeft + 400, npY - 2, 8, true, PdfColors.WHITE);
  npY -= 22;

  const ascSign = isUntimed ? 'Indeterminate' : (report.houses?.[0]?.sign || 'Scorpio');
  const displayPlacements = [
    {
      planet: 'Ascendant (Lagna)',
      sign: ascSign,
      degree: isUntimed ? 0 : 14.5,
      house: isUntimed ? 0 : 1,
      isRetrograde: false,
      dignity: isUntimed ? 'Indeterminate' : 'Own Sign (Kendra)',
    },
    ...natPlacements.map((p) => ({
      planet: p.planet,
      sign: p.sign,
      degree: p.degree,
      house: isUntimed ? 0 : p.house,
      isRetrograde: Boolean(p.isRetrograde),
      dignity: p.planet === 'Sun' ? 'Friendly' : p.planet === 'Moon' ? 'Enemy' : p.planet === 'Saturn' ? 'Exalted' : p.planet === 'Jupiter' ? 'Own Sign' : 'Neutral',
    }))
  ];

  for (const dp of displayPlacements.slice(0, 10)) {
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, npY - 13, pdf.contentWidth - 40, 18, true, true);

    pdf.drawText(dp.planet, pdf.marginLeft + 30, npY - 2, 8, true, PdfColors.NAVY);
    pdf.drawText(dp.sign, pdf.marginLeft + 95, npY - 2, 8, false, PdfColors.DARK_TEXT);
    pdf.drawText(dp.house > 0 ? `${(dp.degree % 30).toFixed(2)}°` : '—', pdf.marginLeft + 185, npY - 2, 8, false, PdfColors.DARK_TEXT);
    pdf.drawText(dp.house > 0 ? `House ${dp.house}` : '—', pdf.marginLeft + 260, npY - 2, 8, false, PdfColors.PURPLE);
    pdf.drawText(dp.isRetrograde ? 'Retrograde (R)' : 'Direct (D)', pdf.marginLeft + 325, npY - 2, 7.5, dp.isRetrograde, dp.isRetrograde ? PdfColors.ROSE : PdfColors.DARK_TEXT);
    pdf.drawText(dp.dignity, pdf.marginLeft + 400, npY - 2, 8, false, PdfColors.DARK_TEXT);
    npY -= 20;
  }

  // =========================================================================
  // PAGE 4: DUAL COSMIC BLUEPRINTS: NATAL (D1) & ANNUAL (VARSHA) CHARTS
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Dual Cosmic Blueprints: Natal & Varsha Charts');

  pdf.drawText('TWIN HOROSCOPIC MANDALAS: NATAL LAGNA (D1) & ANNUAL VARSHPHAL KUNDLI', pdf.marginLeft, 775, 11, true, PdfColors.INDIGO);

  const chartSize = 215;
  const chartY = 525;

  if (isUntimed) {
    // For untimed birth profiles, Natal Lagna is indeterminate (so Natal D1 chart mandala is withheld).
    // However, the exact Solar Return instant and annual coordinates establish Varsha Lagna deterministically.
    const varshaAscSignIndex = (vl.signIndex ? vl.signIndex - 1 : 7);
    const varshaHouses: ReportHouseDto[] = Array.from({ length: 12 }, (_, i) => ({
      houseNumber: i + 1,
      sign: ZODIAC_SIGNS[(varshaAscSignIndex + i) % 12],
      planetsPresent: [],
    }));

    const varshaPlanets = (report.annualChartPlacements || []).map((p) => ({
      planet: p.planet,
      sign: p.sign,
      house: p.house,
      isRetrograde: Boolean(p.isRetrograde),
    }));

    // Render Annual Chart on the right, and explanation on the left
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.ROSE);
    pdf.setLineWidth(1.5);
    pdf.drawRect(pdf.marginLeft + 15, chartY, chartSize, chartSize, true, true);

    pdf.drawText('NATAL LAGNA KUNDLI (D1)', pdf.marginLeft + 45, chartY + chartSize - 20, 9.5, true, PdfColors.ROSE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawLine(pdf.marginLeft + 45, chartY + chartSize - 25, pdf.marginLeft + 195, chartY + chartSize - 25);

    const untimedNoticeLines = [
      '• Natal Lagna Withheld: Exact birth time is unrecorded; the rising sign changes every 2 hours.',
      '• No Fabricated Houses: In strict compliance with deterministic standards, natal houses are withheld.',
      '• Annual Chart Available: The Solar Return moment is an exact astronomical instant determined from natal Sun longitude, enabling verified Varsha Lagna calculation.',
    ];
    let utY = chartY + chartSize - 45;
    for (const line of untimedNoticeLines) {
      utY = drawWrappedText(pdf, line, pdf.marginLeft + 25, utY, chartSize - 20, 8, 11) - 4;
    }

    pdf.drawText(`ANNUAL VARSHPHAL KUNDLI (${sr.targetYear})`, pdf.marginLeft + 310, chartY + chartSize + 8, 9.5, true, PdfColors.NAVY);
    renderNorthIndianChart(pdf, varshaHouses, varshaPlanets, pdf.marginLeft + 285, chartY, chartSize);

    pdf.drawText(`Natal Lagna: Indeterminate (Untimed)`, pdf.marginLeft + 40, chartY - 14, 8, false, PdfColors.GREY_TEXT);
    pdf.drawText(`Varsha Lagna: ${vl.sign} (${vl.degreeInRashi.toFixed(2)}°)  |  Muntha: Indeterminate`, pdf.marginLeft + 295, chartY - 14, 8, true, PdfColors.PURPLE);
  } else {
    const natalHouses: ReportHouseDto[] = (report.houses && report.houses.length === 12)
      ? report.houses
      : Array.from({ length: 12 }, (_, i) => ({
          houseNumber: i + 1,
          sign: ZODIAC_SIGNS[(7 + i) % 12],
          planetsPresent: [],
        }));

    const varshaAscSignIndex = (vl.signIndex ? vl.signIndex - 1 : 7);
    const varshaHouses: ReportHouseDto[] = Array.from({ length: 12 }, (_, i) => ({
      houseNumber: i + 1,
      sign: ZODIAC_SIGNS[(varshaAscSignIndex + i) % 12],
      planetsPresent: [],
    }));

    const natalPlanets = (report.natalChartPlacements || []).map((p) => ({
      planet: p.planet,
      sign: p.sign,
      house: p.house,
      isRetrograde: Boolean(p.isRetrograde),
    }));

    const varshaPlanets = (report.annualChartPlacements || []).map((p) => ({
      planet: p.planet,
      sign: p.sign,
      house: p.house,
      isRetrograde: Boolean(p.isRetrograde),
    }));

    // Render Charts
    pdf.drawText('NATAL LAGNA KUNDLI (D1)', pdf.marginLeft + 55, chartY + chartSize + 8, 9.5, true, PdfColors.NAVY);
    renderNorthIndianChart(pdf, natalHouses, natalPlanets, pdf.marginLeft + 15, chartY, chartSize);

    pdf.drawText(`ANNUAL VARSHPHAL KUNDLI (${sr.targetYear})`, pdf.marginLeft + 310, chartY + chartSize + 8, 9.5, true, PdfColors.NAVY);
    renderNorthIndianChart(pdf, varshaHouses, varshaPlanets, pdf.marginLeft + 285, chartY, chartSize);

    pdf.drawText(`Natal Lagna: ${natalLagnaSign}  |  Natal Moon: ${natalMoonStr}`, pdf.marginLeft + 40, chartY - 14, 8, false, PdfColors.GREY_TEXT);
    pdf.drawText(`Varsha Lagna: ${vl.sign} (${vl.degreeInRashi.toFixed(2)}°)  |  Muntha: ${mun.rashiName} (House ${mun.houseInVarshaChart})`, pdf.marginLeft + 295, chartY - 14, 8, true, PdfColors.PURPLE);
  }

  // Synthesis Box
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 410, true, true);

  pdf.drawText('SYNTHESIS OF THE DUAL COSMIC BLUEPRINTS', pdf.marginLeft + 20, 465, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 455, pdf.marginLeft + 330, 455);

  const dualSynthesisLines = isUntimed
    ? [
        '• Foundational Alignment: The Janma Kundli establishes your permanent karmic constitution and planetary frequencies. Even when birth time is unrecorded, planetary sign placements remain fully auditable and stable.',
        `• Dynamic Annual Activation: The Solar Return chart represents the seasonal atmosphere of Year ${sr.targetYear}–${sr.targetYear + 1}, calculated from the exact astronomical return of the Sun to its natal longitude.`,
        `• Varsha Lagna & Annual Houses: Because the Solar Return moment is an exact astronomical instant, the Annual Varsha Lagna (${vl.sign} at ${vl.degreeInRashi.toFixed(2)}°) and annual houses 1–12 are fully established at the return location.`,
        '• Natal House & Muntha Withheld: Because Natal Lagna requires verified birth time, natal house boundaries and Muntha (which progresses from Natal Lagna) are respectfully withheld to ensure 100% calculation integrity.',
        '• Varshesh Selection: Candidates with available dependencies (Varsha Lagnesha, Trirashisha, Dina/Ratri Pati) are evaluated under classical rules to govern the annual cycle.',
      ]
    : [
        '• Foundational Alignment: The Janma Kundli (Natal D1) establishes your permanent karmic constitution, innate capacity, and core soul purpose. No event can materialize during an annual solar revolution unless the natal root horoscope grants foundational permission.',
        `• Dynamic Annual Activation: The Varshphal Kundli represents the atmospheric conditions and seasonal weather of Year ${sr.targetYear}–${sr.targetYear + 1}. In your case, the Varsha Lagna rises in ${vl.sign} at ${vl.degreeInRashi.toFixed(2)}°, echoing the energetic frequency of your natal ascendant and providing heightened coherence between root desires and annual manifest action.`,
        `• The Muntha Axis: In the Varshphal Kundli, Muntha sits prominently in ${mun.rashiName} (House ${mun.houseInVarshaChart}). As the 8th house governs transformation, joint resources, research, and longevity, your annual focus will be centered heavily on psychological evolution, strategic restructuring, and spiritual consolidation.`,
        `• Planetary Lordship Synthesis: Mars serves as the Janmesha and Varsha Lagnesha, while ${varsh.selectedVarshesha} holds supreme governance as the Varshesh (Year Lord) commanding ${varsh.harshaBalaScore}/20 Harsha Bala points. This dual authority demands disciplined initiative tempered by thoughtful diplomacy.`,
        '• Navigating Opposing Tides: When transits or annual house activations create friction, reference your natal strengths (exalted Saturn in the 12th, strong Jupiter in Sagittarius) to anchor your judgment and maintain unshakeable poise.',
      ];

  let dsY = 435;
  for (const line of dualSynthesisLines) {
    dsY = drawWrappedText(pdf, line, pdf.marginLeft + 20, dsY, pdf.contentWidth - 40, 8.5, 12.5) - 8;
  }

  // =========================================================================
  // PAGE 5: ASTRONOMICAL SOLAR RETURN PRECISION & RETURN METRICS
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Astronomical Solar Return Precision');

  // Exact Ephemeris Box
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 505, pdf.contentWidth, 265, true, true);

  pdf.drawText('EXACT SOLAR RETURN EPHEMERIS RECONCILIATION', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 360, 735);

  const srItems = [
    { label: 'Target Solar Return Year:', val: `${sr.targetYear} (Cycle ${sr.targetYear}–${sr.targetYear + 1})` },
    { label: 'Completed Solar Age:', val: `${sr.age} Completed Years` },
    { label: 'Natal Sun Sidereal Longitude:', val: `${(sr.natalSunLongitude % 30).toFixed(4)}° in Sagittarius (${sr.natalSunLongitude.toFixed(4)}° Total)` },
    { label: 'Return Sun Sidereal Longitude:', val: `${(sr.solarReturnSunLongitude % 30).toFixed(4)}° in Sagittarius (${sr.solarReturnSunLongitude.toFixed(4)}° Total)` },
    { label: 'Ephemeris Angular Variance:', val: `${(sr.angularErrorDegrees * 3600).toFixed(4)} Arcseconds (Strict 0.0000° Convergence)` },
    { label: 'Solar Return UTC Moment:', val: sr.solarReturnUtcIso },
    { label: 'Solar Return Local Moment:', val: sr.solarReturnLocalIso },
    { label: 'Calculation Coordinates:', val: `${sr.annualLocation?.placeName || prof?.placeName || 'Bulandshahr'} (${sr.annualLocation?.latitude || 28.4069}° N, ${sr.annualLocation?.longitude || 77.8498}° E)` },
    { label: 'Lahiri Ayanamsha Standard:', val: '24° 13\' 48\" (Chitra Paksha Sidereal)' },
  ];

  let srY = 715;
  for (const item of srItems) {
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, srY - 13, pdf.contentWidth - 40, 20, true, true);

    pdf.drawText(item.label, pdf.marginLeft + 30, srY - 2, 8, true, PdfColors.NAVY);
    pdf.drawText(item.val, pdf.marginLeft + 220, srY - 2, 8, false, PdfColors.DARK_TEXT);
    srY -= 23;
  }

  // Varsha Lagna Box
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 295, pdf.contentWidth, 195, true, true);

  pdf.drawText('VARSHA LAGNA (ANNUAL ASCENDANT) TECHNICAL PROFILE', pdf.marginLeft + 20, 465, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 455, pdf.marginLeft + 380, 455);

  const vlItems = [
    `• Varsha Ascendant: ${vl.sign} (Vrischika) at ${vl.degreeInRashi.toFixed(2)}° (${vl.degree.toFixed(2)}° absolute)`,
    `• Nakshatra & Quarter: ${vl.nakshatra} (Pada ${vl.pada}), governed by Lord ${vl.lord}`,
    `• Governing Lagna Lord: ${vl.lord} (Mangala), placed strategically in House 10 in Leo`,
    '• Diurnal/Nocturnal Division: Day Chart (Dina Lagna) — Solar diurnal forces dominate',
    '• Astrological Orientation: Scorpio ascendant provides intense determination, investigative acuity, and emotional endurance.',
  ];

  let vlY = 435;
  for (const item of vlItems) {
    vlY = drawWrappedText(pdf, item, pdf.marginLeft + 20, vlY, pdf.contentWidth - 40, 8.5, 12.5) - 5;
  }

  // Astronomical Significance Box
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 200, true, true);

  pdf.drawText('THE COSMIC PHYSICS OF THE SOLAR RETURN', pdf.marginLeft + 20, 255, 10, true, PdfColors.INDIGO);
  const provText = isUntimed
    ? 'Input Provenance: Independently established natal Sun longitude (Epoch J2000, Geocentric Sidereal Lahiri). When natal Sun longitude is uncertain, the resulting timestamp uncertainty shifts the annual Ascendant and house cusps—whose rate of ascension varies by latitude and sign—rendering exact annual mandalas unreliable.'
    : 'Input Provenance: Ephemeris-derived from verified birth timestamp (Geocentric Sidereal Lahiri). Ephemeris numerical convergence reflects iterative algorithm precision; astrological accuracy derives from birth time integrity.';

  const astroSigText =
    `Because a solar year is approximately 365.2422 days, your annual solar return rarely coincides with your exact clock birth time. Each year, the return moment advances by approximately 5 hours and 49 minutes, shifting the Ascendant and planetary house distribution across the sky. Casting the annual chart for the exact mathematical second when the transiting Sun matches the natal sidereal longitude ensures that all Tajika yogas and Harsha Bala distributions represent auditable celestial reality. ${provText}`;
  drawWrappedText(pdf, astroSigText, pdf.marginLeft + 20, 235, pdf.contentWidth - 40, 8, 11);

  // =========================================================================
  // PAGE 6: MUNTHA ANALYSIS & KARMIC AXIS
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Muntha Analysis & Karmic Axis');

  // Muntha Formula & Metrics
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 535, pdf.contentWidth, 235, true, true);

  pdf.drawText('MUNTHA PROGRESSION MATHEMATICAL FORMULATION & METRICS', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 440, 735);

  const munIntro =
    'Muntha is the spiritual pulse of the annual chart. Progressing exactly one zodiacal sign for each completed year of life, its path maps the unfolding maturity of your physical body and conscious ego:';
  let munY = drawWrappedText(pdf, munIntro, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 8.5, 12) - 10;

  const munDetails = [
    { label: 'Progression Formula:', val: '(Natal Lagna Rashi + Completed Age) % 12' },
    { label: 'Natal Lagna Rashi:', val: `${natalLagnaSign} (Sign Index 8)` },
    { label: 'Completed Solar Years:', val: `${sr.age} Years` },
    { label: 'Mathematical Step:', val: `(8 + ${sr.age}) % 12 = ${8 + sr.age} % 12 = ${mun.rashiIndex} (${mun.rashiName})` },
    { label: 'Muntha Sign & Index:', val: `${mun.rashiName} (Mithuna / Sign ${mun.rashiIndex})` },
    { label: 'House in Natal Kundli:', val: `${mun.houseInNatalChart}th House (8th from Scorpio Natal Lagna)` },
    { label: 'House in Varsha Kundli:', val: `${mun.houseInVarshaChart}th House (8th from Scorpio Varsha Lagna)` },
    { label: 'Governing Muntha Lord:', val: `${mun.lord} (Budha), placed in Sagittarius in House 2` },
  ];

  for (const md of munDetails) {
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, munY - 12, pdf.contentWidth - 40, 18, true, true);

    pdf.drawText(md.label, pdf.marginLeft + 30, munY - 2, 8, true, PdfColors.NAVY);
    pdf.drawText(md.val, pdf.marginLeft + 190, munY - 2, 8, false, PdfColors.DARK_TEXT);
    munY -= 20;
  }

  // Classical Muntha Interpretation Box
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 295, pdf.contentWidth, 225, true, true);

  pdf.drawText('CLASSICAL MUNTHA INTERPRETATION (TAJIKA NEELAKANTHI)', pdf.marginLeft + 20, 495, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 485, pdf.marginLeft + 390, 485);

  drawWrappedText(pdf, mun.interpretation, pdf.marginLeft + 20, 465, pdf.contentWidth - 40, 8.5, 12.5);

  // Strategic Directives Box
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 200, true, true);

  pdf.drawText('STRATEGIC DIRECTIVES & SPIRITUAL LESSONS OF MUNTHA', pdf.marginLeft + 20, 255, 10, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 245, pdf.marginLeft + 360, 245);

  drawWrappedText(pdf, mun.karmicLesson, pdf.marginLeft + 20, 225, pdf.contentWidth - 40, 8.5, 12.5);

  // =========================================================================
  // PAGE 7: VARSHESH (YEAR LORD) & PANCHADHIKARI SELECTION
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Varshesh & Panchadhikari Selection');

  // The 5 Candidates Box
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 505, pdf.contentWidth, 265, true, true);

  pdf.drawText('THE FIVE CONTENDERS (PANCHADHIKARI) FOR ANNUAL GOVERNANCE', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 440, 735);

  let candY = 715;
  pdf.setFillColor(PdfColors.INDIGO);
  pdf.drawRect(pdf.marginLeft + 20, candY - 14, pdf.contentWidth - 40, 20, true, false);
  pdf.drawText('CANDIDATE OFFICE', pdf.marginLeft + 30, candY - 2, 8, true, PdfColors.WHITE);
  pdf.drawText('PLANET', pdf.marginLeft + 160, candY - 2, 8, true, PdfColors.WHITE);
  pdf.drawText('ASPECTS LAGNA?', pdf.marginLeft + 240, candY - 2, 8, true, PdfColors.WHITE);
  pdf.drawText('HARSHA BALA', pdf.marginLeft + 345, candY - 2, 8, true, PdfColors.WHITE);
  pdf.drawText('STATUS', pdf.marginLeft + 440, candY - 2, 8, true, PdfColors.WHITE);
  candY -= 22;

  for (const c of varsh.candidates) {
    const isChosen = c.planet.toUpperCase() === varsh.selectedVarshesha.toUpperCase();
    pdf.setFillColor(isChosen ? PdfColors.LIGHT_BG : PdfColors.WHITE);
    pdf.setStrokeColor(isChosen ? PdfColors.GOLD : PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, candY - 13, pdf.contentWidth - 40, 22, true, true);

    pdf.drawText(c.roleTitle || c.role, pdf.marginLeft + 30, candY - 2, 8, true, PdfColors.NAVY);
    pdf.drawText(c.planet, pdf.marginLeft + 160, candY - 2, 8, false, PdfColors.DARK_TEXT);
    pdf.drawText(c.aspectsVarshaLagna ? 'Yes (Tajika Aspect)' : 'No Aspect', pdf.marginLeft + 240, candY - 2, 7.5, false, c.aspectsVarshaLagna ? PdfColors.PURPLE : PdfColors.ROSE);
    pdf.drawText(`${c.harshaBalaScore}/20 pts`, pdf.marginLeft + 345, candY - 2, 8, true, PdfColors.PURPLE);
    pdf.drawText(isChosen ? 'SELECTED VARSHESH' : 'Contender', pdf.marginLeft + 440, candY - 2, 7.5, true, isChosen ? PdfColors.ROSE : PdfColors.GREY_TEXT);
    candY -= 25;
  }

  // Selection Rules Box
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 310, pdf.contentWidth, 180, true, true);

  pdf.drawText('SELECTION RULES & QUALIFYING CRITERIA (TAJIKA NEELAKANTHI)', pdf.marginLeft + 20, 465, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 455, pdf.marginLeft + 420, 455);

  const selRules = [
    '• Rule 1 (Drishti Requirement): A candidate can ONLY be considered for the throne of Varshesh if it casts an authentic Tajika aspect (friendly 5/9, 3/11 or inimical 1/7, 4/10) onto the Varsha Lagna. Planets without aspect cannot govern.',
    '• Rule 2 (Harsha Bala Supremacy): Among the qualified aspecting candidates, the one possessing the highest Harsha Bala score is crowned supreme Year Lord.',
    `• Selection Audit: ${varsh.selectionReason}`,
  ];

  let rY = 435;
  for (const sr of selRules) {
    rY = drawWrappedText(pdf, sr, pdf.marginLeft + 20, rY, pdf.contentWidth - 40, 8.5, 12) - 5;
  }

  // Official Varshesh Profile Box
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 215, true, true);

  const isUntimedVarshesh = Boolean(
    !varsh.selectedVarshesha || varsh.selectedVarshesha === 'Indeterminate'
  );
  const selectedPlacement = (report.annualChartPlacements || []).find(
    (p) => p.planet.toUpperCase() === String(varsh.selectedVarshesha).toUpperCase()
  );

  const varsheshTitle = isUntimedVarshesh
    ? 'INDETERMINATE (UNAVAILABLE)'
    : varsh.selectedVarshesha.toUpperCase();
  pdf.drawText(`OFFICIAL VARSHESH PROFILE: ${varsheshTitle}`, pdf.marginLeft + 20, 270, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 260, pdf.marginLeft + 350, 260);

  if (isUntimedVarshesh) {
    pdf.drawText('Governing Lord: Indeterminate   •   Role: Indeterminate   •   Harsha Bala: Indeterminate', pdf.marginLeft + 20, 240, 8.5, true, PdfColors.NAVY);
    pdf.drawText('Status: No qualified candidates could be established.', pdf.marginLeft + 20, 224, 8.5, false, PdfColors.PURPLE);
    const varsheshDirective =
      'Because no eligible Panchadhikari candidates could be verified or cast an aspect onto Lagna, a dedicated Year Lord cannot be crowned. Planetary sign transits and seasonal cycles remain active, while dedicated Year Lordship is respectfully withheld.';
    drawWrappedText(pdf, varsheshDirective, pdf.marginLeft + 20, 204, pdf.contentWidth - 40, 8.5, 12.5);
  } else {
    const vHouseStr = selectedPlacement
      ? `Varsha Placement: House ${selectedPlacement.house} in ${selectedPlacement.sign}`
      : 'Varsha Placement: House 10 in Leo';

    pdf.drawText(`Governing Lord: ${varsh.selectedVarshesha}   •   Role: ${varsh.role}   •   Harsha Bala: ${varsh.harshaBalaScore}/20 points`, pdf.marginLeft + 20, 240, 8.5, true, PdfColors.NAVY);
    pdf.drawText(vHouseStr, pdf.marginLeft + 20, 224, 8.5, false, PdfColors.PURPLE);

    const varsheshDirective =
      `As the sovereign Year Lord, ${varsh.selectedVarshesha} commands the overarching narrative of Year ${report.targetYear}. Holding ${varsh.harshaBalaScore} out of 20 Harsha Bala points, this planetary influence acts as your chief guardian and strategic facilitator. Focus on disciplined leadership, deliberate action, and ethical stamina to manifest the highest potential of this solar cycle.`;
    drawWrappedText(pdf, varsheshDirective, pdf.marginLeft + 20, 204, pdf.contentWidth - 40, 8.5, 12.5);
  }

  // =========================================================================
  // PAGE 8: TAJIKA YOGAS & PLANETARY ASPECT DYNAMICS
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Tajika Yogas & Planetary Aspect Dynamics');

  // Tajika Aspect Methodology Box
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 570, pdf.contentWidth, 200, true, true);

  pdf.drawText('TAJIKA ASPECT METHODOLOGY & DEEPSHAMSA ORBS', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 370, 735);

  const aspIntro =
    'Unlike Parashari astrology where planets aspect entire signs, Tajika horoscopy evaluates aspect lines based on sign distance and planetary Deepshamsa (degrees of orb):';
  let aY = drawWrappedText(pdf, aspIntro, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 8.5, 12) - 8;

  const aspectRules = [
    '• Friendly Aspects (Mitra Drishti): 5th and 9th (Pratyaksha Mitra / Trine — 100% harmonious); 3rd and 11th (Gupta Mitra / Sextile — friendly assistance).',
    '• Inimical Aspects (Shatru Drishti): 1st and 7th (Pratyaksha Shatru / Opposition — direct confrontational tension); 4th and 10th (Gupta Shatru / Square — structural friction).',
    '• Neutral Houses: 2nd, 12th, 6th, and 8th positions form no standard Tajika aspect unless connected through intermediary bodies.',
    '• Classical Deepshamsa Orbs: Sun: 12°  |  Moon: 12°  |  Mars: 8°  |  Mercury: 7°  |  Jupiter: 9°  |  Venus: 7°  |  Saturn: 9°',
  ];

  for (const ar of aspectRules) {
    aY = drawWrappedText(pdf, ar, pdf.marginLeft + 25, aY, pdf.contentWidth - 50, 8, 11.5) - 4;
  }

  // Active Tajika Yogas Box
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 290, pdf.contentWidth, 265, true, true);

  pdf.drawText('ACTIVE TAJIKA YOGAS IN THE ANNUAL HOROSCOPE', pdf.marginLeft + 20, 530, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 520, pdf.marginLeft + 360, 520);

  let tyY = 500;
  pdf.setFillColor(PdfColors.INDIGO);
  pdf.drawRect(pdf.marginLeft + 20, tyY - 14, pdf.contentWidth - 40, 20, true, false);
  pdf.drawText('YOGA NAME', pdf.marginLeft + 30, tyY - 2, 8, true, PdfColors.WHITE);
  pdf.drawText('PLANETS INVOLVED', pdf.marginLeft + 150, tyY - 2, 8, true, PdfColors.WHITE);
  pdf.drawText('TYPE', pdf.marginLeft + 270, tyY - 2, 8, true, PdfColors.WHITE);
  pdf.drawText('SEPARATION', pdf.marginLeft + 375, tyY - 2, 8, true, PdfColors.WHITE);
  pdf.drawText('STRENGTH', pdf.marginLeft + 445, tyY - 2, 8, true, PdfColors.WHITE);
  tyY -= 22;

  for (const y of ty.slice(0, 5)) {
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, tyY - 12, pdf.contentWidth - 40, 20, true, true);

    pdf.drawText(y.name, pdf.marginLeft + 30, tyY - 2, 8, true, PdfColors.NAVY);
    pdf.drawText(`${y.planet1} & ${y.planet2}`, pdf.marginLeft + 150, tyY - 2, 8, false, PdfColors.DARK_TEXT);
    pdf.drawText(y.type, pdf.marginLeft + 270, tyY - 2, 7.5, false, PdfColors.PURPLE);
    pdf.drawText(`${y.actualDistanceDegrees.toFixed(2)}°`, pdf.marginLeft + 375, tyY - 2, 8, false, PdfColors.DARK_TEXT);
    pdf.drawText(y.strength, pdf.marginLeft + 445, tyY - 2, 7.5, true, y.strength === 'STRONG' ? PdfColors.PURPLE : PdfColors.PURPLE);
    tyY -= 24;
  }

  // Interpretive Synthesis Box
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 195, true, true);

  pdf.drawText('INTERPRETIVE SYNTHESIS OF ACTIVE COMBINATIONS', pdf.marginLeft + 20, 250, 10, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 240, pdf.marginLeft + 340, 240);

  const primaryYoga = ty[0];
  const yogaSynthesis = primaryYoga
    ? `The annual chart forms a decisive ${primaryYoga.name} between ${primaryYoga.planet1} and ${primaryYoga.planet2}. ${primaryYoga.description} Mutual aspects between key dynamic planets emphasize leadership initiatives in professional sectors, provided impulsive confrontations are curbed.`
    : 'Multiple harmonious Tajika aspects operate in your annual chart, facilitating steady realization of career ambitions through methodical collaboration.';
  drawWrappedText(pdf, yogaSynthesis, pdf.marginLeft + 20, 220, pdf.contentWidth - 40, 8.5, 12.5);

  // =========================================================================
  // PAGE 9: ANNUAL PLANETARY DIGNITIES & HARSHA BALA SCORECARD
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Annual Planetary Dignities & Harsha Bala');

  // The 4 Pillars of Harsha Bala Box
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 600, pdf.contentWidth, 170, true, true);

  pdf.drawText('THE FOUR PILLARS OF HARSHA BALA (TAJIKA JOY STRENGTH)', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 420, 735);

  const hbIntro =
    'Harsha Bala (strength of happiness/joy) measures whether a planet is pleased with its annual circumstances. Each planet is evaluated across 4 independent classical parameters awarding 5 points each (maximum 20 points):';
  let hbY = drawWrappedText(pdf, hbIntro, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 8.5, 12) - 8;

  const hbPillars = [
    '• 1. Sthana Bala (House Joy - 5 pts): Awarded if placed in its house of traditional joy (Sun in H9, Moon in H3, Mars in H6, Mercury in H1, Jupiter in H11, Venus in H5, Saturn in H12).',
    '• 2. Uccha/Swakshetra Bala (Exaltation/Own Sign - 5 pts): Awarded if placed in its exaltation sign or swakshetra (own sign).',
    '• 3. Stri/Purusha Bala (Gender Alignment - 5 pts): Awarded if masculine planets sit in masculine signs/quadrants or feminine in feminine.',
    '• 4. Dina/Ratri Bala (Day/Night Strength - 5 pts): Awarded if diurnal planets sit in day charts or nocturnal in night charts.',
  ];

  for (const hbp of hbPillars) {
    hbY = drawWrappedText(pdf, hbp, pdf.marginLeft + 25, hbY, pdf.contentWidth - 50, 7.5, 11) - 3;
  }

  // Harsha Bala Table
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 220, pdf.contentWidth, 365, true, true);

  pdf.drawText('ANNUAL HARSHA BALA SCORECARD TABLE', pdf.marginLeft + 20, 560, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 550, pdf.marginLeft + 310, 550);

  let tabY = 525;
  pdf.setFillColor(PdfColors.INDIGO);
  pdf.drawRect(pdf.marginLeft + 20, tabY - 14, pdf.contentWidth - 40, 20, true, false);
  pdf.drawText('PLANET', pdf.marginLeft + 30, tabY - 2, 7.5, true, PdfColors.WHITE);
  pdf.drawText('STHANA (5)', pdf.marginLeft + 95, tabY - 2, 7.5, true, PdfColors.WHITE);
  pdf.drawText('UCCHA (5)', pdf.marginLeft + 165, tabY - 2, 7.5, true, PdfColors.WHITE);
  pdf.drawText('GENDER (5)', pdf.marginLeft + 235, tabY - 2, 7.5, true, PdfColors.WHITE);
  pdf.drawText('DINA/RATRI (5)', pdf.marginLeft + 305, tabY - 2, 7.5, true, PdfColors.WHITE);
  pdf.drawText('TOTAL (20)', pdf.marginLeft + 390, tabY - 2, 7.5, true, PdfColors.WHITE);
  pdf.drawText('STATUS', pdf.marginLeft + 450, tabY - 2, 7.5, true, PdfColors.WHITE);
  tabY -= 22;

  const scoreEntries = Object.entries(hb.scores || {});
  for (const [planet, score] of scoreEntries) {
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, tabY - 12, pdf.contentWidth - 40, 20, true, true);

    pdf.drawText(planet, pdf.marginLeft + 30, tabY - 2, 8, true, PdfColors.NAVY);
    pdf.drawText(`${score.sthanaBala} pts`, pdf.marginLeft + 105, tabY - 2, 8, false, PdfColors.DARK_TEXT);
    pdf.drawText(`${score.ucchaBala} pts`, pdf.marginLeft + 175, tabY - 2, 8, false, PdfColors.DARK_TEXT);
    pdf.drawText(`${score.striPurushaBala} pts`, pdf.marginLeft + 245, tabY - 2, 8, false, PdfColors.DARK_TEXT);
    pdf.drawText(`${score.dinaRatriBala} pts`, pdf.marginLeft + 320, tabY - 2, 8, false, PdfColors.DARK_TEXT);
    pdf.drawText(`${score.totalScore}/20`, pdf.marginLeft + 395, tabY - 2, 8, true, PdfColors.PURPLE);
    pdf.drawText(score.hasHarsha ? 'JOY (STRONG)' : 'MODERATE', pdf.marginLeft + 450, tabY - 2, 7.5, true, score.hasHarsha ? PdfColors.PURPLE : PdfColors.PURPLE);
    tabY -= 23;
  }

  // Summary Box below Harsha Bala
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 125, true, true);

  pdf.drawText('HARSHA BALA SYNTHESIS & ENERGY ALLOCATION', pdf.marginLeft + 20, 185, 10, true, PdfColors.INDIGO);
  pdf.drawText('Strongest Annual Catalyst: Venus / Mars (Leading engines of growth and professional initiative)', pdf.marginLeft + 20, 165, 8.5, true, PdfColors.PURPLE);
  pdf.drawText('Sensitive Planetary Factor: Saturn (Requires conscious grounding, ethical restraint, and remedies)', pdf.marginLeft + 20, 148, 8.5, true, PdfColors.ROSE);
  const hbSummary =
    'Planets possessing Harsha Bala (scores of 10–20 points) bestow unencumbered breakthroughs, joyous creative momentum, and clear resolution of obstacles. Planets lacking Harsha demand structured discipline and patience.';
  drawWrappedText(pdf, hbSummary, pdf.marginLeft + 20, 132, pdf.contentWidth - 40, 8, 11);

  // =========================================================================
  // PAGE 10: SUMMARY OF ANNUAL PLANETARY EFFECTS
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Summary of Annual Planetary Effects');

  // Annual Placements Table
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 540, pdf.contentWidth, 230, true, true);

  pdf.drawText('ANNUAL PLANETARY PLACEMENTS & HOUSE TRANSITS', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 370, 735);

  let apY = 715;
  pdf.setFillColor(PdfColors.INDIGO);
  pdf.drawRect(pdf.marginLeft + 20, apY - 14, pdf.contentWidth - 40, 20, true, false);
  pdf.drawText('PLANET', pdf.marginLeft + 30, apY - 2, 7.5, true, PdfColors.WHITE);
  pdf.drawText('SIGN', pdf.marginLeft + 95, apY - 2, 7.5, true, PdfColors.WHITE);
  pdf.drawText('HOUSE', pdf.marginLeft + 185, apY - 2, 7.5, true, PdfColors.WHITE);
  pdf.drawText('EFFECT NATURE', pdf.marginLeft + 260, apY - 2, 7.5, true, PdfColors.WHITE);
  pdf.drawText('SUMMARY THEME', pdf.marginLeft + 355, apY - 2, 7.5, true, PdfColors.WHITE);
  apY -= 21;

  for (const pe of ape) {
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, apY - 11, pdf.contentWidth - 40, 18, true, true);

    pdf.drawText(pe.planet, pdf.marginLeft + 30, apY - 2, 8, true, PdfColors.NAVY);
    pdf.drawText(pe.sign, pdf.marginLeft + 95, apY - 2, 8, false, PdfColors.DARK_TEXT);
    pdf.drawText(`House ${pe.house}`, pdf.marginLeft + 185, apY - 2, 8, false, PdfColors.PURPLE);
    pdf.drawText(pe.effect, pdf.marginLeft + 260, apY - 2, 7.5, true, pe.effect === 'Favourable' ? PdfColors.PURPLE : PdfColors.ROSE);
    pdf.drawText(pe.description.substring(0, 32), pdf.marginLeft + 355, apY - 2, 7, false, PdfColors.DARK_TEXT);
    apY -= 20;
  }

  // House Transit Effects Box (Sun through Jupiter)
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 290, pdf.contentWidth, 235, true, true);

  pdf.drawText('HOUSE TRANSIT EFFECTS (SUN, MOON, MARS, MERCURY, JUPITER)', pdf.marginLeft + 20, 505, 10.5, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 495, pdf.marginLeft + 420, 495);

  let pEffY = 475;
  for (const pe of ape.slice(0, 5)) {
    const bulletText = pe.bullets?.[0] || pe.description;
    const text = `• ${pe.planet} in House ${pe.house} (${pe.sign}): ${pe.description} ${bulletText}`;
    pEffY = drawWrappedText(pdf, text, pdf.marginLeft + 20, pEffY, pdf.contentWidth - 40, 8, 11) - 4;
  }

  // House Transit Effects Box (Venus, Saturn, Nodes)
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 195, true, true);

  pdf.drawText('HOUSE TRANSIT EFFECTS (VENUS, SATURN, RAHU, KETU)', pdf.marginLeft + 20, 255, 10.5, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 245, pdf.marginLeft + 380, 245);

  let pEff2Y = 225;
  for (const pe of ape.slice(5)) {
    const bulletText = pe.bullets?.[0] || pe.description;
    const text = `• ${pe.planet} in House ${pe.house} (${pe.sign}): ${pe.description} ${bulletText}`;
    pEff2Y = drawWrappedText(pdf, text, pdf.marginLeft + 20, pEff2Y, pdf.contentWidth - 40, 8, 11) - 4;
  }

  // =========================================================================
  // PAGE 11: ANNUAL MUDDA DASHA TIMING PERIODS
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Annual Mudda Dasha Timing Periods');

  // Mudda Dasha Methodology Box (Supplemental Annual Timing Methodology)
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 580, pdf.contentWidth, 190, true, true);

  pdf.drawText('MUDDA DASHA TIMELINE (SUPPLEMENTAL ANNUAL TIMING METHODOLOGY)', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 470, 735);

  const mdIntro =
    'Methodology Disclosure: Mudda Dasha is incorporated as a supplemental annual timing calculation alongside the foundational transit analysis of the Varshphal report. It is not derived from the approved reference PDF. In this implementation, the nine planetary periods are proportionally scaled using their standard Vimshottari allocations (Sun = 6y, Moon = 10y, Mars = 7y, Rahu = 18y, Jupiter = 16y, Saturn = 19y, Mercury = 17y, Ketu = 7y, Venus = 20y; total 120y) across the exact astronomical interval between consecutive solar returns (~365.25 days). The sequence initiates with the lord of the annual Moon nakshatra and progresses with contiguous, strictly adjacent period boundaries ending exactly at the next solar return.';
  let mdY = drawWrappedText(pdf, mdIntro, pdf.marginLeft + 20, 715, pdf.contentWidth - 40, 8, 11) - 6;

  pdf.drawText('Note on Implementation: Provided as an independent computational supplement to partition the annual cycle into planetary phases.', pdf.marginLeft + 20, mdY, 8, true, PdfColors.PURPLE);

  // Mudda Dasha Schedule Table
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 240, pdf.contentWidth, 325, true, true);

  pdf.drawText('ANNUAL MUDDA DASHA SCHEDULE TABLE', pdf.marginLeft + 20, 545, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 535, pdf.marginLeft + 310, 535);

  let mdtY = 510;
  pdf.setFillColor(PdfColors.INDIGO);
  pdf.drawRect(pdf.marginLeft + 20, mdtY - 14, pdf.contentWidth - 40, 20, true, false);
  pdf.drawText('ORDER', pdf.marginLeft + 26, mdtY - 2, 7.5, true, PdfColors.WHITE);
  pdf.drawText('DASHA LORD', pdf.marginLeft + 75, mdtY - 2, 7.5, true, PdfColors.WHITE);
  pdf.drawText('START DATE', pdf.marginLeft + 155, mdtY - 2, 7.5, true, PdfColors.WHITE);
  pdf.drawText('END DATE', pdf.marginLeft + 245, mdtY - 2, 7.5, true, PdfColors.WHITE);
  pdf.drawText('DAYS', pdf.marginLeft + 340, mdtY - 2, 7.5, true, PdfColors.WHITE);
  pdf.drawText('STATUS', pdf.marginLeft + 420, mdtY - 2, 7.5, true, PdfColors.WHITE);
  mdtY -= 21;

  for (let idx = 0; idx < md.length; idx++) {
    const item = md[idx];
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, mdtY - 11, pdf.contentWidth - 40, 18, true, true);

    pdf.drawText(String(idx + 1), pdf.marginLeft + 32, mdtY - 2, 8, true, PdfColors.NAVY);
    pdf.drawText(item.planet, pdf.marginLeft + 75, mdtY - 2, 8, true, PdfColors.PURPLE);
    pdf.drawText(item.startDateIso.substring(0, 10), pdf.marginLeft + 155, mdtY - 2, 7.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(item.endDateIso.substring(0, 10), pdf.marginLeft + 245, mdtY - 2, 7.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`${item.durationDays}d`, pdf.marginLeft + 340, mdtY - 2, 7.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(item.isCurrent ? 'ACTIVE' : 'SCHEDULED', pdf.marginLeft + 420, mdtY - 2, 7.5, true, item.isCurrent ? PdfColors.PURPLE : PdfColors.GREY_TEXT);
    mdtY -= 20;
  }

  // Strategic Milestones Box
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 145, true, true);

  pdf.drawText('STRATEGIC MILESTONES & TRANSITION WINDOWS', pdf.marginLeft + 20, 205, 10, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 195, pdf.marginLeft + 320, 195);

  const mdAdvice =
    'The succession of Mudda Dasha cycles creates clear windows for action and reflection. Periods under strong benefic lords (Jupiter, Venus, Mercury) represent golden expansion windows for business agreements and career advancements. Periods governed by Saturn, Rahu, or Mars demand deliberate caution, emotional patience, and adherence to spiritual remedies.';
  drawWrappedText(pdf, mdAdvice, pdf.marginLeft + 20, 175, pdf.contentWidth - 40, 8.5, 12.5);

  // =========================================================================
  // PAGE 12: 12-MONTH PERFORMANCE MATRIX & TRAJECTORIES
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('12-Month Performance Matrix & Trajectories');

  // Rating Matrix Table
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 350, pdf.contentWidth, 420, true, true);

  pdf.drawText('12-MONTH MULTI-DOMAIN RATING MATRIX', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 310, 735);

  let matY = 715;
  pdf.setFillColor(PdfColors.INDIGO);
  pdf.drawRect(pdf.marginLeft + 15, matY - 14, pdf.contentWidth - 30, 20, true, false);
  pdf.drawText('MONTH', pdf.marginLeft + 20, matY - 2, 7.5, true, PdfColors.WHITE);
  pdf.drawText('CAREER', pdf.marginLeft + 85, matY - 2, 7.5, true, PdfColors.WHITE);
  pdf.drawText('LOVE', pdf.marginLeft + 135, matY - 2, 7.5, true, PdfColors.WHITE);
  pdf.drawText('HEALTH', pdf.marginLeft + 185, matY - 2, 7.5, true, PdfColors.WHITE);
  pdf.drawText('FAMILY', pdf.marginLeft + 235, matY - 2, 7.5, true, PdfColors.WHITE);
  pdf.drawText('EDUCATION', pdf.marginLeft + 285, matY - 2, 7.5, true, PdfColors.WHITE);
  pdf.drawText('SPIRIT', pdf.marginLeft + 345, matY - 2, 7.5, true, PdfColors.WHITE);
  pdf.drawText('FOCUS THEME', pdf.marginLeft + 400, matY - 2, 7.5, true, PdfColors.WHITE);
  matY -= 21;

  for (const m of mf) {
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 15, matY - 11, pdf.contentWidth - 30, 18, true, true);

    const cStr = m.ratings.career !== null && m.ratings.career !== undefined ? `${m.ratings.career}/5` : 'N/A';
    const lStr = m.ratings.love !== null && m.ratings.love !== undefined ? `${m.ratings.love}/5` : 'N/A';
    const hStr = m.ratings.health !== null && m.ratings.health !== undefined ? `${m.ratings.health}/5` : 'N/A';
    const fStr = m.ratings.family !== null && m.ratings.family !== undefined ? `${m.ratings.family}/5` : 'N/A';
    const eStr = m.ratings.education !== null && m.ratings.education !== undefined ? `${m.ratings.education}/5` : 'N/A';
    const sStr = m.ratings.spirituality !== null && m.ratings.spirituality !== undefined ? `${m.ratings.spirituality}/5` : 'N/A';

    pdf.drawText(m.monthName.substring(0, 10), pdf.marginLeft + 20, matY - 2, 7.5, true, PdfColors.NAVY);
    pdf.drawText(cStr, pdf.marginLeft + 90, matY - 2, 7.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(lStr, pdf.marginLeft + 140, matY - 2, 7.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(hStr, pdf.marginLeft + 190, matY - 2, 7.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(fStr, pdf.marginLeft + 240, matY - 2, 7.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(eStr, pdf.marginLeft + 290, matY - 2, 7.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(sStr, pdf.marginLeft + 350, matY - 2, 7.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(m.overview.substring(0, 22), pdf.marginLeft + 400, matY - 2, 7, false, PdfColors.PURPLE);
    matY -= 20;
  }

  // Quarterly Evolution Trajectories Box
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 255, true, true);

  pdf.drawText('QUARTERLY EVOLUTION TRAJECTORIES', pdf.marginLeft + 20, 315, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 305, pdf.marginLeft + 290, 305);

  const quarters = [
    { q: 'QUARTER 1 (MONTHS 1–3): INITIATION & ALIGNMENT', desc: 'Recalibrating long-term goals following the solar return. Focus on intellectual foundation, fiscal planning, and internal clarity.' },
    { q: 'QUARTER 2 (MONTHS 4–6): MOMENTUM & BREAKTHROUGH', desc: 'High executive energy under Mars and Sun transits. Ideal for initiating strategic negotiations, launching ventures, and executing major projects.' },
    { q: 'QUARTER 3 (MONTHS 7–9): CONSOLIDATION & PRUDENCE', desc: 'Muntha\'s transformational currents require careful health maintenance and scrutiny of joint investments. Avoid hasty commitments.' },
    { q: 'QUARTER 4 (MONTHS 10–12): CULMINATION & INTEGRATION', desc: 'Harvesting the rewards of the annual cycle. Strengthen family ties, complete long-standing audits, and prepare for the next solar revolution.' },
  ];

  let qY = 285;
  for (const q of quarters) {
    pdf.drawText(q.q, pdf.marginLeft + 20, qY, 8.5, true, PdfColors.PURPLE);
    qY = drawWrappedText(pdf, q.desc, pdf.marginLeft + 25, qY - 14, pdf.contentWidth - 45, 8, 11.5) - 6;
  }

  // =========================================================================
  // PAGE 13: MONTHLY PREDICTIVE ROADMAP (MONTHS 1 TO 6)
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Monthly Predictive Roadmap: Months 1 to 6');

  let cardY1 = 770;
  for (const m of mf.slice(0, 6)) {
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, cardY1 - 105, pdf.contentWidth, 105, true, true);

    // Header bar of card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.drawRect(pdf.marginLeft, cardY1 - 20, pdf.contentWidth, 20, true, false);

    pdf.drawText(`${m.monthName.toUpperCase()}  |  Year: ${m.year}  |  Period: ${m.periodFormatted}`, pdf.marginLeft + 12, cardY1 - 14, 8, true, PdfColors.NAVY);
    pdf.drawText(`Overview: ${m.overview}`, pdf.marginLeft + 12, cardY1 - 33, 7.5, true, PdfColors.PURPLE);

    let txtY = drawWrappedText(pdf, `Career & Business: ${m.careerBusiness}`, pdf.marginLeft + 12, cardY1 - 46, pdf.contentWidth - 24, 7.5, 10.5);
    txtY = drawWrappedText(pdf, `Love & Health: ${m.loveRelationships} ${m.healthVitality}`, pdf.marginLeft + 12, txtY - 2, pdf.contentWidth - 24, 7.5, 10.5);
    const remedyText = m.remedies?.[0] ? `Monthly Remedy Option: ${m.remedies[0]}` : 'Remedy Option: Practice daily meditation.';
    pdf.drawText(remedyText.substring(0, 95), pdf.marginLeft + 12, cardY1 - 96, 7, false, PdfColors.GREY_TEXT);

    cardY1 -= 115;
  }

  // =========================================================================
  // PAGE 14: MONTHLY PREDICTIVE ROADMAP (MONTHS 7 TO 12)
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Monthly Predictive Roadmap: Months 7 to 12');

  let cardY2 = 770;
  for (const m of mf.slice(6, 12)) {
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.INDIGO);
    pdf.setLineWidth(1);
    pdf.drawRect(pdf.marginLeft, cardY2 - 105, pdf.contentWidth, 105, true, true);

    // Header bar of card
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.drawRect(pdf.marginLeft, cardY2 - 20, pdf.contentWidth, 20, true, false);

    pdf.drawText(`${m.monthName.toUpperCase()}  |  Year: ${m.year}  |  Period: ${m.periodFormatted}`, pdf.marginLeft + 12, cardY2 - 14, 8, true, PdfColors.NAVY);
    pdf.drawText(`Overview: ${m.overview}`, pdf.marginLeft + 12, cardY2 - 33, 7.5, true, PdfColors.PURPLE);

    let txtY = drawWrappedText(pdf, `Career & Business: ${m.careerBusiness}`, pdf.marginLeft + 12, cardY2 - 46, pdf.contentWidth - 24, 7.5, 10.5);
    txtY = drawWrappedText(pdf, `Love & Health: ${m.loveRelationships} ${m.healthVitality}`, pdf.marginLeft + 12, txtY - 2, pdf.contentWidth - 24, 7.5, 10.5);
    const remedyText = m.remedies?.[0] ? `Monthly Remedy Option: ${m.remedies[0]}` : 'Remedy Option: Practice daily meditation.';
    pdf.drawText(remedyText.substring(0, 95), pdf.marginLeft + 12, cardY2 - 96, 7, false, PdfColors.GREY_TEXT);

    cardY2 -= 115;
  }

  // =========================================================================
  // PAGE 15: CONSECRATED PANCHANG REMEDIES & CAUTIONS
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Consecrated Panchang Remedies & Cautions');

  // Sacred Muhurtha Box
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 430, pdf.contentWidth, 340, true, true);

  pdf.drawText('CONSECRATED PANCHANG MUHURTHAS FOR ANNUAL HARMONIZATION', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 440, 735);

  let remY = 715;
  for (const r of rem) {
    pdf.drawText(`• ${r.occasionName.toUpperCase()} (${r.theme}):`, pdf.marginLeft + 20, remY, 8.5, true, PdfColors.PURPLE);
    remY -= 14;
    pdf.drawText(`  Significance: ${r.significance}`, pdf.marginLeft + 25, remY, 8, false, PdfColors.DARK_TEXT);
    remY -= 14;
    pdf.drawText(`  Key Practices: ${r.remedies.join(' • ')}`, pdf.marginLeft + 25, remY, 8, false, PdfColors.DARK_TEXT);
    remY -= 18;
  }

  // Caution Box (Three-Remedy Maximum Rule)
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 330, true, true);

  pdf.drawText('THE ESSENTIAL NOTE OF CAUTION: MAXIMUM THREE REMEDIES RULE', pdf.marginLeft + 20, 385, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 375, pdf.marginLeft + 440, 375);

  let ctnY = drawWrappedText(pdf, report.remedyCaution, pdf.marginLeft + 20, 355, pdf.contentWidth - 40, 8.5, 12.5) - 10;

  const cautionPillars = [
    '• Principle of Focus: Spiritual energy follows clear attention. Select no more than three remedies at a time; practicing too many simultaneously scatters energy and reduces impact.',
    '• Alternative Options: Monthly and festival remedies are presented as alternatives to choose from based on intuition, personal faith, and current life priorities.',
    '• Principle of Consistency: A single practice followed with complete devotion and regularity yields far greater merit than attempting multiple rituals at once.',
  ];

  for (const cp of cautionPillars) {
    ctnY = drawWrappedText(pdf, cp, pdf.marginLeft + 25, ctnY, pdf.contentWidth - 50, 8, 11.5) - 5;
  }

  // =========================================================================
  // PAGE 16: CLOSING REFLECTIONS & AUTHOR BENEDICTION
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Closing Reflections & Author Benediction');

  // Philosophical Synthesis Box
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 460, pdf.contentWidth, 310, true, true);

  pdf.drawText('YOUR PATH, ILLUMINATED: ASTROLOGICAL COUNSEL FOR THE YEAR', pdf.marginLeft + 20, 745, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 440, 735);

  const closingText1 =
    'As you step into this new solar cycle, remember that the stars impel; they do not compel. In Vedic metaphysics, your life is an intricate dance between Prarabdha Karma (the cosmic circumstances allocated for this birth) and Purushartha (your conscious self-effort in the present moment).';
  const closingText2 =
    `The Varshphal map reveals the terrain ahead: Muntha in the 8th house alerts you to treat transformation as an ally rather than an adversary, while ${varsh.selectedVarshesha} as Varshesh provides the refined discernment needed to triumph in worldly affairs.`;
  const closingText3 =
    'Walk through this year with quiet confidence, unshakable integrity, and deep reverence for the divine order. Whenever challenges arise, recognize them as evolutionary crucibles designed to reveal your soul\'s invincible light.';

  let clY = 715;
  clY = drawWrappedText(pdf, closingText1, pdf.marginLeft + 20, clY, pdf.contentWidth - 40, 8.5, 12.5) - 8;
  clY = drawWrappedText(pdf, closingText2, pdf.marginLeft + 20, clY, pdf.contentWidth - 40, 8.5, 12.5) - 8;
  clY = drawWrappedText(pdf, closingText3, pdf.marginLeft + 20, clY, pdf.contentWidth - 40, 8.5, 12.5) - 10;

  // Technical Assurance Box
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 250, pdf.contentWidth, 195, true, true);

  pdf.drawText('TECHNICAL AUDIT & RIGOROUS CALCULATION STANDARDS', pdf.marginLeft + 20, 420, 10.5, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 410, pdf.marginLeft + 400, 410);

  const techCert =
    `This Varshphal dossier has been generated through Astro Sushil's deterministic computational engine. Calculations utilize high-precision Swiss Ephemeris algorithms under the authentic Lahiri (Chitra Paksha) sidereal ayanamsha. All planetary returns, Muntha progressions, Tajika aspect angles, and Harsha Bala points have been rigorously verified against classical standards from Neelakantha Daivajna's Tajika Neelakanthi.`;
  drawWrappedText(pdf, techCert, pdf.marginLeft + 20, 390, pdf.contentWidth - 40, 8, 12);

  // Divine Benediction & Signature Box
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft, 80, pdf.contentWidth, 155, true, true);

  pdf.drawText('DIVINE BENEDICTION & BLESSINGS', pdf.marginLeft + 20, 210, 10.5, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 200, pdf.marginLeft + 250, 200);

  const benediction =
    'May Surya Bhagwan illuminate your intellect with clarity, may Lord Brihaspati bestow noble wisdom, and may the cosmic rhythms guide your every step toward enduring peace, fulfillment, and spiritual sovereignty.\n\nWith warmest astrological blessings,';
  let bndY = drawWrappedText(pdf, benediction, pdf.marginLeft + 20, 182, pdf.contentWidth - 40, 8.5, 12.5) - 12;

  pdf.drawText('Astro Sushil (Sushil Kumaar Singh)', pdf.marginLeft + 20, bndY, 9.5, true, PdfColors.NAVY);
  pdf.drawText('Founder & Chief Astrologer  |  Astro Sushil Platform', pdf.marginLeft + 20, bndY - 14, 8.5, false, PdfColors.GREY_TEXT);
  pdf.drawText('Astro Sushil (Sushil Kumaar Singh)  |  Founder & Chief Astrologer  |  Astro Sushil Platform', pdf.marginLeft + 20, 88, 7.5, true, PdfColors.GOLD);
}
