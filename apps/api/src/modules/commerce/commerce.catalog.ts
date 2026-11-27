import { OrderItemType, FulfillmentType, ReportType } from '@prisma/client';
import { ValidationError } from '../../errors/app-error';
import { consultationCatalogSource } from '../consultations/consultation-catalog.adapter';
import { applyOverride, reportCatalogOverrides } from './report-catalog.overrides';

export interface CatalogItem {
  id: string;
  itemType: OrderItemType;
  title: string;
  description: string;
  pricePaise: number; // Stored in integer paise (e.g. 49900 = ₹499.00)
  /** Price before the offer (shown struck through), in paise before GST; display only. */
  originalPricePaise?: number;
  currency: string;
  taxRateBasisPoints: number; // 1800 = 18.00% GST, 300 = 3.00% GST
  taxIncluded: boolean;
  fulfillmentType: FulfillmentType;
  isActive: boolean;
  minQuantity: number;
  maxQuantity: number;
  legacyReportType?: ReportType;
  consultationMode?: 'AUDIO' | 'VIDEO' | 'IN_PERSON' | 'MESSAGE';
  durationMinutes?: number;
  responseDays?: number;
  metadataSchema?: {
    requiredFields?: string[];
  };
}

export const COMMERCE_CATALOG: Record<string, CatalogItem> = {
  // ---------------------------------------------------------------------------
  // 1. ASTROLOGY REPORTS (DIGITAL)
  // ---------------------------------------------------------------------------
  'report-kundli': {
    id: 'report-kundli',
    itemType: OrderItemType.REPORT,
    title: 'Premium Personalised Kundli Report',
    description: 'Comprehensive astrological life blueprint with planetary placements, Bhavas, and Nakshatra.',
    // Owner decision 2026-11-24 (open-questions M1): ₹999 + 18% GST, charged on top. Stored here as the
    // GST-inclusive amount the customer pays, which gives the same net (₹999) and the same GST (₹179.82).
    pricePaise: 117882, // ₹1,178.82 = ₹999 + GST
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
    legacyReportType: ReportType.KUNDLI,
    metadataSchema: { requiredFields: ['birthProfileId'] },
  },
  'report-kundli-basic': {
    id: 'report-kundli-basic',
    itemType: OrderItemType.REPORT,
    title: 'Basic Kundli',
    description: 'The essentials of your Kundli: birth particulars, the Lagna and Navamsa charts, planetary positions, your Vimshottari periods, a reading of each of the nine planets and practical guidance.',
    // Website price (astrosushil.com, read 2026-11-24): ₹299 + 18% GST, charged on top. Stored here as the
    // GST-inclusive amount the customer pays, which gives the same net (₹299) and the same GST.
    pricePaise: 35282, // ₹352.82 = ₹299 + GST (website "Basic Horoscope")
    originalPricePaise: 79900,
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
    legacyReportType: ReportType.KUNDLI_BASIC,
    metadataSchema: { requiredFields: ['birthProfileId'] },
  },
  'report-planetary-summary': {
    id: 'report-planetary-summary',
    itemType: OrderItemType.REPORT,
    title: 'Planetary Dynamics & Dignity Summary',
    description: 'Your birth chart (D1) and planet table with a short personal reading of each of the nine planets: sign, house, nakshatra, dignity, and retrograde or combust state.',
    // Website price (astrosushil.com, read 2026-11-24): ₹199 + 18% GST, charged on top. Stored here as the
    // GST-inclusive amount the customer pays, which gives the same net (₹199) and the same GST.
    pricePaise: 23482, // ₹234.82 = ₹199 + GST (website "Mini Horoscope")
    originalPricePaise: 49900,
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
    legacyReportType: ReportType.PLANETARY_SUMMARY,
    metadataSchema: { requiredFields: ['birthProfileId'] },
  },
  'report-career': {
    id: 'report-career',
    itemType: OrderItemType.REPORT,
    title: 'Career Report',
    description: '10th House vocational analysis, career inflection windows, and professional aptitude breakdown.',
    pricePaise: 49900, // ₹499
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
    legacyReportType: ReportType.CAREER,
    metadataSchema: { requiredFields: ['birthProfileId'] },
  },
  'report-marriage': {
    id: 'report-marriage',
    itemType: OrderItemType.REPORT,
    title: 'Couple Kundli Matching Report',
    description: 'Ashtakoota 36-Guna Kundli Milan, 7th house partner dynamics, and planetary harmony evaluation.',
    // Owner decision 2026-11-25 (M2): ₹999 + 18% GST, stored as GST-inclusive amount (matching report-kundli).
    pricePaise: 117882, // ₹1,178.82 = ₹999 + GST
    originalPricePaise: 199900,
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
    legacyReportType: ReportType.MARRIAGE_COMPATIBILITY,
    metadataSchema: { requiredFields: ['birthProfileId'] },
  },
  'report-career-pro': {
    id: 'report-career-pro',
    itemType: OrderItemType.REPORT,
    title: 'Career Report',
    description: 'Multi-divisional D10/D9 analysis with 5-year Dasha roadmap and executive career strategic planning.',
    pricePaise: 69900, // ₹699
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: false, // Retired 2026-11-18: only one Career report exists (report-career). Alias kept so historical CAREER_PROSITY orders still fulfil.
    minQuantity: 1,
    maxQuantity: 1,
    legacyReportType: ReportType.CAREER_PROSITY,
    metadataSchema: { requiredFields: ['birthProfileId'] },
  },
  'report-horoscope': {
    id: 'report-horoscope',
    itemType: OrderItemType.REPORT,
    title: 'Personalised Horoscope Report',
    description: 'Comprehensive annual Chandra Lagna Moon-sign forecast, quarterly trajectories, 12-month matrix, and Vedic remedial guidance.',
    pricePaise: 49900, // ₹499
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
    legacyReportType: ReportType.HOROSCOPE,
    metadataSchema: { requiredFields: ['birthProfileId'] },
  },
  'report-finance': {
    id: 'report-finance',
    itemType: OrderItemType.REPORT,
    title: 'Finance Report',
    description: 'Comprehensive wealth blueprint analyzing 2nd and 11th houses, Dhana Yogas, SAV cashflow dynamics, 3-year financial horizon, and consecrated Vedic remedies.',
    pricePaise: 49900, // ₹499
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
    legacyReportType: ReportType.FINANCE,
    metadataSchema: { requiredFields: ['birthProfileId'] },
  },
  'report-love': {
    id: 'report-love',
    itemType: OrderItemType.REPORT,
    title: 'Love Report',
    description: 'Comprehensive romantic and relationship blueprint analyzing 5th and 7th houses, Venus dynamics, Darakaraka spouse portrait, Mulank numerology, marriage timing, and consecrated Vedic remedies.',
    pricePaise: 49900, // ₹499
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
    legacyReportType: ReportType.LOVE,
    metadataSchema: { requiredFields: ['birthProfileId'] },
  },
  'report-fortune': {
    id: 'report-fortune',
    itemType: OrderItemType.REPORT,
    title: 'Personalised Fortune Report',
    description: 'The ultimate Vedic Numerology and Astrological life blueprint analyzing Mulank, Bhagyank, Lo-Shu grid, Kua cardinal alignment, Name vibration, 12-month personal forecast, four life challenge cycles, multi-chart Vedic quadrant, and consecrated remedies.',
    pricePaise: 49900, // ₹499
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
    legacyReportType: ReportType.FORTUNE,
    metadataSchema: { requiredFields: ['birthProfileId'] },
  },
  'report-fortune-plus': {
    id: 'report-fortune-plus',
    itemType: OrderItemType.REPORT,
    title: 'Personalised Fortune Report Plus',
    description: 'Comprehensive 25-chapter Vedic numerology and astrological life dossier including Success/Connection/Maturity numbers, 4 Life Pinnacles, 4 birth charts (D1, D9, Chandra, Lal Kitab), 9-planet house attributes, Manglik dosh, Sade Sati timeline, classical yogas, marriage timing, and consecrated remedies.',
    // Website price (astrosushil.com, read 2026-11-24): ₹699 + 18% GST, charged on top. Stored here as the
    // GST-inclusive amount the customer pays, which gives the same net (₹699) and the same GST.
    pricePaise: 82482, // ₹824.82 = ₹699 + GST (website "Pro Horoscope")
    originalPricePaise: 149900,
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
    legacyReportType: ReportType.FORTUNE_PLUS,
    metadataSchema: { requiredFields: ['birthProfileId'] },
  },
  'report-saturn': {
    id: 'report-saturn',
    itemType: OrderItemType.REPORT,
    title: 'Saturn In Your Birth Chart Report',
    description: 'Comprehensive Vedic guide to Lord Shani analysing your natal Saturn, its 3rd/7th/10th aspects and nakshatra, Saturn\'s Bhinnashtakavarga, your lifetime Sade Sati and Kantak Shani periods, upcoming Saturn transits, and gentle remedies.',
    pricePaise: 49900, // ₹499
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
    legacyReportType: ReportType.SATURN,
    metadataSchema: { requiredFields: ['birthProfileId'] },
  },
  'report-jupiter-transit': {
    id: 'report-jupiter-transit',
    itemType: OrderItemType.REPORT,
    title: 'Jupiter Transit Report',
    description: 'Comprehensive Vedic guide to Lord Brihaspati analysing your natal Jupiter, its 5th/7th/9th aspects and nakshatra, Jupiter\'s Bhinnashtakavarga, and your personal Jupiter transit periods.',
    pricePaise: 0, // Pending commercial sign-off
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: false,
    minQuantity: 1,
    maxQuantity: 1,
    legacyReportType: ReportType.JUPITER_TRANSIT,
    metadataSchema: { requiredFields: ['birthProfileId'] },
  },
  'report-rahu-ketu-transit': {
    id: 'report-rahu-ketu-transit',
    itemType: OrderItemType.REPORT,
    title: 'Rahu Ketu Transit Report',
    description: 'Comprehensive Vedic guide to the lunar nodes analysing your natal Rahu-Ketu axis and nakshatras, and your personal Rahu and Ketu transit periods.',
    pricePaise: 0, // Pending commercial sign-off
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: false,
    minQuantity: 1,
    maxQuantity: 1,
    legacyReportType: ReportType.RAHU_KETU_TRANSIT,
    metadataSchema: { requiredFields: ['birthProfileId'] },
  },
  'report-varshphal': {
    id: 'report-varshphal',
    itemType: OrderItemType.REPORT,
    title: 'Varshphal Report',
    description: 'Comprehensive classical Tajika annual solar return horoscope analyzing Muntha progression, Varshesh (Year Lord) selection, Tajika Yogas, Harsha Bala, Mudda Dasha, and 12-month predictive roadmap.',
    pricePaise: 0, // Pending commercial sign-off
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: false,
    minQuantity: 1,
    maxQuantity: 1,
    legacyReportType: ReportType.VARSHPHAL,
    metadataSchema: { requiredFields: ['birthProfileId'] },
  },
  'report-baby-name': {
    id: 'report-baby-name',
    itemType: OrderItemType.REPORT,
    title: 'Baby Name Report',
    description: 'Naming guidance from the child\'s birth nakshatra pada (namakshara syllables) and numerology compatibility with the Mulank and Bhagyank, with an optional check of names the family is considering.',
    pricePaise: 0, // Pending commercial sign-off
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: false,
    minQuantity: 1,
    maxQuantity: 1,
    legacyReportType: ReportType.BABY_NAME,
    metadataSchema: { requiredFields: ['birthProfileId'] },
  },
  'report-personalised-horoscope': {
    id: 'report-personalised-horoscope',
    itemType: OrderItemType.REPORT,
    title: 'Personalised Horoscope Report',
    description: 'Comprehensive annual Chandra Lagna Moon-sign forecast, quarterly trajectories, 12-month matrix, and Vedic remedial guidance.',
    pricePaise: 49900, // ₹499
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
    legacyReportType: ReportType.HOROSCOPE,
    metadataSchema: { requiredFields: ['birthProfileId'] },
  },
  'report-childbirth-family': {
    id: 'report-childbirth-family',
    itemType: OrderItemType.REPORT,
    title: 'Childbirth & Family Lineage Analysis',
    description: '5th House Saptamsha D7 evaluation, Beeja/Kshetra Sphuta analysis, and family prosperity insights.',
    pricePaise: 49900, // ₹499
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: false, // No genuine generator exists; selling it would be false (docs/report-system/README.md §4).
    minQuantity: 1,
    maxQuantity: 1,
    legacyReportType: ReportType.CHILDBIRTH_FAMILY,
    metadataSchema: { requiredFields: ['birthProfileId'] },
  },
  'report-gupta-nadi': {
    id: 'report-gupta-nadi',
    itemType: OrderItemType.REPORT,
    title: 'Gupta Nadi Comprehensive Life Dossier',
    description: 'Exhaustive BNN planetary combination reading covering Karma, Jeeva, and transit milestones.',
    pricePaise: 99900, // ₹999
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: false, // No genuine generator exists (BNN rules not implemented); selling it would be false.
    minQuantity: 1,
    maxQuantity: 1,
    legacyReportType: ReportType.GUPTA_NADI_DOSSIER,
    metadataSchema: { requiredFields: ['birthProfileId'] },
  },

  // ---------------------------------------------------------------------------
  // 2. CONSULTATION BOOKINGS (SERVICE)
  // ---------------------------------------------------------------------------
  // Not constants any more: consultation types are rows in `consultation_types`, edited in the
  // admin. `CommerceCatalogService` reads every `consult-*` item from
  // `consultationCatalogSource` (consultations/consultation-catalog.adapter.ts). The former
  // constants are the seed in consultations/consultation-types.defaults.ts.

  // ---------------------------------------------------------------------------
  // 3. COURSES & MASTERCLASSES (DIGITAL) - AUTHORITATIVE WEBSITE OFFERINGS
  // ---------------------------------------------------------------------------
  'course-gupt-nadi': {
    id: 'course-gupt-nadi',
    itemType: OrderItemType.COURSE,
    title: 'Gupt Nadi Astrology',
    description: 'Structured, in-depth video course on Nadi Astrology from fundamentals to advanced techniques by Astro Sushil Kumar Singh.',
    pricePaise: 599900, // ₹5,999 (original ₹10,999)
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },
  'course-kn-rao-marriage-money': {
    id: 'course-kn-rao-marriage-money',
    itemType: OrderItemType.COURSE,
    title: 'Shri K.N. Rao Method of Marriage & Money Astrology',
    description: 'Practical course covering marriage timing, 50+ real delay factors, female horoscopy, and wealth combinations.',
    pricePaise: 499900, // ₹4,999 (original ₹9,999)
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },
  'course-dash-mahavidya': {
    id: 'course-dash-mahavidya',
    itemType: OrderItemType.COURSE,
    title: 'Dash Mahavidya Astrology',
    description: 'Sacred structured video masterclass revealing the ancient secrets of the ten Mahavidyas, authentic mantras, and sadhanas.',
    pricePaise: 899900, // ₹8,999 (original ₹15,999)
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },
  // Legacy aliases for backward compatibility with Phase 3 tests
  'course-bnn-foundation': {
    id: 'course-bnn-foundation',
    itemType: OrderItemType.COURSE,
    title: 'Brihaspati Nandi Nadi Foundation Course',
    description: 'Comprehensive 8-week structured video masterclass on predictive Nadi principles and karakas.',
    pricePaise: 499900, // ₹4,999
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },
  'course-nakshatra-mastery': {
    id: 'course-nakshatra-mastery',
    itemType: OrderItemType.COURSE,
    title: '27 Nakshatras & Predictive Timing Mastery',
    description: 'Advanced course on lunar mansions, Pada analysis, Navamsha resonance, and transit timing.',
    pricePaise: 749900, // ₹7,499
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },
  'course-vastu-practitioner': {
    id: 'course-vastu-practitioner',
    itemType: OrderItemType.COURSE,
    title: 'Vedic Vastu Shastra Practitioner Certification',
    description: 'Spatial energy alignment, directional remedies, Pancha Bhoota balance for residential & commercial spaces.',
    pricePaise: 599900, // ₹5,999
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },

  // ---------------------------------------------------------------------------
  // 4. SPIRITUAL PRODUCTS & REMEDIES (PHYSICAL & DIGITAL)
  // ---------------------------------------------------------------------------
  'product-rudraksha-5-mukhi': {
    id: 'product-rudraksha-5-mukhi',
    itemType: OrderItemType.PRODUCT,
    title: 'Certified 5-Mukhi Nepali Rudraksha',
    description: 'Lab-certified authentic energized Rudraksha bead sanctified according to Vedic rituals.',
    pricePaise: 110000, // ₹1,100
    currency: 'INR',
    taxRateBasisPoints: 300, // 3% GST on spiritual items/gems
    taxIncluded: true,
    fulfillmentType: FulfillmentType.PHYSICAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 5,
  },
  'product-vastu-copper-pyramid': {
    id: 'product-vastu-copper-pyramid',
    itemType: OrderItemType.PRODUCT,
    title: 'Energized Pure Copper Vastu Pyramid',
    description: 'Geometrical copper energizer for neutralizing Brahmasthan and directional doshas.',
    pricePaise: 240000, // ₹2,400
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.PHYSICAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 10,
  },
  'product-sphatik-mala': {
    id: 'product-sphatik-mala',
    itemType: OrderItemType.PRODUCT,
    title: 'Natural Himalayan Sphatik Mala (108 Beads)',
    description: 'Hand-knotted 108 quartz crystal beads for Moon pacification, mental clarity, and meditation.',
    pricePaise: 180000, // ₹1,800
    currency: 'INR',
    taxRateBasisPoints: 300,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.PHYSICAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 5,
  },
  'product-mantra-audio-guide': {
    id: 'product-mantra-audio-guide',
    itemType: OrderItemType.PRODUCT,
    title: 'Siddha Navagraha Mantra Chants & Guide',
    description: 'High-definition authenticated audio recordings with pronunciation guide and Sankalpa instructions.',
    pricePaise: 49900, // ₹499
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },
  'product-archived-yantra': {
    id: 'product-archived-yantra',
    itemType: OrderItemType.PRODUCT,
    title: 'Archived Legacy Silver Yantra',
    description: 'Discontinued legacy offering for inventory testing.',
    pricePaise: 500000,
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.PHYSICAL,
    isActive: false, // Inactive offering to test availability validation
    minQuantity: 1,
    maxQuantity: 1,
  },

  // ---------------------------------------------------------------------------
  // 5. VERIFIED LIVE SHOP PRODUCTS (DIGITAL WALLPAPERS, ART & PHYSICAL HERB)
  // ---------------------------------------------------------------------------
  'ancient-ramayana-era-herb-for-unlimited-wealth-consecrated-during-ravi-pushya-nakshatra-in-ayodhya-by-astro-sushil': {
    id: 'ancient-ramayana-era-herb-for-unlimited-wealth-consecrated-during-ravi-pushya-nakshatra-in-ayodhya-by-astro-sushil',
    itemType: OrderItemType.PRODUCT,
    title: 'Ancient Ramayana Era- Herb for Unlimited Wealth',
    description: 'Sacred consecrated herb for unlimited wealth, blessed during Ravi Pushya Nakshatra in Ayodhya by Astro Sushil.',
    pricePaise: 399900, // ₹3,999
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.PHYSICAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 5,
  },
  'dhan-varsha-kit-maa-lakshmi-digital-art-dhan-prapti-wallpaper-secret-mantrain-astrosushil-voice': {
    id: 'dhan-varsha-kit-maa-lakshmi-digital-art-dhan-prapti-wallpaper-secret-mantrain-astrosushil-voice',
    itemType: OrderItemType.PRODUCT,
    title: 'Dhan Varsha Kit – Maa Lakshmi Art + Wallpaper + Secret Mantra',
    description: 'Spiritual bundle with high-res digital art, consecrated Dhan Prapti wallpaper, and secret mantra in Astro Sushil voice.',
    pricePaise: 219900, // ₹2,199
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 5,
  },
  'vivah-siddh-wallpaper-for-getting-married': {
    id: 'vivah-siddh-wallpaper-for-getting-married',
    itemType: OrderItemType.PRODUCT,
    title: 'Vivah Siddh Wallpaper For Getting Married',
    description: 'Spiritually energized digital wallpaper to bring harmony, love, and stability into relationships and clear marriage obstacles.',
    pricePaise: 89900, // ₹899
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 5,
  },
  'garbh-dharan-conceiving-wallpaper': {
    id: 'garbh-dharan-conceiving-wallpaper',
    itemType: OrderItemType.PRODUCT,
    title: 'Garbh Dharan Conceiving Wallpaper',
    description: 'Vedic energized wallpaper designed for prospective parents seeking conceiving blessings and fertility harmony.',
    pricePaise: 89900, // ₹899
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 5,
  },
  'garbh-raksha-wallpaper': {
    id: 'garbh-raksha-wallpaper',
    itemType: OrderItemType.PRODUCT,
    title: 'Garbh Raksha Wallpaper',
    description: 'Energized protective spiritual wallpaper safeguarding pregnancy, mother, and child health according to Vedic wisdom.',
    pricePaise: 89900, // ₹899
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 5,
  },
  'student-focus-wallpaper': {
    id: 'student-focus-wallpaper',
    itemType: OrderItemType.PRODUCT,
    title: 'Student Focus Wallpaper',
    description: 'Saraswati and Mercury energized digital wallpaper for sharp concentration, memory retention, and competitive exam success.',
    pricePaise: 89900, // ₹899
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 5,
  },
  'court-case-wallpaper': {
    id: 'court-case-wallpaper',
    itemType: OrderItemType.PRODUCT,
    title: 'VERDICT: The Ultimate Legal Victory Manifestation Wallpaper',
    description: 'Consecrated legal victory wallpaper invoking divine justice, clarity in judicial proceedings, and favorable resolution.',
    pricePaise: 89900, // ₹899
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 5,
  },
  'dhan-prapti-wallpaper': {
    id: 'dhan-prapti-wallpaper',
    itemType: OrderItemType.PRODUCT,
    title: 'Dhan Prapti Wallpaper',
    description: 'Sacred wealth attraction wallpaper using Vedic energy principles to activate monetary inflows and clear debt blockages.',
    pricePaise: 89900, // ₹899
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 5,
  },
  'maa-lakshmi-large-variant-digital-image': {
    id: 'maa-lakshmi-large-variant-digital-image',
    itemType: OrderItemType.PRODUCT,
    title: 'Maa Lakshmi – Variant Digital Image',
    description: 'Devotional fine art digital portrait of Kamla Devi Maa Lakshmi based on 20+ scriptures for prosperity and spiritual elevation.',
    pricePaise: 249900, // ₹2,499 (Large default)
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 5,
  },
  'ram-darbar-variant-digital-image': {
    id: 'ram-darbar-variant-digital-image',
    itemType: OrderItemType.PRODUCT,
    title: 'Ram Darbar Variant Digital Image',
    description: 'Majestic sacred artwork of Bhagwan Ram Darbar enhancing stability, leadership, confidence, and dharma.',
    pricePaise: 249900, // ₹2,499 (Large default)
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 5,
  },
};

