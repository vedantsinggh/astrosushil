import { ProductType } from '@prisma/client';

export interface VerifiedProductSeed {
  slug: string;
  catalogId: string;
  title: string;
  hindiTitle: string;
  description: string;
  hindiDescription: string;
  category: string;
  productType: ProductType;
  mrp: number; // in paise
  price: number; // in paise
  currency: string;
  stock: number;
  isAvailable: boolean;
  requiresShipping: boolean;
  imageUrl: string;
  galleryImages?: string[];
  variants?: Array<{
    id: string;
    name: string;
    value: string;
    price: number; // in paise
    mrp: number; // in paise
    stock: number;
  }>;
  metadata?: Record<string, any>;
}

export const VERIFIED_PRODUCTS: VerifiedProductSeed[] = [
  {
    slug: 'ancient-ramayana-era-herb-for-unlimited-wealth-consecrated-during-ravi-pushya-nakshatra-in-ayodhya-by-astro-sushil',
    catalogId: 'ancient-ramayana-era-herb-for-unlimited-wealth-consecrated-during-ravi-pushya-nakshatra-in-ayodhya-by-astro-sushil',
    title: 'Ancient Ramayana Era- Herb for Unlimited Wealth',
    hindiTitle: 'प्राचीन रामायण कालीन दुर्लभ जड़ी-बूटी (रवि पुष्य नक्षत्र में अभिमंत्रित)',
    description: 'Sacred consecrated herb for unlimited wealth, blessed during Ravi Pushya Nakshatra in Ayodhya by Astro Sushil. Dispels financial obstacles and attracts lasting Lakshmi energy.',
    hindiDescription: 'रवि पुष्य नक्षत्र में अयोध्या धाम में पूज्य गुरुदेव एस्ट्रो सुशील द्वारा अभिमंत्रित दिव्य रामायण कालीन जड़ी-बूटी। यह धन, समृद्धि और व्यापार में चमत्कारी उन्नति प्रदान करती है।',
    category: 'PHYSICAL_HERB',
    productType: ProductType.PHYSICAL,
    mrp: 799900, // ₹7,999
    price: 399900, // ₹3,999
    currency: 'INR',
    stock: 9995,
    isAvailable: true,
    requiresShipping: true,
    imageUrl: 'https://astrosushil.s3.ap-south-1.amazonaws.com/assets/1780244329225-ancient-ramayana-era--herb-for-unlimited-wealth-1.webp',
    galleryImages: [
      'https://astrosushil.s3.ap-south-1.amazonaws.com/assets/1780244329225-ancient-ramayana-era--herb-for-unlimited-wealth-1.webp',
    ],
    metadata: {
      deliveryDays: 5,
      weightGrams: 50,
      blessedLocation: 'Ayodhya Dham',
      consecrationOccasion: 'Ravi Pushya Nakshatra',
    },
  },
  {
    slug: 'dhan-varsha-kit-maa-lakshmi-digital-art-dhan-prapti-wallpaper-secret-mantrain-astrosushil-voice',
    catalogId: 'dhan-varsha-kit-maa-lakshmi-digital-art-dhan-prapti-wallpaper-secret-mantrain-astrosushil-voice',
    title: 'Dhan Varsha Kit – Maa Lakshmi Digital Art + Dhan Prapti Wallpaper + Secret Mantra',
    hindiTitle: 'धन वर्षा किट – माँ लक्ष्मी डिजिटल आर्ट + धन प्राप्ति वॉलपेपर + गुप्त मंत्र',
    description: 'Comprehensive wealth manifestation kit containing ultra-high-definition 4K Maa Lakshmi digital art, consecrated Dhan Prapti phone/desktop wallpaper, and secret Beej Mantra recited in Astro Sushil\'s voice.',
    hindiDescription: 'अखंड लक्ष्मी कृपा हेतु संपूर्ण डिजिटल किट। इसमें 4K माँ लक्ष्मी डिजिटल कला, अभिमंत्रित धन प्राप्ति वॉलपेपर एवं पूज्य गुरुदेव की पावन वाणी में सिद्ध गुप्त मंत्र सम्मिलित हैं।',
    category: 'DIGITAL_BUNDLE',
    productType: ProductType.DIGITAL_BUNDLE,
    mrp: 439700, // ₹4,397
    price: 219900, // ₹2,199
    currency: 'INR',
    stock: -1, // Unlimited digital
    isAvailable: true,
    requiresShipping: false,
    imageUrl: 'https://astrosushil.s3.ap-south-1.amazonaws.com/assets/1780244851743-dhanvrashakit-1.webp',
    galleryImages: [
      'https://astrosushil.s3.ap-south-1.amazonaws.com/assets/1780244851743-dhanvrashakit-1.webp',
    ],
    metadata: {
      bundleAssets: [
        { name: 'Maa Lakshmi Digital Art (High-Res 4K)', key: 'digital/maa-lakshmi-art-4k.webp', type: 'IMAGE' },
        { name: 'Dhan Prapti Wallpaper (Mobile & Desktop)', key: 'digital/dhan-prapti-wallpaper-hd.webp', type: 'IMAGE' },
        { name: 'Secret Dhan Prapti Mantra (Audio by Astro Sushil)', key: 'audio/secret-mantra-astrosushil.mp3', type: 'AUDIO' },
      ],
    },
  },
  {
    slug: 'vivah-siddh-wallpaper-for-getting-married',
    catalogId: 'vivah-siddh-wallpaper-for-getting-married',
    title: 'Vivah Siddh Wallpaper For Getting Married',
    hindiTitle: 'विवाह सिद्ध वॉलपेपर (शीघ्र एवं सुखद विवाह हेतु)',
    description: 'Spiritually energized digital wallpaper designed using Vedic and astrological principles to bring harmony, love, and stability into relationships and eliminate marriage delays.',
    hindiDescription: 'वैदिक एवं ज्योतिषीय सिद्धांतों पर आधारित आध्यात्मिक रूप से ऊर्जावान डिजिटल वॉलपेपर। विवाह में आ रही बाधाओं को दूर कर योग्य जीवनसाथी के शीघ्र संयोग बनाता है।',
    category: 'WALLPAPER',
    productType: ProductType.DIGITAL_WALLPAPER,
    mrp: 189900, // ₹1,899
    price: 89900, // ₹899
    currency: 'INR',
    stock: -1,
    isAvailable: true,
    requiresShipping: false,
    imageUrl: 'https://astrosushil.s3.ap-south-1.amazonaws.com/assets/1780298759540-vivah-sidh-with-copyright-2.webp',
    metadata: {
      digitalAssetKey: 'digital/vivah-sidh-with-copyright-2.webp',
      aspectRatio: '9:16',
    },
  },
  {
    slug: 'garbh-dharan-conceiving-wallpaper',
    catalogId: 'garbh-dharan-conceiving-wallpaper',
    title: 'Garbh Dharan Conceiving Wallpaper',
    hindiTitle: 'गर्भ धारण वॉलपेपर (संतान प्राप्ति हेतु)',
    description: 'Vedic energized wallpaper designed for prospective parents seeking conceiving blessings, hormonal harmony, and planetary support for successful pregnancy.',
    hindiDescription: 'संतान सुख की अभिलाषा रखने वाले दंपत्तियों के लिए पंचतत्व और बृहस्पति-चंद्रमा की सकारात्मक ऊर्जा से सिद्ध दिव्य गर्भ धारण वॉलपेपर।',
    category: 'WALLPAPER',
    productType: ProductType.DIGITAL_WALLPAPER,
    mrp: 189900,
    price: 89900,
    currency: 'INR',
    stock: -1,
    isAvailable: true,
    requiresShipping: false,
    imageUrl: 'https://astrosushil.s3.ap-south-1.amazonaws.com/assets/1780300538812-garbh-dharan-1.webp',
    metadata: {
      digitalAssetKey: 'digital/garbh-dharan-1.webp',
      aspectRatio: '9:16',
    },
  },
  {
    slug: 'garbh-raksha-wallpaper',
    catalogId: 'garbh-raksha-wallpaper',
    title: 'Garbh Raksha Wallpaper',
    hindiTitle: 'गर्भ रक्षा यंत्र वॉलपेपर (सुरक्षा एवं आरोग्य हेतु)',
    description: 'Energized protective spiritual wallpaper safeguarding pregnancy, mother, and child health according to sacred Vedic yantra geometry.',
    hindiDescription: 'गर्भावस्था के दौरान माता और शिशु की नकारात्मक ऊर्जाओं एवं ग्रह दोषों से संपूर्ण रक्षा हेतु अभिमंत्रित दिव्य गर्भ रक्षा यंत्र वॉलपेपर।',
    category: 'WALLPAPER',
    productType: ProductType.DIGITAL_WALLPAPER,
    mrp: 189900,
    price: 89900,
    currency: 'INR',
    stock: -1,
    isAvailable: true,
    requiresShipping: false,
    imageUrl: 'https://astrosushil.s3.ap-south-1.amazonaws.com/assets/1780300959521-garbh-rksha-yantar-1.webp',
    metadata: {
      digitalAssetKey: 'digital/garbh-rksha-yantar-1.webp',
      aspectRatio: '9:16',
    },
  },
  {
    slug: 'student-focus-wallpaper',
    catalogId: 'student-focus-wallpaper',
    title: 'Student Focus Wallpaper',
    hindiTitle: 'विद्या एवं एकाग्रता वॉलपेपर (छात्रों हेतु)',
    description: 'Saraswati and Mercury energized digital wallpaper for sharp concentration, memory retention, mental clarity, and competitive examination success.',
    hindiDescription: 'छात्रों के लिए माँ सरस्वती और बुध ग्रह के शुभ प्रभावों से अभिमंत्रित वॉलपेपर, जो एकाग्रता, स्मरण शक्ति और अध्ययन में सफलता बढ़ाता है।',
    category: 'WALLPAPER',
    productType: ProductType.DIGITAL_WALLPAPER,
    mrp: 189900,
    price: 89900,
    currency: 'INR',
    stock: -1,
    isAvailable: true,
    requiresShipping: false,
    imageUrl: 'https://astrosushil.s3.ap-south-1.amazonaws.com/assets/1780303497894-student-focus-wallpaper.webp',
    metadata: {
      digitalAssetKey: 'digital/student-focus-wallpaper.webp',
      aspectRatio: '9:16',
    },
  },
  {
    slug: 'court-case-wallpaper',
    catalogId: 'court-case-wallpaper',
    title: 'VERDICT: The Ultimate Legal Victory Manifestation Wallpaper',
    hindiTitle: 'कोर्ट केस विजय वॉलपेपर (न्याय एवं सफलता हेतु)',
    description: 'Consecrated legal victory wallpaper invoking divine justice, clarity in judicial proceedings, elimination of false accusations, and favorable verdict resolution.',
    hindiDescription: 'न्यायालयीन विवादों, मुकदमों और कानूनी समस्याओं में सत्य और न्याय की विजय हेतु विशेष रूप से अभिमंत्रित शक्तिशाली वॉलपेपर।',
    category: 'WALLPAPER',
    productType: ProductType.DIGITAL_WALLPAPER,
    mrp: 189900,
    price: 89900,
    currency: 'INR',
    stock: -1,
    isAvailable: true,
    requiresShipping: false,
    imageUrl: 'https://astrosushil.s3.ap-south-1.amazonaws.com/assets/1780302974428-verdict-wallpaper1.webp',
    metadata: {
      digitalAssetKey: 'digital/verdict-wallpaper1.webp',
      aspectRatio: '9:16',
    },
  },
  {
    slug: 'dhan-prapti-wallpaper',
    catalogId: 'dhan-prapti-wallpaper',
    title: 'Dhan Prapti Wallpaper',
    hindiTitle: 'धन प्राप्ति वॉलपेपर (आर्थिक समृद्धि हेतु)',
    description: 'Sacred wealth attraction wallpaper using Vedic energy principles to activate monetary inflows, unlock stagnant assets, and eliminate debt blockages.',
    hindiDescription: 'श्री सूक्त एवं कनकधारा स्तोत्र के दिव्य बीजों से अभिमंत्रित वॉलपेपर, जो धन आगमन के नए मार्ग खोलता है और कर्ज से मुक्ति दिलाता है।',
    category: 'WALLPAPER',
    productType: ProductType.DIGITAL_WALLPAPER,
    mrp: 189900,
    price: 89900,
    currency: 'INR',
    stock: -1,
    isAvailable: true,
    requiresShipping: false,
    imageUrl: 'https://astrosushil.s3.ap-south-1.amazonaws.com/assets/1780389681978-dhan-prapti-copyright-2.webp',
    metadata: {
      digitalAssetKey: 'digital/dhan-prapti-copyright-2.webp',
      aspectRatio: '9:16',
    },
  },
  {
    slug: 'maa-lakshmi-large-variant-digital-image',
    catalogId: 'maa-lakshmi-large-variant-digital-image',
    title: 'Maa Lakshmi – Variant Digital Image',
    hindiTitle: 'माँ लक्ष्मी – पावन डिजिटल स्वरूप',
    description: 'Devotional fine art digital portrait of Kamla Devi Maa Lakshmi based on 20+ scriptures for prosperity, spiritual elevation, and divine grace.',
    hindiDescription: '२० से अधिक प्राचीन शास्त्रों के आधार पर निर्मित माँ कमला देवी (लक्ष्मी) का मनोहारी दिव्य डिजिटल चित्र, जो घर एवं व्यापार में अखंड श्री का वास कराता है।',
    category: 'DIGITAL_ART',
    productType: ProductType.DIGITAL_ART,
    mrp: 249900, // Large default
    price: 249900, // Large default
    currency: 'INR',
    stock: -1,
    isAvailable: true,
    requiresShipping: false,
    imageUrl: 'https://astrosushil.s3.ap-south-1.amazonaws.com/assets/1780043520880-maa-lakshmi--large-variant-digital-image.webp',
    variants: [
      { id: 'size-large', name: 'Size', value: 'Large', price: 249900, mrp: 249900, stock: 10000 },
      { id: 'size-medium', name: 'Size', value: 'Medium', price: 199900, mrp: 199900, stock: 10000 },
      { id: 'size-small', name: 'Size', value: 'Small', price: 149900, mrp: 149900, stock: 10000 },
    ],
    metadata: {
      digitalAssetKey: 'digital/maa-lakshmi--large-variant-digital-image.webp',
    },
  },
  {
    slug: 'ram-darbar-variant-digital-image',
    catalogId: 'ram-darbar-variant-digital-image',
    title: 'Ram Darbar Variant Digital Image',
    hindiTitle: 'राम दरबार – पावन डिजिटल स्वरूप',
    description: 'Majestic sacred artwork of Bhagwan Ram Darbar enhancing stability, leadership, confidence, protection, and righteous victory.',
    hindiDescription: 'प्रभु श्री राम, माता सीता, भ्राता लक्ष्मण एवं वीर हनुमान जी सहित संपूर्ण राम दरबार का पावन डिजिटल चित्र। पारिवारिक एकता एवं मान-सम्मान का संवर्धन करता है।',
    category: 'DIGITAL_ART',
    productType: ProductType.DIGITAL_ART,
    mrp: 249900, // Large default
    price: 249900, // Large default
    currency: 'INR',
    stock: -1,
    isAvailable: true,
    requiresShipping: false,
    imageUrl: 'https://astrosushil.s3.ap-south-1.amazonaws.com/assets/1780048936471-ram-darbar-variant-digital-image.webp',
    variants: [
      { id: 'size-large', name: 'Size', value: 'Large', price: 249900, mrp: 249900, stock: 10000 },
      { id: 'size-medium', name: 'Size', value: 'Medium', price: 199900, mrp: 199900, stock: 10000 },
      { id: 'size-small', name: 'Size', value: 'Small', price: 149900, mrp: 149900, stock: 10000 },
    ],
    metadata: {
      digitalAssetKey: 'digital/ram-darbar-variant-digital-image.webp',
    },
  },
];
