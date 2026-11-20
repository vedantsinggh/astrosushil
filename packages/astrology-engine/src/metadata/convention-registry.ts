export interface SystemConventionMetadata {
  subsystem: string;
  tradition: string;
  zodiac: 'SIDEREAL' | 'TROPICAL';
  ayanamsa: string;
  houseSystem: string;
  nodeModel: string;
  precisionDegrees: number;
  description: string;
  authoritativeSources: string[];
  specialRules?: string[];
}

export class ConventionRegistry {
  private static readonly registry: Record<string, SystemConventionMetadata> = {
    PARASHARA: {
      subsystem: 'Vedic Parashara Foundations',
      tradition: 'Brihat Parashara Hora Shastra (BPHS)',
      zodiac: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
      nodeModel: 'MEAN_NODE',
      precisionDegrees: 0.0001,
      description: 'Classical Vedic astrology chart, 16 Vargas, Shadbala, and 12-house Whole Sign framework.',
      authoritativeSources: ['Brihat Parashara Hora Shastra', 'Saravali', 'Jataka Parijata', 'Phaladeepika'],
    },
    JAIMINI: {
      subsystem: 'Jaimini Sutras Engine',
      tradition: 'Jaimini Upadesha Sutras',
      zodiac: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
      nodeModel: 'MEAN_NODE',
      precisionDegrees: 0.0001,
      description: 'Chara Karakas, Arudha Padas, Rashi Drishti, Argala, and Karakamsha analysis.',
      authoritativeSources: ['Jaimini Upadesha Sutras (Maharishi Jaimini)', 'Brihat Parashara Hora Shastra Ch. 29-32'],
    },
    KP: {
      subsystem: 'Krishnamurti Padhdhati (KP)',
      tradition: 'KP Stellar System (K.S. Krishnamurti)',
      zodiac: 'SIDEREAL',
      // The KP report uses the chart's ayanamsa (engine default true Lahiri); 'KP' selects KP New (ADR-017).
      ayanamsa: 'LAHIRI',
      houseSystem: 'PLACIDUS',
      nodeModel: 'MEAN_NODE',
      precisionDegrees: 0.0001,
      description: '249 Sub-divisional Stellar Astrology, 4-tier lordships, cusps, and significators.',
      authoritativeSources: ['KP Readers Vol 1-6 (Prof. K.S. Krishnamurti)'],
      specialRules: [
        'Ayanamsa follows the calculation option (default true Chitrapaksha Lahiri); KP New and Krishnamurti (KSK) are selectable (ADR-017).',
        'Cusps are true Placidus; above about 66.56° latitude Placidus is not defined and the calculation fails (no fallback).',
      ],
    },
    VARSHAPHALA: {
      subsystem: 'Tajika Annual Solar Return',
      tradition: 'Tajika Neelakanthi',
      zodiac: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
      nodeModel: 'MEAN_NODE',
      precisionDegrees: 0.0001,
      description: 'Solar return timing, Varsha Lagna, Muntha, Panchadhikari, Harsha Bala, and Sahams.',
      authoritativeSources: ['Tajika Neelakanthi', 'Varshaphala (Dr. B.V. Raman)'],
    },
    PRASHNA: {
      subsystem: 'Horary Astrology',
      tradition: 'Prashna Marga & Krishneeyam',
      zodiac: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
      nodeModel: 'MEAN_NODE',
      precisionDegrees: 0.0001,
      description: 'Instantaneous query chart, Trisphuta, Chatusphuta, Panchasphuta, and Gulika.',
      authoritativeSources: ['Prashna Marga (Dr. B.V. Raman translation)', 'Krishneeyam'],
    },
    MATCHMAKING: {
      subsystem: 'Ashtakoota Matchmaking (Guna Milan)',
      tradition: 'Classical 36-Guna Ashtakoota & Manglik Dosha Analysis',
      zodiac: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
      nodeModel: 'MEAN_NODE',
      precisionDegrees: 0.0001,
      description: '8-fold Koota evaluation (Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi) with Manglik Dosha.',
      authoritativeSources: ['Muhurta Chintamani', 'Prashna Marga', 'Jataka Parijata'],
    },
    // Keys for the two entries below follow the public API contract (camelCase); lookups through
    // getConvention() are case- and separator-insensitive.
    ashtakavarga: {
      subsystem: 'Ashtakavarga Engine',
      tradition: 'Brihat Parashara Hora Shastra',
      zodiac: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
      nodeModel: 'MEAN_NODE',
      precisionDegrees: 0.0001,
      description: 'Bhinnashtakavarga for the 7 grahas (8 contributors incl. Lagna), Sarvashtakavarga, Trikona and Ekadhipatya Shodhana, and Shodhya Pinda.',
      authoritativeSources: ['Brihat Parashara Hora Shastra Ch. 66-73'],
      specialRules: [
        'Benefic-point (bindu) tables per BPHS Ch. 66-72; contributors are the 7 grahas and the Lagna, counted by sign from each contributor.',
        'Rahu and Ketu receive and contribute no bindus.',
        'BAV totals are invariant: Sun 48, Moon 49, Mars 39, Mercury 54, Jupiter 56, Venus 52, Saturn 39 (SAV = 337).',
        'Trikona Shodhana then Ekadhipatya Shodhana per BPHS Ch. 73; Shodhya Pinda from Rashi and Graha Gunakaras (BPHS Ch. 73).',
        'Transit thresholds used by the Gochara engine: BAV >= 4 and SAV >= 28 marked favourable.',
      ],
    },
    gocharaTransit: {
      subsystem: 'Gochara Planetary Transit Engine',
      tradition: 'Phaladeepika (Gochara Phala) with Parashari Drishti',
      zodiac: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
      nodeModel: 'MEAN_NODE',
      precisionDegrees: 0.0001,
      description: 'Transit positions counted from the natal Moon and Lagna, Vedha obstruction, Jupiter/Saturn favourable-house summary, Parashari aspects to natal points, Ashtakavarga bindus and Kakshas.',
      authoritativeSources: ['Phaladeepika Ch. 26 (Mantreswara)', 'Brihat Parashara Hora Shastra'],
      specialRules: [
        'Gochara houses are counted by whole sign from the natal Moon sign.',
        'Favourable houses / Vedha houses (Phaladeepika Ch. 26): Sun 3/9 6/12 10/4 11/5; Moon 1/5 3/9 6/12 7/2 10/4 11/8; Mars and Saturn 3/12 6/9 11/5; Mercury 2/5 4/3 6/9 8/1 10/8 11/12; Jupiter 2/12 5/4 7/3 9/10 11/8; Venus 1/8 2/7 3/1 4/10 5/9 8/5 9/11 11/6 12/3.',
        'Rahu and Ketu use the Saturn table; only the 7 classical grahas cause Vedha.',
        'No Vedha between the Sun and Saturn, nor between the Moon and Mercury.',
        'Vipareeta Vedha: a planet in an unfavourable house is relieved when another planet occupies the paired favourable house.',
        'Guru Peyarchi favourable = Jupiter in house 2, 5, 7, 9 or 11 from the natal Moon (also reported net of Vedha).',
        'Kaksha: 8 divisions of 3 deg 45 min per sign ruled in order by Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon, Lagna.',
      ],
    },
  };

  private static normalizeKey(key: string): string {
    return key.replace(/[^a-z0-9]/gi, '').toUpperCase();
  }

  public static getConvention(systemKey: string): SystemConventionMetadata {
    const wanted = this.normalizeKey(systemKey);
    const match = Object.keys(this.registry).find((k) => this.normalizeKey(k) === wanted);
    return match ? this.registry[match] : this.registry.PARASHARA;
  }

  public static getAllConventions(): Record<string, SystemConventionMetadata> {
    return { ...this.registry };
  }
}