export interface CalculatedItem {
  catalogItem: CatalogItem;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal: number; // Base amount before tax
  taxAmount: number; // Tax in paise
  totalAmount: number; // Final amount in paise
  metadata?: Record<string, any>;
}

export interface CalculatedOrder {
  items: CalculatedItem[];
  subtotal: number; // Sum of base amounts in paise
  taxAmount: number; // Sum of taxes in paise
  discountAmount: number; // Total discount in paise (0 by default)
  totalAmount: number; // Final payable amount in paise
  currency: string;
}

export class CommerceCatalogService {
  /**
   * Brings the consultation items up to date with the database. `getItem`, `listItems` and
   * `calculateOrder` are synchronous and read an in-memory snapshot, so every asynchronous caller
   * awaits this first:
   *   - before money is involved, with `force: true`: the types are re-read now and the call fails
   *     if the database cannot be read, so nothing is priced from a stale or default snapshot
   *     (this is also what makes the first request after start-up correct);
   *   - for a listing, without `force`: re-read at most every 30 seconds, and a failed read keeps
   *     the previous snapshot.
   */
  public async refresh(options: { force?: boolean } = {}): Promise<void> {
    await Promise.all([consultationCatalogSource.refresh(options), reportCatalogOverrides.refresh(options)]);
  }

