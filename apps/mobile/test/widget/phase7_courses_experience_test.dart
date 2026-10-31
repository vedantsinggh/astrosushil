import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:astro_mobile/core/localization/locale_provider.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';
import 'package:astro_mobile/features/courses/models/course_models.dart';
import 'package:astro_mobile/features/courses/services/courses_service.dart';
import 'package:astro_mobile/features/courses/providers/courses_provider.dart';
import 'package:astro_mobile/features/courses/screens/courses_hub_screen.dart';
import 'package:astro_mobile/features/courses/screens/course_detail_screen.dart';
import 'package:astro_mobile/features/courses/screens/course_player_screen.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart' hide secureStorageProvider;
import 'package:astro_mobile/features/auth/models/user_model.dart';

class MockPhase7CoursesService implements CoursesService {
  final bool shouldFail;
  final List<CourseSummaryModel> mockCourses;
  final List<MyLearningCourseModel> mockMyLearning;
  final CourseDetailModel mockDetail;
  final LessonPlaybackModel mockPreviewPlayback;
  final LessonPlaybackModel mockProtectedPlayback;

  int updateProgressCalls = 0;
  String? lastUpdatedLessonId;
  int? lastWatchedSeconds;
  bool? lastIsCompleted;

  MockPhase7CoursesService({
    this.shouldFail = false,
    List<CourseSummaryModel>? courses,
    List<MyLearningCourseModel>? myLearning,
    CourseDetailModel? detail,
    LessonPlaybackModel? previewPlayback,
    LessonPlaybackModel? protectedPlayback,
  })  : mockCourses = courses ??
            const [
              CourseSummaryModel(
                id: 'c-gupt-nadi',
                sku: 'course-gupt-nadi',
                slug: 'gupt-nadi-astrology',
                title: 'Gupt Nadi Astrology',
                hindiTitle: 'गुप्त नाड़ी ज्योतिष',
                shortDescription: 'Comprehensive Nadi course with 12 video lectures.',
                hindiDescription: 'सम्पूर्ण गुप्त नाड़ी ज्योतिष पाठ्यक्रम।',
                instructorName: 'Astro Sushil Kumar Singh',
                language: 'English',
                level: CourseLevelEnum.beginner,
                pricePaise: 599900,
                priceRupees: 5999,
                originalPricePaise: 1099900,
                originalPriceRupees: 10999,
                currency: 'INR',
                totalDurationMinutes: 240,
                totalLessons: 13,
                rating: 5.0,
                isEnrolled: false,
                isFeatured: true,
              ),
              CourseSummaryModel(
                id: 'c-kn-rao',
                sku: 'course-kn-rao-marriage-money',
                slug: 'shri-k-n-rao-method-of-marriage-money-astrology',
                title: 'Shri K.N. Rao Method of Marriage & Money Astrology',
                hindiTitle: 'श्री के.एन. राव विवाह एवं धन ज्योतिष पद्धति',
                shortDescription: 'Marriage timing and money techniques by Shri K.N. Rao.',
                hindiDescription: 'श्री के.एन. राव पद्धति पर आधारित विवाह एवं धन विश्लेषण।',
                instructorName: 'Astro Sushil Kumar Singh',
                language: 'Hindi',
                level: CourseLevelEnum.advanced,
                pricePaise: 499900,
                priceRupees: 4999,
                originalPricePaise: 999900,
                originalPriceRupees: 9999,
                currency: 'INR',
                totalDurationMinutes: 180,
                totalLessons: 8,
                rating: 5.0,
                isEnrolled: true,
                isFeatured: true,
              ),
              CourseSummaryModel(
                id: 'c-dash-mahavidya',
                sku: 'course-dash-mahavidya',
                slug: 'dash-mahavidya-astrology',
                title: 'Dash Mahavidya Astrology',
                hindiTitle: 'दस महाविद्या ज्योतिष एवं साधना',
                shortDescription: 'Ancient secrets of the Dash Mahavidyas.',
                hindiDescription: 'दस दिव्य महाविद्याओं के रहस्य एवं साधना।',
                instructorName: 'Astro Sushil Kumar Singh',
                language: 'English',
                level: CourseLevelEnum.beginner,
                pricePaise: 899900,
                priceRupees: 8999,
                originalPricePaise: 1599900,
                originalPriceRupees: 15999,
                currency: 'INR',
                totalDurationMinutes: 165,
                totalLessons: 12,
                rating: 5.0,
                isEnrolled: false,
                isFeatured: true,
              ),
            ],
        mockMyLearning = myLearning ??
            const [
              MyLearningCourseModel(
                id: 'c-kn-rao',
                courseId: 'c-kn-rao',
                sku: 'course-kn-rao-marriage-money',
                slug: 'shri-k-n-rao-method-of-marriage-money-astrology',
                title: 'Shri K.N. Rao Method of Marriage & Money Astrology',
                hindiTitle: 'श्री के.एन. राव विवाह एवं धन ज्योतिष पद्धति',
                shortDescription: 'Marriage timing and money techniques.',
                totalDurationMinutes: 180,
                totalLessons: 8,
                completedLessons: 4,
                progressPercent: 50,
              ),
            ],
        mockDetail = detail ??
            const CourseDetailModel(
              id: 'c-gupt-nadi',
              sku: 'course-gupt-nadi',
              slug: 'gupt-nadi-astrology',
              title: 'Gupt Nadi Astrology',
              hindiTitle: 'गुप्त नाड़ी ज्योतिष',
              shortDescription: 'Detailed video lectures covering Nadi fundamentals.',
              instructorName: 'Astro Sushil Kumar Singh',
              language: 'English',
              level: CourseLevelEnum.beginner,
              pricePaise: 599900,
              priceRupees: 5999,
              originalPricePaise: 1099900,
              originalPriceRupees: 10999,
              currency: 'INR',
              totalDurationMinutes: 240,
              rating: 5.0,
              isEnrolled: false,
              progressPercent: 0,
              sections: [
                CourseSectionModel(
                  id: 'sec-1',
                  title: 'Section 1: Foundations & Nadi Principles',
                  hindiTitle: 'भाग 1: मूल सिद्धांत एवं नाड़ी परिचय',
                  orderIndex: 1,
                  lessons: [
                    CourseLessonModel(
                      id: 'l-1',
                      title: 'Introduction of Astrology',
                      hindiTitle: 'ज्योतिष का परिचय',
                      description: 'Overview of Vedic astrology principles.',
                      orderIndex: 1,
                      durationMinutes: 15,
                      durationSeconds: 900,
                      isFreePreview: true,
                      isLocked: false,
                      isUnlocked: true,
                      isCompleted: false,
                      videoType: 'HLS',
                    ),
                    CourseLessonModel(
                      id: 'l-2',
                      title: 'Basic Introduction - Gupt Nadi Astrology',
                      hindiTitle: 'गुप्त नाड़ी ज्योतिष मूल परिचय',
                      description: 'Core concepts of BNN lineage and planetary combinations.',
                      orderIndex: 2,
                      durationMinutes: 20,
                      durationSeconds: 1200,
                      isFreePreview: false,
                      isLocked: true,
                      isUnlocked: false,
                      isCompleted: false,
                      videoType: 'HLS',
                    ),
                  ],
                ),
              ],
            ),
        mockPreviewPlayback = previewPlayback ??
            const LessonPlaybackModel(
              lesson: CourseLessonModel(
                id: 'l-1',
                courseTitle: 'Gupt Nadi Astrology',
                sectionTitle: 'Section 1: Foundations & Nadi Principles',
                title: 'Introduction of Astrology',
                orderIndex: 1,
                durationMinutes: 15,
                durationSeconds: 900,
                isFreePreview: true,
                isLocked: false,
                isUnlocked: true,
                isCompleted: false,
                videoType: 'HLS',
              ),
              isAvailable: true,
              isUnlocked: true,
              isFreePreview: true,
              streamUrl: 'https://d502jbuhuh9wk.cloudfront.net/courses/preview.m3u8',
              nextLessonId: 'l-2',
              nextLessonTitle: 'Basic Introduction',
            ),
        mockProtectedPlayback = protectedPlayback ??
            const LessonPlaybackModel(
              lesson: CourseLessonModel(
                id: 'l-2',
                courseTitle: 'Gupt Nadi Astrology',
                sectionTitle: 'Section 1: Foundations & Nadi Principles',
                title: 'Basic Introduction - Gupt Nadi Astrology',
                orderIndex: 2,
                durationMinutes: 20,
                durationSeconds: 1200,
                isFreePreview: false,
                isLocked: false,
                isUnlocked: true,
                isCompleted: false,
                videoType: 'HLS',
              ),
              isAvailable: false,
              isUnlocked: true,
              isFreePreview: false,
              unavailableNotice:
                  'Video stream is securely hosted on Astro Sushil Learning Cloud (Graphy LMS).',
              platformUrl: 'https://courses.astrosushil.com/courses/gupt-nadi',
              prevLessonId: 'l-1',
              prevLessonTitle: 'Introduction of Astrology',
            );

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<List<CourseSummaryModel>> fetchCourses({
    String? search,
    String? level,
    String? language,
  }) async {
    if (shouldFail) {
      throw Exception('Network connection failed. Please try again.');
    }
    return mockCourses.where((c) {
      if (search != null && search.isNotEmpty) {
        final q = search.toLowerCase();
        if (!c.title.toLowerCase().contains(q) &&
            !(c.hindiTitle?.toLowerCase().contains(q) ?? false)) {
          return false;
        }
      }
      if (level != null && level != 'ALL') {
        if (c.level.displayName.toUpperCase() != level.toUpperCase()) {
          return false;
        }
      }
      if (language != null && language != 'ALL') {
        if (c.language.toLowerCase() != language.toLowerCase()) {
          return false;
        }
      }
      return true;
    }).toList();
  }

