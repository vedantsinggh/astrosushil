import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
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

class MockCaptureCoursesService implements CoursesService {
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
            'Video stream is securely hosted on Astro Sushil Learning Cloud (Graphy LMS).',
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
  final outDir = Directory('/home/pilot/Projects/astrosushil/docs/audits/screenshots/phase_7');
  if (!outDir.existsSync()) {
    outDir.createSync(recursive: true);
  }

  Widget buildCaptureWidget({
    required GlobalKey boundaryKey,
    required Widget child,
    Locale locale = const Locale('en'),
  }) {
    final storage = InMemorySecureStorageService();
    final service = MockCaptureCoursesService();

    return ProviderScope(
      overrides: [
        secureStorageProvider.overrideWithValue(storage),
        coursesServiceProvider.overrideWithValue(service),
        localeProvider.overrideWith((ref) => TestCustomLocaleNotifier(storage, locale)),
      ],
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        locale: locale,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        home: RepaintBoundary(
          key: boundaryKey,
          child: child,
        ),
      ),
    );
  }

  Future<void> captureToFile(
    WidgetTester tester,
    GlobalKey boundaryKey,
    String filename,
  ) async {
    await tester.runAsync(() async {
      final RenderRepaintBoundary boundary =
          boundaryKey.currentContext!.findRenderObject()! as RenderRepaintBoundary;
      final ui.Image image = await boundary.toImage(pixelRatio: 2.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData != null) {
        final file = File('${outDir.path}/$filename');
        await file.writeAsBytes(byteData.buffer.asUint8List());
      }
    });
  }

  group('Phase 7 Courses Screens Capture Suite', () {
    testWidgets('Capture 01_courses_discovery_catalog', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureWidget(
        boundaryKey: boundaryKey,
        child: const CoursesHubScreen(),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '01_courses_discovery_catalog.png');
    });

    testWidgets('Capture 02_courses_filter_advanced', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureWidget(
        boundaryKey: boundaryKey,
        child: const CoursesHubScreen(),
      ));
      await tester.pumpAndSettle();

      // Tap Advanced filter chip
      await tester.ensureVisible(find.text('Advanced'));
      await tester.tap(find.text('Advanced'), warnIfMissed: false);
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '02_courses_filter_advanced.png');
    });

    testWidgets('Capture 03_courses_detail_syllabus', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureWidget(
        boundaryKey: boundaryKey,
        child: const CourseDetailScreen(idOrSlug: 'c-gupt-nadi'),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '03_courses_detail_syllabus.png');
    });

    testWidgets('Capture 04_courses_detail_overview', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureWidget(
        boundaryKey: boundaryKey,
        child: const CourseDetailScreen(idOrSlug: 'c-gupt-nadi'),
      ));
      await tester.pumpAndSettle();

      // Switch to Course Overview tab
      await tester.tap(find.text('Course Overview'));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '04_courses_detail_overview.png');
    });

    testWidgets('Capture 05_courses_player_preview', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureWidget(
        boundaryKey: boundaryKey,
        child: const CoursePlayerScreen(lessonId: 'l-1'),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '05_courses_player_preview.png');
    });

    testWidgets('Capture 06_courses_player_protected_lms', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureWidget(
        boundaryKey: boundaryKey,
        child: const CoursePlayerScreen(lessonId: 'l-2'),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '06_courses_player_protected_lms.png');
    });

    testWidgets('Capture 07_courses_my_learning', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(390 * 2, 844 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureWidget(
        boundaryKey: boundaryKey,
        child: const CoursesHubScreen(),
      ));
      await tester.pumpAndSettle();

      // Switch to My Learning tab
      await tester.tap(find.text('My Learning'));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '07_courses_my_learning.png');
    });

    testWidgets('Capture 08_courses_hindi_discovery', (tester) async {
      final boundaryKey = GlobalKey();
      tester.view.physicalSize = const Size(360 * 2, 800 * 2);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildCaptureWidget(
        boundaryKey: boundaryKey,
        locale: const Locale('hi'),
        child: const CoursesHubScreen(),
      ));
      await tester.pumpAndSettle();

      await captureToFile(tester, boundaryKey, '08_courses_hindi_discovery.png');
    });
  });
}
