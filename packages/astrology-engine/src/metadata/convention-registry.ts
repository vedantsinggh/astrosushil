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
      ayanamsa: 'KP_NEW',
      houseSystem: 'PLACIDUS',
      nodeModel: 'MEAN_NODE',
      precisionDegrees: 0.0001,
      description: '249 Sub-divisional Stellar Astrology, 4-tier lordships, cusps, and significators.',
      authoritativeSources: ['KP Readers Vol 1-6 (Prof. K.S. Krishnamurti)'],
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
  };

  public static getConvention(systemKey: string): SystemConventionMetadata {
    return (
      this.registry[systemKey.toUpperCase()] ||
      this.registry.PARASHARA
    );
  }

  public static getAllConventions(): Record<string, SystemConventionMetadata> {
    return { ...this.registry };
  }
}
