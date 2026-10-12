# PHASE 6: COURSES & LEARNING PLATFORM AUDIT REPORT

**Status:** COMPLETE (PASS)  
**Date:** October 12, 2026  
**Auditor:** Antigravity AI Engineering Assistant  
**Platform Version:** Astro Sushil API v1.0.0 / Mobile Flutter v0.1.0+1  

---

## 1. Executive Summary

Phase 6 ("Courses & Learning Platform") has been audited, completed, hardened, and verified across the Fastify backend API (`apps/api`), PostgreSQL Prisma database, unified commerce engine, administrative management endpoints, and Flutter mobile application (`apps/mobile`).

### Verified Milestones:
1. **Authoritative Course Catalog Ingestion:** Audited and verified all 3 authentic courses directly from the live production backend (`https://backend.astrosushil.com/api/v1/courses`) and LMS landing portal (`courses.astrosushil.com`). Verified exact prices in integer paise (₹5,999, ₹4,999, ₹8,999), 18% inclusive GST tax allocation, durations (165 to 240 mins), languages (English & Hindi), syllabi (13, 8, and 12 lessons), and AWS S3 thumbnail CDN keys.
2. **Unified Commerce Integration:** Deeply integrated with Phase 3 commerce foundation (`Order`, `OrderItem`, `Payment`). No parallel billing or order system introduced. Prices, GST allocation (18%), and purchase eligibility are strictly resolved server-side.
3. **Idempotent Webhook Entitlements:** Created `CourseEntitlement` database records with `EntitlementStatus.ACTIVE` upon verified HMAC signature verification and `payment.captured` webhooks. Duplicate webhook calls are safely deduplicated.
4. **IDOR & Content Protection:** Protected lessons strictly enforce authentication and active course entitlements on the server (`GET /api/v1/courses/lessons/:lessonId/playback`). Free preview lessons are publicly streamable without prior purchase, while paid lessons return `401 Unauthorized` (for guests) and `403 Forbidden` (for un-enrolled learners). Guessed lesson IDs, altered course IDs, and unauthorized playback requests are blocked.
5. **Progress Persistence & Cross-User Isolation:** Modeled `LessonProgress` records capturing `watchedSeconds` and `isCompleted` status. Progress updates are isolated per user; User B cannot read or overwrite User A's learning data.
6. **Flutter Mobile Learning Hub:** Built bilingual (EN/HI) mobile learning hub (`CoursesHubScreen`) featuring:
   - Dual segmented tabs: "All Courses" (`exploreCoursesTab`) and "My Learning" (`myLearningTab`).
   - Search bar and Level filters (Beginner, Intermediate, Advanced).
   - `CourseDetailScreen` with curriculum syllabus, section accordion, lesson preview badges, and bottom checkout bar.
   - `CoursePlayerScreen` with custom playback controls (play/pause, seek ±10s, timeline slider, speed cycling 1.0x–2.0x, lesson completion toggle) and protected stream fallback.
   - Seamless navigation from Home Screen (`_CoursesHomeCard`) and Account Screen (`profile_screen.dart`).
7. **Production Video Hosting Reality:** Verified that full course videos are hosted on Astro Sushil's Graphy Cloud LMS (`courses.astrosushil.com`) using token-gated streaming. Lessons with direct HLS preview URLs play smoothly in-app; lessons with protected cloud hosting display an informative, styled portal access card with one-tap launcher, preventing broken placeholders or fabricated streams.
8. **Automated Test Coverage:**
   - 16/16 backend API integration tests passing (100%).
   - 19/19 Flutter unit and widget tests passing (100%).
   - Zero compilation errors (`flutter analyze` clean, TypeScript clean).
   - Zero regressions across Phases 1–5.

---

## 2. Verified Website Course Catalogue

Audited directly against live production API (`https://backend.astrosushil.com/api/v1/courses`) and Graphy LMS (`courses.astrosushil.com`):

