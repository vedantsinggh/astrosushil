import 'package:flutter/material.dart';

/// Brand visual and editorial identity for one of the 13 canonical Astro Sushil
/// report editions.
class ReportBrandInfo {
  final String reportType;
  final String canonicalKey;
  final String title;
  final String tagline;
  final String taglineHi;
  final String description;
  final String coverAsset;
  final String illustrationAsset;
  final Color primaryColor;
  final Color accentColor;
  final Color tintColor;
  final Color textAccentColor;
  final String motifDescription;
  final IconData icon;
  final List<String> includedSections;

  const ReportBrandInfo({
    required this.reportType,
    required this.canonicalKey,
    required this.title,
    required this.tagline,
    required this.taglineHi,
    required this.description,
    required this.coverAsset,
    required this.illustrationAsset,
    required this.primaryColor,
    required this.accentColor,
    required this.tintColor,
    required this.textAccentColor,
    required this.motifDescription,
    required this.icon,
    required this.includedSections,
  });
}

/// Central registry mapping the 13 canonical Astro Sushil report keys and
/// legacy report-type aliases to their WebP cover previews, PNG illustrations,
/// jewel-tone palettes, and accessibility motif descriptions.
class ReportBrandRegistry {
  ReportBrandRegistry._();

  static const String insightStarAsset = 'assets/reports/shared/insight-star.png';
  static const String sectionDividerAsset = 'assets/reports/shared/section-divider.png';
  static const String timelineMarkerAsset = 'assets/reports/shared/timeline-marker.png';

