export interface RashiDailyPredictionContent {
  rashiIndex: number; // 1 to 12
  sanskritName: string;
  englishName: string;
  element: string;
  ruler: string;
  summary: string;
  categories: {
    general: string;
    health: string;
    love: string;
    career: string;
    finance: string;
  };
  luckyNumber: number;
  luckyColor: string;
}

/**
 * Development Prediction Content Fixtures for Rashi Bhavishya.
 * Clearly marked as development fixtures per project guidelines.
 */
export const DAILY_PREDICTION_FIXTURES: Record<number, RashiDailyPredictionContent> = {
  1: {
    rashiIndex: 1,
    sanskritName: 'Mesha',
    englishName: 'Aries',
    element: 'Fire',
    ruler: 'Mars',
    summary: 'A dynamic energy surround your day. Focus on key initiatives and maintain momentum in personal projects.',
    categories: {
      general: 'Mars gives you enthusiasm today. Channel your drive into creative or practical efforts rather than hasty decisions.',
      health: 'Physical energy is high. Engage in moderate exercise and ensure proper hydration throughout the day.',
      love: 'Clear communication brings harmony to relationships. Express your thoughts openly with loved ones.',
      career: 'Your leadership qualities shine at work. Collaborative discussions will lead to favorable outcomes.',
      finance: 'Financial stability is highlighted. Avoid speculative investments and stick to established budgets.',
    },
    luckyNumber: 9,
    luckyColor: 'Red',
  },
  2: {
    rashiIndex: 2,
    sanskritName: 'Vrishabha',
    englishName: 'Taurus',
    element: 'Earth',
    ruler: 'Venus',
    summary: 'Steady progress defines today. Patience and attention to detail bring rewarding results.',
    categories: {
      general: 'Venus fosters a peaceful environment. Take time to enjoy nature and refined surroundings.',
      health: 'Focus on rest and mindful nutrition. A quiet evening helps recharge your vital energy.',
      love: 'Warmth and trust deepen emotional bonds. Spend quality time with family or close partners.',
      career: 'Methodical execution of tasks gains recognition from colleagues and superiors.',
      finance: 'Favorable planetary alignment supports long-term financial planning and savings.',
    },
    luckyNumber: 6,
    luckyColor: 'White',
  },
  3: {
    rashiIndex: 3,
    sanskritName: 'Mithuna',
    englishName: 'Gemini',
    element: 'Air',
    ruler: 'Mercury',
    summary: 'Intellectual curiosity is heightened. Great day for learning, networking, and creative expression.',
    categories: {
      general: 'Mercury enhances mental clarity. Useful insights come from unexpected conversations today.',
      health: 'Keep your mind relaxed with breathing exercises or short walks during work breaks.',
      love: 'Lighthearted conversations bring joy. Express your sense of humor and appreciation.',
      career: 'Excellent day for negotiations, writing, and presentation of new ideas.',
      finance: 'Review ongoing expenses. Minor adjustments now improve monthly cash flow.',
    },
    luckyNumber: 5,
    luckyColor: 'Green',
  },
  4: {
    rashiIndex: 4,
    sanskritName: 'Karka',
    englishName: 'Cancer',
    element: 'Water',
    ruler: 'Moon',
    summary: 'Intuitive awareness is strong. Focus on emotional well-being and domestic comfort.',
    categories: {
      general: 'The Moon heightens sensitivity. Trust your instincts when navigating personal matters.',
      health: 'Prioritize emotional balance and restful sleep. Avoid unnecessary stress.',
      love: 'Nurturing relationships brings deep contentment. Show care through thoughtful gestures.',
      career: 'Team synergy improves when you offer support to colleagues. Work steadily on priorities.',
      finance: 'Keep spending focused on essential home and family requirements.',
    },
    luckyNumber: 2,
    luckyColor: 'Silver',
  },
  5: {
    rashiIndex: 5,
    sanskritName: 'Simha',
    englishName: 'Leo',
    element: 'Fire',
    ruler: 'Sun',
    summary: 'Confidence and vitality mark your day. Radiate optimism and take decisive action.',
    categories: {
      general: 'The Sun inspires enthusiasm. Your positive attitude motivates those around you.',
      health: 'Maintain a balanced routine. Outdoor sunlight and active movement bolster vitality.',
      love: 'Generosity and warmth strengthen romantic relationships.',
      career: 'Your vision receives encouragement. Present your creative ideas boldly.',
      finance: 'Good period for organizing investments and evaluating future financial goals.',
    },
    luckyNumber: 1,
    luckyColor: 'Gold',
  },
  6: {
    rashiIndex: 6,
    sanskritName: 'Kanya',
    englishName: 'Virgo',
    element: 'Earth',
    ruler: 'Mercury',
    summary: 'Precision and organization lead to success today. Structure your priorities clearly.',
    categories: {
      general: 'Analytical focus allows you to solve complex issues effortlessly.',
      health: 'Maintain balanced dietary habits and stay well-hydrated throughout your work routine.',
      love: 'Practical helpfulness shows your care. Small acts of service build strong bonds.',
      career: 'Detailed planning ensures flawless project delivery. Superior work is noticed.',
      finance: 'Prudent money management yields stability. Review budgets carefully.',
    },
    luckyNumber: 7,
    luckyColor: 'Emerald Green',
  },
  7: {
    rashiIndex: 7,
    sanskritName: 'Tula',
    englishName: 'Libra',
    element: 'Air',
    ruler: 'Venus',
    summary: 'Balance and diplomatic finesse define your interactions. Cooperation opens new doors.',
    categories: {
      general: 'Harmonious planetary aspects encourage peace and artistic appreciation.',
      health: 'Engage in gentle stretching or yoga to maintain flexibility and tranquility.',
      love: 'Mutual understanding blossoms. Great day for shared cultural activities.',
      career: 'Mediation and teamwork yield positive outcomes in ongoing group efforts.',
      finance: 'Balanced financial decisions support long-term security.',
    },
    luckyNumber: 8,
    luckyColor: 'Pastel Blue',
  },
  8: {
    rashiIndex: 8,
    sanskritName: 'Vrischika',
    englishName: 'Scorpio',
    element: 'Water',
    ruler: 'Mars',
    summary: 'Focus and determination drive success. Deep insights help solve lingering questions.',
    categories: {
      general: 'Inner strength allows you to overcome challenges with calm resilience.',
      health: 'Channel intense focus into productive physical or mental health practices.',
      love: 'Honesty and loyalty foster profound emotional connection with your partner.',
      career: 'Research, investigation, and strategic planning deliver excellent progress.',
      finance: 'Maintain confidentiality regarding financial arrangements.',
    },
    luckyNumber: 9,
    luckyColor: 'Maroon',
  },
  9: {
    rashiIndex: 9,
    sanskritName: 'Dhanu',
    englishName: 'Sagittarius',
    element: 'Fire',
    ruler: 'Jupiter',
    summary: 'Optimism and expansive thinking illuminate your path today. Higher knowledge calls.',
    categories: {
      general: 'Jupiter brings wisdom and broader perspective to your daily endavors.',
      health: 'Outdoor activities and fresh air invigorate your physical well-being.',
      love: 'Shared philosophy and adventurous spirit bring enthusiasm to relationships.',
      career: 'Broad horizons open up. Good day for educational or international projects.',
      finance: 'Financial outlook remains favorable. Maintain sensible risk management.',
    },
    luckyNumber: 3,
    luckyColor: 'Yellow',
  },
  10: {
    rashiIndex: 10,
    sanskritName: 'Makara',
    englishName: 'Capricorn',
    element: 'Earth',
    ruler: 'Saturn',
    summary: 'Discipline and dedication build lasting foundations. Stay focused on your goals.',
    categories: {
      general: 'Saturn reinforces perseverance and practical responsibility.',
      health: 'Ensure consistent sleep and ergonomic posture during long work hours.',
      love: 'Reliability and commitment form the bedrock of enduring affection.',
      career: 'Long-term strategies yield tangible progress. Your patience earns respect.',
      finance: 'Focus on debt reduction and solid asset accumulation.',
    },
    luckyNumber: 4,
    luckyColor: 'Dark Blue',
  },
  11: {
    rashiIndex: 11,
    sanskritName: 'Kumbha',
    englishName: 'Aquarius',
    element: 'Air',
    ruler: 'Saturn',
    summary: 'Innovative thinking and social consciousness guide your actions today.',
    categories: {
      general: 'Original ideas emerge effortlessly. Connect with like-minded communities.',
      health: 'Mental stimulation paired with relaxation exercises restores balance.',
      love: 'Intellectual camaraderie and mutual respect enrich your relationships.',
      career: 'Progressive solutions solve longstanding team obstacles. Embrace innovation.',
      finance: 'Explore modern financial tools while maintaining prudent risk boundaries.',
    },
    luckyNumber: 11,
    luckyColor: 'Cyan',
  },
  12: {
    rashiIndex: 12,
    sanskritName: 'Meena',
    englishName: 'Pisces',
    element: 'Water',
    ruler: 'Jupiter',
    summary: 'Compassion and creative imagination flow freely. Trust your spiritual intuition.',
    categories: {
      general: 'Jupiter nurtures inner peace, empathy, and artistic inspiration.',
      health: 'Meditation, gentle music, and proper rest refresh your nervous system.',
      love: 'Deep empathy creates magical moments of emotional unity with your partner.',
      career: 'Creative projects and altruistic initiatives flourish under current energies.',
      finance: 'Avoid impulse buys; focus resources on genuine needs and charitable acts.',
    },
    luckyNumber: 12,
    luckyColor: 'Sea Green',
  },
};