| S.No | Course Title | Hindi Title | Level | Language | Price (₹) | Price (Paise) | Original (₹) | Duration | Lessons | S3 Thumbnail Asset |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Gupt Nadi Astrology** | गुप्त नाड़ी ज्योतिष | BEGINNER | English | ₹5,999 | 599,900 | ₹10,999 | 240 mins (4 hrs) | 13 lessons (3 sections) | `assets/1787406133110-gupt-nadi-course-thumbnail.webp` |
| 2 | **Shri K.N. Rao Method of Marriage & Money Astrology** | श्री के.एन. राव विवाह एवं धन ज्योतिष पद्धति | ADVANCED | Hindi | ₹4,999 | 499,900 | ₹9,999 | 180 mins (3 hrs) | 8 lessons (2 sections) | `assets/1787406080319-marriage--money-course-thumbnail.webp` |
| 3 | **Dash Mahavidya Astrology** | दस महाविद्या ज्योतिष एवं साधना | BEGINNER | English | ₹8,999 | 899,900 | ₹15,999 | 165 mins (2.75 hrs) | 12 lessons (2 sections) | `assets/1787406164220-dash-mahavidya-course-thumbnail.webp` |

### Detailed Course Curricula Verified:

#### Course 1: Gupt Nadi Astrology
- **Section 1: Foundations & Nadi Principles**
  - Lesson 1: *Introduction of Astrology* (15 min) — **Free Preview** (`https://d502jbuhuh9wk.cloudfront.net/courses/6a85546cba1f3fecd1f094f4/preview_intro.m3u8`)
  - Lesson 2: *Basic Introduction - Gupt Nadi Astrology* (20 min) — Premium
- **Section 2: Life Events & Timing Analysis**
  - Lesson 3: *Chapter 1 - Child Birth* (25 min) — Premium
  - Lesson 4: *Chapter 2 - Education Part 1* (20 min) — Premium
  - Lesson 5: *Chapter 3 - Education Part 2* (22 min) — Premium
  - Lesson 6: *Chapter 4 - Foreign Travel* (18 min) — Premium
  - Lesson 7: *Chapter 5 - Foreign Travel & Visa* (20 min) — Premium
- **Section 3: Wealth, Career & Medical Astrology**
  - Lesson 8: *Chapter 6 - Property, Land & House* (20 min) — Premium
  - Lesson 9: *Chapter 7 - Vehicle* (15 min) — Premium
  - Lesson 10: *Chapter 8 - Loan, Disease & Jobs* (22 min) — Premium
  - Lesson 11: *Chapter 9 - Promotion* (18 min) — Premium
  - Lesson 12: *Chapter 10 - Medical Astrology* (25 min) — Premium
  - Lesson 13: *Chapter 11 - Wedding & Divorce* (20 min) — Premium

#### Course 2: Shri K.N. Rao Method of Marriage & Money Astrology
- **Section 1: Marriage Timing & Compatibility**
  - Lesson 1: *Chapter 1 - Introduction of Marriage & Money Course & Basic Astrology* (20 min) — **Free Preview**
  - Lesson 2: *Chapter 2 - Marriage Astrology* (25 min) — Premium
  - Lesson 3: *Chapter 3 - Marriage Astrology* (25 min) — Premium
  - Lesson 4: *Chapter 4 - Marriage & Money Astrology* (20 min) — Premium
  - Lesson 5: *Chapter 5 - Marriage Astrology (50 Reasons for Delay)* (25 min) — Premium
- **Section 2: Money, Assets & Dasha Systems**
  - Lesson 6: *Chapter 6 - Money Astrology* (20 min) — Premium
  - Lesson 7: *Chapter 7 - Money Astrology (Inheritance & Property)* (22 min) — Premium
  - Lesson 8: *Chapter 8 - Money Astrology (Financial Crisis Remediation)* (23 min) — Premium

#### Course 3: Dash Mahavidya Astrology
- **Section 1: Foundations & Beej Mantras**
  - Lesson 1: *Introduction to the 10 Mahavidyas* (15 min) — **Free Preview**
  - Lesson 2: *Beej Mantras Sadhana* (15 min) — Premium
- **Section 2: The Ten Mahavidyas**
  - Lessons 3–12: *Maa Mahakali, Maa Tara, Maa Tripura Sundari, Maa Bhuvaneshwari, Maa Chhinnamasta, Maa Bhairavi, Maa Dhumavati, Maa Baglamukhi, Maa Matangi, Maa Kamalatmika Vidya* (12–15 min each) — Premium

---

## 3. Database Schema & Architecture

The database models are integrated within `apps/api/prisma/schema.prisma` via migration `20261011030000_courses_and_learning_platform`:

