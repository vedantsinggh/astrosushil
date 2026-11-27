/**
 * Brand metadata, jewel-tone palettes, fallback illustrations, and curated section highlights
 * for the 13 canonical Astro Sushil reports (matching `public/report-assets/brand_assets.json`).
 *
 * Commercial fields (prices, GST, availability) are NEVER stored here — they come exclusively
 * from the backend report catalogue API.
 */

export const SHARED_REPORT_ASSETS = {
  insightStar: "/report-assets/illustrations/shared/insight-star.svg",
  sectionDivider: "/report-assets/illustrations/shared/section-divider.svg",
  timelineMarker: "/report-assets/illustrations/shared/timeline-marker.svg",
};

export const REPORT_CATALOG_META = [
  {
    key: "report-kundli",
    slug: "kundli",
    title: "Premium Personalised Kundli Report",
    category: "life-blueprint",
    badgeLabel: "Complete Life Blueprint",
    accent: "#b45cff",
    jewelSurface: "linear-gradient(145deg, #1b0f36 0%, #2d1854 55%, #160c2c 100%)",
    softTint: "rgba(180, 92, 255, 0.08)",
    borderTint: "rgba(180, 92, 255, 0.30)",
    coverImage: "/report-assets/covers/web-preview/report-kundli.webp",
    illustrationUrl: "/report-assets/illustrations/reports/report-kundli.svg",
    headerSummary:
      "Your complete Vedic birth chart dossier crafted from exact planetary longitudes, Bhava placements, Nakshatra padas, and Vimshottari Dasha cycles. Designed for clarity on personality, dharma, relationships, career, and spiritual growth across every major life chapter.",
    seoDescription:
      "Get your Premium Personalised Kundli Report by Astro Sushil with Lagna & Navamsa charts, planetary strengths, Nakshatra analysis, and Vimshottari Dasha roadmap.",
    seoKeywords: "personalized kundli report, janam kundli pdf, vedic birth chart, astro sushil",
    highlights: [
      {
        title: "Lagna, Navamsa (D9) & Planetary Table",
        description: "Exact sidereal planetary degrees, signs, house placements, Nakshatra padas, and planetary dignities.",
      },
      {
        title: "12 Bhava Life-Area Breakdown",
        description: "House-by-house interpretation covering health, wealth, family, education, career, and inner purpose.",
      },
      {
        title: "Vimshottari Mahadasha & Antardasha Timeline",
        description: "Period-wise cosmic timing windows highlighting turning points, opportunities, and caution phases.",
      },
      {
        title: "Classical Yogas, Dosha & Remedies",
        description: "Identification of benefic yogas alongside gentle, practical Vedic remedies tailored to your chart.",
      },
    ],
  },
  {
    key: "report-career",
    slug: "career",
    aliases: ["report-career-pro", "career-pro", "career_prosity"],
    title: "Career Report",
    category: "career-wealth",
    badgeLabel: "10th House & D10 Analysis",
    accent: "#42c7c4",
    jewelSurface: "linear-gradient(145deg, #0b262b 0%, #123e45 55%, #091f24 100%)",
    softTint: "rgba(66, 199, 196, 0.08)",
    borderTint: "rgba(66, 199, 196, 0.32)",
    coverImage: "/report-assets/covers/web-preview/report-career.webp",
    illustrationUrl: "/report-assets/illustrations/reports/report-career.svg",
    headerSummary:
      "A focused vocational analysis examining your 10th house, Dashamsha (D10) divisional chart, Amatyakaraka, and planetary dasha inflection windows. Gain decisive clarity on job vs. entrepreneurship, promotions, industry fit, and high-growth career timing.",
    seoDescription:
      "Discover your ideal profession, promotion windows, and Dashamsha (D10) career insights with Astro Sushil's Career Report.",
    seoKeywords: "vedic career report, d10 dashamsha analysis, job vs business astrology, astro sushil",
    highlights: [
      {
        title: "10th House & Lord Strength Assessment",
        description: "Evaluates your primary karma bhava, career significators, and professional authority indicators.",
      },
      {
        title: "Dashamsha (D10) Vocational Mapping",
        description: "Identifies sectors, leadership roles, and work environments aligned with your natal potential.",
      },
      {
        title: "Career Inflection & Promotion Windows",
        description: "Pinpoints upcoming Dasha and transit triggers for role transitions, raises, or business launches.",
      },
      {
        title: "Job vs. Business Aptitude & Remedies",
        description: "Clear guidance on independent enterprise versus structured service, plus targeted Vedic remedies.",
      },
    ],
  },
  {
    key: "report-marriage",
    slug: "marriage",
    aliases: ["match-making", "match_making_pdf", "couple-kundli-matching"],
    title: "Couple Kundli Matching Report",
    category: "love-marriage",
    badgeLabel: "Ashtakoota 36-Guna Milan",
    accent: "#ff78b8",
    jewelSurface: "linear-gradient(145deg, #2d1024 0%, #4b183a 55%, #230c1c 100%)",
    softTint: "rgba(255, 120, 184, 0.08)",
    borderTint: "rgba(255, 120, 184, 0.32)",
    coverImage: "/report-assets/covers/web-preview/report-marriage.webp",
    illustrationUrl: "/report-assets/illustrations/reports/report-marriage.svg",
    headerSummary:
      "A comprehensive couple compatibility dossier combining classical 36-Guna Ashtakoota Milan, Manglik and Nadi Dosha verification, 7th-house partner dynamics, and Navamsa (D9) synastry so both partners step into marriage with confidence and harmony.",
    seoDescription:
      "Detailed Couple Kundli Matching Report with 36-Guna Ashtakoota scores, Manglik check, D9 synastry, and marital harmony guidance.",
    seoKeywords: "couple kundli matching report, ashtakoota guna milan, marriage compatibility pdf, astro sushil",
    highlights: [
      {
        title: "36-Guna Ashtakoota Compatibility Score",
        description: "Complete breakdown across Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, and Nadi.",
      },
      {
        title: "Manglik, Nadi & Bhakoot Dosha Evaluation",
        description: "Checks genuine dosha presence alongside classical cancellation rules and practical mitigations.",
      },
      {
        title: "7th House & Navamsa (D9) Partner Dynamics",
        description: "Insights into emotional temperament, communication, shared prosperity, and long-term stability.",
      },
      {
        title: "Harmony Guidance & Consecrated Remedies",
        description: "Actionable recommendations for mutual understanding and auspicious alignment before marriage.",
      },
    ],
  },
  {
    key: "report-finance",
    slug: "finance",
    title: "Finance Report",
    category: "career-wealth",
    badgeLabel: "Dhana Yogas & SAV Cashflow",
    accent: "#62d69b",
    jewelSurface: "linear-gradient(145deg, #0b261c 0%, #134231 55%, #081e16 100%)",
    softTint: "rgba(98, 214, 155, 0.08)",
    borderTint: "rgba(98, 214, 155, 0.32)",
    coverImage: "/report-assets/covers/web-preview/report-finance.webp",
    illustrationUrl: "/report-assets/illustrations/reports/report-finance.svg",
    headerSummary:
      "A structured Vedic wealth blueprint analysing your 2nd and 11th houses of accumulated assets and gains, classical Dhana Yogas, Sarvashtakavarga cashflow strength, and a 3-year financial horizon for prudent investment and wealth building.",
    seoDescription:
      "Unlock your wealth blueprint with Astro Sushil's Finance Report: Dhana Yogas, 2nd & 11th house strength, SAV cashflow, and 3-year timing.",
    seoKeywords: "vedic finance report, wealth astrology, dhana yoga analysis, astro sushil",
    highlights: [
      {
        title: "2nd & 11th House Wealth Architecture",
        description: "Examines savings retention, liquid assets, passive income channels, and financial resilience.",
      },
      {
        title: "Dhana & Arishta Yoga Detection",
        description: "Maps wealth-generating combinations and periods that require conservative capital protection.",
      },
      {
        title: "Sarvashtakavarga (SAV) Cashflow Dynamics",
        description: "Quantitative bindu scoring across money houses to spot high-yield versus lean phases.",
      },
      {
        title: "3-Year Financial Horizon & Remedies",
        description: "Clear timing roadmap for major purchases, investments, and consecrated Lakshmi-oriented remedies.",
      },
    ],
  },
  {
    key: "report-love",
    slug: "love",
    title: "Love Report",
    category: "love-marriage",
    badgeLabel: "5th/7th House & Venus",
    accent: "#ff83ad",
    jewelSurface: "linear-gradient(145deg, #311122 0%, #4f1c37 55%, #240c19 100%)",
    softTint: "rgba(255, 131, 173, 0.08)",
    borderTint: "rgba(255, 131, 173, 0.32)",
    coverImage: "/report-assets/covers/web-preview/report-love.webp",
    illustrationUrl: "/report-assets/illustrations/reports/report-love.svg",
    headerSummary:
      "An intimate exploration of your romantic nature, 5th and 7th house dynamics, Venus placement, Jaimini Darakaraka spouse portrait, Mulank numerology, and marriage timing windows so you navigate love with emotional clarity.",
    seoDescription:
      "Explore your romantic destiny, Darakaraka spouse traits, Venus dynamics, and marriage timing in Astro Sushil's Love Report.",
    seoKeywords: "vedic love report, darakaraka spouse prediction, marriage timing astrology, astro sushil",
    highlights: [
      {
        title: "5th & 7th House Relationship Blueprint",
        description: "Reveals romantic expression, attachment patterns, and partnership expectations.",
      },
      {
        title: "Venus & Darakaraka Spouse Portrait",
        description: "Highlights likely temperament, values, and qualities of your significant partner.",
      },
      {
        title: "Love vs. Arranged & Marriage Timing",
        description: "Identifies auspicious Dasha and Jupiter/Venus transit windows for commitment.",
      },
      {
        title: "Mulank Numerology & Gentle Remedies",
        description: "Blends birth-number relationship harmony with practical Vedic remedies.",
      },
    ],
  },
  {
    key: "report-fortune",
    slug: "fortune",
    title: "Fortune Report",
    category: "life-blueprint",
    badgeLabel: "Vedic Numerology & Destiny",
    accent: "#e8a36a",
    jewelSurface: "linear-gradient(145deg, #2b190d 0%, #492a15 55%, #211209 100%)",
    softTint: "rgba(232, 163, 106, 0.08)",
    borderTint: "rgba(232, 163, 106, 0.32)",
    coverImage: "/report-assets/covers/web-preview/report-fortune.webp",
    illustrationUrl: "/report-assets/illustrations/reports/report-fortune.svg",
    headerSummary:
      "Unites Vedic Numerology and Horoscopic insight—decoding your Mulank, Bhagyank, Lo-Shu Grid, Kua directional alignment, Name vibration, four life challenge cycles, and a 12-month personal forecast in one cohesive fortune dossier.",
    seoDescription:
      "Discover Mulank, Bhagyank, Lo-Shu Grid, Kua alignment, and your 12-month Vedic forecast in Astro Sushil's Fortune Report.",
    seoKeywords: "fortune report, vedic numerology report, lo shu grid, mulank bhagyank, astro sushil",
    highlights: [
      {
        title: "Mulank, Bhagyank & Name Vibration",
        description: "Decodes your core psychic and destiny numbers alongside name-letter resonance.",
      },
      {
        title: "Lo-Shu Grid & Kua Cardinal Alignment",
        description: "Maps missing and repeating energies, auspicious directions, and personal balance.",
      },
      {
        title: "Four Life Cycles & Challenge Phases",
        description: "Outlines long-term karmic milestones and how to turn obstacles into breakthroughs.",
      },
      {
        title: "12-Month Personal Forecast & Remedies",
        description: "Month-by-month guidance with multi-chart Vedic quadrants and practical remedies.",
      },
    ],
  },
  {
    key: "report-fortune-plus",
    slug: "fortune-plus",
    aliases: ["pro-horoscope", "pro_horoscope_pdf"],
    title: "Personalised Fortune Report Plus",
    category: "life-blueprint",
    badgeLabel: "25-Chapter Flagship Dossier",
    accent: "#f5c85e",
    jewelSurface: "linear-gradient(145deg, #271e09 0%, #44340e 55%, #1e1707 100%)",
    softTint: "rgba(245, 200, 94, 0.09)",
    borderTint: "rgba(245, 200, 94, 0.36)",
    coverImage: "/report-assets/covers/web-preview/report-fortune-plus.webp",
    illustrationUrl: "/report-assets/illustrations/reports/report-fortune-plus.svg",
    headerSummary:
      "Our flagship 25-chapter Vedic numerology and astrological life dossier—combining Success, Connection & Maturity numbers, 4 Life Pinnacles, 4 birth charts (D1, D9, Chandra, Lal Kitab), 9-planet house attributes, Manglik & Sade Sati timelines, and consecrated remedies.",
    seoDescription:
      "Comprehensive 25-chapter Personalised Fortune Report Plus with 4 Vedic charts, Life Pinnacles, Sade Sati timeline, and consecrated remedies.",
    seoKeywords: "fortune report plus, 25 chapter astrology dossier, lal kitab sade sati, astro sushil",
    highlights: [
      {
        title: "4 Charts: D1, Navamsa (D9), Chandra & Lal Kitab",
        description: "Multi-dimensional chart synthesis covering natal, spiritual, lunar, and karmic perspectives.",
      },
      {
        title: "Success, Connection & 4 Life Pinnacles",
        description: "Deep Vedic numerology mapping life phases, peak achievement cycles, and pivotal years.",
      },
      {
        title: "Manglik Dosh, Sade Sati & Classical Yogas",
        description: "Complete dosha diagnostics, lifetime Shani timelines, and high-impact planetary yogas.",
      },
      {
        title: "9-Planet Attributes & Consecrated Remedies",
        description: "Individual guidance for every planet alongside gemstone, mantra, and charity remedies.",
      },
    ],
  },
  {
    key: "report-horoscope",
    slug: "horoscope",
    aliases: ["report-personalised-horoscope", "personalised-horoscope"],
    title: "Personalised Horoscope Report",
    category: "life-blueprint",
    badgeLabel: "Chandra Lagna Annual Forecast",
    accent: "#c9a2ff",
    jewelSurface: "linear-gradient(145deg, #1d1438 0%, #31215e 55%, #150e29 100%)",
    softTint: "rgba(201, 162, 255, 0.09)",
    borderTint: "rgba(201, 162, 255, 0.34)",
    coverImage: "/report-assets/covers/web-preview/report-horoscope.webp",
    illustrationUrl: "/report-assets/illustrations/reports/report-horoscope.svg",
    headerSummary:
      "A personalized annual forecast anchored in your Chandra Lagna (natal Moon sign) and active planetary transits—delivering quarterly trajectories, a 12-month opportunity matrix, and tailored Vedic remedies to stay aligned all year.",
    seoDescription:
      "Personalised Horoscope Report with Chandra Lagna Moon-sign annual forecast, quarterly trends, and 12-month matrix by Astro Sushil.",
    seoKeywords: "personalised horoscope report, annual moon sign forecast, chandra lagna report, astro sushil",
    highlights: [
      {
        title: "Chandra Lagna & Natal Moon Strength",
        description: "Anchors yearly predictions in your exact natal Moon degree and Nakshatra pada.",
      },
      {
        title: "Quarterly Life Trajectories",
        description: "Seasonal focus across career, finances, relationships, and emotional wellbeing.",
      },
      {
        title: "12-Month Transit Opportunity Matrix",
        description: "Month-wise auspicious windows, caution dates, and key planetary shifts.",
      },
      {
        title: "Vedic Remedial Guidance",
        description: "Simple, grounded spiritual practices matched to your yearly planetary weather.",
      },
    ],
  },
  {
    key: "report-saturn",
    slug: "saturn",
    title: "Saturn In Your Birth Chart Report",
    category: "transits-special",
    badgeLabel: "Shani, Sade Sati & Dhaiya",
    accent: "#b9a1ff",
    jewelSurface: "linear-gradient(145deg, #171336 0%, #272059 55%, #110e29 100%)",
    softTint: "rgba(185, 161, 255, 0.08)",
    borderTint: "rgba(185, 161, 255, 0.34)",
    coverImage: "/report-assets/covers/web-preview/report-saturn.webp",
    illustrationUrl: "/report-assets/illustrations/reports/report-saturn.svg",
    headerSummary:
      "A deep, reassuring guide to Lord Shani in your horoscope—analysing your natal Saturn, its 3rd/7th/10th aspects, Bhinnashtakavarga bindus, lifetime Sade Sati & Kantak Shani periods, upcoming Saturn transits, and gentle remedial practices.",
    seoDescription:
      "Understand Lord Shani in your chart with lifetime Sade Sati & Kantak Shani dates, Bhinnashtakavarga, and gentle Shani remedies.",
    seoKeywords: "saturn in birth chart report, sade sati calculator report, shani dhaiya, astro sushil",
    highlights: [
      {
        title: "Natal Saturn & 3rd / 7th / 10th Aspects",
        description: "Reveals where Shani builds discipline, endurance, and delayed yet lasting rewards.",
      },
      {
        title: "Saturn Bhinnashtakavarga (BAV) Score",
        description: "Measures how supportive Saturn's transit houses are across your entire chart.",
      },
      {
        title: "Lifetime Sade Sati & Kantak Shani Timeline",
        description: "Exact start and end phases of all Sade Sati and Ashtama/Kantak Shani cycles.",
      },
      {
        title: "Upcoming Shani Transits & Gentle Remedies",
        description: "Practical, non-fear-based Vedic remedies to harmonize karmic lessons.",
      },
    ],
  },
  {
    key: "report-jupiter-transit",
    slug: "jupiter-transit",
    title: "Jupiter Transit Report",
    category: "transits-special",
    badgeLabel: "Brihaspati Gochara",
    accent: "#77c8ef",
    jewelSurface: "linear-gradient(145deg, #0d2136 0%, #16395c 55%, #091829 100%)",
    softTint: "rgba(119, 200, 239, 0.08)",
    borderTint: "rgba(119, 200, 239, 0.32)",
    coverImage: "/report-assets/covers/web-preview/report-jupiter-transit.webp",
    illustrationUrl: "/report-assets/illustrations/reports/report-jupiter-transit.svg",
    headerSummary:
      "A dedicated Vedic analysis of Lord Brihaspati's blessings in your chart—examining natal Jupiter, its 5th/7th/9th benefic aspects, Jupiter's Bhinnashtakavarga strength, and your upcoming Jupiter transit expansion windows.",
    seoDescription:
      "Jupiter Transit Report analysing natal Brihaspati, 5th/7th/9th aspects, Bhinnashtakavarga, and personal Guru Gochara cycles.",
    seoKeywords: "jupiter transit report, guru gochar, brihaspati transit astrology, astro sushil",
    highlights: [
      {
        title: "Natal Jupiter & Nakshatra Wisdom",
        description: "Assesses Brihaspati's dignity, house rulership, and natural areas of grace and wisdom.",
      },
      {
        title: "5th, 7th & 9th Aspect Blessings",
        description: "Maps which houses receive Jupiter's protective and expansive sight.",
      },
      {
        title: "Jupiter Bhinnashtakavarga Strength",
        description: "Shows the exact bindu support available during each sign transit.",
      },
      {
        title: "Personal Guru Gochara Windows",
        description: "Highlights growth phases for education, wealth, marriage, and spiritual merit.",
      },
    ],
  },
  {
    key: "report-rahu-ketu-transit",
    slug: "rahu-ketu-transit",
    title: "Rahu Ketu Transit Report",
    category: "transits-special",
    badgeLabel: "Lunar Nodes Axis",
    accent: "#68d6c3",
    jewelSurface: "linear-gradient(145deg, #0b2626 0%, #124242 55%, #081c1c 100%)",
    softTint: "rgba(104, 214, 195, 0.08)",
    borderTint: "rgba(104, 214, 195, 0.32)",
    coverImage: "/report-assets/covers/web-preview/report-rahu-ketu-transit.webp",
    illustrationUrl: "/report-assets/illustrations/reports/report-rahu-ketu-transit.svg",
    headerSummary:
      "Clarity on the shadow planets Rahu and Ketu—mapping your natal nodal axis, Nakshatra dispositors, and personal Rahu-Ketu transit cycles so sudden shifts become conscious evolutionary breakthroughs.",
    seoDescription:
      "Rahu Ketu Transit Report analysing your natal lunar nodes axis, nakshatras, and upcoming nodal transit cycles by Astro Sushil.",
    seoKeywords: "rahu ketu transit report, lunar nodes astrology, rahu ketu gochar, astro sushil",
    highlights: [
      {
        title: "Natal Rahu–Ketu Axis & Dispositors",
        description: "Uncovers karmic hunger (Rahu) and past-life mastery (Ketu) in your birth chart.",
      },
      {
        title: "Nodal Nakshatra Analysis",
        description: "Examines the lunar mansions hosting your nodes and how they shape life themes.",
      },
      {
        title: "18-Month Nodal Transit Windows",
        description: "Prepares you for upcoming Rahu–Ketu house shifts affecting career, home, and mindset.",
      },
      {
        title: "Grounding & Nodal Balance Guidance",
        description: "Practical Vedic disciplines to stay centered through rapid or unconventional changes.",
      },
    ],
  },
  {
    key: "report-varshphal",
    slug: "varshphal",
    title: "Varshphal Report",
    category: "transits-special",
    badgeLabel: "Tajika Solar Return",
    accent: "#ed9bd9",
    jewelSurface: "linear-gradient(145deg, #2b132b 0%, #482048 55%, #200d20 100%)",
    softTint: "rgba(237, 155, 217, 0.08)",
    borderTint: "rgba(237, 155, 217, 0.32)",
    coverImage: "/report-assets/covers/web-preview/report-varshphal.webp",
    illustrationUrl: "/report-assets/illustrations/reports/report-varshphal.svg",
    headerSummary:
      "A classical Tajika annual solar return horoscope calculated for the exact moment the Sun returns to its natal degree—featuring Muntha progression, Varshesh (Year Lord) selection, Tajika Yogas, Harsha Bala, Mudda Dasha, and a 12-month predictive roadmap.",
    seoDescription:
      "Classical Tajika Varshphal Solar Return Report with Muntha, Varshesh, Tajika Yogas, and Mudda Dasha by Astro Sushil.",
    seoKeywords: "varshphal report, tajika annual horoscope, muntha varshesh, mudda dasha, astro sushil",
    highlights: [
      {
        title: "Exact Solar Return Chart & Muntha",
        description: "Computes your annual Tajika Lagna and Muntha house placement for the year ahead.",
      },
      {
        title: "Varshesh (Year Lord) & Panchavargiya Bala",
        description: "Identifies the planetary ruler governing your birthday-to-birthday year.",
      },
      {
        title: "Tajika Yogas & Harsha Bala",
        description: "Analyses Ithasala, Easarpha, and classical annual planetary combinations.",
      },
      {
        title: "Mudda Dasha 12-Month Roadmap",
        description: "Breaks down sub-periods across the year for crisp timing of major decisions.",
      },
    ],
  },
  {
    key: "report-baby-name",
    slug: "baby-name",
    title: "Baby Name Report",
    category: "transits-special",
    badgeLabel: "Nakshatra Pada & Numerology",
    accent: "#a9baff",
    jewelSurface: "linear-gradient(145deg, #131938 0%, #202b5e 55%, #0e132b 100%)",
    softTint: "rgba(169, 186, 255, 0.09)",
    borderTint: "rgba(169, 186, 255, 0.34)",
    coverImage: "/report-assets/covers/web-preview/report-baby-name.webp",
    illustrationUrl: "/report-assets/illustrations/reports/report-baby-name.svg",
    headerSummary:
      "Sacred naming guidance rooted in your newborn's exact Janma Nakshatra pada (Namakshara syllables) and Chaldean/Vedic numerology harmony with their Mulank and Bhagyank—including evaluation of names your family is already considering.",
    seoDescription:
      "Vedic Baby Name Report with Janma Nakshatra pada syllables (Namakshara) and Mulank/Bhagyank numerology compatibility.",
    seoKeywords: "vedic baby name report, nakshatra namakshara syllables, baby numerology, astro sushil",
    highlights: [
      {
        title: "Janma Nakshatra & Pada Namakshara",
        description: "Exact auspicious starting syllables derived from the Moon's natal pada at birth.",
      },
      {
        title: "Mulank & Bhagyank Compatibility",
        description: "Matches name vibrations with your child's core psychic and destiny numbers.",
      },
      {
        title: "Shortlisted Family Name Evaluation",
        description: "Checks resonance and numerological balance of names parents have in mind.",
      },
      {
        title: "Curated Auspicious Name Ideas",
        description: "Meaningful traditional and modern options aligned with Vedic sound harmonics.",
      },
    ],
  },
];

