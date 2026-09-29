library divisional_chart_info;

/// Metadata and catalog for Vedic Divisional Charts (Shodashvarga system)
/// Deterministic calculations are performed exclusively by the backend Fastify API.

class DivisionalChartInfo {
  final String code; // 'D1', 'D9', etc.
  final String sanskritName;
  final String englishName;
  final int division;
  final String description;
  final String lifeDomain;
  final bool isPriority;

  const DivisionalChartInfo({
    required this.code,
    required this.sanskritName,
    required this.englishName,
    required this.division,
    required this.description,
    required this.lifeDomain,
    this.isPriority = false,
  });

  static const List<DivisionalChartInfo> allVargas = [
    DivisionalChartInfo(
      code: 'D1',
      sanskritName: 'Rashi (राशि)',
      englishName: 'Natal Lagna Chart',
      division: 1,
      lifeDomain: 'General Life, Physical Self & Foundation',
      description: 'The root natal horoscope representing the physical constitution, primary personality, life vitality, and overall destiny baseline.',
      isPriority: true,
    ),
    DivisionalChartInfo(
      code: 'D2',
      sanskritName: 'Hora (होरा)',
      englishName: 'Wealth & Liquid Assets',
      division: 2,
      lifeDomain: 'Financial Capacity, Liquid Assets & Resource Accumulation',
      description: 'Divided into solar (Surya) and lunar (Chandra) halves to evaluate liquid financial prosperity, self-acquired assets, and sustainability.',
    ),
    DivisionalChartInfo(
      code: 'D3',
      sanskritName: 'Drekkana (द्रेष्काण)',
      englishName: 'Siblings & Courage',
      division: 3,
      lifeDomain: 'Co-borns, Courage, Energy & Third House Matters',
      description: 'Analyzes relationship with siblings, physical stamina, initiative, valor, and communicative capability.',
    ),
    DivisionalChartInfo(
      code: 'D4',
      sanskritName: 'Chaturthamsha (चतुर्थांश)',
      englishName: 'Fixed Assets & Property',
      division: 4,
      lifeDomain: 'Land, Real Estate, Vehicles & Fixed Destiny',
      description: 'Evaluates fixed immovable assets, ancestral real estate, residences, conveyances, and general contentment (Bhagya).',
    ),
    DivisionalChartInfo(
      code: 'D7',
      sanskritName: 'Saptamsha (सप्तांश)',
      englishName: 'Children & Progeny',
      division: 7,
      lifeDomain: 'Progeny, Lineage, Creativity & Grandchildren',
      description: 'Provides in-depth insights into children, reproductive fertility, creative generation, and continuity of lineage.',
    ),
    DivisionalChartInfo(
      code: 'D9',
      sanskritName: 'Navamsha (नवांश)',
      englishName: 'Dharma & Spouse',
      division: 9,
      lifeDomain: 'Marriage, Spouse, Inner Dharma & Second Half of Life',
      description: 'The most pivotal divisional chart in Vedic astrology. Reveals true karmic potential, life partner qualities, marital harmony, and inherent inner soul strength.',
      isPriority: true,
    ),
    DivisionalChartInfo(
      code: 'D10',
      sanskritName: 'Dashamsha (दशांश)',
      englishName: 'Career & Status',
      division: 10,
      lifeDomain: 'Profession, Public Achievements, Status & Karmic Work',
      description: 'Assesses career elevation, leadership positions, professional accomplishments, fame, public sphere authority, and livelihood.',
      isPriority: true,
    ),
    DivisionalChartInfo(
      code: 'D12',
      sanskritName: 'Dwadashamsha (द्वादशांश)',
      englishName: 'Parents & Ancestry',
      division: 12,
      lifeDomain: 'Mother, Father, Ancestral Lineage & Heredity',
      description: 'Examines parental health, ancestral karmic inheritance, relationships with father and mother, and genetic inclinations.',
    ),
    DivisionalChartInfo(
      code: 'D16',
      sanskritName: 'Shodashamsha (षोडशांश)',
      englishName: 'Vehicles & Comforts',
      division: 16,
      lifeDomain: 'Conveyances, Material Luxuries, Joys & Sorrows',
      description: 'Also called Kalamsa. Focuses on conveyances (vehicles), physical comforts, accidents, and inner psychological happiness.',
    ),
    DivisionalChartInfo(
      code: 'D20',
      sanskritName: 'Vimshamsha (विंशांश)',
      englishName: 'Spiritual Progress',
      division: 20,
      lifeDomain: 'Devotion, Upasana, Meditation & Spiritual Sadhana',
      description: 'Reveals spiritual inclinations, devotion to deities, meditation achievements, inner evolution, and religious merits.',
    ),
    DivisionalChartInfo(
      code: 'D24',
      sanskritName: 'Chaturvimshamsha (चतुर्विंशांश)',
      englishName: 'Higher Learning & Vidya',
      division: 24,
      lifeDomain: 'Academic Studies, Intellect, Skills & Wisdom (Siddhamsa)',
      description: 'Focuses on intellectual capacities, scholastic achievements, specialized higher education, analytical mind, and mastery of arts.',
    ),
    DivisionalChartInfo(
      code: 'D27',
      sanskritName: 'Saptavimshamsha (सप्तविंशांश)',
      englishName: 'Strengths & Vitality',
      division: 27,
      lifeDomain: 'Inherent Vitality, Physical Endurance & Nakshatra Strengths',
      description: 'Also called Bhamsa or Nakshatramsha. Maps intrinsic soul vitality, stamina against challenges, and subconscious faculties.',
    ),
    DivisionalChartInfo(
      code: 'D30',
      sanskritName: 'Trimshamsha (त्रिंशांश)',
      englishName: 'Misfortunes & Arishta',
      division: 30,
      lifeDomain: 'Evils, Enmities, Acute Diseases & Karmic Obstacles',
      description: 'Used to diagnose health vulnerabilities, moral weaknesses, hidden enmities, unexpected adversities, and arishta.',
    ),
    DivisionalChartInfo(
      code: 'D40',
      sanskritName: 'Khavedamsha (खवेदांश)',
      englishName: 'Auspicious Karma',
      division: 40,
      lifeDomain: 'Auspicious and Inauspicious Karmic Manifestations',
      description: 'Evaluates subtle auspicious and inauspicious karmic effects, general blessings, and sub-surface destiny undercurrents.',
    ),
    DivisionalChartInfo(
      code: 'D45',
      sanskritName: 'Akshavedamsha (अक्षवेदांश)',
      englishName: 'Character & Purity',
      division: 45,
      lifeDomain: 'Moral Integrity, Character Purity & Comprehensive Well-being',
      description: 'Presents ultra-fine evaluation of inherent character purity, ethical standing, and comprehensive well-being.',
    ),
    DivisionalChartInfo(
      code: 'D60',
      sanskritName: 'Shashtiamsha (षष्ट्यंश)',
      englishName: 'Root Karmic Ledger',
      division: 60,
      lifeDomain: 'Past Life Karma, Root Destiny & Supreme Verification',
      description: 'The ultimate harmonic chart in Parashari Vedic astrology. Parashara states Shashtiamsha holds the supreme weight in determining the final karmic fruits and past-life causality.',
      isPriority: true,
    ),
  ];

  static DivisionalChartInfo findByCode(String code) {
    final clean = code.trim().toUpperCase();
    return allVargas.firstWhere(
      (v) => v.code.toUpperCase() == clean,
      orElse: () => allVargas.first,
    );
  }

  static List<DivisionalChartInfo> get priorityVargas =>
      allVargas.where((v) => v.isPriority).toList();
}