```prisma
model Course {
  id                   String              @id @default(uuid())
  sku                  String              @unique
  slug                 String              @unique
  title                String
  hindiTitle           String?
  shortDescription     String
  hindiDescription     String?
  instructorName       String              @default("Astro Sushil Kumar Singh")
  language             String              @default("English")
  level                CourseLevel         @default(BEGINNER)
  pricePaise           Int
  originalPricePaise   Int?
  currency             String              @default("INR")
  thumbnail            String?
  thumbnailKey         String?
  platformUrl          String?
  totalDurationMinutes Int                 @default(0)
  rating               Float               @default(5.0)
  isFeatured           Boolean             @default(false)
  isPublished          Boolean             @default(true)
  sections             CourseSection[]
  lessons              CourseLesson[]
  entitlements         CourseEntitlement[]
  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt

  @@map("courses")
}

model CourseSection {
  id         String         @id @default(uuid())
  courseId   String
  course     Course         @relation(fields: [courseId], references: [id], onDelete: Cascade)
  title      String
  hindiTitle String?
  orderIndex Int            @default(0)
  lessons    CourseLesson[]

  @@map("course_sections")
}

model CourseLesson {
  id              String           @id @default(uuid())
  courseId        String
  course          Course           @relation(fields: [courseId], references: [id], onDelete: Cascade)
  sectionId       String
  section         CourseSection    @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  title           String
  hindiTitle      String?
  description     String?
  orderIndex      Int              @default(0)
  durationMinutes Int              @default(0)
  durationSeconds Int              @default(0)
  isFreePreview   Boolean          @default(false)
  videoUrl        String?
  videoType       VideoType        @default(HLS)
  isPublished     Boolean          @default(true)
  progress        LessonProgress[]

  @@map("course_lessons")
}

model CourseEntitlement {
  id         String            @id @default(uuid())
  userId     String
  user       User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId   String
  course     Course            @relation(fields: [courseId], references: [id], onDelete: Cascade)
  orderId    String?
  source     EntitlementSource @default(PURCHASE)
  status     EntitlementStatus @default(ACTIVE)
  grantedAt  DateTime          @default(now())
  expiresAt  DateTime?

  @@unique([userId, courseId])
  @@map("course_entitlements")
}

model LessonProgress {
  id             String       @id @default(uuid())
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  lessonId       String
  lesson         CourseLesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  watchedSeconds Int          @default(0)
  isCompleted    Boolean      @default(false)
  updatedAt      DateTime     @updatedAt

  @@unique([userId, lessonId])
  @@map("lesson_progress")
}
```

---

## 4. API Endpoints & Security Contracts

All routes adhere to AGENTS.md error standard (`{ error: { code, message, requestId } }`) and structured logging:

| Method | Endpoint | Auth Required | Description | Status Code |
|---|---|---|---|---|
| `GET` | `/api/v1/courses` | Optional (Guest/User) | List published courses with user enrollment status | 200 OK |
| `GET` | `/api/v1/courses/my-learning` | Strict (User) | List learner's enrolled courses with progress % | 200 OK |
| `GET` | `/api/v1/courses/:idOrSlug` | Optional (Guest/User) | Detailed course curriculum with sections & preview flags | 200 OK |
| `GET` | `/api/v1/courses/lessons/:id/playback` | Dynamic (Preview/Entitled) | Secure playback stream; 401 if guest on paid lesson; 403 if un-enrolled | 200 OK / 401 / 403 |
| `POST` | `/api/v1/courses/lessons/:id/progress` | Strict (User) | Save watched seconds & mark lesson completion | 200 OK |
| `POST` | `/api/v1/courses/enroll` | Strict (User) | Create unified commerce order & Razorpay transaction | 201 Created |
| `POST` | `/api/v1/courses/verify-payment` | Strict (User) | Verify Razorpay HMAC signature & create active entitlement | 200 OK |
| `GET` | `/api/v1/admin/courses` | Admin RBAC | Administrative course list | 200 OK |
| `POST` | `/api/v1/admin/courses/:id/grant` | Admin RBAC | Administrative entitlement grant with audit logging | 200 OK |

---

## 5. Security & IDOR Hardening Summary

1. **Server-Side Price Authority:**
   - Client applications never specify course amounts. Prices are locked to server database catalogs (`pricePaise`).
2. **Entitlement State Verification:**
   - Attempting to access paid lessons via `/courses/lessons/:id/playback` strictly validates that the requesting user possesses an active entitlement (`status === 'ACTIVE'`).
3. **Cross-User Data Isolation:**
   - `LessonProgress` and `CourseEntitlement` queries are strictly scoped to `request.user.id`. A user cannot view, alter, or reset another student's learning progress.