  @override
  Future<List<MyLearningCourseModel>> fetchMyLearning() async {
    if (shouldFail) {
      throw Exception('Could not fetch enrolled masterclasses.');
    }
    return mockMyLearning;
  }

  @override
  Future<CourseDetailModel> fetchCourseDetails(String idOrSlug) async {
    if (shouldFail) {
      throw Exception('Failed to load course details.');
    }
    return mockDetail;
  }

  @override
  Future<LessonPlaybackModel> fetchLessonPlayback(String lessonId) async {
    if (shouldFail) {
      throw Exception('Video stream unavailable.');
    }
    if (lessonId == 'l-1') {
      return mockPreviewPlayback;
    }
    return mockProtectedPlayback;
  }

  @override
  Future<Map<String, dynamic>> updateLessonProgress({
    required String lessonId,
    required int watchedSeconds,
    bool isCompleted = false,
  }) async {
    updateProgressCalls++;
    lastUpdatedLessonId = lessonId;
    lastWatchedSeconds = watchedSeconds;
    lastIsCompleted = isCompleted;
    return {
      'lessonId': lessonId,
      'watchedSeconds': watchedSeconds,
      'isCompleted': isCompleted,
    };
  }

  @override
  Future<Map<String, dynamic>> enrollInCourse(String courseId) async {
    return {
      'orderId': 'order_test_778',
      'amount': 599900,
      'currency': 'INR',
      'courseId': courseId,
      'alreadyEnrolled': false,
    };
  }
}

