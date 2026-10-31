import { OrderItemType, FulfillmentType, ReportType } from '@prisma/client';
import { ValidationError } from '../../errors/app-error';

export interface CatalogItem {
  id: string;
  itemType: OrderItemType;
  title: string;
  description: string;
  pricePaise: number; // Stored in integer paise (e.g. 49900 = ₹499.00)
  currency: string;
  taxRateBasisPoints: number; // 1800 = 18.00% GST, 300 = 3.00% GST
  taxIncluded: boolean;
  fulfillmentType: FulfillmentType;
  isActive: boolean;
  minQuantity: number;
  maxQuantity: number;
  legacyReportType?: ReportType;
  consultationMode?: 'AUDIO' | 'VIDEO' | 'IN_PERSON';
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
    title: 'Janma Kundli & Birth Chart Report',
    description: 'Comprehensive astrological life blueprint with planetary placements, Bhavas, and Nakshatra.',
    pricePaise: 29900, // ₹299
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
  'report-planetary-summary': {
    id: 'report-planetary-summary',
    itemType: OrderItemType.REPORT,
    title: 'Planetary Dynamics & Dignity Summary',
    description: 'Detailed analysis of planetary dignities, combustions, retrogressions, and astronomical strengths.',
    pricePaise: 19900, // ₹199
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
    title: 'Career & Professional Life Report',
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
    title: 'Marriage & Relationship Compatibility Report',
    description: 'Ashtakoota 36-Guna Kundli Milan, 7th house partner dynamics, and planetary harmony evaluation.',
    pricePaise: 49900, // ₹499
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
    title: 'Executive Career & Wealth Prosperity Dossier',
    description: 'Multi-divisional D10/D9 analysis with 5-year Dasha roadmap and executive career strategic planning.',
    pricePaise: 69900, // ₹699
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.DIGITAL,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
    legacyReportType: ReportType.CAREER_PROSITY,
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
    isActive: true,
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
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
    legacyReportType: ReportType.GUPTA_NADI_DOSSIER,
    metadataSchema: { requiredFields: ['birthProfileId'] },
  },