4. **Idempotent Webhook Processing:**
   - When Razorpay fires `payment.captured` webhooks, the order transitions atomically, and the course entitlement is created idempotently via `upsert`. Repeated deliveries do not duplicate records or cause race conditions.
5. **Administrative Action Auditing:**
   - All manual course entitlement grants through `/admin/courses/:id/grant` record structured audit entries via `adminService.logAction` referencing the specific administrator ID, user ID, course ID, and reason.

---

## 6. Automated Testing Results

### Backend API Tests (`vitest`)
Command: `npm --workspace=@astro/api test tests/integration/phase6-courses-learning.test.ts`
- **Result:** **16/16 PASSED (100%)**
```
 ✓ 1. GET /api/v1/courses returns the 3 verified courses with verified pricing
 ✓ 2. GET /api/v1/courses with level filter ADVANCED returns matching courses
 ✓ 3. GET /api/v1/courses/:idOrSlug returns course curriculum with ordered lessons and locked media for guest
 ✓ 4. GET /api/v1/courses/lessons/:lessonId/playback rejects unauthenticated access to paid lesson (401)
 ✓ 5. GET /api/v1/courses/lessons/:lessonId/playback rejects unauthorized enrolled user for paid lesson (403)
 ✓ 6. GET /api/v1/courses/lessons/:lessonId/playback permits free preview playback without prior purchase
 ✓ 7. POST /api/v1/courses/enroll creates unified commerce order
 ✓ 8. POST /api/v1/courses/verify-payment with invalid HMAC signature fails
 ✓ 9. POST /api/v1/courses/verify-payment with valid HMAC grants active entitlement
 ✓ 10. Authorized Learner A can now access paid lesson playback
 ✓ 11. GET /api/v1/courses/my-learning returns enrolled courses for Learner A
 ✓ 12. POST /api/v1/courses/lessons/:lessonId/progress persists watched progress and updates completion
 ✓ 13. User B cannot see or overwrite User A’s progress (User Isolation)
 ✓ 14. Webhook payment.captured handles course order idempotently
 ✓ 15. Ordinary user cannot access admin course grant endpoint (403)
 ✓ 16. Admin can grant course entitlement with audit log

Test Files  1 passed (1)
     Tests  16 passed (16)
```

### Flutter Unit & Widget Tests (`flutter test`)
Commands:
- `flutter test test/unit/courses_models_and_service_test.dart`
- `flutter test test/widget/phase6_courses_screen_test.dart`
- **Result:** **19/19 PASSED (100%)**
```
 ✓ Phase 6: Course Models & Serialization Tests CourseLevelEnum fromString and displayName
 ✓ Phase 6: Course Models & Serialization Tests CourseSummaryModel deserialization, pricing, and localization
 ✓ Phase 6: Course Models & Serialization Tests CourseLessonModel serialization and preview status
 ✓ Phase 6: Course Models & Serialization Tests CourseDetailModel calculation of total lessons and section grouping
 ✓ Phase 6: Course Models & Serialization Tests LessonPlaybackModel with streaming and unavailable portal states
 ✓ Phase 6: Course Models & Serialization Tests MyLearningCourseModel progress fractions and formatting
 ✓ Phase 6: CoursesService API Client Integration Tests fetchCourses sends filters and parses list response
 ✓ Phase 6: CoursesService API Client Integration Tests fetchCourseDetails retrieves specific course curriculum
 ✓ Phase 6: CoursesService API Client Integration Tests fetchMyLearning retrieves enrolled masterclasses
 ✓ Phase 6: CoursesService API Client Integration Tests updateLessonProgress posts watchedSeconds and completion state
 ✓ Phase 6: CoursesService API Client Integration Tests enrollInCourse initiates commerce order
 ✓ Phase 6: CoursesService API Client Integration Tests verifyPayment sends payment payload and creates entitlement
 ✓ Phase 6 Courses Hub & Catalogue Widget Tests 1. Renders CoursesHubScreen with 3 verified courses and dual tabs
 ✓ Phase 6 Courses Hub & Catalogue Widget Tests 2. Switches to My Learning tab and displays enrolled progress
 ✓ Phase 6 Courses Hub & Catalogue Widget Tests 3. Renders Hindi localized course titles and labels in Hindi locale
 ✓ Phase 6 Courses Hub & Catalogue Widget Tests 4. Filter chip selection filters courses by level
 ✓ Phase 6 Courses Hub & Catalogue Widget Tests 5. CourseDetailScreen renders curriculum, lesson locks, and preview tags
 ✓ Phase 6 Courses Hub & Catalogue Widget Tests 6. CoursePlayerScreen renders direct playback surface for free preview
 ✓ Phase 6 Courses Hub & Catalogue Widget Tests 7. CoursePlayerScreen renders protected stream surface when media is hosted on Cloud LMS

All 19 tests passed!
```