  static const List<ReportBrandInfo> canonicalReports = [
    ReportBrandInfo(
      reportType: 'KUNDLI',
      canonicalKey: 'report-kundli',
      title: 'Premium Personalised Kundli Report',
      tagline: 'Your full birth chart, planetary placements and dasha periods',
      taglineHi: 'आपकी पूरी जन्म कुंडली, ग्रह स्थिति और दशा',
      description:
          'Comprehensive astrological life blueprint with North Indian D1 Lagna & Chandra charts, 9 Graha dignities, Vimshottari Dasha periods, and classical remedies.',
      coverAsset: 'assets/reports/covers/report-kundli.webp',
      illustrationAsset: 'assets/reports/illustrations/report-kundli.png',
      primaryColor: Color(0xFF2E1A47),
      accentColor: Color(0xFFD4AF37),
      tintColor: Color(0xFFF3EAF8),
      textAccentColor: Color(0xFF6B21A8),
      motifDescription: 'Sacred North Indian diamond Kundli yantra with cosmic meridian lines',
      icon: Icons.auto_awesome_rounded,
      includedSections: [
        'North Indian D1 Lagna Kundli & Chandra Kundli',
        '9 Graha Placements, Degrees & Functional Dignities',
        '120-Year Parashari Vimshottari Dasha Periods',
        'Planetary Placements & Manglik Analysis',
        'Trikona Lord Gemstone Recommendations (1st, 5th, 9th Lords)',
      ],
    ),
    ReportBrandInfo(
      reportType: 'CAREER',
      canonicalKey: 'report-career',
      title: 'Career Report',
      tagline: 'Work, career path and good times for change',
      taglineHi: 'काम, करियर और बदलाव का सही समय',
      description:
          '10th House Karma Bhava analysis, vocational DNA mapping, career inflection windows, and multi-year Dasha career guidance.',
      coverAsset: 'assets/reports/covers/report-career.webp',
      illustrationAsset: 'assets/reports/illustrations/report-career.png',
      primaryColor: Color(0xFF133C4B),
      accentColor: Color(0xFFD4AF37),
      tintColor: Color(0xFFEAF4F2),
      textAccentColor: Color(0xFF0E7490),
      motifDescription: 'Ascending career pillars and upward trajectory arrow',
      icon: Icons.work_outline_rounded,
      includedSections: [
        '10th House Karma Bhava & Planetary Significators',
        'Professional Aptitude & Vocational DNA Mapping',
        'Saturn Career Lessons & Jupiter Expansion Horizons',
        'Multi-Year Dasha Professional Career Roadmap',
        'Practical Astrological & Behavioral Remedies',
      ],
    ),
    ReportBrandInfo(
      reportType: 'MARRIAGE_COMPATIBILITY',
      canonicalKey: 'report-marriage',
      title: 'Couple Kundli Matching Report',
      tagline: 'Match two birth charts for marriage and harmony',
      taglineHi: 'विवाह के लिए दो कुंडली का मिलान',
      description:
          'Full 36-point Ashtakoota Guna Milan, dual-chart Manglik analysis, 7th house partner dynamics, and relationship synastry.',
      coverAsset: 'assets/reports/covers/report-marriage.webp',
      illustrationAsset: 'assets/reports/illustrations/report-marriage.png',
      primaryColor: Color(0xFF4A1525),
      accentColor: Color(0xFFE2B49A),
      tintColor: Color(0xFFF8ECEB),
      textAccentColor: Color(0xFFBE185D),
      motifDescription: 'Dual-chart sacred union heart mandala',
      icon: Icons.favorite_rounded,
      includedSections: [
        'Full 36-Point Ashtakoota Guna Milan (Varna, Vashya, Tara, Yoni, Maitri, Gana, Bhakoot, Nadi)',
        'Comparative Dual-Chart Manglik Placement & Compatibility Analysis',
        '7th House & Venus/Jupiter Synastry Analysis',
        'Astrological Compatibility Score & Relationship Synthesis',
      ],
    ),
    ReportBrandInfo(
      reportType: 'FINANCE',
      canonicalKey: 'report-finance',
      title: 'Finance Report',
      tagline: 'Money, savings and wealth timing',
      taglineHi: 'धन, बचत और समृद्धि का समय',
      description:
          'Wealth blueprint analyzing 2nd and 11th houses, Indu Lagna, Dhana Yogas, Sarvashtakavarga cashflow potency, and a 3-year milestone matrix.',
      coverAsset: 'assets/reports/covers/report-finance.webp',
      illustrationAsset: 'assets/reports/illustrations/report-finance.png',
      primaryColor: Color(0xFF0F3D2E),
      accentColor: Color(0xFFD4AF37),
      tintColor: Color(0xFFEAF3E9),
      textAccentColor: Color(0xFF047857),
      motifDescription: 'Prosperity coin emblem and ascending wealth pillars',
      icon: Icons.account_balance_wallet_outlined,
      includedSections: [
        '2nd (Accumulated Wealth) and 11th (Gains) House Deep Dive',
        'Indu Lagna, Dhana Yogas, and Planetary Wealth Combinations',
        'Sarvashtakavarga (SAV) House Inflow Potency Breakdown',
        '3-Year Chronological Financial Milestone & Cashflow Matrix',
        'Practical Vedic & Tantric Wealth Preservation Remedies',
      ],
    ),
    ReportBrandInfo(
      reportType: 'LOVE',
      canonicalKey: 'report-love',
      title: 'Love Report',
      tagline: 'Love, relationships and marriage timing',
      taglineHi: 'प्रेम, रिश्ते और विवाह का समय',
      description:
          'Romantic and relationship blueprint analyzing 5th and 7th houses, Venus dynamics, Navamsha D9, Darakaraka spouse archetype, and marriage timing.',
      coverAsset: 'assets/reports/covers/report-love.webp',
      illustrationAsset: 'assets/reports/illustrations/report-love.png',
      primaryColor: Color(0xFF4E1635),
      accentColor: Color(0xFFF2C6B4),
      tintColor: Color(0xFFF8EBF0),
      textAccentColor: Color(0xFFBE123C),
      motifDescription: 'Twin harmonic waves cradling the Venusian heart emblem',
      icon: Icons.favorite_outline_rounded,
      includedSections: [
        '5th & 7th House Romance, Passion and Karmic Relationship Patterns',
        'Venus Placements, Navamsha D9 Matrimonial Blueprint',
        'Jaimini Darakaraka Comprehensive Future Spouse Archetype',
        '10 Favorable Chronological Marriage & Fruition Timing Windows',
        'Relationship Harmonization & Remedial Measures',
      ],
    ),
    ReportBrandInfo(
      reportType: 'FORTUNE',
      canonicalKey: 'report-fortune',
      title: 'Personalised Fortune Report',
      tagline: 'Numerology, lucky numbers and Vedic remedies',
      taglineHi: 'अंक ज्योतिष, शुभ अंक और उपाय',
      description:
          '17-part Vedic numerology and astrological blueprint covering Mulank, Bhagyank, Lo-Shu Magic Square, Kua alignment, Chaldean name vibration, and remedies.',
      coverAsset: 'assets/reports/covers/report-fortune.webp',
      illustrationAsset: 'assets/reports/illustrations/report-fortune.png',
      primaryColor: Color(0xFF162C5B),
      accentColor: Color(0xFFE8C97A),
      tintColor: Color(0xFFEEF1FA),
      textAccentColor: Color(0xFFC2410C),
      motifDescription: 'Sacred lotus wheel of fortune and numerology symmetry',
      icon: Icons.diamond_outlined,
      includedSections: [
        'Mulank (Psychic) and Bhagyank (Destiny) Exhaustive Profile',
        '3x3 Lo-Shu Magic Square Grid & Cardinal Kua Feng-Shui Alignment',
        'Chaldean Legal Name Number, Soul Urge & Personality Vibration',
        '12-Month Personal Forecasting Rhythm & Life Challenge Cycles',
        'Vedic Quadrant Charts (D1, Moon, D9, Lal Kitab) & Consecrated Remedies',
      ],
    ),
    ReportBrandInfo(
      reportType: 'FORTUNE_PLUS',
      canonicalKey: 'report-fortune-plus',
      title: 'Personalised Fortune Report Plus',
      tagline: 'Full 25-chapter numerology and astrology dossier',
      taglineHi: '25-अध्याय अंक ज्योतिष और ज्योतिष पुस्तिका',
      description:
          '25-chapter Vedic numerology and astrological dossier covering Success/Connection/Maturity numbers, 4 Life Pinnacles, 4 Vedic charts, yogas, and remedies.',
      coverAsset: 'assets/reports/covers/report-fortune-plus.webp',
      illustrationAsset: 'assets/reports/illustrations/report-fortune-plus.png',
      primaryColor: Color(0xFF261340),
      accentColor: Color(0xFFF0C75E),
      tintColor: Color(0xFFF1EAF7),
      textAccentColor: Color(0xFFB45309),
      motifDescription: 'Five-pointed sovereign star crest of 25 Vedic chapters',
      icon: Icons.diamond_rounded,
      includedSections: [
        'Complete 25-Chapter Vedic Numerology and Astrological Blueprint',
        'Your Mulank, Bhagyank, Chaldean Name, Kua, Success, Connection & Maturity Numbers',
        'Four Life Pinnacles / Challenge Cycles (0-29, 29-38, 38-47, 47+)',
        'Four Vedic Charts Quadrant (D1, Chandra, Navamsha D9, Lal Kitab Aries-fixed)',
        'Three-Remedy Caution Rule & Consecrated Astrological Remedies',
      ],
    ),
    ReportBrandInfo(
      reportType: 'HOROSCOPE',
      canonicalKey: 'report-horoscope',
      title: 'Personalised Horoscope Report',
      tagline: 'Your year ahead, quarter by quarter',
      taglineHi: 'आने वाला साल, हर तिमाही',
      description:
          'Annual Chandra Lagna Moon-sign forecast with quarterly trajectories, 12-month timeline matrix, major planetary transits, and Vedic remedial guidance.',
      coverAsset: 'assets/reports/covers/report-horoscope.webp',
      illustrationAsset: 'assets/reports/illustrations/report-horoscope.png',
      primaryColor: Color(0xFF122B3B),
      accentColor: Color(0xFFE6D39A),
      tintColor: Color(0xFFEAF1F3),
      textAccentColor: Color(0xFF6D28D9),
      motifDescription: 'Eight-rayed planetary compass and annual transit wheel',
      icon: Icons.stars_rounded,
      includedSections: [
        'Annual Chandra Lagna Planetary Transits & Quarter-by-Quarter Trajectories',
        '12-Month Detailed Timeline Matrix & Favorable Career/Financial Windows',
        'Saturn, Jupiter, Rahu-Ketu Gochara Effects and Mitigation',
        'Comprehensive Vedic Remedies, Gemstone & Mantra Guidance',
      ],
    ),
    ReportBrandInfo(
      reportType: 'SATURN',
      canonicalKey: 'report-saturn',
      title: 'Saturn In Your Birth Chart Report',
      tagline: 'Saturn in your chart and Sade Sati dates',
      taglineHi: 'आपकी कुंडली में शनि और साढ़े साती',
      description:
          'Vedic guide to Lord Shani analyzing natal Saturn placement, 3rd/7th/10th aspects, Bhinnashtakavarga, lifetime Sade Sati & Dhaiya chronology, and remedies.',
      coverAsset: 'assets/reports/covers/report-saturn.webp',
      illustrationAsset: 'assets/reports/illustrations/report-saturn.png',
      primaryColor: Color(0xFF161E35),
      accentColor: Color(0xFFC8B273),
      tintColor: Color(0xFFEDF0F4),
      textAccentColor: Color(0xFF4338CA),
      motifDescription: 'Ringed Lord Shani orbit and karmic discipline halo',
      icon: Icons.hourglass_empty_rounded,
      includedSections: [
        'Natal Saturn House Placement, Zodiac Dignity & Aspect Geography',
        'Lord Shani Karmic Taskmaster Lessons & Life Restructuring Zones',
        'Complete Shani Sade Sati Rising, Peak, and Setting Chronology',
        'Dhaiya (Small Panoti) 4th and 8th House Transit Timings',
        'Classical Saturday Astrological, Fasting, and Charitable Remedies',
      ],
    ),
    ReportBrandInfo(
      reportType: 'JUPITER_TRANSIT',
      canonicalKey: 'report-jupiter-transit',
      title: 'Jupiter Transit Report',
      tagline: "How Jupiter's movement affects you",
      taglineHi: 'गुरु (बृहस्पति) की चाल का आप पर असर',
      description:
          'Comprehensive Vedic guide to Lord Brihaspati analyzing natal Jupiter, 5th/7th/9th golden drishti rays, 56-point Bhinnashtakavarga, and transit windows.',
      coverAsset: 'assets/reports/covers/report-jupiter-transit.webp',
      illustrationAsset: 'assets/reports/illustrations/report-jupiter-transit.png',
      primaryColor: Color(0xFF4A2B0F),
      accentColor: Color(0xFFF3C969),
      tintColor: Color(0xFFF8F0E2),
      textAccentColor: Color(0xFF0369A1),
      motifDescription: 'Banded Brihaspati sphere and golden drishti arcs',
      icon: Icons.public_rounded,
      includedSections: [
        'Jupiter’s Divine Placement (Birth Chart & Coordinates)',
        'Vedic Charts Overview (Lagna, Chandra & Jupiter Gochara)',
        'Natal Jupiter Placement Deep Dive (House, Sign & Dignity)',
        'Aspects of Jupiter (5th, 7th & 9th Golden Drishti Rays)',
        'Birth Nakshatra Deep Dive',
        'Jupiter’s Bhinnashtakavarga (56-Point Zodiacal Scorecard)',
        'Consecrated Remedies (Yellow Sapphire, 5 Mukhi Rudraksha, Vastu & Mantras)',
      ],
    ),
    ReportBrandInfo(
      reportType: 'RAHU_KETU_TRANSIT',
      canonicalKey: 'report-rahu-ketu-transit',
      title: 'Rahu Ketu Transit Report',
      tagline: "How Rahu and Ketu's movement affects you",
      taglineHi: 'राहु और केतु की चाल का आप पर असर',
      description:
          'Comprehensive Vedic guide to the lunar nodes analyzing your natal Rahu-Ketu 180-degree axis, nodal nakshatras, 18.6-year return cycles, and remedies.',
      coverAsset: 'assets/reports/covers/report-rahu-ketu-transit.webp',
      illustrationAsset: 'assets/reports/illustrations/report-rahu-ketu-transit.png',
      primaryColor: Color(0xFF23192D),
      accentColor: Color(0xFFDFB878),
      tintColor: Color(0xFFF1EBF3),
      textAccentColor: Color(0xFF0F766E),
      motifDescription: '180-degree serpentine Rahu-Ketu nodal lemniscate',
      icon: Icons.all_inclusive_rounded,
      includedSections: [
        'The Nodes’ Placement (Astronomical Coordinates & 180° Axis)',
        'Vedic Charts Overview (Lagna, Chandra & Nodal Gochara)',
        'Natal Rahu & Ketu Deep Dive',
        'Aspects of Rahu & Ketu (Triple 5th, 7th & 9th Drishti)',
        'The Karmic Journey: Past Life Karma & Soul Evolution',
        'The 18.6-Year Nodal Return Cycles & Consecrated Remedies',
      ],
    ),
    ReportBrandInfo(
      reportType: 'VARSHPHAL',
      canonicalKey: 'report-varshphal',
      title: 'Varshphal Report',
      tagline: 'Your year from one birthday to the next',
      taglineHi: 'एक जन्मदिन से अगले जन्मदिन तक का साल',
      description:
          'Classical Tajika annual solar return horoscope analyzing Muntha progression, Varshesh (Year Lord), Tajika Yogas, Mudda Dasha, and 12-month roadmap.',
      coverAsset: 'assets/reports/covers/report-varshphal.webp',
      illustrationAsset: 'assets/reports/illustrations/report-varshphal.png',
      primaryColor: Color(0xFF143B3B),
      accentColor: Color(0xFFEBD59E),
      tintColor: Color(0xFFEEF4EF),
      textAccentColor: Color(0xFFA21CAF),
      motifDescription: '12-month solar return Tajika calendar matrix',
      icon: Icons.calendar_month_rounded,
      includedSections: [
        'Astronomical Solar Return Precision (Exact Sidereal Longitude)',
        'Dual Cosmic Blueprints (Natal Lagna & Varshphal Kundli)',
        'Muntha Progression Analysis & Varshesh (Year Lord) Selection',
        'Tajika Yogas, Harsha Bala & Mudda Dasha Timing Periods',
        'Month-by-Month Predictive Roadmap (Months 1 to 12)',
      ],
    ),
    ReportBrandInfo(
      reportType: 'BABY_NAME',
      canonicalKey: 'report-baby-name',
      title: 'Baby Name Report',
      tagline: 'Auspicious baby naming from Janma Nakshatra & numerology',
      taglineHi: 'जन्म नक्षत्र और अंक ज्योतिष से शुभ नामकरण',
      description:
          'Naming guidance from your child’s birth nakshatra pada (namakshara syllables) and Mulank/Bhagyank numerology harmony, plus family shortlist checks.',
      coverAsset: 'assets/reports/covers/report-baby-name.webp',
      illustrationAsset: 'assets/reports/illustrations/report-baby-name.png',
      primaryColor: Color(0xFF1D3557),
      accentColor: Color(0xFFF4D58D),
      tintColor: Color(0xFFF1F3F7),
      textAccentColor: Color(0xFF3730A3),
      motifDescription: 'Crescent cradle and Janma Nakshatra blessing stars',
      icon: Icons.child_care_rounded,
      includedSections: [
        'Janma Nakshatra & Pada Namakshara Starting Syllables',
        'Child’s Birth Rashi, Lagna & Planetary Harmony',
        'Mulank & Bhagyank Numerology Name Compatibility',
        'Evaluation of Names the Family Is Considering',
      ],
    ),
  ];