class TestCustomLocaleNotifier extends LocaleNotifier {
  TestCustomLocaleNotifier(super.storage, Locale initialLocale) {
    state = initialLocale;
  }
}

class _TestAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  _TestAuthNotifier(super.state);

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

void main() {
  Widget buildAppWrapper({
    required Widget child,
    Locale locale = const Locale('en'),
    MockPhase7CoursesService? customService,
    AuthState? authState,
  }) {
    final storage = InMemorySecureStorageService();
    final service = customService ?? MockPhase7CoursesService();
    final currentAuthState = authState ??
        AuthState.authenticated(UserModel(
          id: 'user_test_1',
          email: 'test@astrosushil.com',
          role: 'USER',
          createdAt: DateTime(2026, 1, 1),
        ));

    return ProviderScope(
      overrides: [
        secureStorageProvider.overrideWithValue(storage),
        coursesServiceProvider.overrideWithValue(service),
        localeProvider.overrideWith((ref) => TestCustomLocaleNotifier(storage, locale)),
        authStateProvider.overrideWith((ref) => _TestAuthNotifier(currentAuthState)),
      ],
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        locale: locale,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        home: child,
      ),
    );
  }

  group('Phase 7 Courses & Learning Experience Comprehensive Suite', () {
    testWidgets('1. Catalogue renders 3 verified courses with official pricing & 18% GST badges', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(buildAppWrapper(child: const CoursesHubScreen()));
      await tester.pumpAndSettle();

      // Cosmic Hero and Header
      expect(find.text('Vedic Courses & Masterclasses'), findsOneWidget);
      expect(find.text('Learn authentic Gupta Nadi & predictive astrology from Astro Sushil'), findsOneWidget);

      // Lineage guidance card
      expect(find.text('Authentic Vedic Astrology Lineage'), findsOneWidget);

      // 3 verified course titles
      expect(find.text('Gupt Nadi Astrology'), findsOneWidget);
      expect(find.text('Shri K.N. Rao Method of Marriage & Money Astrology'), findsOneWidget);
      expect(find.text('Dash Mahavidya Astrology'), findsOneWidget);

      // Pricing & 18% GST badges
      expect(find.text('₹5999'), findsOneWidget);
      expect(find.text('₹4999'), findsOneWidget);
      expect(find.text('₹8999'), findsOneWidget);
      expect(find.text('Inclusive of all taxes (18% GST)'), findsNWidgets(3));

      // Access actions: Enrolled vs Enroll Now
      expect(find.text('Continue Learning'), findsOneWidget); // Shri K.N. Rao
      expect(find.text('Enroll Now'), findsNWidgets(2)); // Gupt Nadi & Dash Mahavidya

      // Free Preview pill on Gupt Nadi
      expect(find.text('Free Preview'), findsWidgets);
    });

    testWidgets('2. Filter chips filter courses by level and language correctly', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(buildAppWrapper(child: const CoursesHubScreen()));
      await tester.pumpAndSettle();

      // Initially 3 courses
      expect(find.text('Gupt Nadi Astrology'), findsOneWidget);
      expect(find.text('Shri K.N. Rao Method of Marriage & Money Astrology'), findsOneWidget);
      expect(find.text('Dash Mahavidya Astrology'), findsOneWidget);

      // Tap 'Advanced' filter
      await tester.ensureVisible(find.text('Advanced'));
      await tester.tap(find.text('Advanced'), warnIfMissed: false);
      await tester.pumpAndSettle();

      // Only K.N. Rao method should remain
      expect(find.text('Shri K.N. Rao Method of Marriage & Money Astrology'), findsOneWidget);
      expect(find.text('Gupt Nadi Astrology'), findsNothing);
      expect(find.text('Dash Mahavidya Astrology'), findsNothing);

      // Tap 'All Levels' to reset filter
      await tester.ensureVisible(find.text('All Levels'));
      await tester.tap(find.text('All Levels'), warnIfMissed: false);
      await tester.pumpAndSettle();

      // All 3 back
      expect(find.text('Gupt Nadi Astrology'), findsOneWidget);
      expect(find.text('Shri K.N. Rao Method of Marriage & Money Astrology'), findsOneWidget);
      expect(find.text('Dash Mahavidya Astrology'), findsOneWidget);
    });

    testWidgets('3. CourseDetailScreen renders syllabus, locked dialog for locked lessons, and overview', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(buildAppWrapper(
        child: const CourseDetailScreen(idOrSlug: 'c-gupt-nadi'),
      ));
      await tester.pumpAndSettle();

      // Header details
      expect(find.text('Gupt Nadi Astrology'), findsWidgets);
      expect(find.text('Astro Sushil Kumar Singh'), findsWidgets);

      // Syllabus section
      expect(find.text('Section 1: Foundations & Nadi Principles'), findsOneWidget);
      expect(find.text('Introduction of Astrology'), findsOneWidget);
      expect(find.text('Basic Introduction - Gupt Nadi Astrology'), findsOneWidget);

      // Tap locked lesson -> non-entitled dialog
      await tester.ensureVisible(find.text('Basic Introduction - Gupt Nadi Astrology'));
      await tester.tap(find.text('Basic Introduction - Gupt Nadi Astrology'), warnIfMissed: false);
      await tester.pumpAndSettle();

      expect(find.text('Premium Masterclass Lesson'), findsOneWidget);
      expect(find.textContaining('exclusive proprietary techniques'), findsOneWidget);

      // Dismiss dialog
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();

      // Switch to Overview tab
      await tester.tap(find.text('Course Overview'));
      await tester.pumpAndSettle();

      expect(find.text('Course Overview'), findsWidgets);
      expect(find.text('Detailed video lectures covering Nadi fundamentals.'), findsOneWidget);
      expect(find.text('Instructor Profile'), findsOneWidget);
      expect(find.text('Key Deliverables & Learning Objectives'), findsOneWidget);
    });

    testWidgets('4. Enrollment modal itemizes 18% GST breakdown and handles purchase flow', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(buildAppWrapper(
        child: const CourseDetailScreen(idOrSlug: 'c-gupt-nadi'),
      ));
      await tester.pumpAndSettle();

      // Tap bottom Enroll Now button
      final enrollBtn = find.widgetWithText(ElevatedButton, 'Enroll Now');
      await tester.tap(enrollBtn);
      await tester.pumpAndSettle();

      // Itemized invoice breakdown sheet
      expect(find.text('Complete Masterclass Enrollment'), findsOneWidget);
      expect(find.text('Base Course Fee:'), findsOneWidget);
      expect(find.text('GST (18% Included):'), findsOneWidget);
      expect(find.text('Total Payable:'), findsOneWidget);
      expect(find.text('Proceed to Pay ₹5999'), findsOneWidget);
    });

    testWidgets('5. My Learning tab renders enrolled courses, real progress, and handles empty state', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final mockService = MockPhase7CoursesService();
      await tester.pumpWidget(buildAppWrapper(
        child: const CoursesHubScreen(),
        customService: mockService,
      ));
      await tester.pumpAndSettle();

      // Switch to My Learning tab
      await tester.tap(find.text('My Learning'));
      await tester.pumpAndSettle();

      // Enrolled course card
      expect(find.text('Shri K.N. Rao Method of Marriage & Money Astrology'), findsOneWidget);
      expect(find.text('50% completed'), findsOneWidget);
      expect(find.text('4 / 8 lessons completed'), findsOneWidget);
      expect(find.text('Continue Learning'), findsOneWidget);

      // Now test empty state
      final emptyService = MockPhase7CoursesService(myLearning: const []);
      await tester.pumpWidget(buildAppWrapper(
        child: const CoursesHubScreen(),
        customService: emptyService,
      ));
      await tester.pumpAndSettle();

      // Switch to My Learning tab
      await tester.tap(find.text('My Learning'));
      await tester.pumpAndSettle();

      expect(find.text("You haven't enrolled in any courses yet. Explore our authentic masterclasses!"), findsOneWidget);
      expect(find.text('Explore Course Catalog'), findsOneWidget);

      // Tapping Explore Course Catalog switches back to Explore
      await tester.tap(find.text('Explore Course Catalog'));
      await tester.pumpAndSettle();

      expect(find.text('Vedic Courses & Masterclasses'), findsOneWidget);
    });

    testWidgets('6. CoursePlayerScreen native preview playback & speed cycle & progress mark', (tester) async {
      final mockService = MockPhase7CoursesService();
      await tester.pumpWidget(buildAppWrapper(
        child: const CoursePlayerScreen(lessonId: 'l-1'),
        customService: mockService,
      ));
      await tester.pumpAndSettle();

      // Native preview player surface
      expect(find.byIcon(Icons.replay_10_rounded), findsOneWidget);
      expect(find.byIcon(Icons.forward_10_rounded), findsOneWidget);
      expect(find.text('Introduction of Astrology'), findsWidgets);
      expect(find.text('Free Preview'), findsWidgets);

      // Speed button cycles playback speed
      expect(find.text('1.0x'), findsOneWidget);
      await tester.tap(find.text('1.0x'));
      await tester.pumpAndSettle();
      expect(find.text('1.25x'), findsOneWidget);

      // Seek buttons present
      expect(find.byIcon(Icons.replay_10_rounded), findsOneWidget);
      expect(find.byIcon(Icons.forward_10_rounded), findsOneWidget);

      // Mark lesson completed
      final completeBtn = find.text('Complete');
      expect(completeBtn, findsOneWidget);
      await tester.tap(completeBtn);
      await tester.pumpAndSettle();

      // Updated to 'Done' and service called
      expect(find.text('Done'), findsOneWidget);
      expect(mockService.updateProgressCalls, 1);
      expect(mockService.lastIsCompleted, true);
    });

    testWidgets('7. CoursePlayerScreen renders protected LMS explanatory surface with portal action', (tester) async {
      await tester.pumpWidget(buildAppWrapper(
        child: const CoursePlayerScreen(lessonId: 'l-2'),
      ));
      await tester.pumpAndSettle();

      // Protected cloud LMS surface
      expect(find.text('Official Masterclass Protected Stream'), findsOneWidget);
      expect(find.text('Open in Learning Portal'), findsOneWidget);
      expect(find.text('Basic Introduction - Gupt Nadi Astrology'), findsWidgets);
      expect(find.text('Previous'), findsOneWidget);
    });

    testWidgets('8. Honest error state with functional retry button', (tester) async {
      final failService = MockPhase7CoursesService(shouldFail: true);
      await tester.pumpWidget(buildAppWrapper(
        child: const CoursesHubScreen(),
        customService: failService,
      ));
      await tester.pumpAndSettle();

      expect(find.text('Retry'), findsOneWidget);
      expect(find.textContaining('Network connection failed'), findsOneWidget);
    });

    testWidgets('9. Hindi localized course catalogue rendering', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(buildAppWrapper(
        child: const CoursesHubScreen(),
        locale: const Locale('hi'),
      ));
      await tester.pumpAndSettle();

      // Devanagari titles & labels
      expect(find.text('वैदिक पाठ्यक्रम एवं मास्टरक्लास'), findsOneWidget);
      expect(find.text('गुप्त नाड़ी ज्योतिष'), findsOneWidget);
      expect(find.text('श्री के.एन. राव विवाह एवं धन ज्योतिष पद्धति'), findsOneWidget);
      expect(find.text('दस महाविद्या ज्योतिष एवं साधना'), findsOneWidget);
      expect(find.text('अध्ययन जारी रखें'), findsOneWidget);
      expect(find.text('अभी प्रवेश लें'), findsNWidgets(2));
    });

    testWidgets('10. Multi-viewport responsive rendering (320, 360, 390, 414 dp)', (tester) async {
      final viewports = [
        const Size(320, 640),
        const Size(360, 740),
        const Size(390, 844),
        const Size(414, 896),
      ];

      for (final size in viewports) {
        tester.view.physicalSize = Size(size.width * 2, size.height * 2);
        tester.view.devicePixelRatio = 2.0;
        addTearDown(tester.view.resetPhysicalSize);

        await tester.pumpWidget(buildAppWrapper(child: const CoursesHubScreen()));
        await tester.pumpAndSettle();

        expect(find.text('Gupt Nadi Astrology'), findsOneWidget);
        expect(tester.takeException(), isNull);
      }
    });

    testWidgets('11. Dynamic text scaling (1.0x, 1.5x, 2.0x) renders without crash or overflow', (tester) async {
      for (final scale in [1.0, 1.5, 2.0]) {
        tester.view.platformDispatcher.textScaleFactorTestValue = scale;
        addTearDown(tester.view.platformDispatcher.clearTextScaleFactorTestValue);

        await tester.pumpWidget(buildAppWrapper(child: const CoursesHubScreen()));
        await tester.pumpAndSettle();

        expect(find.text('Gupt Nadi Astrology'), findsOneWidget);
        expect(tester.takeException(), isNull);
      }
    });
  });
}