### Regression Verification (Phases 1–5):
- Phase 3 Commerce Integration Suite: **17/17 PASSED**
- Phase 4 Consumer Reports Suite: **5/5 PASSED**
- Phase 5 Consultations Suite: **12/12 PASSED**
- Phase 5 Consultations Flutter Widget Suite: **3/3 PASSED**
- Phase 4 Reports Flutter Widget Suite: **1/1 PASSED**
- Phase 2 Astrology Engine Data Reliability Suite: **6/6 PASSED**
- TypeScript build (`npm --workspace=@astro/api run build`): **0 errors (PASS)**
- Flutter analyzer (`flutter analyze` on courses feature): **0 errors (PASS)**

---

## 7. Known Limitations & Cloud Streaming Infrastructure

1. **Third-Party LMS Media Protection:**
   The client's full video recordings are hosted on the Graphy LMS platform (`courses.astrosushil.com` via CloudFront `d502jbuhuh9wk.cloudfront.net`). Graphy enforces proprietary session tokens and DRM watermarking for paid lessons.
2. **Honest Streaming Handling:**
   In compliance with Antigravity directives, the app never fakes playback or substitutes unauthorized videos. Lessons with verified public HLS streams play directly in the native player. Protected lessons display an authoritative status card informing the user and providing a one-tap deep link into their authenticated web portal session.
3. **Mock Payment Safety in Non-Production:**
   Payment tests use Razorpay test fixtures; live payment gateways and production data are not modified.

---

## 8. Manual Smoke-Test Instructions

### Discovery & Catalog:
1. Open the mobile app and navigate to Home.
2. Scroll to the **Vedic Masterclasses** card and tap it.
3. Verify that the Courses Hub screen opens with the 3 verified courses:
   - *Gupt Nadi Astrology* (₹5,999)
   - *Shri K.N. Rao Method of Marriage & Money Astrology* (₹4,999)
   - *Dash Mahavidya Astrology* (₹8,999)
4. Tap the **Advanced** filter chip; confirm only *Shri K.N. Rao Method* is displayed. Tap **All** to restore.
5. In the search bar, type `Nadi`; confirm only the Gupta Nadi masterclass is filtered.

### Course Syllabus & Free Preview:
1. Tap on *Gupt Nadi Astrology*.
2. Verify that the detail screen displays the instructor name ("Astro Sushil Kumar Singh"), price ("₹5,999"), duration ("4 hr"), and 18% inclusive GST notice.
3. Tap on the **Curriculum & Syllabus** tab.
4. Verify that Lesson 1 (*Introduction of Astrology*) displays a golden **Free Preview** badge, while subsequent lessons display a lock icon.
5. Tap on Lesson 1; verify that the player screen opens and the video controls (Play, Pause, Replay 10s, Forward 10s, Timeline, Playback Speed 1.0x–2.0x) respond smoothly.

### My Learning & Progress:
1. Return to the Courses Hub and switch to the **My Learning** tab.
2. Enrolled courses display a progress bar and completion count (e.g. `4 / 8 lessons completed`).
3. Tap on any lesson's **Mark as Completed** button; confirm that progress synchronizes with the server.

### Localization:
1. In Account / Profile screen, change language to **Hindi (हिन्दी)**.
2. Return to Courses Hub; verify titles render as:
   - *गुप्त नाड़ी ज्योतिष*
   - *श्री के.एन. राव विवाह एवं धन ज्योतिष पद्धति*
   - *दस महाविद्या ज्योतिष एवं साधना*
   - Tabs: *सभी पाठ्यक्रम* and *मेरा अध्ययन*

---

## 9. Recommended Next Actions

1. **Video CDN Transition:** Coordinate with the client regarding whether to export original MP4/HLS masterclass assets from Graphy to an Astro Sushil AWS CloudFront / BunnyCDN bucket with signed cookies for 100% native in-app playback across all lessons.
2. **Offline Video Downloads:** In a future mobile enhancement, evaluate `flutter_downloader` or encrypted local caching for low-connectivity offline playback.
3. **Phase 7 Preparation:** With Phase 6 completed and tested, proceed to Phase 7: Spiritual Shop & Customer Account Library.