const LEGACY_META_ALIASES = {
  "mini-horoscope": {
    key: "report-horoscope",
    slug: "mini-horoscope",
    title: "Mini Horoscope",
    badgeLabel: "Planetary Summary",
    accent: "#c9a2ff",
    jewelSurface: "linear-gradient(145deg, #1d1438 0%, #31215e 55%, #150e29 100%)",
    softTint: "rgba(201, 162, 255, 0.09)",
    borderTint: "rgba(201, 162, 255, 0.34)",
    coverImage: "/Image/Reports/mini-horscope.webp",
    illustrationUrl: "/report-assets/illustrations/reports/report-horoscope.svg",
  },
  "basic-horoscope": {
    key: "report-kundli",
    slug: "basic-horoscope",
    title: "Basic Horoscope",
    badgeLabel: "Essential Kundli",
    accent: "#b45cff",
    jewelSurface: "linear-gradient(145deg, #1b0f36 0%, #2d1854 55%, #160c2c 100%)",
    softTint: "rgba(180, 92, 255, 0.08)",
    borderTint: "rgba(180, 92, 255, 0.30)",
    coverImage: "/Image/Reports/basic-horscope.webp",
    illustrationUrl: "/report-assets/illustrations/reports/report-kundli.svg",
  },
};

export const REPORT_CATALOG_CATEGORIES = [
  { key: "all", label: "All Reports" },
  { key: "available", label: "Available Now" },
  { key: "life-blueprint", label: "Life & Destiny" },
  { key: "career-wealth", label: "Career & Wealth" },
  { key: "love-marriage", label: "Love & Marriage" },
  { key: "transits-special", label: "Transits & Special" },
];

