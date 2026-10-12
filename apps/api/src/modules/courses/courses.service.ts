import { prisma } from '../../services/prisma.service';
import { COMMERCE_CATALOG } from '../commerce/commerce.catalog';
import { commerceService } from '../commerce/commerce.service';
import { paymentService } from '../../services/payment.service';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  AuthorizationError,
  ForbiddenError,
  AuthenticationError,
} from '../../errors/app-error';
import {
  CourseLevel,
  VideoType,
  EntitlementSource,
  EntitlementStatus,
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
} from '@prisma/client';
import { logger } from '../../utils/logger';

export interface ListCoursesFilters {
  search?: string;
  level?: CourseLevel;
  language?: string;
  category?: string;
}

export class CoursesService {
  /**
   * Seed/Sync the 3 authoritative website courses from live website data into Postgres
   */
  public async seedVerifiedCourses(): Promise<void> {
    const coursesData = [
      {
        sku: 'course-gupt-nadi',
        slug: 'gupt-nadi-astrology',
        title: 'Gupt Nadi Astrology',
        hindiTitle: 'गुप्त नाड़ी ज्योतिष',
        shortDescription:
          'Astro Sushil Kumar, a renowned Nadi Astrology expert, brings you a structured and in-depth course on Nadi Astrology, covering everything from fundamentals to advanced techniques. This course consists of 10-12 detailed video lectures, explaining step-by-step concepts, techniques, and methods to understand and apply Nadi Astrology effectively.',
        hindiDescription:
          'एस्ट्रो सुशील कुमार जी द्वारा तैयार गुप्त नाड़ी ज्योतिष का संपूर्ण एवं प्रामाणिक पाठ्यक्रम। मूलभूत सिद्धांतों से लेकर फलकथन की गूढ़ तकनीकों तक 12 विस्तृत पाठ।',
        instructorName: 'Astro Sushil Kumar Singh',
        language: 'English',
        level: CourseLevel.BEGINNER,
        pricePaise: 599900, // ₹5,999
        originalPricePaise: 1099900, // ₹10,999
        currency: 'INR',
        thumbnail: 'https://astro-sushil.s3.ap-southeast-2.amazonaws.com/assets/1787406133110-gupt-nadi-course-thumbnail.webp',
        thumbnailKey: 'assets/1787406133110-gupt-nadi-course-thumbnail.webp',
        platformUrl: 'https://courses.astrosushil.com/courses/Master-Gupt-Nadi-Astrology-by-Astro-Sushil-6a85546cba1f3fecd1f094f4',
        totalDurationMinutes: 240,
        isFeatured: true,
        sections: [
          {
            title: 'Section 1: Foundations & Nadi Principles',
            hindiTitle: 'भाग 1: मूल सिद्धांत एवं नाड़ी परिचय',
            orderIndex: 1,
            lessons: [
              {
                title: 'Introduction of Astrology',
                hindiTitle: 'ज्योतिष का परिचय',
                description: 'Overview of Vedic astrology and cosmic timing.',
                orderIndex: 1,
                durationMinutes: 15,
                durationSeconds: 900,
                isFreePreview: true,
                videoUrl: 'https://d502jbuhuh9wk.cloudfront.net/courses/6a85546cba1f3fecd1f094f4/preview_intro.m3u8',
              },
              {
                title: 'Basic Introduction - Gupt Nadi Astrology',
                hindiTitle: 'गुप्त नाड़ी ज्योतिष मूल परिचय',
                description: 'Core concepts of planetary combinations in Gupta Nadi.',
                orderIndex: 2,
                durationMinutes: 20,
                durationSeconds: 1200,
                isFreePreview: false,
                videoUrl: null,
              },
            ],
          },
          {
            title: 'Section 2: Life Events & Timing Analysis',
            hindiTitle: 'भाग 2: जीवन घटनाएं एवं काल निर्धारण',
            orderIndex: 2,
            lessons: [
              {
                title: 'Chapter 1 - Child Birth',
                hindiTitle: 'अध्याय 1 - संतान योग',
                description: 'Timing of progeny and planetary karakas for childbirth.',
                orderIndex: 1,
                durationMinutes: 25,
                durationSeconds: 1500,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 2 - Education Part 1',
                hindiTitle: 'अध्याय 2 - शिक्षा भाग 1',
                description: 'Academic aptitude and 4th/5th house combinations.',
                orderIndex: 2,
                durationMinutes: 20,
                durationSeconds: 1200,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 3 - Education Part 2',
                hindiTitle: 'अध्याय 3 - शिक्षा भाग 2',
                description: 'Higher education and competitive examinations.',
                orderIndex: 3,
                durationMinutes: 22,
                durationSeconds: 1320,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 4 - Foreign Travel',
                hindiTitle: 'अध्याय 4 - विदेश यात्रा योग',
                description: 'Combinations for overseas settlement and travel.',
                orderIndex: 4,
                durationMinutes: 18,
                durationSeconds: 1080,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 5 - Foreign Travel & Visa',
                hindiTitle: 'अध्याय 5 - विदेश यात्रा एवं वीज़ा',
                description: 'Predicting visa clearance and global migration.',
                orderIndex: 5,
                durationMinutes: 20,
                durationSeconds: 1200,
                isFreePreview: false,
                videoUrl: null,
              },
            ],
          },
          {
            title: 'Section 3: Wealth, Career & Medical Astrology',
            hindiTitle: 'भाग 3: धन, आजीविका एवं चिकित्सा ज्योतिष',
            orderIndex: 3,
            lessons: [
              {
                title: 'Chapter 6 - Property, Land & House',
                hindiTitle: 'अध्याय 6 - भूमि, भवन एवं संपत्ति',
                description: 'Acquisition of real estate and planetary signatures.',
                orderIndex: 1,
                durationMinutes: 20,
                durationSeconds: 1200,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 7 - Vehicle',
                hindiTitle: 'अध्याय 7 - वाहन योग',
                description: 'Vehicle purchases and luxury comforts.',
                orderIndex: 2,
                durationMinutes: 15,
                durationSeconds: 900,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 8 - Loan, Disease & Jobs',
                hindiTitle: 'अध्याय 8 - ऋण, रोग एवं नौकरी',
                description: '6th house matters, debt clearance, and service employment.',
                orderIndex: 3,
                durationMinutes: 22,
                durationSeconds: 1320,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 9 - Promotion',
                hindiTitle: 'अध्याय 9 - पदोन्नति योग',
                description: 'Career elevations, government favors, and recognition.',
                orderIndex: 4,
                durationMinutes: 18,
                durationSeconds: 1080,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 10 - Medical Astrology',
                hindiTitle: 'अध्याय 10 - चिकित्सा ज्योतिष',
                description: 'Health vulnerabilities and preventive remedies.',
                orderIndex: 5,
                durationMinutes: 25,
                durationSeconds: 1500,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 11 - Wedding & Divorce',
                hindiTitle: 'अध्याय 11 - विवाह एवं वैवाहिक विश्लेषण',
                description: 'Marital longevity, relationship harmony, and conflict indicators.',
                orderIndex: 6,
                durationMinutes: 20,
                durationSeconds: 1200,
                isFreePreview: false,
                videoUrl: null,
              },
            ],
          },
        ],
      },
      {
        sku: 'course-kn-rao-marriage-money',
        slug: 'shri-k-n-rao-method-of-marriage-money-astrology',
        title: 'Shri K.N. Rao Method of Marriage & Money Astrology',
        hindiTitle: 'श्री के.एन. राव विवाह एवं धन ज्योतिष पद्धति',
        shortDescription:
          'Astrological Methods of Shri K.N. Rao for Marriage & Money is a practical course by Astro Sushil Sir, designed for those who want to deeply understand how astrology can reveal the timing of marriage and financial growth. Covers 50+ real reasons for delayed marriage, special rules for female charts, and multiple dasha systems.',
        hindiDescription:
          'श्री के.एन. राव पद्धति पर आधारित विवाह समय निर्धारण, विलंब के 50+ कारण, स्त्री जातक कुंडली के विशेष नियम एवं धन प्राप्ति के शक्तिशाली योगों का सविस्तार विश्लेषण।',
        instructorName: 'Astro Sushil Kumar Singh',
        language: 'Hindi',
        level: CourseLevel.ADVANCED,
        pricePaise: 499900, // ₹4,999
        originalPricePaise: 999900, // ₹9,999
        currency: 'INR',
        thumbnail: 'https://astro-sushil.s3.ap-southeast-2.amazonaws.com/assets/1787406080319-marriage--money-course-thumbnail.webp',
        thumbnailKey: 'assets/1787406080319-marriage--money-course-thumbnail.webp',
        platformUrl: 'https://courses.astrosushil.com/courses/Shri-KN-Rao-Method-of-Marriage--Money-Astrology-by-Astro-Sushil-6a86afc2ccd767596968bdd2',
        totalDurationMinutes: 180,
        isFeatured: true,
        sections: [
          {
            title: 'Section 1: Marriage Timing & Compatibility',
            hindiTitle: 'भाग 1: विवाह समय एवं मिलान विश्लेषण',
            orderIndex: 1,
            lessons: [
              {
                title: 'Chapter 1 - Introduction of Marriage & Money Course & Basic Astrology',
                hindiTitle: 'अध्याय 1 - विवाह एवं धन पाठ्यक्रम परिचय',
                description: 'Introduction to K.N. Rao principles and Dasha application.',
                orderIndex: 1,
                durationMinutes: 20,
                durationSeconds: 1200,
                isFreePreview: true,
                videoUrl: 'https://d502jbuhuh9wk.cloudfront.net/courses/6a86afc2ccd767596968bdd2/preview_kn_intro.m3u8',
              },
              {
                title: 'Chapter 2 - Marriage Astrology',
                hindiTitle: 'अध्याय 2 - विवाह ज्योतिष मूल नियम',
                description: '7th house analysis, Venus/Jupiter karakas, and Navamsha.',
                orderIndex: 2,
                durationMinutes: 25,
                durationSeconds: 1500,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 3 - Marriage Astrology',
                hindiTitle: 'अध्याय 3 - विवाह समय निर्धारण',
                description: 'Timing marriage using Chara Dasha and Vimshottari.',
                orderIndex: 3,
                durationMinutes: 25,
                durationSeconds: 1500,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 4 - Marriage & Money Astrology',
                hindiTitle: 'अध्याय 4 - विवाह उपरांत भाग्योदय योग',
                description: 'Prosperity through partner and joint wealth.',
                orderIndex: 4,
                durationMinutes: 20,
                durationSeconds: 1200,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 5 - Marriage Astrology',
                hindiTitle: 'अध्याय 5 - विवाह में विलंब के 50 कारण',
                description: 'Over 50 identifiable astrological causes for marriage delays.',
                orderIndex: 5,
                durationMinutes: 25,
                durationSeconds: 1500,
                isFreePreview: false,
                videoUrl: null,
              },
            ],
          },
          {
            title: 'Section 2: Money, Assets & Dasha Systems',
            hindiTitle: 'भाग 2: धन, संपत्ति एवं दशा पद्धतियां',
            orderIndex: 2,
            lessons: [
              {
                title: 'Chapter 6 - Money Astrology',
                hindiTitle: 'अध्याय 6 - धनेश एवं लाभेश योग',
                description: '2nd and 11th house dynamics for wealth accumulation.',
                orderIndex: 1,
                durationMinutes: 20,
                durationSeconds: 1200,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 7 - Money Astrology',
                hindiTitle: 'अध्याय 7 - स्थायी संपत्ति एवं पैतृक धन',
                description: 'Inheritance, investments, and luxury asset creation.',
                orderIndex: 2,
                durationMinutes: 22,
                durationSeconds: 1320,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 8 - Money Astrology',
                hindiTitle: 'अध्याय 8 - वित्तीय संकट निवारण',
                description: 'Identifying financial losses and astrological remediation.',
                orderIndex: 3,
                durationMinutes: 23,
                durationSeconds: 1380,
                isFreePreview: false,
                videoUrl: null,
              },
            ],
          },
        ],
      },
      {
        sku: 'course-dash-mahavidya',
        slug: 'dash-mahavidya-astrology',
        title: 'Dash Mahavidya Astrology',
        hindiTitle: 'दस महाविद्या ज्योतिष एवं साधना',
        shortDescription:
          'For the first time ever, step into a powerful guided course where the ancient secrets of the Dash mahavidyas are revealed in a structured, transformative experience. Learn to harness authentic mantras, rituals, yantras, and sadhanas to align with higher cosmic energies and unlock lasting prosperity and spiritual protection.',
        hindiDescription:
          'दस दिव्य महाविद्याओं के रहस्य, प्रामाणिक मंत्र, यंत्र, साधना एवं ग्रहों की शांति हेतु महाविद्या अनुष्ठान का दुर्लभ ज्ञान।',
        instructorName: 'Astro Sushil Kumar Singh',
        language: 'English',
        level: CourseLevel.BEGINNER,
        pricePaise: 899900, // ₹8,999
        originalPricePaise: 1599900, // ₹15,999
        currency: 'INR',
        thumbnail: 'https://astro-sushil.s3.ap-southeast-2.amazonaws.com/assets/1787406164220-dash-mahavidya-course-thumbnail.webp',
        thumbnailKey: 'assets/1787406164220-dash-mahavidya-course-thumbnail.webp',
        platformUrl: 'https://courses.astrosushil.com/courses/Dash-Mahavidya-by-Astro-Sushil-6a85b6f3160c7d8176b2532f',
        totalDurationMinutes: 165,
        isFeatured: true,
        sections: [
          {
            title: 'Section 1: Foundations & Beej Mantras',
            hindiTitle: 'भाग 1: मूल परिचय एवं बीज मंत्र',
            orderIndex: 1,
            lessons: [
              {
                title: 'Introduction',
                hindiTitle: 'महाविद्या परिचय',
                description: 'Cosmic significance of the 10 Divine Feminine energies.',
                orderIndex: 1,
                durationMinutes: 15,
                durationSeconds: 900,
                isFreePreview: true,
                videoUrl: 'https://d502jbuhuh9wk.cloudfront.net/courses/6a85b6f3160c7d8176b2532f/preview_mahavidya.m3u8',
              },
              {
                title: 'Beej Mantras',
                hindiTitle: 'बीज मंत्र साधना',
                description: 'Pronunciation, resonance, and daily spiritual sadhana.',
                orderIndex: 2,
                durationMinutes: 15,
                durationSeconds: 900,
                isFreePreview: false,
                videoUrl: null,
              },
            ],
          },
          {
            title: 'Section 2: The Ten Mahavidyas',
            hindiTitle: 'भाग 2: दश महाविद्या स्वरूप एवं अनुष्ठान',
            orderIndex: 2,
            lessons: [
              {
                title: 'Chapter 1 - Maa Mahakali Vidya',
                hindiTitle: 'अध्याय 1 - माँ महाकाली विद्या',
                description: 'Time, transformation, and conquering fear.',
                orderIndex: 1,
                durationMinutes: 15,
                durationSeconds: 900,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 2 - Maa Tara Vidya',
                hindiTitle: 'अध्याय 2 - माँ तारा विद्या',
                description: 'The goddess of speech, intellect, and crossing life storms.',
                orderIndex: 2,
                durationMinutes: 14,
                durationSeconds: 840,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 3 - Maa Tripura Sundari Vidya',
                hindiTitle: 'अध्याय 3 - माँ त्रिपुर सुंदरी विद्या',
                description: 'Inner beauty, magnetism, and complete fulfillment.',
                orderIndex: 3,
                durationMinutes: 15,
                durationSeconds: 900,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 4 - Maa Bhuvaneshwari Vidya',
                hindiTitle: 'अध्याय 4 - माँ भुवनेश्वरी विद्या',
                description: 'Sovereign ruler of the manifest universe and material wealth.',
                orderIndex: 4,
                durationMinutes: 14,
                durationSeconds: 840,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 5 - Maa Chhinnamasta Vidya',
                hindiTitle: 'अध्याय 5 - माँ छिन्नमस्ता विद्या',
                description: 'Transcendence of the ego and awakening of Kundalini.',
                orderIndex: 5,
                durationMinutes: 13,
                durationSeconds: 780,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 6 - Maa Bhairavi Vidya',
                hindiTitle: 'अध्याय 6 - माँ भैरवी विद्या',
                description: 'Purification through cosmic fire and intense devotion.',
                orderIndex: 6,
                durationMinutes: 13,
                durationSeconds: 780,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 7 - Maa Dhumavati Vidya',
                hindiTitle: 'अध्याय 7 - माँ धूमावती विद्या',
                description: 'Overcoming adversity, deep solitude, and unmanifest wisdom.',
                orderIndex: 7,
                durationMinutes: 12,
                durationSeconds: 720,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 8 - Maa Bagalamukhi Vidya',
                hindiTitle: 'अध्याय 8 - माँ बगलामुखी विद्या',
                description: 'Silencing adversaries, legal victories, and unshakeable focus.',
                orderIndex: 8,
                durationMinutes: 15,
                durationSeconds: 900,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 9 - Maa Matangi Vidya',
                hindiTitle: 'अध्याय 9 - माँ मातंगी विद्या',
                description: 'Music, creative arts, and occult spoken wisdom.',
                orderIndex: 9,
                durationMinutes: 14,
                durationSeconds: 840,
                isFreePreview: false,
                videoUrl: null,
              },
              {
                title: 'Chapter 10 - Maa Kamala Vidya',
                hindiTitle: 'अध्याय 10 - माँ कमला विद्या',
                description: 'Lotus prosperity, abundance, and grace of Goddess Lakshmi.',
                orderIndex: 10,
                durationMinutes: 15,
                durationSeconds: 900,
                isFreePreview: false,
                videoUrl: null,
              },
            ],
          },
        ],
      },
    ];

    for (const c of coursesData) {
      const existing = await prisma.course.findUnique({
        where: { sku: c.sku },
      });

      if (!existing) {
        const createdCourse = await prisma.course.create({
          data: {
            sku: c.sku,
            slug: c.slug,
            title: c.title,
            hindiTitle: c.hindiTitle,
            shortDescription: c.shortDescription,
            hindiDescription: c.hindiDescription,
            instructorName: c.instructorName,
            language: c.language,
            level: c.level,
            pricePaise: c.pricePaise,
            originalPricePaise: c.originalPricePaise,
            currency: c.currency,
            thumbnail: c.thumbnail,
            thumbnailKey: c.thumbnailKey,
            platformUrl: c.platformUrl,
            totalDurationMinutes: c.totalDurationMinutes,
            isFeatured: c.isFeatured,
            isPublished: true,
          },
        });

        for (const sec of c.sections) {
          const createdSection = await prisma.courseSection.create({
            data: {
              courseId: createdCourse.id,
              title: sec.title,
              hindiTitle: sec.hindiTitle,
              orderIndex: sec.orderIndex,
            },
          });

          for (const les of sec.lessons) {
            await prisma.courseLesson.create({
              data: {
                courseId: createdCourse.id,
                sectionId: createdSection.id,
                title: les.title,
                hindiTitle: les.hindiTitle,
                description: les.description,
                orderIndex: les.orderIndex,
                durationMinutes: les.durationMinutes,
                durationSeconds: les.durationSeconds,
                isFreePreview: les.isFreePreview,
                videoUrl: les.videoUrl,
                videoType: VideoType.HLS,
                isPublished: true,
              },
            });
          }
        }

        logger.info({ sku: c.sku, title: c.title }, 'Seeded authoritative course and curriculum into database');
      }
    }
  }