  // ---------------------------------------------------------------------------
  // 2. CONSULTATION BOOKINGS (SERVICE) - AUTHORITATIVE 10 SERVICE TIERS
  // ---------------------------------------------------------------------------
  'consult-budget-friendly': {
    id: 'consult-budget-friendly',
    itemType: OrderItemType.CONSULTATION,
    title: 'Budget Friendly Consultation',
    description: '15-minute focused phone consultation with Astro Sushil answering up to 3 specific questions with remedial guidance.',
    pricePaise: 500000, // ₹5,000
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.SERVICE,
    consultationMode: 'AUDIO',
    durationMinutes: 15,
    responseDays: 15,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },
  'consult-general-audio': {
    id: 'consult-general-audio',
    itemType: OrderItemType.CONSULTATION,
    title: 'General Consultation (Audio)',
    description: '30-minute direct one-on-one voice call with Astro Sushil covering comprehensive life issues and remedies.',
    pricePaise: 1000000, // ₹10,000
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.SERVICE,
    consultationMode: 'AUDIO',
    durationMinutes: 30,
    responseDays: 15,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },
  'consult-general-video': {
    id: 'consult-general-video',
    itemType: OrderItemType.CONSULTATION,
    title: 'General Consultation (Video)',
    description: '30-minute interactive video call with Astro Sushil with thorough chart analysis and solutions.',
    pricePaise: 1500000, // ₹15,000
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.SERVICE,
    consultationMode: 'VIDEO',
    durationMinutes: 30,
    responseDays: 15,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },
  'consult-standard-audio': {
    id: 'consult-standard-audio',
    itemType: OrderItemType.CONSULTATION,
    title: 'Standard Consultation (Audio)',
    description: '30-minute priority scheduling voice consultation with Astro Sushil for reliable clarity.',
    pricePaise: 1500000, // ₹15,000
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.SERVICE,
    consultationMode: 'AUDIO',
    durationMinutes: 30,
    responseDays: 7,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },
  'consult-standard-video': {
    id: 'consult-standard-video',
    itemType: OrderItemType.CONSULTATION,
    title: 'Standard Consultation (Video)',
    description: '30-minute priority video consultation with Astro Sushil with comprehensive planetary remedy roadmap.',
    pricePaise: 2000000, // ₹20,000
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.SERVICE,
    consultationMode: 'VIDEO',
    durationMinutes: 30,
    responseDays: 7,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },
  'consult-urgent-audio': {
    id: 'consult-urgent-audio',
    itemType: OrderItemType.CONSULTATION,
    title: 'Urgent Consultation (Audio)',
    description: '30-minute expedited phone session guaranteed within 4 days (or 48-72h) for critical inflection points.',
    pricePaise: 2500000, // ₹25,000
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.SERVICE,
    consultationMode: 'AUDIO',
    durationMinutes: 30,
    responseDays: 4,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },
  'consult-urgent-video': {
    id: 'consult-urgent-video',
    itemType: OrderItemType.CONSULTATION,
    title: 'Urgent Consultation (Video)',
    description: '30-minute expedited video call guaranteed within 4 days for fast astrological clarity.',
    pricePaise: 3500000, // ₹35,000
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.SERVICE,
    consultationMode: 'VIDEO',
    durationMinutes: 30,
    responseDays: 4,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },
  'consult-signature-analysis': {
    id: 'consult-signature-analysis',
    itemType: OrderItemType.CONSULTATION,
    title: 'Signature Analysis Consultation',
    description: '30-minute specialized graphology and astrological session optimizing your signature for wealth, status, and success.',
    pricePaise: 2500000, // ₹25,000
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.SERVICE,
    consultationMode: 'VIDEO',
    durationMinutes: 30,
    responseDays: 7,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },
  'consult-wrist-watch-therapy': {
    id: 'consult-wrist-watch-therapy',
    itemType: OrderItemType.CONSULTATION,
    title: 'Wrist Watch Therapy Consultation',
    description: '30-minute astrological wrist watch selection, dial element alignment, and metal recommendation session.',
    pricePaise: 5000000, // ₹50,000
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.SERVICE,
    consultationMode: 'VIDEO',
    durationMinutes: 30,
    responseDays: 7,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },
  'consult-longevity': {
    id: 'consult-longevity',
    itemType: OrderItemType.CONSULTATION,
    title: 'Age & Longevity Consultation',
    description: '30-minute in-depth lifespan, Maraka/Badhaka evaluation, and critical health milestone consultation.',
    pricePaise: 6000000, // ₹60,000
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.SERVICE,
    consultationMode: 'VIDEO',
    durationMinutes: 30,
    responseDays: 7,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },
  'consult-instant-audio': {
    id: 'consult-instant-audio',
    itemType: OrderItemType.CONSULTATION,
    title: 'Instant Consultation (Audio - 24h)',
    description: '30-minute emergency voice call booked within 24 hours directly with Astro Sushil.',
    pricePaise: 9000000, // ₹90,000
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.SERVICE,
    consultationMode: 'AUDIO',
    durationMinutes: 30,
    responseDays: 1,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },
  'consult-instant-video': {
    id: 'consult-instant-video',
    itemType: OrderItemType.CONSULTATION,
    title: 'Instant Consultation (Video - 24h)',
    description: '30-minute emergency video consultation booked within 24 hours directly with Astro Sushil.',
    pricePaise: 10000000, // ₹1,00,000
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.SERVICE,
    consultationMode: 'VIDEO',
    durationMinutes: 30,
    responseDays: 1,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },
  'consult-in-person-delhi': {
    id: 'consult-in-person-delhi',
    itemType: OrderItemType.CONSULTATION,
    title: 'Face-to-Face Consultation (Delhi / NCR)',
    description: '30-minute private in-person consultation at Astro Sushil’s Delhi NCR office.',
    pricePaise: 10000000, // ₹1,00,000
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.SERVICE,
    consultationMode: 'IN_PERSON',
    durationMinutes: 30,
    responseDays: 7,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },
  'consult-in-person-other': {
    id: 'consult-in-person-other',
    itemType: OrderItemType.CONSULTATION,
    title: 'Face-to-Face Consultation (Other Cities)',
    description: 'Exclusive in-person consultation in client’s home city with personalized remedies.',
    pricePaise: 15000000, // ₹1,50,000
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.SERVICE,
    consultationMode: 'IN_PERSON',
    durationMinutes: 30,
    responseDays: 7,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },

