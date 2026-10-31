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

class MockTestCoursesService implements CoursesService {
  final List<CourseSummaryModel> mockCourses = const [
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
  ];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<List<CourseSummaryModel>> fetchCourses({
    String? search,
    String? level,
    String? language,
  }) async {
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
    return const [
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
    ];
  }

  @override
  Future<CourseDetailModel> fetchCourseDetails(String idOrSlug) async {
    return const CourseDetailModel(
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
    );
  }

  @override
  Future<LessonPlaybackModel> fetchLessonPlayback(String lessonId) async {
    if (lessonId == 'l-1') {
      return const LessonPlaybackModel(
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
      );
    } else {
      return const LessonPlaybackModel(
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
            'Video stream is securely hosted on Astro Sushil Learning Cloud.',
        platformUrl: 'https://courses.astrosushil.com/courses/gupt-nadi',
        prevLessonId: 'l-1',
        prevLessonTitle: 'Introduction of Astrology',
      );
    }
  }

  @override
  Future<Map<String, dynamic>> updateLessonProgress({
    required String lessonId,
    required int watchedSeconds,
    bool isCompleted = false,
  }) async {
    return {
      'lessonId': lessonId,
      'watchedSeconds': watchedSeconds,
      'isCompleted': isCompleted,
    };
  }
}

class TestCustomLocaleNotifier extends LocaleNotifier {
  TestCustomLocaleNotifier(super.storage, Locale initialLocale) {
    state = initialLocale;
  }
}

void main() {
  Widget buildAppWrapper({
    required Widget child,
    Locale locale = const Locale('en'),
    MockTestCoursesService? customService,
  }) {
    final storage = InMemorySecureStorageService();
    final service = customService ?? MockTestCoursesService();

    return ProviderScope(
      overrides: [
        secureStorageProvider.overrideWithValue(storage),
        coursesServiceProvider.overrideWithValue(service),
        localeProvider.overrideWith((ref) => TestCustomLocaleNotifier(storage, locale)),
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

  group('Phase 6 Courses Hub & Catalogue Widget Tests', () {
    testWidgets('1. Renders CoursesHubScreen with 3 verified courses and dual tabs', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(buildAppWrapper(child: const CoursesHubScreen()));
      await tester.pumpAndSettle();

      // Dual navigation tabs
      expect(find.text('All Courses'), findsOneWidget);
      expect(find.text('My Learning'), findsOneWidget);

      // 3 verified courses
      expect(find.text('Gupt Nadi Astrology'), findsAtLeastNWidgets(1));
      expect(find.text('Shri K.N. Rao Method of Marriage & Money Astrology'), findsAtLeastNWidgets(1));
      expect(find.text('Dash Mahavidya Astrology'), findsAtLeastNWidgets(1));

      // Verified prices
      expect(find.text('₹5999'), findsAtLeastNWidgets(1));
      expect(find.text('₹4999'), findsAtLeastNWidgets(1));
      expect(find.text('₹8999'), findsAtLeastNWidgets(1));
    });

    testWidgets('2. Switches to My Learning tab and displays enrolled progress', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(buildAppWrapper(child: const CoursesHubScreen()));
      await tester.pumpAndSettle();

      // Tap on My Learning Tab
      await tester.tap(find.text('My Learning'));
      await tester.pumpAndSettle();

      // Verified enrolled course
      expect(find.text('Shri K.N. Rao Method of Marriage & Money Astrology'), findsOneWidget);
      expect(find.text('4 / 8 lessons completed'), findsOneWidget);
      expect(find.text('50% completed'), findsOneWidget);
    });

    testWidgets('3. Renders Hindi localized course titles and labels in Hindi locale', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        buildAppWrapper(
          child: const CoursesHubScreen(),
          locale: const Locale('hi'),
        ),
      );
      await tester.pumpAndSettle();

      // Hindi tab titles
      expect(find.text('सभी पाठ्यक्रम'), findsOneWidget);
      expect(find.text('मेरा अध्ययन'), findsOneWidget);

      // Localized course names
      expect(find.text('गुप्त नाड़ी ज्योतिष'), findsAtLeastNWidgets(1));
      expect(find.text('श्री के.एन. राव विवाह एवं धन ज्योतिष पद्धति'), findsAtLeastNWidgets(1));
      expect(find.text('दस महाविद्या ज्योतिष एवं साधना'), findsAtLeastNWidgets(1));
    });

    testWidgets('4. Filter chip selection filters courses by level', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(buildAppWrapper(child: const CoursesHubScreen()));
      await tester.pumpAndSettle();

      // Tap Advanced filter chip
      await tester.tap(find.text('Advanced'));
      await tester.pumpAndSettle();

      // Only Shri K.N. Rao is ADVANCED
      expect(find.text('Shri K.N. Rao Method of Marriage & Money Astrology'), findsAtLeastNWidgets(1));
      expect(find.text('Dash Mahavidya Astrology'), findsNothing);
    });

    testWidgets('5. CourseDetailScreen renders curriculum, lesson locks, and preview tags', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        buildAppWrapper(
          child: const CourseDetailScreen(idOrSlug: 'gupt-nadi-astrology'),
        ),
      );
      await tester.pumpAndSettle();

      // Header and syllabus
      expect(find.text('Gupt Nadi Astrology'), findsAtLeastNWidgets(1));
      expect(find.text('Curriculum & Syllabus'), findsOneWidget);
      expect(find.text('Course Overview'), findsOneWidget);

      // Section and lessons
      expect(find.text('Section 1: Foundations & Nadi Principles'), findsOneWidget);
      expect(find.text('Introduction of Astrology'), findsOneWidget);
      expect(find.text('Free Preview'), findsOneWidget);
      expect(find.text('Basic Introduction - Gupt Nadi Astrology'), findsOneWidget);
    });

    testWidgets('6. CoursePlayerScreen renders direct playback surface for free preview', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        buildAppWrapper(
          child: const CoursePlayerScreen(lessonId: 'l-1'),
        ),
      );
      await tester.pumpAndSettle();

      // Playback elements
      expect(find.text('Introduction of Astrology'), findsOneWidget);
      expect(find.byIcon(Icons.play_arrow_rounded), findsOneWidget);
      expect(find.byIcon(Icons.replay_10_rounded), findsOneWidget);
      expect(find.byIcon(Icons.forward_10_rounded), findsOneWidget);
      expect(find.text('Next Lesson'), findsOneWidget);
    });

    testWidgets('7. CoursePlayerScreen renders protected stream surface when media is hosted on Cloud LMS', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        buildAppWrapper(
          child: const CoursePlayerScreen(lessonId: 'l-2'),
        ),
      );
      await tester.pumpAndSettle();

      // Protected streaming surface
      expect(find.text('Official Masterclass Protected Stream'), findsOneWidget);
      expect(find.text('Open in Learning Portal'), findsOneWidget);
      expect(find.byIcon(Icons.lock_rounded), findsOneWidget);
      expect(find.text('Previous'), findsOneWidget);
    });
  });
}