  /// Legacy report types and retired SKU IDs mapped to their canonical key.
  static const Map<String, String> legacyAliases = {
    'CAREER_PROSITY': 'report-career',
    'HOROSCOPE_REPORT': 'report-horoscope',
    'KUNDLI_BASIC': 'report-kundli',
    'PLANETARY_SUMMARY': 'report-horoscope',
    'report-career-pro': 'report-career',
    'report-kundli-basic': 'report-kundli',
    'report-planetary-summary': 'report-horoscope',
    'report-personalised-horoscope': 'report-horoscope',
  };

  static final Map<String, ReportBrandInfo> _byKeyOrType = _buildLookup();

  static Map<String, ReportBrandInfo> _buildLookup() {
    final map = <String, ReportBrandInfo>{};
    for (final info in canonicalReports) {
      map[info.reportType.toUpperCase()] = info;
      map[info.canonicalKey.toLowerCase()] = info;
    }
    for (final entry in legacyAliases.entries) {
      final target = map[entry.value.toLowerCase()];
      if (target != null) {
        map[entry.key.toUpperCase()] = target;
        map[entry.key.toLowerCase()] = target;
      }
    }
    return Map.unmodifiable(map);
  }

  /// Resolves any canonical reportType (`KUNDLI`), canonical key (`report-kundli`),
  /// or legacy alias (`CAREER_PROSITY`, `HOROSCOPE_REPORT`, `KUNDLI_BASIC`,
  /// `PLANETARY_SUMMARY`) to its [ReportBrandInfo]. Returns null if unknown.
  static ReportBrandInfo? resolve(String? keyOrType) {
    if (keyOrType == null) return null;
    final trimmed = keyOrType.trim();
    if (trimmed.isEmpty) return null;
    return _byKeyOrType[trimmed.toUpperCase()] ?? _byKeyOrType[trimmed.toLowerCase()];
  }

  /// Resolves to [ReportBrandInfo], falling back to the primary Kundli identity
  /// when an unrecognised report type is passed.
  static ReportBrandInfo resolveOrDefault(String? keyOrType) {
    return resolve(keyOrType) ?? canonicalReports.first;
  }

  /// Returns the canonical kebab-case key (e.g. `report-career`) for any
  /// canonical report type or legacy alias.
  static String? canonicalKeyFor(String? keyOrType) {
    return resolve(keyOrType)?.canonicalKey;
  }
}
