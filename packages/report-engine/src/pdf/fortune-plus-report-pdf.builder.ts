import { FortunePlusReportModel, ReportHouseDto } from '../types/report.types';
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

export function renderFortunePlusReportPdf(
  pdf: PdfWriter,
  report: FortunePlusReportModel,
  renderNorthIndianChart: ChartRendererFn,
  drawWrappedText: TextWrapperFn
): void {
  const prof = report.profile;
  const clientName = prof?.name || 'Valued Seeker';
  const lp = report.luckyProfile;
  const na = report.numerologyAnalysis;
  const hc = report.healthAndCareer;
  const fg = report.fortuneGrid;
  const kd = report.kuaAndDirection;
  const nme = report.nameAnalysis;
  const ft = report.fortuneTrend;
  const lpCycles = report.lifePinnacles;
  const path = report.areYouOnRightPath;
  const items = report.everydayLuckyItems;
  const missingRem = report.missingNumberRemedies;
  const hMantras = report.healthMantras;
  const cp = report.cosmicPathway;
  const aa = report.astrologyAnalysis;
  const rem = report.remedies;

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

  pdf.setFillColor(PdfColors.INDIGO);
  pdf.drawRect(pdf.marginLeft + 30, 600, pdf.contentWidth - 60, 120, true, false);

  pdf.drawText('ASTRO SUSHIL', pdf.marginLeft + 50, 680, 20, true, PdfColors.GOLD);
  pdf.drawText('PERSONALISED FORTUNE REPORT PLUS', pdf.marginLeft + 50, 650, 16, true, PdfColors.WHITE);
  pdf.drawText('The Ultimate Vedic Numerology & Astrological Life Blueprint', pdf.marginLeft + 50, 625, 9, false, PdfColors.LIGHT_BG);

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft + 50, 340, pdf.contentWidth - 100, 220, true, true);

  pdf.drawText('COSMIC FORTUNE & NUMEROLOGICAL DOSSIER', pdf.marginLeft + 70, 530, 11, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 70, 520, pdf.marginLeft + 360, 520);

  pdf.drawText('Exclusively Prepared For:', pdf.marginLeft + 70, 498, 10, false, PdfColors.GREY_TEXT);
  pdf.drawText(clientName.toUpperCase(), pdf.marginLeft + 70, 474, 18, true, PdfColors.NAVY);
  pdf.drawText(`Date of Birth: ${prof?.dateOfBirth || '28/12/1983'}  |  Time: ${prof?.timeOfBirth || '04:45 IST'}`, pdf.marginLeft + 70, 450, 9.5, false, PdfColors.DARK_TEXT);
  pdf.drawText(`Lagna: ${aa.rashiPredictions.lagnaSign}  |  Moon: ${aa.rashiPredictions.moonSign}  |  Nakshatra: ${cp.janmNakshatra.name} (Pada ${cp.janmNakshatra.pada})`, pdf.marginLeft + 70, 430, 9.5, false, PdfColors.DARK_TEXT);
  pdf.drawText(`Mulank: ${lp.mulank} (${lp.mulankLord})  |  Bhagyank: ${lp.bhagyank} (${lp.bhagyankLord})  |  Kua: ${lp.kuaNumber}`, pdf.marginLeft + 70, 410, 9.5, true, PdfColors.INDIGO);
  pdf.drawText(`Chaldean Name Number: ${nme.nameNumber}  |  Soul Urge: ${nme.soulUrgeNumber}  |  Personality: ${nme.personalityNumber}`, pdf.marginLeft + 70, 390, 9.5, true, PdfColors.PURPLE);
  pdf.drawText(`Success Number: ${path.successNumber}  |  Connection Number: ${path.connectionNumber}  |  Maturity Number: ${path.maturityNumber}`, pdf.marginLeft + 70, 370, 9.5, true, PdfColors.GOLD);

  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 50, 130, pdf.contentWidth - 100, 175, true, true);

  pdf.drawText('VEDIC AXIOM ON NUMBERS & COSMIC DESTINY', pdf.marginLeft + 70, 275, 10, true, PdfColors.INDIGO);
  const coverAxiom =
    'In the timeless science of Vedic destiny, numbers and planets are twin mirrors of the soul\'s karmic blueprint. While your natal chart reveals the geometric design of planetary influences, your sacred numbers unlock the energetic frequencies that govern your everyday reality. This comprehensive dossier aligns both celestial systems to illuminate your highest path of wealth, health, vocation, and soulful fulfillment.';
  drawWrappedText(pdf, coverAxiom, pdf.marginLeft + 70, 252, pdf.contentWidth - 140, 9, 14);

  pdf.drawText('Astro Sushil (Sushil Kumaar Singh)', pdf.marginLeft + 70, 160, 9.5, true, PdfColors.NAVY);
  pdf.drawText('Founder & Chief Astrologer  |  Authentic Lahiri Ephemeris Standards', pdf.marginLeft + 70, 145, 8.5, false, PdfColors.GREY_TEXT);

  // =========================================================================
  // PAGE 2: ASTROLOGICAL DISCLAIMER & LIMITATION OF LIABILITY
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Astrological Disclaimer & Limitation of Liability');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('ASTROLOGICAL DISCLAIMER & LIMITATION OF LIABILITY', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 340, 735);

  const discPara1 =
    'This Personalised Fortune Report Plus is an advanced spiritual, astrological, and numerological advisory document compiled strictly in accordance with authentic Parashari Vedic Astrology, Chaldean Numerology, and classical Lo-Shu traditions. All planetary calculations are 100% deterministic, computed using Swiss Ephemeris data under the true Sidereal Lahiri Ayanamsha system.';
  const discPara2 =
    'Astrological and numerological interpretations represent celestial weather patterns, karmic predispositions, and energy harmonics rather than fatalistic decrees. Human free will (Purushartha), moral rectitude, and conscious decisions remain sovereign in shaping the final outcome of life events.';
  const discPara3 =
    'Medical and Health Insights: Any references to physical vitality, doshic predispositions, or constitutional tendencies are strictly astrological indicators and must never be construed as medical diagnosis, prescription, or treatment. Always consult qualified healthcare professionals.';
  const discPara4 =
    'Financial and Career Perspectives: Discussions regarding wealth accumulation, investment timing, business partnerships, or vocational avenues provide esoteric guidance and symbolic clarity. They do not constitute certified financial, legal, or investment advice.';
  const discPara5 =
    'Confidentiality & Intellectual Rights: This dossier is uniquely calculated for the named recipient. Reproduction, distribution, or unauthorized transmission in whole or in part without prior written permission from Astro Sushil is strictly prohibited.';

  let dY = 705;
  dY = drawWrappedText(pdf, discPara1, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9.5, 14.5) - 15;
  dY = drawWrappedText(pdf, discPara2, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9.5, 14.5) - 15;
  dY = drawWrappedText(pdf, discPara3, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9.5, 14.5) - 15;
  dY = drawWrappedText(pdf, discPara4, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9.5, 14.5) - 15;
  dY = drawWrappedText(pdf, discPara5, pdf.marginLeft + 20, dY, pdf.contentWidth - 40, 9.5, 14.5) - 25;

  pdf.drawText('Astro Sushil Integrity Pledge', pdf.marginLeft + 20, dY, 10, true, PdfColors.GOLD);
  dY -= 16;
  pdf.drawText('All planetary positions, houses, yogas, and numerological sums in this dossier are calculated with absolute mathematical rigor.', pdf.marginLeft + 20, dY, 8.5, false, PdfColors.GREY_TEXT);

  // =========================================================================
  // PAGE 3: A MESSAGE FROM ASTRO SUSHIL
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('A Message from Astro Sushil');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('A MESSAGE FROM ASTRO SUSHIL', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 220, 735);

  const welcomeLetter = [
    `Dear ${clientName},`,
    '',
    'Welcome to Your Personalised Fortune Report Plus.',
    '',
    'Throughout my journey as an astrologer and numerologist, I have had the profound privilege to connect with thousands of seekers across the globe, each carrying their distinct aspirations, trials, and quiet victories. What I have discovered across these decades is a singular truth: though our individual life stories appear varied, we all yearn for divine clarity, authentic direction, and a conscious touch of foresight.',
    '',
    'This report is the direct fruit of that living experience. It has been meticulously structured to bridge timeless Vedic wisdom with the crisp precision of Chaldean numerology. Every placement and mathematical cycle within these pages has been calculated deterministically to offer you an empowering mirror of your cosmic potential.',
    '',
    'As you immerse yourself in this blueprint, remember that celestial influences do not coerce—they illuminate. Use these insights not as fatalistic boundaries, but as strategic guidance. Adopt what deeply resonates, explore what intrigues you, and allow your intuition and moral integrity to lead every worldly choice.',
    '',
    'May this dossier grant you profound clarity, ignite enduring confidence, and align your life path with highest prosperity and inner fulfillment.',
    '',
    'Warmest personal regards,',
    'Astro Sushil (Sushil Kumaar Singh)',
    'Founder & Chief Astrologer',
  ];

  let wY = 705;
  for (const line of welcomeLetter) {
    if (line === '') {
      wY -= 8;
    } else {
      wY = drawWrappedText(pdf, line, pdf.marginLeft + 20, wY, pdf.contentWidth - 40, 9.5, 14.5) - 4;
    }
  }

  // =========================================================================
  // PAGE 4: HOW TO NAVIGATE YOUR FORTUNE REPORT PLUS
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Reading Guide & Blueprint Navigation');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('HOW TO NAVIGATE YOUR FORTUNE REPORT PLUS', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 340, 735);

  const guideIntro =
    'Your Personalised Fortune Report Plus is systematically structured across two integrated analytical frameworks: Sacred Numerology & Feng-Shui (Parts 1 to 12) and Cosmic Pathway Vedic Astrology (Parts 13 to 25). Follow this reading roadmap for maximum practical benefit.';
  let gY = drawWrappedText(pdf, guideIntro, pdf.marginLeft + 20, 705, pdf.contentWidth - 40, 9.5, 14.5) - 20;

  const readingSteps = [
    {
      title: 'Step 1: Discover Your Sacred Numerical Blueprint',
      desc: 'Begin with your Mulank (Psychic Number), Bhagyank (Destiny Number), and Kua Cardinal Alignment. These primary numbers define your core psychological drive, natural affinities, and interpersonal harmony.',
    },
    {
      title: 'Step 2: Decode the Lo-Shu Magic Grid',
      desc: 'Examine your 3x3 Lo-Shu matrix, arrows of strength, and missing numbers. Understand where cosmic energy flows freely and where conscious remedial compensation is warranted.',
    },
    {
      title: 'Step 3: Analyze Your Temporal Trajectory',
      desc: 'Study your Personal Year and 12-month forecasting rhythm, followed by the Four Life Pinnacles and Success, Connection, and Maturity Numbers.',
    },
    {
      title: 'Step 4: Explore the Four Kundli Charts Quadrant',
      desc: 'Cross-reference your D1 Lagna Kundli, Chandra Kundli, Navamsha D9, and Lal Kitab Kundli to observe how natal planetary forces shape your vocation, wealth, and marriage.',
    },
    {
      title: 'Step 5: Implement Consecrated Remedies with Discipline',
      desc: 'Focus on no more than three remedies at a time. Consecrated lifestyle alignment, morning solar arghya, and sacred mantras create enduring energetic transformation.',
    },
  ];

  for (const step of readingSteps) {
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, gY - 60, pdf.contentWidth - 40, 65, true, true);

    pdf.drawText(step.title, pdf.marginLeft + 35, gY - 15, 10, true, PdfColors.INDIGO);
    drawWrappedText(pdf, step.desc, pdf.marginLeft + 35, gY - 32, pdf.contentWidth - 70, 8.5, 12.5);
    gY -= 75;
  }

  // =========================================================================
  // PAGE 5: TABLE OF CONTENTS (COMPLETE 25-CHAPTER DIRECTORY)
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Table of Contents: Complete 25-Chapter Directory');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('TABLE OF CONTENTS', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 160, 735);

  const tocItems = [
    { num: 'PART I', title: 'SACRED NUMEROLOGY & FENG-SHUI BLUEPRINT', page: 'Pages 6–22' },
    { num: 'Ch. 1', title: 'Your Sacred Lucky Profile & Cosmic Signatures', page: 'Page 6' },
    { num: 'Ch. 2', title: 'Numerological Analysis: Mulank, Bhagyank & Combinations', page: 'Pages 7–10' },
    { num: 'Ch. 3', title: 'Empower Your Health: Vulnerabilities & Wellness Solutions', page: 'Page 11' },
    { num: 'Ch. 4', title: 'Numerology & Your Future: Career & Wealth Pathways', page: 'Page 12' },
    { num: 'Ch. 5', title: 'Decoding Your Destiny: Lo-Shu Fortune Grid & Missing Numbers', page: 'Pages 13–14' },
    { num: 'Ch. 6', title: 'Feng-Shui & Directional Insights: Kua 8 & Cardinal Guidance', page: 'Page 15' },
    { num: 'Ch. 7', title: 'Sacred Name Vibration: Chaldean, Soul Urge & Personality', page: 'Page 16' },
    { num: 'Ch. 8', title: 'Fortune Trend: Personal Year 5 & 12-Month Forecast Matrix', page: 'Pages 17–18' },
    { num: 'Ch. 9', title: 'Challenge of Life: The Four Challenge Cycles (Pinnacles)', page: 'Page 19' },
    { num: 'Ch. 10', title: 'Are You on the Right Path: Success, Connection & Maturity Numbers', page: 'Page 20' },
    { num: 'Ch. 11', title: 'Your Everyday Lucky Items: Email ID, Banks, Tattoo & Signature', page: 'Page 21' },
    { num: 'Ch. 12', title: 'Remedies for Wellbeing: Missing Numbers & Health Mantras', page: 'Page 22' },
    { num: 'PART II', title: 'COSMIC PATHWAY: VEDIC ASTROLOGICAL DOSSIER', page: 'Pages 23–35' },
    { num: 'Ch. 13', title: 'Birth Charts: D1 Lagna, Chandra, Navamsha D9 & Lal Kitab', page: 'Page 23' },
    { num: 'Ch. 14-15', title: 'Panchang & Janm Nakshatra: Chitra Pada 2 & Vishwakarma', page: 'Page 24' },
    { num: 'Ch. 16', title: 'Rashi Predictions: Scorpio Ascendant & Virgo Moon Profile', page: 'Page 25' },
    { num: 'Ch. 17', title: 'Planets & House Attributes: Comprehensive 9-Graha Analysis', page: 'Pages 26–28' },
    { num: 'Ch. 18', title: 'Manglik Dosh Analysis: Low Manglik & Mitigating Factors', page: 'Page 29' },
    { num: 'Ch. 19', title: 'Shani Sade Sati Deep Dive: Rising, Peak & Setting Phases', page: 'Page 30' },
    { num: 'Ch. 20', title: 'Auspicious Yogas: Gajakesari, Budhaditya, Saraswati & Vasumati', page: 'Page 31' },
    { num: 'Ch. 21', title: 'About Your Marriage: Darakaraka Jupiter & Favorable Windows', page: 'Page 32' },
    { num: 'Ch. 22', title: 'Career Predictions: 10th House Calling & D10 Dashamsha', page: 'Page 33' },
    { num: 'Ch. 23', title: 'Consecrated Astrological Remedies: Gemstones, Rudraksha, Yantras', page: 'Page 34' },
    { num: 'Ch. 24-25', title: 'Harnessing Gems & Crystal Magic, Closing Benediction & Message', page: 'Page 35' },
  ];

  let tY = 705;
  for (const item of tocItems) {
    const isPartHeader = item.num.startsWith('PART');
    if (isPartHeader) {
      pdf.setFillColor(PdfColors.INDIGO);
      pdf.drawRect(pdf.marginLeft + 20, tY - 14, pdf.contentWidth - 40, 18, true, false);
      pdf.drawText(item.num, pdf.marginLeft + 30, tY - 1, 9, true, PdfColors.GOLD);
      pdf.drawText(item.title, pdf.marginLeft + 80, tY - 1, 9, true, PdfColors.WHITE);
      pdf.drawText(item.page, pdf.marginLeft + pdf.contentWidth - 110, tY - 1, 8.5, true, PdfColors.GOLD);
      tY -= 24;
    } else {
      pdf.drawText(item.num, pdf.marginLeft + 30, tY, 8.5, true, PdfColors.INDIGO);
      pdf.drawText(item.title, pdf.marginLeft + 90, tY, 8.5, false, PdfColors.DARK_TEXT);
      pdf.setStrokeColor(PdfColors.BORDER_GREY);
      pdf.drawText(item.page, pdf.marginLeft + pdf.contentWidth - 100, tY, 8.5, true, PdfColors.PURPLE);
      tY -= 19;
    }
  }

  // =========================================================================
  // PAGE 6: PART 1 - SACRED LUCKY PROFILE (CHAPTER 1)
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 1: Sacred Lucky Profile & Cosmic Signatures');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 1: SACRED LUCKY PROFILE & COSMIC SIGNATURES', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 380, 735);

  const profileTableRows = [
    ['Client Full Legal Name', clientName],
    ['Chaldean Name Number', `${nme.nameNumber} (Jupiterian Vibration)`],
    ['Date of Birth & Gender', `${lp.birthDate}  |  ${lp.gender}`],
    ['Western / Solar Sign', lp.sunSign],
    ['Mulank (Psychic / Birth Day Number)', `${lp.mulank} — Governed by ${lp.mulankLord}`],
    ['Bhagyank (Destiny / Life Path Number)', `${lp.bhagyank} — Governed by ${lp.bhagyankLord}`],
    ['Feng-Shui Kua Number', `${lp.kuaNumber} (Earth Element, West Group)`],
    ['Success Number', `${path.successNumber} (Day reduced + Month reduced)`],
    ['Connection Number', `${path.connectionNumber} (|Bhagyank - Mulank|)`],
    ['Maturity Number', `${path.maturityNumber} (Mulank + Name Number)`],
    ['Auspicious Numbers to Embrace', lp.luckyNumbers.join(', ')],
    ['Inimical Numbers to Avoid', lp.avoidNumbers.join(', ')],
    ['Harmonizing Lucky Colors', lp.luckyColours.join(', ')],
    ['Auspicious Calendar Dates', lp.luckyDates.join(', ')],
    ['Pivotal Milestone Years', lp.luckyYears.join(', ')],
    ['Consecrated Lucky Rudraksha', lp.luckyRudraksh],
    ['Protective Gemstone / Crystal Bracelet', lp.luckyBracelet],
    ['Empowered Sacred Yantra', lp.luckyYantra],
    ['Primary Auspicious Beej Mantra', lp.favourableMantra],
  ];

  let pY = 710;
  for (let i = 0; i < profileTableRows.length; i++) {
    const [label, val] = profileTableRows[i];
    const isEven = i % 2 === 0;
    pdf.setFillColor(isEven ? PdfColors.LIGHT_BG : PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, pY - 14, pdf.contentWidth - 40, 20, true, true);

    pdf.drawText(label, pdf.marginLeft + 30, pY, 8.5, true, PdfColors.INDIGO);
    pdf.drawText(val, pdf.marginLeft + 230, pY, val.length > 55 ? 7.5 : 8.5, false, PdfColors.DARK_TEXT);
    pY -= 24;
  }

  // =========================================================================
  // PAGE 7: PART 2 - MULANK 1 DEEP DIVE (CHAPTER 2)
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 2: Numerological Analysis - Mulank 1 Deep Dive');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 2: MULANK 1 DEEP DIVE — THE SOVEREIGN SUN', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 380, 735);

  const mulankIntro =
    'Mulank (also known as the Psychic or Birth Day Number) is calculated strictly from the day of your birth. Born on the 28th, your day reduces (2 + 8 = 10 -> 1) to the foundational number 1, ruled by the glorious Sun (Surya Dev). The Sun represents the soul (Atman), vital ojas, creative sovereignty, executive ambition, and natural nobility.';
  let mY = drawWrappedText(pdf, mulankIntro, pdf.marginLeft + 20, 705, pdf.contentWidth - 40, 9.5, 14.5) - 20;

  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawRect(pdf.marginLeft + 20, mY - 130, pdf.contentWidth - 40, 135, true, true);

  pdf.drawText('CORE ARCHETYPAL TRAITS OF MULANK 1', pdf.marginLeft + 35, mY - 15, 10, true, PdfColors.INDIGO);
  let trY = mY - 35;
  for (const trait of na.mulankDetails.characteristics) {
    trY = drawWrappedText(pdf, `• ${trait}`, pdf.marginLeft + 35, trY, pdf.contentWidth - 70, 8.5, 12.5) - 6;
  }
  mY -= 155;

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, mY - 110, pdf.contentWidth - 40, 115, true, true);

  pdf.drawText('PRACTICAL STRATEGIC ADVICE FOR MULANK 1', pdf.marginLeft + 35, mY - 15, 10, true, PdfColors.INDIGO);
  let advY = mY - 35;
  for (const adv of na.mulankDetails.advice) {
    advY = drawWrappedText(pdf, `• ${adv}`, pdf.marginLeft + 35, advY, pdf.contentWidth - 70, 8.5, 12.5) - 6;
  }
  mY -= 135;

  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, mY - 95, pdf.contentWidth - 40, 100, true, true);

  pdf.drawText('TEMPORAL RHYTHMS: FAVORABLE & CAUTION PERIODS', pdf.marginLeft + 35, mY - 15, 10, true, PdfColors.INDIGO);
  pdf.drawText('Most Favorable Astrological Windows:', pdf.marginLeft + 35, mY - 35, 9, true, PdfColors.DARK_TEXT);
  pdf.drawText(na.mulankDetails.favourablePeriod, pdf.marginLeft + 35, mY - 50, 8.5, false, PdfColors.GREY_TEXT);
  pdf.drawText('Vulnerable Solar Caution Period:', pdf.marginLeft + 35, mY - 70, 9, true, PdfColors.DARK_TEXT);
  pdf.drawText(na.mulankDetails.avoidPeriod, pdf.marginLeft + 35, mY - 85, 8.5, false, PdfColors.GREY_TEXT);

  // =========================================================================
  // PAGE 8: PART 2 - BHAGYANK 7 & 1-7 SYNTHESIS (CHAPTER 2)
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 2: Bhagyank 7 Deep Dive & 1-7 Synthesis');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 2: BHAGYANK 7 DEEP DIVE & THE 1-7 SYNTHESIS', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 380, 735);

  const bhagIntro =
    'Bhagyank (Destiny or Life Path Number) represents the cosmic current and long-range karmic purpose of your entire incarnation. Calculated by summing the complete birth date (28 + 12 + 1983 = 2023 -> 2 + 0 + 2 + 3 = 7), your Bhagyank is 7, ruled by mystical Ketu. Where Mulank 1 represents your conscious self, Bhagyank 7 defines your ultimate destiny.';
  let bY = drawWrappedText(pdf, bhagIntro, pdf.marginLeft + 20, 705, pdf.contentWidth - 40, 9.5, 14.5) - 20;

  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawRect(pdf.marginLeft + 20, bY - 130, pdf.contentWidth - 40, 135, true, true);

  pdf.drawText('SPIRITUAL SIGNIFICANCE & INTUITIVE GIFTS OF BHAGYANK 7', pdf.marginLeft + 35, bY - 15, 10, true, PdfColors.INDIGO);
  let giftY = drawWrappedText(pdf, na.bhagyankDetails.spiritualSignificance, pdf.marginLeft + 35, bY - 35, pdf.contentWidth - 70, 8.5, 12.5) - 8;
  for (const gift of na.bhagyankDetails.intuitiveGifts) {
    giftY = drawWrappedText(pdf, `• ${gift}`, pdf.marginLeft + 35, giftY, pdf.contentWidth - 70, 8.5, 12.5) - 6;
  }
  bY -= 150;

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, bY - 160, pdf.contentWidth - 40, 165, true, true);

  pdf.drawText('THE SACRED 1-7 COMBINATION: EXECUTIVE PIONEER & MYSTIC SAGE', pdf.marginLeft + 35, bY - 15, 10, true, PdfColors.INDIGO);
  const comboText =
    'The combination of Mulank 1 and Bhagyank 7 represents one of the most intellectually distinguished alignments in classical numerology. Mulank 1 provides relentless leadership, bold ambition, and executive authority, while Bhagyank 7 infuses deep contemplative wisdom, spiritual discernment, and research capability. You are simultaneously equipped to lead organizations in the outer world and uncover esoteric or complex structural truths in the inner realm. To maximize this gift, balance public leadership with quiet periods of study and meditation.';
  drawWrappedText(pdf, comboText, pdf.marginLeft + 35, bY - 35, pdf.contentWidth - 70, 9, 13.5);

  // =========================================================================
  // PAGE 9: PART 2 - BIRTH DATE 28, CAPRICORN, DEITY & FASTING (CHAPTER 2)
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 2: Birth Date 28 Decoding, Deity & Sacred Fasting');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('DECODING BIRTH DATE 28, ZODIAC TRAITS & SACRED FASTING', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 430, 735);

  let d28Y = 705;
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, d28Y - 95, pdf.contentWidth - 40, 100, true, true);

  pdf.drawText('A. DECODING THE COMPOUND VIBRATION OF DAY 28', pdf.marginLeft + 35, d28Y - 15, 10, true, PdfColors.INDIGO);
  d28Y = drawWrappedText(pdf, na.birthDateDecoding, pdf.marginLeft + 35, d28Y - 35, pdf.contentWidth - 70, 9, 13.5) - 35;

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, d28Y - 95, pdf.contentWidth - 40, 100, true, true);

  pdf.drawText('B. ZODIAC ARCHETYPE: CAPRICORN (MAKARA)', pdf.marginLeft + 35, d28Y - 15, 10, true, PdfColors.INDIGO);
  let zY = d28Y - 35;
  for (const zt of na.zodiacTraits.traits) {
    zY = drawWrappedText(pdf, `• ${zt}`, pdf.marginLeft + 35, zY, pdf.contentWidth - 70, 8.5, 12.5) - 6;
  }
  d28Y -= 120;

  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawRect(pdf.marginLeft + 20, d28Y - 145, pdf.contentWidth - 40, 150, true, true);

  pdf.drawText('C. RULING DEITY & SACRED SUNDAY FASTING PROTOCOL', pdf.marginLeft + 35, d28Y - 15, 10, true, PdfColors.INDIGO);
  pdf.drawText(`Presiding Deity: ${na.deityAndFasting.deity}`, pdf.marginLeft + 35, d28Y - 35, 9, true, PdfColors.DARK_TEXT);
  pdf.drawText(`Dedicated Fasting Day: ${na.deityAndFasting.fastingDay}`, pdf.marginLeft + 35, d28Y - 50, 9, true, PdfColors.DARK_TEXT);
  drawWrappedText(pdf, na.deityAndFasting.ritualGuidance, pdf.marginLeft + 35, d28Y - 70, pdf.contentWidth - 70, 8.5, 12.5);

  // =========================================================================
  // PAGE 10: PART 2 - RELATIONSHIP HARMONICS (CHAPTER 2)
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 2: Relationship Harmonics - Friendship & Romance');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 2: RELATIONSHIP HARMONICS (MULANKS 1 TO 9)', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 380, 735);

  let rhY = 705;
  pdf.drawText('As someone with Mulank 1, your interactions with other numbers follow precise energetic resonances:', pdf.marginLeft + 20, rhY, 8.5, false, PdfColors.DARK_TEXT);
  rhY -= 20;

  for (let n = 1; n <= 9; n++) {
    const friendText = na.friendshipCompatibility[n] || 'Harmonious.';
    const romText = na.romanceCompatibility[n] || 'Compatible.';

    pdf.setFillColor(n % 2 === 0 ? PdfColors.LIGHT_BG : PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, rhY - 32, pdf.contentWidth - 40, 36, true, true);

    pdf.drawText(`Mulank ${n}`, pdf.marginLeft + 30, rhY - 10, 9.5, true, PdfColors.INDIGO);
    pdf.drawText(`Friendship: ${friendText}`, pdf.marginLeft + 95, rhY - 6, 8, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Romance: ${romText}`, pdf.marginLeft + 95, rhY - 19, 8, false, PdfColors.PURPLE);
    rhY -= 41;
  }

  // =========================================================================
  // PAGE 11: PART 3 - HEALTH & WELLNESS ANALYSIS (CHAPTER 3)
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 3: Health & Wellness Blueprint');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 3: EMPOWER YOUR HEALTH & WELLNESS BLUEPRINT', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 380, 735);

  const healthIntro =
    'In esoteric numerology, Mulank 1 connects directly to the heart, arteries, eyesight, and general vitality (Ojas), governed by the Sun. Bhagyank 7 connects to the nervous system and psychological peace, governed by Ketu. Maintaining pristine vitality requires balancing intense ambition with systematic rejuvenation.';
  let hY = drawWrappedText(pdf, healthIntro, pdf.marginLeft + 20, 705, pdf.contentWidth - 40, 9.5, 14.5) - 20;

  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, hY - 110, pdf.contentWidth - 40, 115, true, true);

  pdf.drawText('POTENTIAL CONSTITUTIONAL VULNERABILITIES', pdf.marginLeft + 35, hY - 15, 10, true, PdfColors.INDIGO);
  let vY = hY - 35;
  for (const v of hc.healthVulnerabilities) {
    vY = drawWrappedText(pdf, `• ${v}`, pdf.marginLeft + 35, vY, pdf.contentWidth - 70, 8.5, 12.5) - 6;
  }
  hY -= 135;

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawRect(pdf.marginLeft + 20, hY - 130, pdf.contentWidth - 40, 135, true, true);

  pdf.drawText('HOLISTIC WELLNESS SOLUTIONS & DAILY DISCIPLINES', pdf.marginLeft + 35, hY - 15, 10, true, PdfColors.INDIGO);
  let sY = hY - 35;
  for (const sol of hc.wellnessSolutions) {
    sY = drawWrappedText(pdf, `• ${sol}`, pdf.marginLeft + 35, sY, pdf.contentWidth - 70, 8.5, 12.5) - 6;
  }
  hY -= 155;

  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, hY - 80, pdf.contentWidth - 40, 85, true, true);

  pdf.drawText('IMPORTANT WELLNESS & MEDICAL DISCLAIMER', pdf.marginLeft + 35, hY - 15, 9.5, true, PdfColors.GOLD);
  const healthDisc =
    'Astrological health insights reflect subtle energetic tendencies and constitution, not medical diagnoses. They are offered exclusively for holistic self-awareness. Always seek medical guidance from certified physicians for physical ailments.';
  drawWrappedText(pdf, healthDisc, pdf.marginLeft + 35, hY - 32, pdf.contentWidth - 70, 8, 12);

  // =========================================================================
  // PAGE 12: PART 3 - CAREER PATHWAYS & WEALTH POTENTIAL (CHAPTER 4)
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 3: Numerology & Career Pathways');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 3: NUMEROLOGY & YOUR FUTURE — CAREER & WEALTH', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 400, 735);

  const careerIntro =
    'Your career trajectory is shaped by the executive sovereign drive of Mulank 1 combined with the deep analytical research acumen of Bhagyank 7. You thrive in vocations where you exercise independent authority, shape organizational vision, and deploy intellectual or technical mastery.';
  let cY = drawWrappedText(pdf, careerIntro, pdf.marginLeft + 20, 705, pdf.contentWidth - 40, 9.5, 14.5) - 20;

  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, cY - 120, pdf.contentWidth - 40, 125, true, true);

  pdf.drawText('OPTIMAL VOCATIONAL DOMAINS', pdf.marginLeft + 35, cY - 15, 10, true, PdfColors.INDIGO);
  let coY = cY - 35;
  for (const opt of hc.careerOptions) {
    coY = drawWrappedText(pdf, `• ${opt}`, pdf.marginLeft + 35, coY, pdf.contentWidth - 70, 8.5, 12.5) - 6;
  }
  cY -= 145;

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawRect(pdf.marginLeft + 20, cY - 140, pdf.contentWidth - 40, 145, true, true);

  pdf.drawText('STRATEGIC WEALTH GUIDANCE & ASSET CREATION', pdf.marginLeft + 35, cY - 15, 10, true, PdfColors.INDIGO);
  let wgY = cY - 35;
  for (const wg of hc.wealthGuidance) {
    wgY = drawWrappedText(pdf, `• ${wg}`, pdf.marginLeft + 35, wgY, pdf.contentWidth - 70, 8.5, 12.5) - 6;
  }

  // =========================================================================
  // PAGE 13: PART 4 - THE SACRED LO-SHU GRID (CHAPTER 5)
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 4: The Sacred Lo-Shu Fortune Grid');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 4: DECODING YOUR DESTINY — THE LO-SHU GRID', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 380, 735);

  const gridIntro =
    'The Lo-Shu Grid is an ancient 3x3 Magic Square where every row, column, and diagonal sums to 15. Your personal fortune grid is populated by mapping the digits of your full birth date (28/12/1983) along with your Mulank (1) and Bhagyank (7). The frequency of digits indicates areas of immense natural talent or structural lessons.';
  let gIntroY = drawWrappedText(pdf, gridIntro, pdf.marginLeft + 20, 705, pdf.contentWidth - 40, 9.5, 14.5) - 20;

  // Render 3x3 Lo-Shu Grid
  const cellSize = 60;
  const gridStartX = pdf.marginLeft + 40;
  const gridStartY = gIntroY - 10;

  const loShuReference = [
    [4, 9, 2],
    [3, 5, 7],
    [8, 1, 6],
  ];

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cellX = gridStartX + c * cellSize;
      const cellY = gridStartY - r * cellSize;
      const refNum = loShuReference[r][c];
      const count = fg.numberOccurrences[refNum] || 0;

      pdf.setFillColor(count > 0 ? PdfColors.LIGHT_BG : PdfColors.WHITE);
      pdf.setStrokeColor(PdfColors.INDIGO);
      pdf.setLineWidth(1);
      pdf.drawRect(cellX, cellY - cellSize, cellSize, cellSize, true, true);

      pdf.drawText(String(refNum), cellX + 8, cellY - 18, 9, true, PdfColors.GREY_TEXT);
      if (count > 0) {
        const repeatStr = String(refNum).repeat(count);
        pdf.drawText(repeatStr, cellX + 15, cellY - 40, count > 2 ? 11 : 13, true, PdfColors.NAVY);
      } else {
        pdf.drawText('—', cellX + 26, cellY - 38, 12, false, PdfColors.BORDER_GREY);
      }
    }
  }

  // Summary of Occurrences on the right
  const statStartX = gridStartX + 3 * cellSize + 30;
  pdf.drawText('DIGIT OCCURRENCE AUDIT', statStartX, gridStartY - 10, 10, true, PdfColors.INDIGO);

  let stY = gridStartY - 30;
  for (let num = 1; num <= 9; num++) {
    const cnt = fg.numberOccurrences[num] || 0;
    pdf.drawText(`Number ${num}: ${cnt === 0 ? 'Missing' : cnt + ' time(s)'}`, statStartX, stY, 8.5, cnt > 0, cnt > 0 ? PdfColors.DARK_TEXT : PdfColors.GREY_TEXT);
    stY -= 16;
  }

  // Synthesis Box
  const gridSynY = gridStartY - 3 * cellSize - 30;
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawRect(pdf.marginLeft + 20, gridSynY - 110, pdf.contentWidth - 40, 115, true, true);

  pdf.drawText('LO-SHU GRID NUMERICAL SYNTHESIS', pdf.marginLeft + 35, gridSynY - 15, 10, true, PdfColors.INDIGO);
  const synText =
    'Your Lo-Shu grid exhibits a powerful concentration in Number 1 (present 3 times), signifying exceptional executive independence, strong will, and authoritative presence. Numbers 8 (present 2 times) and 9 (present 1 time) reinforce executive discipline and ambition. Numbers 4, 5, and 6 are absent from your natal grid, creating specific remedial opportunities described in subsequent chapters.';
  drawWrappedText(pdf, synText, pdf.marginLeft + 35, gridSynY - 35, pdf.contentWidth - 70, 9, 13.5);

  // =========================================================================
  // PAGE 14: PART 4 - ARROWS OF STRENGTH & WEAKNESS (CHAPTER 5)
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 4: Arrows of Strength & Missing Numbers');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 4: ARROWS OF STRENGTH & WEAKNESS', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 340, 735);

  let arY = 705;
  pdf.drawText('A. ARROWS OF STRENGTH (ACTIVE PLANES)', pdf.marginLeft + 20, arY, 10, true, PdfColors.INDIGO);
  arY -= 15;

  for (const plane of fg.arrowsOfStrength) {
    pdf.setFillColor(plane.present ? PdfColors.LIGHT_BG : PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, arY - 38, pdf.contentWidth - 40, 42, true, true);

    pdf.drawText(`${plane.name} [${plane.numbers.join('-')}]: ${plane.present ? 'COMPLETE' : 'INCOMPLETE'}`, pdf.marginLeft + 35, arY - 12, 9, true, plane.present ? PdfColors.INDIGO : PdfColors.GREY_TEXT);
    drawWrappedText(pdf, plane.description, pdf.marginLeft + 35, arY - 26, pdf.contentWidth - 70, 8, 11.5);
    arY -= 48;
  }

  arY -= 10;
  pdf.drawText('B. IMPACT OF MISSING NUMBERS (4, 5, 6)', pdf.marginLeft + 20, arY, 10, true, PdfColors.INDIGO);
  arY -= 15;

  for (const remItem of missingRem) {
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.GOLD);
    pdf.drawRect(pdf.marginLeft + 20, arY - 45, pdf.contentWidth - 40, 50, true, true);

    pdf.drawText(`Missing Number ${remItem.number} (${remItem.planet})`, pdf.marginLeft + 35, arY - 12, 9, true, PdfColors.INDIGO);
    drawWrappedText(pdf, remItem.impact, pdf.marginLeft + 35, arY - 26, pdf.contentWidth - 70, 8, 11.5);
    arY -= 56;
  }

  // =========================================================================
  // PAGE 15: PART 5 - FENG-SHUI & DIRECTIONAL INSIGHTS (CHAPTER 6)
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 5: Feng-Shui & Directional Insights');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 5: FENG-SHUI & DIRECTIONAL INSIGHTS — KUA 8', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 380, 735);

  const kuaIntro =
    'Your Kua Number is calculated from your birth year (1983) and gender (Male), yielding Kua 8, governed by the Earth element and aligned with the West Group of compass directions. Harmonizing your workstation, sleeping orientation, and negotiation seating with your auspicious directions unlocks powerful environmental synergy.';
  let kY = drawWrappedText(pdf, kuaIntro, pdf.marginLeft + 20, 705, pdf.contentWidth - 40, 9.5, 14.5) - 20;

  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawRect(pdf.marginLeft + 20, kY - 170, pdf.contentWidth - 40, 175, true, true);

  pdf.drawText('FOUR AUSPICIOUS CARDINAL DIRECTIONS FOR KUA 8', pdf.marginLeft + 35, kY - 15, 10, true, PdfColors.INDIGO);
  const dirs = [
    ['Sheng Chi (Primacy in Wealth & Success)', kd.favourableDirections.wealthShengChi],
    ['Tien Yi (Heavenly Doctor - Health & Vitality)', kd.favourableDirections.healthTienYi],
    ['Nien Yen (Longevity & Relationship Harmony)', kd.favourableDirections.romanceNienYen],
    ['Fu Wei (Personal Growth & Clarity)', kd.favourableDirections.growthFuWei],
  ];

  let dItemY = kY - 35;
  for (const [title, desc] of dirs) {
    pdf.drawText(`• ${title}:`, pdf.marginLeft + 35, dItemY, 8.5, true, PdfColors.INDIGO);
    dItemY = drawWrappedText(pdf, desc, pdf.marginLeft + 50, dItemY - 14, pdf.contentWidth - 90, 8, 11.5) - 8;
  }
  kY -= 195;

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, kY - 90, pdf.contentWidth - 40, 95, true, true);

  pdf.drawText('DIRECTIONS TO MINIMIZE OR AVOID', pdf.marginLeft + 35, kY - 15, 10, true, PdfColors.INDIGO);
  let avY = kY - 35;
  for (const av of kd.avoidDirections) {
    pdf.drawText(`• ${av}`, pdf.marginLeft + 35, avY, 8.5, false, PdfColors.GREY_TEXT);
    avY -= 15;
  }

  // =========================================================================
  // PAGE 16: PART 6 - SACRED NAME NUMBER ANALYSIS (CHAPTER 7)
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 6: Sacred Name Number Analysis');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 6: SACRED NAME NUMBER ANALYSIS (CHALDEAN)', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 380, 735);

  const nameIntro =
    'In esoteric Chaldean numerology, your legal name represents the vibrational energy you project into the commercial and social realm. Unlike Pythagorean systems, Chaldean values are assigned based on sound frequencies and occult planetary rulerships.';
  let nmY = drawWrappedText(pdf, nameIntro, pdf.marginLeft + 20, 705, pdf.contentWidth - 40, 9.5, 14.5) - 20;

  const nameMetrics = [
    ['Chaldean Full Name Number', `${nme.nameNumber}`, 'Governed by Jupiter (Guru): Bestows eloquence, optimism, commercial goodwill, and social popularity.'],
    ['Soul Urge / Heart\'s Desire Number', `${nme.soulUrgeNumber}`, 'Calculated from vowels: Governed by Mercury (Budha): Yearns for intellectual freedom, exploration, and dynamic expression.'],
    ['Outer Personality Number', `${nme.personalityNumber}`, 'Calculated from consonants: Governed by Ketu: Projects an aura of thoughtful dignity, quiet authority, and deep analytical depth.'],
    ['Maturity Number Vibration', `${path.maturityNumber}`, 'Calculated from Mulank + Name Number: Governed by Rahu/Uranus: Confers structured material execution and executive stewardship in mature years.'],
  ];

  for (const [title, num, desc] of nameMetrics) {
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, nmY - 60, pdf.contentWidth - 40, 65, true, true);

    pdf.drawText(`${title}: ${num}`, pdf.marginLeft + 35, nmY - 15, 10, true, PdfColors.INDIGO);
    drawWrappedText(pdf, desc, pdf.marginLeft + 35, nmY - 32, pdf.contentWidth - 70, 8.5, 12.5);
    nmY -= 75;
  }

  // =========================================================================
  // PAGE 17: PART 7 - FORTUNE TREND & PERSONAL YEAR DYNAMICS (CHAPTER 8)
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 7: Fortune Trend & Personal Year Dynamics');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 7: FORTUNE TREND & PERSONAL YEAR DYNAMICS', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 380, 735);

  const pyIntro =
    `Your Personal Year number governs the overarching macroeconomic and spiritual theme of your current 9-year cycle. Calculated by combining your birth day and month (28/12 -> 10 + 3 = 13 -> 4) with the calendar year ${ft.currentYear} (${ft.currentYear} -> 1), your Personal Year is ${ft.personalYear}, governed by dynamic Mercury (Budha).`;
  let pyY = drawWrappedText(pdf, pyIntro, pdf.marginLeft + 20, 705, pdf.contentWidth - 40, 9.5, 14.5) - 20;

  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawRect(pdf.marginLeft + 20, pyY - 140, pdf.contentWidth - 40, 145, true, true);

  pdf.drawText(`PERSONAL YEAR ${ft.personalYear}: THE MERCURIAN CYCLE OF EXPANSION & COMMERCE`, pdf.marginLeft + 35, pyY - 15, 10, true, PdfColors.INDIGO);
  drawWrappedText(pdf, ft.personalYearTheme, pdf.marginLeft + 35, pyY - 35, pdf.contentWidth - 70, 9, 13.5);

  // =========================================================================
  // PAGE 18: PART 7 - 12-MONTH PERSONAL FORECASTING MATRIX (CHAPTER 8)
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 7: 12-Month Personal Forecasting Matrix');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText(`PART 7: ${ft.currentYear} MONTH-BY-MONTH PERSONAL FORECAST`, pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 380, 735);

  let mthY = 710;
  for (const mth of ft.personalMonths) {
    pdf.setFillColor(mth.monthNumber % 2 === 0 ? PdfColors.LIGHT_BG : PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, mthY - 34, pdf.contentWidth - 40, 38, true, true);

    pdf.drawText(`${mth.monthName} (Personal Month ${mth.personalMonthNumber})`, pdf.marginLeft + 35, mthY - 10, 9, true, PdfColors.INDIGO);
    drawWrappedText(pdf, mth.guidance, pdf.marginLeft + 35, mthY - 24, pdf.contentWidth - 70, 7.8, 10.8);
    mthY -= 43;
  }

  // =========================================================================
  // PAGE 19: PART 8 - CHALLENGE OF LIFE (CHAPTER 9: CHALLENGE CYCLES)
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 8: Challenge of Life - Four Challenge Cycles');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 8: CHALLENGE OF LIFE — FOUR CHALLENGE CYCLES', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 380, 735);

  const pinIntro =
    'In the reference methodology (Chapter 9: Challenge of Life), your life journey is divided into Four Challenge Cycles across distinct age spans. Note on Calculation: Following the authoritative reference formulas, each cycle number is derived via addition (Cycle 1: Month + Day, Cycle 2: Day + Year, Cycle 3: Cycle 1 + Cycle 2, Cycle 4: Month + Year) rather than subtraction, defining the primary focus, developmental duties, and material fruits of each life phase.';
  let pinY = drawWrappedText(pdf, pinIntro, pdf.marginLeft + 20, 705, pdf.contentWidth - 40, 8.8, 13.5) - 16;

  for (const cyc of lpCycles) {
    const cardH = 92;
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, pinY - (cardH - 5), pdf.contentWidth - 40, cardH, true, true);

    const rangeDisplay = cyc.ageRange.includes('onwards') ? cyc.ageRange : `${cyc.ageRange} Years`;
    pdf.drawText(`Challenge ${cyc.phaseName}  |  Range: ${rangeDisplay}  |  Challenge Number: ${cyc.pinnacleNumber}`, pdf.marginLeft + 35, pinY - 14, 8.5, true, PdfColors.INDIGO);
    const attrEndY = drawWrappedText(pdf, cyc.attributes, pdf.marginLeft + 35, pinY - 28, pdf.contentWidth - 70, 7.8, 10.8) - 5;
    drawWrappedText(pdf, `Key Opportunity: ${cyc.phaseOpportunity}`, pdf.marginLeft + 35, attrEndY, pdf.contentWidth - 70, 7.8, 10.8);
    pinY -= (cardH + 12);
  }

  // =========================================================================
  // PAGE 20: PART 9 - CHAPTER 10: ARE YOU ON THE RIGHT PATH?
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 9: Are You on the Right Path?');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 9: ARE YOU ON THE RIGHT PATH? (SUCCESS, CONNECTION, MATURITY)', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 440, 735);

  let rY = 705;

  // 1. Success Number
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawRect(pdf.marginLeft + 20, rY - 130, pdf.contentWidth - 40, 135, true, true);

  pdf.drawText(`A. SUCCESS NUMBER : ${path.successNumber} (${path.successNumberFormula})`, pdf.marginLeft + 35, rY - 15, 10, true, PdfColors.INDIGO);
  pdf.drawText('Core Qualities Bestowed:', pdf.marginLeft + 35, rY - 32, 9, true, PdfColors.DARK_TEXT);
  let sqY = rY - 48;
  for (const q of path.successNumberQualities) {
    sqY = drawWrappedText(pdf, `• ${q}`, pdf.marginLeft + 35, sqY, pdf.contentWidth - 70, 8, 11) - 4;
  }
  rY -= 150;

  // 2. Connection Number
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, rY - 90, pdf.contentWidth - 40, 95, true, true);

  pdf.drawText(`B. CONNECTION NUMBER : ${path.connectionNumber} (${path.connectionNumberFormula})`, pdf.marginLeft + 35, rY - 15, 10, true, PdfColors.INDIGO);
  drawWrappedText(pdf, path.connectionNumberSynthesis, pdf.marginLeft + 35, rY - 35, pdf.contentWidth - 70, 8.5, 12.5);
  rY -= 110;

  // 3. Maturity Number
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawRect(pdf.marginLeft + 20, rY - 110, pdf.contentWidth - 40, 115, true, true);

  pdf.drawText(`C. MATURITY NUMBER : ${path.maturityNumber} (${path.maturityNumberFormula})`, pdf.marginLeft + 35, rY - 15, 10, true, PdfColors.INDIGO);
  let mqY = rY - 35;
  for (const mq of path.maturityNumberQualities) {
    mqY = drawWrappedText(pdf, `• ${mq}`, pdf.marginLeft + 35, mqY, pdf.contentWidth - 70, 8, 11) - 4;
  }
  drawWrappedText(pdf, `Guidance: ${path.maturityNumberGuidance}`, pdf.marginLeft + 35, mqY - 4, pdf.contentWidth - 70, 8, 11);

  // =========================================================================
  // PAGE 21: PART 10 - CHAPTER 11: EVERYDAY LUCKY ITEMS
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 10: Everyday Lucky Items & Signatures');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 10: YOUR EVERYDAY LUCKY ITEMS & PRACTICAL SIGNATURE', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 440, 735);

  let itmY = 705;

  // Lucky Email ID
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, itmY - 120, pdf.contentWidth - 40, 125, true, true);

  pdf.drawText('A. YOUR LUCKY EMAIL ID CONFIGURATION', pdf.marginLeft + 35, itmY - 15, 10, true, PdfColors.INDIGO);
  pdf.drawText(`Recommended Handle: ${items.luckyEmailId}`, pdf.marginLeft + 35, itmY - 35, 9.5, true, PdfColors.PURPLE);
  let emY = itmY - 52;
  for (const rule of items.emailModificationRules) {
    emY = drawWrappedText(pdf, `• ${rule}`, pdf.marginLeft + 35, emY, pdf.contentWidth - 70, 8, 11) - 4;
  }
  itmY -= 140;

  // Lucky Banks & Tattoo
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, itmY - 80, pdf.contentWidth - 40, 85, true, true);

  pdf.drawText('B. YOUR LUCKY FINANCIAL INSTITUTIONS & SACRED TATTOO', pdf.marginLeft + 35, itmY - 15, 10, true, PdfColors.INDIGO);
  pdf.drawText(`Auspicious Banks: ${items.luckyBanks.join(', ')}`, pdf.marginLeft + 35, itmY - 35, 8.5, false, PdfColors.DARK_TEXT);
  pdf.drawText(`Recommended Tattoo Totem: ${items.luckyTattoo}`, pdf.marginLeft + 35, itmY - 55, 8.5, false, PdfColors.DARK_TEXT);
  itmY -= 100;

  // Signature Advice
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawRect(pdf.marginLeft + 20, itmY - 90, pdf.contentWidth - 40, 95, true, true);

  pdf.drawText('C. THE SACRED GEOMETRY OF YOUR SIGNATURE', pdf.marginLeft + 35, itmY - 15, 10, true, PdfColors.INDIGO);
  drawWrappedText(pdf, items.signatureAdvice, pdf.marginLeft + 35, itmY - 35, pdf.contentWidth - 70, 8.5, 12.5);

  // =========================================================================
  // PAGE 22: PART 11 - CHAPTER 12: MISSING NUMBERS & HEALTH MANTRAS
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 11: Missing Number Remedies & Sacred Health Mantras');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 11: MISSING NUMBER REMEDIES & SACRED HEALTH MANTRAS', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 440, 735);

  let mRemY = 705;

  // Three-Remedy Caution Rule Box
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawRect(pdf.marginLeft + 20, mRemY - 70, pdf.contentWidth - 40, 75, true, true);

  pdf.drawText('MANDATORY THREE-REMEDY CAUTION RULE', pdf.marginLeft + 35, mRemY - 14, 9.5, true, PdfColors.INDIGO);
  mRemY = drawWrappedText(pdf, report.threeRemedyCautionRule, pdf.marginLeft + 35, mRemY - 28, pdf.contentWidth - 70, 7.8, 10.8) - 22;

  // Health Mantras
  const mantraList = [hMantras.mahamrityunjaya, hMantras.suryaMantra, hMantras.gayatriMantra];
  for (const m of mantraList) {
    const cardH = 76;
    pdf.setFillColor(PdfColors.WHITE);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, mRemY - (cardH - 5), pdf.contentWidth - 40, cardH, true, true);

    pdf.drawText(m.title, pdf.marginLeft + 35, mRemY - 12, 9, true, PdfColors.INDIGO);
    pdf.drawText(`Sanskrit / IAST: ${m.mantra}`, pdf.marginLeft + 35, mRemY - 25, 7.5, false, PdfColors.DARK_TEXT);
    const pronEndY = drawWrappedText(pdf, `Phonetic Chanting: ${m.pronunciation}`, pdf.marginLeft + 35, mRemY - 37, pdf.contentWidth - 70, 7.2, 9.5) - 3;
    pdf.drawText(`Timing: ${m.timing}`, pdf.marginLeft + 35, pronEndY, 7.5, false, PdfColors.PURPLE);
    mRemY -= (cardH + 10);
  }

  // =========================================================================
  // PAGE 23: PART 12 - CHAPTER 13: FOUR VEDIC CHARTS QUADRANT
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 12: Cosmic Pathway - Four Vedic Charts Quadrant');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 12: COSMIC PATHWAY — FOUR VEDIC CHARTS QUADRANT', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 440, 735);

  const quadSize = 185;
  const qTopY = 530;

  // Chart 1: Lagna Chart (D1)
  pdf.drawText('A. JANMA KUNDLI (D1 LAGNA)', pdf.marginLeft + 30, 725, 9, true, PdfColors.INDIGO);
  renderNorthIndianChart(pdf, cp.charts.lagna || report.houses, report.planets, pdf.marginLeft + 30, qTopY, quadSize);

  // Chart 2: Chandra Kundli (Moon)
  pdf.drawText('B. CHANDRA KUNDLI (MOON)', pdf.marginLeft + 280, 725, 9, true, PdfColors.PURPLE);
  renderNorthIndianChart(pdf, cp.charts.moon || report.houses, report.planets, pdf.marginLeft + 280, qTopY, quadSize);

  // Chart 3: Navamsha Kundli (D9)
  const qBotY = 270;
  pdf.drawText('C. NAVAMSHA KUNDLI (D9)', pdf.marginLeft + 30, 465, 9, true, PdfColors.INDIGO);
  renderNorthIndianChart(pdf, cp.charts.navamsha || report.houses, report.planets, pdf.marginLeft + 30, qBotY, quadSize);

  // Chart 4: Lal Kitab Planetary Kundli
  pdf.drawText('D. LAL KITAB PLANETARY KUNDLI', pdf.marginLeft + 280, 465, 9, true, PdfColors.PURPLE);
  renderNorthIndianChart(pdf, cp.charts.lalKitab || report.houses, report.planets, pdf.marginLeft + 280, qBotY, quadSize);

  // Explanatory Synthesis Box at bottom
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawRect(pdf.marginLeft + 20, 115, pdf.contentWidth - 40, 135, true, true);

  pdf.drawText('VEDIC QUADRANT HARMONIC SYNTHESIS', pdf.marginLeft + 35, 235, 9.5, true, PdfColors.INDIGO);
  const quadDesc = [
    '• Janma Kundli (D1): Foundational physical incarnation and baseline distribution of career, finance, and vitality.',
    '• Chandra Kundli (Moon): Inner psychological reality, emotional impulses, stress processing, and mental peace.',
    '• Navamsha (D9): Microscopic 9th harmonic division revealing soul purpose, marital destiny, and mid-life fruition.',
    '• Lal Kitab Kundli: Planetary energies mapped to natural house rulerships (Aries House 1), revealing immediate remedial levers.',
  ];
  let qdY = 217;
  for (const qd of quadDesc) {
    pdf.drawText(qd, pdf.marginLeft + 35, qdY, 8, false, PdfColors.DARK_TEXT);
    qdY -= 17;
  }

  // =========================================================================
  // PAGE 24: PART 13 - CHAPTERS 14 & 15: PANCHANG & JANM NAKSHATRA
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 13: Sacred Panchang & Janm Nakshatra Profile');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 13: SACRED PANCHANG & JANM NAKSHATRA PROFILE', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 400, 735);

  // Panchang Pillars Table
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, 540, pdf.contentWidth - 40, 180, true, true);

  pdf.drawText('THE FIVE SACRED PILLARS OF TIME (PANCHANG)', pdf.marginLeft + 35, 705, 10.5, true, PdfColors.INDIGO);
  const pPillars = [
    ['Tithi (Lunar Phase)', cp.panchang.tithi, 'Relationship harmony, emotional balance, and divine auspiciousness.'],
    ['Vara (Solar Day)', cp.panchang.vara, 'Physical energy, vitality, executive stamina, and weekly momentum.'],
    ['Nakshatra (Lunar Mansion)', cp.panchang.nakshatra, 'Mental disposition, instinctive subconscious urges, and karmic talents.'],
    ['Yoga (Solar-Lunar Angular Sum)', cp.panchang.yoga, 'Spiritual character, moral resilience, and natural alignment with dharma.'],
    ['Karana (Half Lunar Phase)', cp.panchang.karana, 'Material execution, professional efficiency, and worldly task completion.'],
  ];

  let panY = 685;
  for (const [pil, val, inf] of pPillars) {
    pdf.drawText(`• ${pil}: ${val}`, pdf.marginLeft + 35, panY, 8.5, true, PdfColors.INDIGO);
    pdf.drawText(`Influence: ${inf}`, pdf.marginLeft + 48, panY - 12, 7.5, false, PdfColors.DARK_TEXT);
    panY -= 28;
  }

  // Nakshatra Profile Box
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawRect(pdf.marginLeft + 20, 260, pdf.contentWidth - 40, 260, true, true);

  pdf.drawText(`JANM NAKSHATRA: ${cp.janmNakshatra.name.toUpperCase()} (PADA ${cp.janmNakshatra.pada})`, pdf.marginLeft + 35, 505, 10.5, true, PdfColors.INDIGO);
  pdf.drawText(`Ruling Deity: Lord Vishwakarma  |  Planetary Lord: ${cp.janmNakshatra.rulingLord}`, pdf.marginLeft + 35, 490, 8.5, true, PdfColors.PURPLE);
  pdf.drawText(`Sacred Symbol: ${cp.janmNakshatra.symbol}`, pdf.marginLeft + 35, 476, 8.5, true, PdfColors.PURPLE);

  let nqY = 455;
  for (const nq of cp.janmNakshatra.qualities) {
    nqY = drawWrappedText(pdf, `• ${nq}`, pdf.marginLeft + 35, nqY, pdf.contentWidth - 70, 8.5, 12.5) - 8;
  }

  // =========================================================================
  // PAGE 25: PART 14 - CHAPTER 16: RASHI PREDICTIONS
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 14: Rashi Predictions - Scorpio Lagna & Virgo Moon');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 14: RASHI PREDICTIONS — SCORPIO LAGNA & VIRGO MOON', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 440, 735);

  let rshY = 705;
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, rshY - 160, pdf.contentWidth - 40, 165, true, true);

  pdf.drawText('A. SCORPIO ASCENDANT (VRISHCHIKA LAGNA) PSYCHO-ASTROLOGY', pdf.marginLeft + 35, rshY - 15, 10, true, PdfColors.INDIGO);
  const scorpDesc =
    'As a Scorpio ascendant, Mars and Ketu rule your primal life force. You project an aura of magnetic calm beneath which lies immense determination, investigative brilliance, and profound emotional intensity. People instinctively confide in you because your presence feels secure yet deeply perceptive. You rarely accept superficial explanations, choosing to probe every personal and professional situation to its core root. Channel your intense emotional stamina into tangible achievements rather than carrying silent grievances.';
  rshY = drawWrappedText(pdf, scorpDesc, pdf.marginLeft + 35, rshY - 35, pdf.contentWidth - 70, 9, 13.5) - 35;

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawRect(pdf.marginLeft + 20, rshY - 160, pdf.contentWidth - 40, 165, true, true);

  pdf.drawText('B. VIRGO MOON (KANYA CHANDRA) INNER EMOTIONAL LANDSCAPE', pdf.marginLeft + 35, rshY - 15, 10, true, PdfColors.INDIGO);
  const virgoDesc =
    'Your Moon resides in analytical Virgo, governed by Mercury. This placement creates a detail-conscious mind that processes emotions through logic, organization, and practical service. You feel most secure when your environment and schedule are clean, orderly, and predictable. Your empathy often expresses itself as tangible problem-solving rather than sentimental displays. Be mindful to avoid excessive self-criticism or overthinking; allow yourself to celebrate progress rather than obsessing over minor imperfections.';
  drawWrappedText(pdf, virgoDesc, pdf.marginLeft + 35, rshY - 35, pdf.contentWidth - 70, 9, 13.5);

  // =========================================================================
  // PAGE 26: PART 15 - CHAPTER 17: PLANETS & HOUSES (PART 1)
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 15: Planetary Placements & House Attributes (Part 1)');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 15: PLANETS & HOUSE ATTRIBUTES (SUN, MOON, MARS)', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 440, 735);

  let pl1Y = 705;
  const planetsGroup1 = aa.planetsInHouses.filter((p) => ['SUN', 'MOON', 'MARS'].includes(p.planet));

  for (const p of planetsGroup1) {
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, pl1Y - 95, pdf.contentWidth - 40, 100, true, true);

    pdf.drawText(`${p.planet} IN HOUSE ${p.house} (${p.sign.toUpperCase()})`, pdf.marginLeft + 35, pl1Y - 15, 10, true, PdfColors.INDIGO);
    drawWrappedText(pdf, p.attributes, pdf.marginLeft + 35, pl1Y - 35, pdf.contentWidth - 70, 8.8, 12.8);
    pl1Y -= 115;
  }

  // =========================================================================
  // PAGE 27: PART 16 - CHAPTER 17: PLANETS & HOUSES (PART 2)
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 16: Planetary Placements & House Attributes (Part 2)');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 16: PLANETS & HOUSE ATTRIBUTES (MERCURY, JUPITER, VENUS)', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 440, 735);

  let pl2Y = 705;
  const planetsGroup2 = aa.planetsInHouses.filter((p) => ['MERCURY', 'JUPITER', 'VENUS'].includes(p.planet));

  for (const p of planetsGroup2) {
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, pl2Y - 95, pdf.contentWidth - 40, 100, true, true);

    pdf.drawText(`${p.planet} IN HOUSE ${p.house} (${p.sign.toUpperCase()})`, pdf.marginLeft + 35, pl2Y - 15, 10, true, PdfColors.INDIGO);
    drawWrappedText(pdf, p.attributes, pdf.marginLeft + 35, pl2Y - 35, pdf.contentWidth - 70, 8.8, 12.8);
    pl2Y -= 115;
  }

  // =========================================================================
  // PAGE 28: PART 17 - CHAPTER 17: PLANETS & HOUSES (PART 3)
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 17: Planetary Placements & House Attributes (Part 3)');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 17: PLANETS & HOUSE ATTRIBUTES (SATURN, RAHU, KETU)', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 440, 735);

  let pl3Y = 705;
  const planetsGroup3 = aa.planetsInHouses.filter((p) => ['SATURN', 'RAHU', 'KETU'].includes(p.planet));

  for (const p of planetsGroup3) {
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, pl3Y - 95, pdf.contentWidth - 40, 100, true, true);

    pdf.drawText(`${p.planet} IN HOUSE ${p.house} (${p.sign.toUpperCase()})`, pdf.marginLeft + 35, pl3Y - 15, 10, true, PdfColors.INDIGO);
    drawWrappedText(pdf, p.attributes, pdf.marginLeft + 35, pl3Y - 35, pdf.contentWidth - 70, 8.8, 12.8);
    pl3Y -= 115;
  }

  // =========================================================================
  // PAGE 29: PART 18 - CHAPTER 18: MANGLIK DOSH ANALYSIS
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 18: Manglik Dosh Analysis & Mitigations');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 18: MANGLIK DOSH ANALYSIS & MITIGATING FACTORS', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 440, 735);

  let mgY = 705;
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawRect(pdf.marginLeft + 20, mgY - 110, pdf.contentWidth - 40, 115, true, true);

  pdf.drawText('MANGLIK DOSH STATUS: ANSHIK MANGLIK (MILD / MITIGATED)', pdf.marginLeft + 35, mgY - 15, 10, true, PdfColors.INDIGO);
  mgY = drawWrappedText(pdf, aa.manglikDosh.marsPlacement, pdf.marginLeft + 35, mgY - 35, pdf.contentWidth - 70, 8.5, 12.5) - 35;

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, mgY - 120, pdf.contentWidth - 40, 125, true, true);

  pdf.drawText('CLASSICAL CANCELLATION & MITIGATING FACTORS', pdf.marginLeft + 35, mgY - 15, 10, true, PdfColors.INDIGO);
  let mitY = mgY - 35;
  for (const m of aa.manglikDosh.mitigatingFactors) {
    mitY = drawWrappedText(pdf, `• ${m}`, pdf.marginLeft + 35, mitY, pdf.contentWidth - 70, 8.2, 11.5) - 4;
  }
  mgY -= 140;

  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, mgY - 110, pdf.contentWidth - 40, 115, true, true);

  pdf.drawText('RECOMMENDED MANGLIK DOSH REMEDIES', pdf.marginLeft + 35, mgY - 15, 10, true, PdfColors.INDIGO);
  let rRemY = mgY - 35;
  for (const r of aa.manglikDosh.remedies) {
    rRemY = drawWrappedText(pdf, `• ${r}`, pdf.marginLeft + 35, rRemY, pdf.contentWidth - 70, 8.2, 11.5) - 4;
  }

  // =========================================================================
  // PAGE 30: PART 19 - CHAPTER 19: SHANI SADE SATI ANALYSIS
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 19: Shani Sade Sati Deep Dive & Timeline');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 19: SHANI SADE SATI DEEP DIVE & TIMELINE', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 380, 735);

  let ssY = 705;
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawRect(pdf.marginLeft + 20, ssY - 95, pdf.contentWidth - 40, 100, true, true);

  const statusUpper = aa.sadeSati.currentStatus.toUpperCase();
  const statusShort = statusUpper.includes('(') ? statusUpper.split('(')[0].trim() : statusUpper;
  const statusNote = statusUpper.includes('(') ? '(' + statusUpper.split('(')[1] : '';
  pdf.drawText(`CURRENT SADE SATI STATUS: ${statusShort}`, pdf.marginLeft + 35, ssY - 14, 10, true, PdfColors.INDIGO);
  if (statusNote) {
    pdf.drawText(statusNote, pdf.marginLeft + 35, ssY - 26, 7.8, false, PdfColors.INDIGO);
  }
  pdf.drawText(aa.sadeSati.shaniPlacement, pdf.marginLeft + 35, ssY - 40, 8.5, false, PdfColors.DARK_TEXT);
  drawWrappedText(pdf, aa.sadeSati.phaseAnalysis, pdf.marginLeft + 35, ssY - 56, pdf.contentWidth - 70, 8.2, 11.5);
  ssY -= 115;

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, ssY - 150, pdf.contentWidth - 40, 155, true, true);

  pdf.drawText('THE THREE PHASES OF SHANI SADE SATI EXPLAINED', pdf.marginLeft + 35, ssY - 15, 10, true, PdfColors.INDIGO);
  const phases = [
    ['1. Rising Phase (12th from Moon - Leo)', 'Saturn transits the 12th house from Moon, triggering financial reallocation, foreign travels, and psychological reorganization.'],
    ['2. Peak Phase (Over Natal Moon - Virgo)', 'Saturn transits directly over natal Moon. Demands unyielding emotional discipline, mental composure, and steady dedication.'],
    ['3. Setting Phase (2nd from Moon - Libra)', 'Saturn transits the 2nd house of family and wealth. Exalted in Libra in your chart, concluding trials and establishing stable financial maturity.'],
  ];
  let phY = ssY - 35;
  for (const [t, d] of phases) {
    pdf.drawText(t, pdf.marginLeft + 35, phY, 8.5, true, PdfColors.INDIGO);
    phY = drawWrappedText(pdf, d, pdf.marginLeft + 50, phY - 14, pdf.contentWidth - 90, 8, 11) - 6;
  }
  ssY -= 175;

  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, ssY - 100, pdf.contentWidth - 40, 105, true, true);

  pdf.drawText('CONSECRATED SHANI REMEDIES & DISCIPLINE', pdf.marginLeft + 35, ssY - 15, 10, true, PdfColors.INDIGO);
  let sRemY = ssY - 35;
  for (const sr of aa.sadeSati.remedies) {
    sRemY = drawWrappedText(pdf, `• ${sr}`, pdf.marginLeft + 35, sRemY, pdf.contentWidth - 70, 8.2, 11.5) - 4;
  }

  // =========================================================================
  // PAGE 31: PART 20 - CHAPTER 20: AUSPICIOUS YOGAS IN THE BIRTH CHART
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 20: Auspicious Yogas Formed in the Birth Chart');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 20: AUSPICIOUS YOGAS FORMED IN THE BIRTH CHART', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 440, 735);

  let ygY = 705;
  for (const yog of aa.yogas) {
    pdf.setFillColor(PdfColors.LIGHT_BG);
    pdf.setStrokeColor(PdfColors.BORDER_GREY);
    pdf.drawRect(pdf.marginLeft + 20, ygY - 55, pdf.contentWidth - 40, 60, true, true);

    pdf.drawText(`${yog.name.toUpperCase()} (${yog.status})`, pdf.marginLeft + 35, ygY - 14, 9.5, true, PdfColors.INDIGO);
    pdf.drawText(`Planets Involved: ${yog.planetsInvolved.join(', ')}`, pdf.marginLeft + 230, ygY - 14, 8.5, true, PdfColors.PURPLE);
    drawWrappedText(pdf, yog.influence, pdf.marginLeft + 35, ygY - 28, pdf.contentWidth - 70, 8, 11);
    ygY -= 68;
  }

  // =========================================================================
  // PAGE 32: PART 21 - CHAPTER 21: ABOUT YOUR MARRIAGE & DARAKARAKA
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 21: Sacred Matrimony & Spouse Insights');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 21: ABOUT YOUR MARRIAGE & DARAKARAKA SPOUSE', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 440, 735);

  let marY = 705;
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawRect(pdf.marginLeft + 20, marY - 110, pdf.contentWidth - 40, 115, true, true);

  pdf.drawText(`JAIMINI DARAKARAKA: ${aa.marriageAndSpouse.darakarakaPlanet}`, pdf.marginLeft + 35, marY - 15, 10, true, PdfColors.INDIGO);
  pdf.drawText('Core Archetypal Traits of Your Future Spouse:', pdf.marginLeft + 35, marY - 32, 9, true, PdfColors.DARK_TEXT);
  let spY = marY - 48;
  for (const sp of aa.marriageAndSpouse.spouseTraits) {
    spY = drawWrappedText(pdf, `• ${sp}`, pdf.marginLeft + 35, spY, pdf.contentWidth - 70, 8.2, 11.5) - 4;
  }
  marY -= 130;

  const mBoxH = marY - 115;
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, 115, pdf.contentWidth - 40, mBoxH, true, true);

  pdf.drawText('FAVORABLE PERIODS FOR MARRIAGE & RELATIONSHIP FRUITION', pdf.marginLeft + 35, marY - 15, 10, true, PdfColors.INDIGO);
  let twY = marY - 35;
  for (const tw of aa.marriageAndSpouse.timingWindows) {
    pdf.drawText(`${tw.rating} Window: ${tw.beginningPeriod} to ${tw.endingPeriod}`, pdf.marginLeft + 35, twY, 8.5, true, PdfColors.INDIGO);
    twY = drawWrappedText(pdf, `Astrological Basis: ${tw.astrologicalBasis}`, pdf.marginLeft + 50, twY - 12, pdf.contentWidth - 90, 7.8, 10.8) - 6;
  }

  // =========================================================================
  // PAGE 33: PART 22 - CHAPTER 22: CAREER PREDICTIONS (10TH HOUSE & D10)
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 22: Career Predictions - 10th House Calling');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 22: CAREER PREDICTIONS — 10TH HOUSE & D10 DASHAMSHA', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 440, 735);

  let carY = 705;
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, carY - 90, pdf.contentWidth - 40, 95, true, true);

  pdf.drawText('KEY VOCATIONAL SIGNIFICATORS IN KUNDLI', pdf.marginLeft + 35, carY - 15, 10, true, PdfColors.INDIGO);
  let vsY = carY - 35;
  for (const vs of aa.careerPredictions.vocationalSignificators) {
    pdf.drawText(`• ${vs}`, pdf.marginLeft + 35, vsY, 8.5, false, PdfColors.DARK_TEXT);
    vsY -= 16;
  }
  carY -= 110;

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawRect(pdf.marginLeft + 20, carY - 160, pdf.contentWidth - 40, 165, true, true);

  pdf.drawText('LONG-RANGE VOCATIONAL TRAJECTORY & PEAK FRUITION', pdf.marginLeft + 35, carY - 15, 10, true, PdfColors.INDIGO);
  drawWrappedText(pdf, aa.careerPredictions.careerTrajectory, pdf.marginLeft + 35, carY - 35, pdf.contentWidth - 70, 9, 13.5);

  // =========================================================================
  // PAGE 34: PART 23 - CHAPTER 23: CONSECRATED ASTROLOGICAL REMEDIES
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 23: Consecrated Astrological Remedies');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('PART 23: CONSECRATED ASTROLOGICAL REMEDIES', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 380, 735);

  let remY = 710;

  // Gemstones Table
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawRect(pdf.marginLeft + 20, remY - 120, pdf.contentWidth - 40, 125, true, true);

  pdf.drawText('PRIMARY & SECONDARY GEMSTONE RECOMMENDATIONS', pdf.marginLeft + 35, remY - 14, 9.5, true, PdfColors.INDIGO);
  let gmY = remY - 32;
  for (const gem of rem.gemstonesAndCrystals) {
    pdf.drawText(`Stone: ${gem.stone} (Sub: ${gem.substitute})`, pdf.marginLeft + 35, gmY, 8.5, true, PdfColors.NAVY);
    pdf.drawText(`Setting & Finger: ${gem.fingerMetal}`, pdf.marginLeft + 48, gmY - 13, 7.5, false, PdfColors.DARK_TEXT);
    pdf.drawText(`Consecration Mantra: ${gem.mantra}`, pdf.marginLeft + 48, gmY - 26, 7.5, false, PdfColors.PURPLE);
    gmY -= 42;
  }
  remY -= 135;

  // Rudraksha & Yantras
  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, remY - 80, pdf.contentWidth - 40, 85, true, true);

  pdf.drawText(`SACRED RUDRAKSHA: ${rem.rudrakshaRecommendation.name}`, pdf.marginLeft + 35, remY - 14, 9.5, true, PdfColors.INDIGO);
  pdf.drawText(`Mukhi & Configuration: ${rem.rudrakshaRecommendation.mukhi}`, pdf.marginLeft + 35, remY - 32, 8, false, PdfColors.DARK_TEXT);
  drawWrappedText(pdf, `Purpose: ${rem.rudrakshaRecommendation.purpose}`, pdf.marginLeft + 35, remY - 48, pdf.contentWidth - 70, 7.8, 10.8);
  remY -= 95;

  // Lifestyle Remedies
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, remY - 120, pdf.contentWidth - 40, 125, true, true);

  pdf.drawText('CONSECRATED LIFESTYLE & CHARITY ACTIONS', pdf.marginLeft + 35, remY - 14, 9.5, true, PdfColors.INDIGO);
  let lfY = remY - 32;
  for (const lf of rem.lifestyleRemedies) {
    lfY = drawWrappedText(pdf, `• ${lf}`, pdf.marginLeft + 35, lfY, pdf.contentWidth - 70, 8, 11) - 4;
  }

  // =========================================================================
  // PAGE 35: PART 24 & 25 - GEMS CARE & CLOSING BENEDICTION
  // =========================================================================
  pdf.addPage();
  pdf.drawHeader('Part 24 & 25: Gems Care & Closing Benediction');

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.setLineWidth(1.5);
  pdf.drawRect(pdf.marginLeft, 100, pdf.contentWidth, 670, true, true);

  pdf.drawText('HARNESSING GEMS MAGIC, CLOSING BENEDICTION & MESSAGE', pdf.marginLeft + 20, 745, 12, true, PdfColors.INDIGO);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawLine(pdf.marginLeft + 20, 735, pdf.marginLeft + 440, 735);

  let finY = 705;
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.BORDER_GREY);
  pdf.drawRect(pdf.marginLeft + 20, finY - 110, pdf.contentWidth - 40, 115, true, true);

  pdf.drawText('TO HARNESS THE MAGIC OF GEMS, CRYSTALS & RUDRAKSHA', pdf.marginLeft + 35, finY - 15, 10, true, PdfColors.INDIGO);
  const careText =
    'Your gemstones and Rudraksha beads are natural conduits of cosmic frequencies. Before wearing, purify them in raw milk, holy water (Gangajal), and wash with pure water. Energize on their designated weekday (e.g. Thursdays for Pukhraj, Sundays for Manikya) by chanting their sacred Beej Mantras 108 times facing East. Re-energize periodically during auspicious Shukla Paksha muhurtas to preserve their divine luster.';
  finY = drawWrappedText(pdf, careText, pdf.marginLeft + 35, finY - 35, pdf.contentWidth - 70, 8.5, 12.5) - 35;

  pdf.setFillColor(PdfColors.WHITE);
  pdf.setStrokeColor(PdfColors.GOLD);
  pdf.drawRect(pdf.marginLeft + 20, finY - 110, pdf.contentWidth - 40, 115, true, true);

  pdf.drawText('FINAL BENEDICTION FROM ASTRO SUSHIL', pdf.marginLeft + 35, finY - 15, 10, true, PdfColors.INDIGO);
  finY = drawWrappedText(pdf, rem.closingBlessing, pdf.marginLeft + 35, finY - 35, pdf.contentWidth - 70, 8.5, 12.5) - 35;

  // Universal Shloka & Sealing Signature
  pdf.setFillColor(PdfColors.LIGHT_BG);
  pdf.setStrokeColor(PdfColors.INDIGO);
  pdf.drawRect(pdf.marginLeft + 20, finY - 100, pdf.contentWidth - 40, 105, true, true);

  pdf.drawText('SACRED SHLOKA OF UNIVERSAL WELL-BEING (SANSKRIT TRANSLITERATION)', pdf.marginLeft + 35, finY - 15, 9, true, PdfColors.PURPLE);
  pdf.drawText('"Om Sarve Bhavantu Sukhinah, Sarve Santu Niramayah |', pdf.marginLeft + 35, finY - 30, 8.5, true, PdfColors.INDIGO);
  pdf.drawText(' Sarve Bhadrani Pashyantu, Ma Kashchid Duhkha-Bhag-Bhavet ||"', pdf.marginLeft + 35, finY - 43, 8.5, true, PdfColors.INDIGO);
  pdf.drawText('Meaning: May all beings be happy and peaceful; may all see good fortune and none suffer.', pdf.marginLeft + 35, finY - 56, 7.5, false, PdfColors.DARK_TEXT);
  pdf.drawText('Astro Sushil (Sushil Kumaar Singh), Founder & Chief Astrologer', pdf.marginLeft + 35, finY - 72, 9, true, PdfColors.NAVY);
  pdf.drawText('Authentic Parashari, Chaldean & Lahiri Ephemeris Standards - 2026', pdf.marginLeft + 35, finY - 86, 7.5, false, PdfColors.GREY_TEXT);
}