  /**
   * List courses with enrollment status and learning progress for the user
   */
  public async listCourses(userId?: string, filters?: ListCoursesFilters) {
    await this.seedVerifiedCourses();

    const where: any = { isPublished: true };

    if (filters?.level) {
      where.level = filters.level;
    }
    if (filters?.language) {
      where.language = { contains: filters.language, mode: 'insensitive' };
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { shortDescription: { contains: filters.search, mode: 'insensitive' } },
        { hindiTitle: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const courses = await prisma.course.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: {
            sections: true,
            lessons: true,
          },
        },
      },
    });

    let enrolledCourseIds = new Set<string>();
    let progressMap = new Map<string, number>();

    if (userId) {
      const entitlements = await prisma.courseEntitlement.findMany({
        where: {
          userId,
          status: EntitlementStatus.ACTIVE,
        },
        select: { courseId: true },
      });
      enrolledCourseIds = new Set(entitlements.map((e) => e.courseId));

      const progresses = await prisma.lessonProgress.findMany({
        where: {
          userId,
          isCompleted: true,
        },
        select: { courseId: true },
      });

      const completedCounts = new Map<string, number>();
      for (const p of progresses) {
        completedCounts.set(p.courseId, (completedCounts.get(p.courseId) || 0) + 1);
      }

      for (const course of courses) {
        const totalLessons = course._count.lessons;
        const completed = completedCounts.get(course.id) || 0;
        const percent = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
        progressMap.set(course.id, percent);
      }
    }

    return courses.map((course) => ({
      id: course.id,
      sku: course.sku,
      slug: course.slug,
      title: course.title,
      hindiTitle: course.hindiTitle,
      shortDescription: course.shortDescription,
      hindiDescription: course.hindiDescription,
      instructorName: course.instructorName,
      language: course.language,
      level: course.level,
      pricePaise: course.pricePaise,
      priceRupees: Math.floor(course.pricePaise / 100),
      originalPricePaise: course.originalPricePaise,
      originalPriceRupees: course.originalPricePaise ? Math.floor(course.originalPricePaise / 100) : null,
      currency: course.currency,
      thumbnail: course.thumbnail,
      platformUrl: course.platformUrl,
      totalDurationMinutes: course.totalDurationMinutes,
      totalLessons: course._count.lessons,
      totalSections: course._count.sections,
      rating: course.rating,
      isFeatured: course.isFeatured,
      isEnrolled: enrolledCourseIds.has(course.id),
      progressPercent: progressMap.get(course.id) || 0,
    }));
  }

  /**
   * Get single course details with sections, lessons, and access lockdown
   */
  public async getCourseDetails(idOrSlug: string, userId?: string, userRole: string = 'USER') {
    await this.seedVerifiedCourses();

    const course = await prisma.course.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }, { sku: idOrSlug }],
      },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              where: { isPublished: true },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundError(`Course '${idOrSlug}' not found`);
    }

    let isEnrolled = false;
    let completedLessonIds = new Set<string>();

    if (userId) {
      if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
        isEnrolled = true;
      } else {
        const entitlement = await prisma.courseEntitlement.findUnique({
          where: {
            userId_courseId: {
              userId,
              courseId: course.id,
            },
          },
        });
        isEnrolled = entitlement?.status === EntitlementStatus.ACTIVE;
      }

      if (isEnrolled) {
        const progresses = await prisma.lessonProgress.findMany({
          where: { userId, courseId: course.id },
          select: { lessonId: true, isCompleted: true },
        });
        completedLessonIds = new Set(
          progresses.filter((p) => p.isCompleted).map((p) => p.lessonId)
        );
      }
    }

    let totalLessonsCount = 0;
    let completedLessonsCount = 0;

    const sections = course.sections.map((section) => {
      const lessons = section.lessons.map((lesson) => {
        totalLessonsCount++;
        const isCompleted = completedLessonIds.has(lesson.id);
        if (isCompleted) completedLessonsCount++;

        const isAccessible = isEnrolled || lesson.isFreePreview;

        return {
          id: lesson.id,
          title: lesson.title,
          hindiTitle: lesson.hindiTitle,
          description: lesson.description,
          orderIndex: lesson.orderIndex,
          durationMinutes: lesson.durationMinutes,
          durationSeconds: lesson.durationSeconds,
          isFreePreview: lesson.isFreePreview,
          isLocked: !isAccessible,
          isUnlocked: isAccessible,
          isCompleted,
          videoUrl: isAccessible ? lesson.videoUrl : null,
          videoType: lesson.videoType,
        };
      });

      return {
        id: section.id,
        title: section.title,
        hindiTitle: section.hindiTitle,
        orderIndex: section.orderIndex,
        lessons,
      };
    });

    const progressPercent =
      totalLessonsCount > 0 ? Math.round((completedLessonsCount / totalLessonsCount) * 100) : 0;

    return {
      id: course.id,
      sku: course.sku,
      slug: course.slug,
      title: course.title,
      hindiTitle: course.hindiTitle,
      shortDescription: course.shortDescription,
      hindiDescription: course.hindiDescription,
      instructorName: course.instructorName,
      language: course.language,
      level: course.level,
      pricePaise: course.pricePaise,
      priceRupees: Math.floor(course.pricePaise / 100),
      originalPricePaise: course.originalPricePaise,
      originalPriceRupees: course.originalPricePaise ? Math.floor(course.originalPricePaise / 100) : null,
      currency: course.currency,
      thumbnail: course.thumbnail,
      platformUrl: course.platformUrl,
      totalDurationMinutes: course.totalDurationMinutes,
      rating: course.rating,
      isEnrolled,
      progressPercent,
      sections,
    };
  }

  /**
   * Get authenticated user's purchased & active courses
   */
  public async getMyCourses(userId: string) {
    const entitlements = await prisma.courseEntitlement.findMany({
      where: {
        userId,
        status: EntitlementStatus.ACTIVE,
      },
      include: {
        course: {
          include: {
            lessons: {
              where: { isPublished: true },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
      orderBy: { grantedAt: 'desc' },
    });

    const progressRecords = await prisma.lessonProgress.findMany({
      where: { userId },
    });

    const progressMap = new Map<string, { watchedSeconds: number; isCompleted: boolean }>();
    for (const pr of progressRecords) {
      progressMap.set(`${pr.courseId}:${pr.lessonId}`, {
        watchedSeconds: pr.watchedSeconds,
        isCompleted: pr.isCompleted,
      });
    }

    return entitlements.map((ent) => {
      const c = ent.course;
      const totalLessons = c.lessons.length;
      let completedLessons = 0;
      let nextLessonId: string | null = null;

      for (const les of c.lessons) {
        const pr = progressMap.get(`${c.id}:${les.id}`);
        if (pr?.isCompleted) {
          completedLessons++;
        } else if (!nextLessonId) {
          nextLessonId = les.id;
        }
      }

      const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return {
        id: c.id,
        courseId: c.id,
        isEnrolled: true,
        entitlementId: ent.id,
        grantedAt: ent.grantedAt,
        source: ent.source,
        sku: c.sku,
        slug: c.slug,
        title: c.title,
        hindiTitle: c.hindiTitle,
        shortDescription: c.shortDescription,
        thumbnail: c.thumbnail,
        totalDurationMinutes: c.totalDurationMinutes,
        totalLessons,
        completedLessons,
        progressPercent: percent,
        progressPercentage: percent,
        nextLessonId: nextLessonId || (c.lessons[0]?.id ?? null),
      };
    });
  }

  /**
   * Secure Lesson Playback access with IDOR and entitlement verification
   */
  public async getLessonPlayback(lessonId: string, userId?: string, userRole: string = 'USER') {
    const lesson = await prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            sku: true,
            platformUrl: true,
          },
        },
        section: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundError(`Lesson '${lessonId}' not found`);
    }

    // Authorization verification
    let isAuthorized = false;
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      isAuthorized = true;
    } else if (lesson.isFreePreview) {
      isAuthorized = true;
    } else {
      if (!userId) {
        throw new AuthenticationError('Authentication required to access paid lesson');
      }
      const entitlement = await prisma.courseEntitlement.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: lesson.courseId,
          },
        },
      });
      isAuthorized = entitlement?.status === EntitlementStatus.ACTIVE;
    }

    if (!isAuthorized) {
      throw new ForbiddenError(
        'This lesson is part of a premium masterclass. Please purchase the course to access the full video lesson.'
      );
    }

    // Retrieve saved progress if authenticated
    const progress = userId
      ? await prisma.lessonProgress.findUnique({
          where: {
            userId_lessonId: {
              userId,
              lessonId,
            },
          },
        })
      : null;

    // Check adjacent lessons for navigation
    const allCourseLessons = await prisma.courseLesson.findMany({
      where: { courseId: lesson.courseId, isPublished: true },
      orderBy: [{ section: { orderIndex: 'asc' } }, { orderIndex: 'asc' }],
      select: { id: true, title: true },
    });

    const currentIndex = allCourseLessons.findIndex((l) => l.id === lessonId);
    const prevLesson = currentIndex > 0 ? allCourseLessons[currentIndex - 1] : null;
    const nextLesson =
      currentIndex < allCourseLessons.length - 1 ? allCourseLessons[currentIndex + 1] : null;

    const hasDirectVideoUrl = Boolean(lesson.videoUrl && lesson.videoUrl.length > 5);

    return {
      lesson: {
        id: lesson.id,
        courseId: lesson.courseId,
        courseTitle: lesson.course.title,
        sectionId: lesson.sectionId,
        sectionTitle: lesson.section.title,
        title: lesson.title,
        hindiTitle: lesson.hindiTitle,
        description: lesson.description,
        durationMinutes: lesson.durationMinutes,
        durationSeconds: lesson.durationSeconds,
        isFreePreview: lesson.isFreePreview,
        videoType: lesson.videoType,
        watchedSeconds: progress?.watchedSeconds || 0,
        isCompleted: progress?.isCompleted || false,
      },
      playback: {
        isUnlocked: true,
        isFreePreview: lesson.isFreePreview,
        streamUrl: lesson.videoUrl,
        isAvailable: hasDirectVideoUrl,
        unavailableNotice: hasDirectVideoUrl
          ? null
          : 'Video stream is securely hosted on Astro Sushil Learning Cloud. Direct streaming is active on the official learning portal.',
        platformUrl: lesson.course.platformUrl,
      },
      navigation: {
        prevLessonId: prevLesson?.id ?? null,
        prevLessonTitle: prevLesson?.title ?? null,
        nextLessonId: nextLesson?.id ?? null,
        nextLessonTitle: nextLesson?.title ?? null,
      },
    };
  }

  /**
   * Update lesson watched progress and handle completion
   */
  public async updateLessonProgress(
    userId: string,
    lessonId: string,
    watchedSeconds: number,
    isCompleted?: boolean
  ) {
    const lesson = await prisma.courseLesson.findUnique({
      where: { id: lessonId },
      select: { id: true, courseId: true, durationSeconds: true },
    });

    if (!lesson) {
      throw new NotFoundError(`Lesson '${lessonId}' not found`);
    }

    // Auto-mark completed if watched >= 90% of duration
    const thresholdReached = lesson.durationSeconds > 0 && watchedSeconds >= lesson.durationSeconds * 0.9;
    const markCompleted = isCompleted === true || thresholdReached;

    const record = await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      update: {
        watchedSeconds,
        isCompleted: markCompleted ? true : undefined,
        completedAt: markCompleted ? new Date() : undefined,
        lastWatchedAt: new Date(),
      },
      create: {
        userId,
        lessonId,
        courseId: lesson.courseId,
        watchedSeconds,
        isCompleted: markCompleted,
        completedAt: markCompleted ? new Date() : null,
        lastWatchedAt: new Date(),
      },
    });

    // Recalculate total course progress
    const totalLessons = await prisma.courseLesson.count({
      where: { courseId: lesson.courseId, isPublished: true },
    });

    const completedLessons = await prisma.lessonProgress.count({
      where: {
        userId,
        courseId: lesson.courseId,
        isCompleted: true,
      },
    });

    const progressPercent =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      progress: record,
      courseProgress: {
        courseId: lesson.courseId,
        totalLessons,
        completedLessons,
        progressPercent,
      },
    };
  }

  /**
   * Initiate Course Enrollment order via Phase 3 unified commerce
   */
  public async enrollInCourse(userId: string, courseIdOrSku: string) {
    const course = await prisma.course.findFirst({
      where: {
        OR: [{ id: courseIdOrSku }, { sku: courseIdOrSku }, { slug: courseIdOrSku }],
      },
    });

    if (!course) {
      throw new NotFoundError(`Course '${courseIdOrSku}' not found`);
    }

    // Check if user already owns the course
    const existingEntitlement = await prisma.courseEntitlement.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: course.id,
        },
      },
    });

    if (existingEntitlement && existingEntitlement.status === EntitlementStatus.ACTIVE) {
      throw new ConflictError('You are already enrolled in this course.');
    }

    // Create Order using unified CommerceService with catalogId = course.sku
    const order = await commerceService.createOrder(
      {
        items: [
          {
            catalogId: course.sku,
            quantity: 1,
            metadata: {
              courseId: course.id,
              courseSku: course.sku,
              title: course.title,
            },
          },
        ],
        notes: `Enrollment for ${course.title}`,
      },
      { id: userId }
    );

    return {
      course: {
        id: course.id,
        sku: course.sku,
        title: course.title,
        pricePaise: course.pricePaise,
        priceRupees: Math.floor(course.pricePaise / 100),
      },
      order: {
        id: order.orderId,
        orderId: order.orderId,
        razorpayOrderId: order.razorpayOrderId,
        amount: order.amount,
        amountPaise: order.amount,
        currency: order.currency,
        status: order.status,
      },
      payment: {
        razorpayOrderId: order.razorpayOrderId,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key',
      },
      razorpayConfig: {
        key: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key',
        orderId: order.razorpayOrderId,
        amount: order.amount,
        currency: order.currency,
      },
    };
  }

  /**
   * Verify Razorpay payment and immediately grant course entitlement
   */
  public async verifyCoursePayment(
    userId: string,
    input: {
      courseId: string;
      orderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }
  ) {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundError(`Order '${input.orderId}' not found`);
    }

    if (order.userId !== userId) {
      throw new NotFoundError(`Order '${input.orderId}' not found`);
    }

    const course = await prisma.course.findFirst({
      where: {
        OR: [{ id: input.courseId }, { sku: input.courseId }],
      },
    });

    if (!course) {
      throw new NotFoundError(`Course '${input.courseId}' not found`);
    }

    // Verify HMAC signature
    const isValidSignature = paymentService.verifySignature(
      order.razorpayOrderId,
      input.razorpayPaymentId,
      input.razorpaySignature
    );

    if (!isValidSignature) {
      throw new ValidationError('Invalid Razorpay payment signature');
    }

    // Update order status to PAID
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.CAPTURED,
        fulfillmentStatus: FulfillmentStatus.FULFILLED,
        razorpayPaymentId: input.razorpayPaymentId,
      },
    });

    // Idempotently create CourseEntitlement
    const entitlement = await prisma.courseEntitlement.upsert({
      where: {
        userId_courseId: {
          userId,
          courseId: course.id,
        },
      },
      update: {
        status: EntitlementStatus.ACTIVE,
        orderId: order.id,
        updatedAt: new Date(),
      },
      create: {
        userId,
        courseId: course.id,
        orderId: order.id,
        source: EntitlementSource.PURCHASE,
        status: EntitlementStatus.ACTIVE,
      },
    });

    return {
      success: true,
      isEnrolled: true,
      message: `Enrolled in ${course.title} successfully!`,
      entitlement,
      course,
    };
  }

  /**
   * Admin: Grant manual course entitlement to user
   */
  public async adminGrantEntitlement(
    adminId: string,
    courseId: string,
    userId: string,
    source: EntitlementSource = EntitlementSource.ADMIN_GRANT,
    expiresAt?: Date
  ) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundError(`Course '${courseId}' not found`);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError(`User '${userId}' not found`);

    const entitlement = await prisma.courseEntitlement.upsert({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      update: {
        status: EntitlementStatus.ACTIVE,
        source,
        expiresAt: expiresAt || null,
        updatedAt: new Date(),
      },
      create: {
        userId,
        courseId,
        source,
        status: EntitlementStatus.ACTIVE,
        expiresAt: expiresAt || null,
      },
    });

    logger.info({ adminId, userId, courseId, source }, 'Admin granted course entitlement');

    return entitlement;
  }
}

export const coursesService = new CoursesService();