export function isReportPurchasable(report) {
  if (!report) return false;
  if (report.isActive === false) return false;
  if (report.availableForPurchase === false) return false;
  const price = Number(report.priceWithGst ?? report.salePrice ?? 0);
  const paise = report.pricePaise !== undefined ? Number(report.pricePaise) : price * 100;
  return price > 0 && paise > 0;
}

export function getReportMeta(reportOrSlug) {
  if (!reportOrSlug) return REPORT_CATALOG_META[0];
  const ref =
    typeof reportOrSlug === "string"
      ? reportOrSlug.trim().toLowerCase()
      : String(reportOrSlug._id || reportOrSlug.slug || reportOrSlug.reportType || "")
          .trim()
          .toLowerCase();

  const slugRef =
    typeof reportOrSlug === "object" && reportOrSlug.slug
      ? String(reportOrSlug.slug).trim().toLowerCase()
      : ref;

  const exact = REPORT_CATALOG_META.find(
    (m) =>
      m.key === ref ||
      m.slug === ref ||
      m.slug === slugRef ||
      (m.aliases && (m.aliases.includes(ref) || m.aliases.includes(slugRef))),
  );
  if (exact) return exact;

  if (LEGACY_META_ALIASES[slugRef] || LEGACY_META_ALIASES[ref]) {
    const legacy = LEGACY_META_ALIASES[slugRef] || LEGACY_META_ALIASES[ref];
    const base = REPORT_CATALOG_META.find((m) => m.key === legacy.key) || REPORT_CATALOG_META[0];
    return { ...base, ...legacy };
  }

  return REPORT_CATALOG_META[0];
}