  // Backward compatibility alias keys
  'consult-voice-20': {
    id: 'consult-voice-20',
    itemType: OrderItemType.CONSULTATION,
    title: '20-Minute Focused Voice Consultation',
    description: 'One-on-one direct phone consultation with Astro Sushil focusing on one primary life question.',
    pricePaise: 150000, // ₹1,500
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.SERVICE,
    consultationMode: 'AUDIO',
    durationMinutes: 20,
    responseDays: 7,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },
  'consult-video-45': {
    id: 'consult-video-45',
    itemType: OrderItemType.CONSULTATION,
    title: '45-Minute In-Depth Video Consultation',
    description: 'Interactive video session covering complete Janma Kundli, current Dasha, and life questions.',
    pricePaise: 310000, // ₹3,100
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.SERVICE,
    consultationMode: 'VIDEO',
    durationMinutes: 45,
    responseDays: 7,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },
  'consult-in-person-60': {
    id: 'consult-in-person-60',
    itemType: OrderItemType.CONSULTATION,
    title: '60-Minute Office In-Person Consultation',
    description: 'Private 1-on-1 consultation in Astro Sushil’s office with comprehensive astrological remedies.',
    pricePaise: 510000, // ₹5,100
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.SERVICE,
    consultationMode: 'IN_PERSON',
    durationMinutes: 60,
    responseDays: 7,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },
  'consult-urgent-24h': {
    id: 'consult-urgent-24h',
    itemType: OrderItemType.CONSULTATION,
    title: 'Urgent 24-Hour Expedited Video Consultation',
    description: 'Priority emergency booking guaranteed within 24 hours for critical decisions.',
    pricePaise: 1100000, // ₹11,000
    currency: 'INR',
    taxRateBasisPoints: 1800,
    taxIncluded: true,
    fulfillmentType: FulfillmentType.SERVICE,
    consultationMode: 'VIDEO',
    durationMinutes: 30,
    responseDays: 1,
    isActive: true,
    minQuantity: 1,
    maxQuantity: 1,
  },

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
  public getItem(id: string): CatalogItem | null {
    return COMMERCE_CATALOG[id] || null;
  }

  public getItemByLegacyReportType(reportType: ReportType): CatalogItem | null {
    const item = Object.values(COMMERCE_CATALOG).find(
      (entry) => entry.legacyReportType === reportType
    );
    return item || null;
  }

  public listItems(filter?: { itemType?: OrderItemType; activeOnly?: boolean }): CatalogItem[] {
    let items = Object.values(COMMERCE_CATALOG);
    if (filter?.itemType) {
      items = items.filter((i) => i.itemType === filter.itemType);
    }
    if (filter?.activeOnly !== false) {
      items = items.filter((i) => i.isActive);
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

      // Calculate decimal-safe integer tax allocation (inclusive pricing)
      // Base = round(lineGross * 10000 / (10000 + taxRate))
      const lineNet = Math.round((lineGross * 10000) / (10000 + item.taxRateBasisPoints));
      const lineTax = lineGross - lineNet;

      calculatedItems.push({
        catalogItem: item,
        quantity: qty,
        unitPrice,
        taxRate: item.taxRateBasisPoints,
        subtotal: lineNet,
        taxAmount: lineTax,
        totalAmount: lineGross,
        metadata: req.metadata,
      });

      orderSubtotal += lineNet;
      orderTax += lineTax;
      orderTotal += lineGross;
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