  /**
   * True when the item's price can change without a release, so it must be re-read before money is
   * involved: a consultation type (database row) or a report (admin-editable since 2026-11-26).
   */
  public needsFreshRead(id: string): boolean {
    if (this.isDatabaseItem(id)) return true;
    return COMMERCE_CATALOG[id]?.itemType === OrderItemType.REPORT;
  }

  /**
   * Before pricing: re-read now (failing if the database cannot be read) only the sources the
   * requested items come from: consultation types and/or report edits.
   */
  public async refreshFor(ids: readonly string[]): Promise<void> {
    const consultations = ids.some((id) => this.isDatabaseItem(id));
    const reports = ids.some((id) => !this.isDatabaseItem(id) && COMMERCE_CATALOG[id]?.itemType === OrderItemType.REPORT);
    await Promise.all([
      consultations ? consultationCatalogSource.refresh({ force: true }) : Promise.resolve(),
      reports ? reportCatalogOverrides.refresh({ force: true }) : Promise.resolve(),
    ]);
  }

  /** True when `id` is not one of the code constants, i.e. it can only be a consultation row. */
  public isDatabaseItem(id: string): boolean {
    return !Object.prototype.hasOwnProperty.call(COMMERCE_CATALOG, id);
  }

  public getItem(id: string): CatalogItem | null {
    if (Object.prototype.hasOwnProperty.call(COMMERCE_CATALOG, id)) {
      return applyOverride(COMMERCE_CATALOG[id], reportCatalogOverrides.get(id));
    }
    // Consultation types are database rows (admin-editable); see consultation-catalog.adapter.ts.
    return consultationCatalogSource.getItem(id);
  }

  public getItemByLegacyReportType(reportType: ReportType): CatalogItem | null {
    const item = Object.values(COMMERCE_CATALOG).find(
      (entry) => entry.legacyReportType === reportType
    );
    return item ? applyOverride(item, reportCatalogOverrides.get(item.id)) : null;
  }

  public listItems(filter?: { itemType?: OrderItemType; activeOnly?: boolean }): CatalogItem[] {
    let items = Object.values(COMMERCE_CATALOG).map((item) => applyOverride(item, reportCatalogOverrides.get(item.id)));
    if (filter?.itemType) {
      items = items.filter((i) => i.itemType === filter.itemType);
    }
    if (filter?.activeOnly !== false) {
      items = items.filter((i) => i.isActive);
    }
    if (!filter?.itemType || filter.itemType === OrderItemType.CONSULTATION) {
      items = items.concat(consultationCatalogSource.listItems({ activeOnly: filter?.activeOnly !== false }));
    }
    return items;
  }

  /**
   * Authoritative decimal-safe calculation of items and order totals.
   * Completely immune to client-supplied prices, taxes, or discounts.
   */
  public calculateOrder(
    requestedItems: Array<{ catalogId: string; quantity?: number; metadata?: Record<string, any> }>
  ): CalculatedOrder {
    if (!requestedItems || !Array.isArray(requestedItems) || requestedItems.length === 0) {
      throw new ValidationError('At least one catalog item must be selected');
    }

    if (requestedItems.length > 50) {
      throw new ValidationError('Order exceeds maximum allowed item count (50 items)');
    }

    const calculatedItems: CalculatedItem[] = [];
    let orderSubtotal = 0;
    let orderTax = 0;
    let orderTotal = 0;

    for (const req of requestedItems) {
      const item = this.getItem(req.catalogId);
      if (!item) {
        throw new ValidationError(`Catalog offering not found: "${req.catalogId}"`);
      }

      if (!item.isActive) {
        throw new ValidationError(`Offering "${item.title}" is currently inactive or unavailable`);
      }

      const qty = req.quantity ?? 1;
      if (!Number.isInteger(qty) || qty < item.minQuantity || qty > item.maxQuantity) {
        throw new ValidationError(
          `Invalid quantity for "${item.title}". Must be between ${item.minQuantity} and ${item.maxQuantity}`
        );
      }

      // Snapshot unit price in paise (integer-safe)
      const unitPrice = item.pricePaise;
      const lineGross = unitPrice * qty;

      // Decimal-safe integer tax allocation.
      // GST inside the price (every code constant): Base = round(lineGross * 10000 / (10000 + taxRate)).
      // GST on top of the price (`taxIncluded: false`, possible for a consultation type edited in
      // the admin): Tax = round(lineGross * taxRate / 10000), halves up, and it is added to the total.
      // Both agree with `calculateSale` (./money/tax.ts), which is what an order is charged from.
      let lineNet: number;
      let lineTax: number;
      if (item.taxIncluded) {
        lineNet = Math.round((lineGross * 10000) / (10000 + item.taxRateBasisPoints));
        lineTax = lineGross - lineNet;
      } else {
        lineNet = lineGross;
        lineTax = Math.floor((lineGross * item.taxRateBasisPoints + 5000) / 10000);
      }
      const lineTotal = lineNet + lineTax;

      calculatedItems.push({
        catalogItem: item,
        quantity: qty,
        unitPrice,
        taxRate: item.taxRateBasisPoints,
        subtotal: lineNet,
        taxAmount: lineTax,
        totalAmount: lineTotal,
        metadata: req.metadata,
      });

      orderSubtotal += lineNet;
      orderTax += lineTax;
      orderTotal += lineTotal;
    }

    return {
      items: calculatedItems,
      subtotal: orderSubtotal,
      taxAmount: orderTax,
      discountAmount: 0,
      totalAmount: orderTotal,
      currency: 'INR',
    };
  }
}

export const commerceCatalog = new CommerceCatalogService();
