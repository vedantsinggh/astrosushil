import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/features/courses/models/course_models.dart';
import 'package:astro_mobile/features/courses/services/courses_service.dart';
import 'package:astro_mobile/core/network/api_client.dart';

class MockApiClient implements ApiClient {
  final Map<String, dynamic> responses = {};
  String? lastGetPath;
  Map<String, dynamic>? lastGetQueryParams;
  String? lastPostPath;
  dynamic lastPostData;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);

  @override
  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    dynamic cancelToken,
    Duration? timeout,
  }) async {
    lastGetPath = path;
    lastGetQueryParams = queryParameters;
    return responses[path] ?? {'data': {}};
  }

  @override
  Future<Map<String, dynamic>> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    dynamic cancelToken,
    Duration? timeout,
  }) async {
    lastPostPath = path;
    lastPostData = data;
    return responses[path] ?? {'data': {}};
  }
}

void main() {
  group('Phase 6: Course Models & Serialization Tests', () {
    test('CourseLevelEnum fromString and displayName', () {
      expect(CourseLevelEnum.fromString('BEGINNER'), CourseLevelEnum.beginner);
      expect(CourseLevelEnum.fromString('beginner'), CourseLevelEnum.beginner);
      expect(CourseLevelEnum.fromString('INTERMEDIATE'), CourseLevelEnum.intermediate);
      expect(CourseLevelEnum.fromString('ADVANCED'), CourseLevelEnum.advanced);
      expect(CourseLevelEnum.fromString(null), CourseLevelEnum.beginner);

      expect(CourseLevelEnum.beginner.displayName, 'Beginner');
      expect(CourseLevelEnum.intermediate.displayName, 'Intermediate');
      expect(CourseLevelEnum.advanced.displayName, 'Advanced');
    });

    test('CourseSummaryModel deserialization, pricing, and localization', () {
      final json = {
        'id': 'c-1',
        'sku': 'course-gupt-nadi',
        'slug': 'gupt-nadi-astrology',
        'title': 'Gupt Nadi Astrology',
        'hindiTitle': 'गुप्त नाड़ी ज्योतिष',
        'shortDescription': 'Comprehensive Nadi course.',
        'hindiDescription': 'सम्पूर्ण गुप्त नाड़ी ज्योतिष पाठ्यक्रम।',
        'instructorName': 'Astro Sushil Kumar Singh',
        'language': 'English',
        'level': 'BEGINNER',
        'pricePaise': 599900,
        'originalPricePaise': 1099900,
        'currency': 'INR',
        'thumbnail': 'https://astro-sushil.s3.ap-southeast-2.amazonaws.com/assets/thumb.webp',
        'platformUrl': 'https://courses.astrosushil.com/courses/gupt-nadi',
        'totalDurationMinutes': 240,
        'totalLessons': 13,
        'rating': 4.9,
        'isEnrolled': false,
        'isFeatured': true,
      };

      final model = CourseSummaryModel.fromJson(json);

      expect(model.id, 'c-1');
      expect(model.sku, 'course-gupt-nadi');
      expect(model.slug, 'gupt-nadi-astrology');
      expect(model.pricePaise, 599900);
      expect(model.priceRupees, 5999);
      expect(model.originalPriceRupees, 10999);
      expect(model.formattedDuration, '4 hr ');
      expect(model.level, CourseLevelEnum.beginner);
      expect(model.isEnrolled, false);

      // Localization
      expect(model.getLocalizedTitle('en'), 'Gupt Nadi Astrology');
      expect(model.getLocalizedTitle('hi'), 'गुप्त नाड़ी ज्योतिष');
      expect(model.getLocalizedDescription('en'), 'Comprehensive Nadi course.');
      expect(model.getLocalizedDescription('hi'), 'सम्पूर्ण गुप्त नाड़ी ज्योतिष पाठ्यक्रम।');
    });

    test('CourseLessonModel serialization and preview status', () {
      final freeLessonJson = {
        'id': 'l-1',
        'courseId': 'c-1',
        'courseTitle': 'Gupt Nadi Astrology',
        'sectionId': 'sec-1',
        'sectionTitle': 'Foundations',
        'title': 'Introduction of Astrology',
        'hindiTitle': 'ज्योतिष का परिचय',
        'description': 'Overview of Vedic astrology principles.',
        'orderIndex': 1,
        'durationMinutes': 15,
        'durationSeconds': 900,
        'isFreePreview': true,
        'isLocked': false,
        'isUnlocked': true,
        'isCompleted': false,
        'videoUrl': 'https://d502jbuhuh9wk.cloudfront.net/preview.m3u8',
        'videoType': 'HLS',
      };

      final lesson = CourseLessonModel.fromJson(freeLessonJson);

      expect(lesson.id, 'l-1');
      expect(lesson.courseTitle, 'Gupt Nadi Astrology');
      expect(lesson.sectionTitle, 'Foundations');
      expect(lesson.isFreePreview, true);
      expect(lesson.isLocked, false);
      expect(lesson.durationSeconds, 900);
      expect(lesson.getLocalizedTitle('en'), 'Introduction of Astrology');
      expect(lesson.getLocalizedTitle('hi'), 'ज्योतिष का परिचय');

      final paidLessonJson = {
        'id': 'l-2',
        'title': 'Chapter 1 - Child Birth',
        'orderIndex': 2,
        'durationMinutes': 25,
        'durationSeconds': 1500,
        'isFreePreview': false,
        'isLocked': true,
        'isUnlocked': false,
        'isCompleted': false,
        'videoUrl': null,
      };

      final paidLesson = CourseLessonModel.fromJson(paidLessonJson);
      expect(paidLesson.isFreePreview, false);
      expect(paidLesson.isLocked, true);
      expect(paidLesson.isUnlocked, false);
      expect(paidLesson.videoUrl, isNull);
    });

    test('CourseDetailModel calculation of total lessons and section grouping', () {
      final detailJson = {
        'id': 'c-2',
        'sku': 'course-kn-rao-marriage-money',
        'slug': 'shri-k-n-rao-method-of-marriage-money-astrology',
        'title': 'Shri K.N. Rao Method of Marriage & Money Astrology',
        'hindiTitle': 'श्री के.एन. राव विवाह एवं धन ज्योतिष पद्धति',
        'shortDescription': 'Practical marriage and money predictions.',
        'instructorName': 'Astro Sushil Kumar Singh',
        'language': 'Hindi',
        'level': 'ADVANCED',
        'pricePaise': 499900,
        'currency': 'INR',
        'totalDurationMinutes': 180,
        'rating': 5.0,
        'isEnrolled': true,
        'progressPercent': 50,
        'sections': [
          {
            'id': 'sec-1',
            'title': 'Section 1: Marriage Timing',
            'orderIndex': 1,
            'lessons': [
              {
                'id': 'l-1',
                'title': 'Chapter 1 - Introduction',
                'orderIndex': 1,
                'durationMinutes': 20,
                'durationSeconds': 1200,
                'isFreePreview': true,
              },
              {
                'id': 'l-2',
                'title': 'Chapter 2 - Marriage Astrology',
                'orderIndex': 2,
                'durationMinutes': 25,
                'durationSeconds': 1500,
                'isFreePreview': false,
              },
            ],
          },
          {
            'id': 'sec-2',
            'title': 'Section 2: Wealth & Assets',
            'orderIndex': 2,
            'lessons': [
              {
                'id': 'l-3',
                'title': 'Chapter 6 - Money Astrology',
                'orderIndex': 1,
                'durationMinutes': 20,
                'durationSeconds': 1200,
                'isFreePreview': false,
              },
            ],
          },
        ],
      };

      final detail = CourseDetailModel.fromJson(detailJson);

      expect(detail.id, 'c-2');
      expect(detail.level, CourseLevelEnum.advanced);
      expect(detail.isEnrolled, true);
      expect(detail.progressPercent, 50);
      expect(detail.sections.length, 2);
      expect(detail.totalLessonsCount, 3);
      expect(detail.sections[0].lessons.length, 2);
      expect(detail.sections[1].lessons.length, 1);
    });

    test('LessonPlaybackModel with streaming and unavailable portal states', () {
      final availablePlaybackJson = {
        'lesson': {
          'id': 'l-1',
          'title': 'Introduction',
          'durationMinutes': 15,
          'durationSeconds': 900,
          'isFreePreview': true,
        },
        'playback': {
          'isUnlocked': true,
          'isFreePreview': true,
          'streamUrl': 'https://d502jbuhuh9wk.cloudfront.net/preview.m3u8',
          'isAvailable': true,
        },
        'navigation': {
          'nextLessonId': 'l-2',
          'nextLessonTitle': 'Chapter 1',
        },
      };

      final model1 = LessonPlaybackModel.fromJson(availablePlaybackJson);
      expect(model1.isAvailable, true);
      expect(model1.streamUrl, 'https://d502jbuhuh9wk.cloudfront.net/preview.m3u8');
      expect(model1.nextLessonId, 'l-2');
      expect(model1.nextLessonTitle, 'Chapter 1');
      expect(model1.prevLessonId, isNull);

      final unavailablePlaybackJson = {
        'lesson': {
          'id': 'l-2',
          'title': 'Chapter 1',
          'durationMinutes': 20,
          'durationSeconds': 1200,
          'isFreePreview': false,
        },
        'playback': {
          'isUnlocked': true,
          'isFreePreview': false,
          'streamUrl': null,
          'isAvailable': false,
          'unavailableNotice': 'Securely hosted on Astro Sushil Learning Cloud.',
          'platformUrl': 'https://courses.astrosushil.com/courses/gupt-nadi',
        },
        'navigation': {
          'prevLessonId': 'l-1',
          'prevLessonTitle': 'Introduction',
        },
      };

      final model2 = LessonPlaybackModel.fromJson(unavailablePlaybackJson);
      expect(model2.isAvailable, false);
      expect(model2.streamUrl, isNull);
      expect(model2.unavailableNotice, 'Securely hosted on Astro Sushil Learning Cloud.');
      expect(model2.platformUrl, 'https://courses.astrosushil.com/courses/gupt-nadi');
      expect(model2.prevLessonId, 'l-1');
      expect(model2.prevLessonTitle, 'Introduction');
    });

    test('MyLearningCourseModel progress fractions and formatting', () {
      final myLearningJson = {
        'id': 'c-1',
        'courseId': 'c-1',
        'sku': 'course-gupt-nadi',
        'slug': 'gupt-nadi-astrology',
        'title': 'Gupt Nadi Astrology',
        'hindiTitle': 'गुप्त नाड़ी ज्योतिष',
        'shortDescription': 'Comprehensive course.',
        'totalDurationMinutes': 240,
        'totalLessons': 10,
        'completedLessons': 4,
        'progressPercent': 40,
      };

      final myCourse = MyLearningCourseModel.fromJson(myLearningJson);

      expect(myCourse.courseId, 'c-1');
      expect(myCourse.totalLessons, 10);
      expect(myCourse.completedLessons, 4);
      expect(myCourse.progressPercent, 40);
      expect(myCourse.progressFraction, 0.4);
      expect(myCourse.getLocalizedTitle('hi'), 'गुप्त नाड़ी ज्योतिष');
    });
  });

  group('Phase 6: CoursesService API Client Integration Tests', () {
    late MockApiClient mockApi;
    late CoursesService service;

    setUp(() {
      mockApi = MockApiClient();
      service = CoursesService(apiClient: mockApi);
    });

    test('fetchCourses sends filters and parses list response', () async {
      mockApi.responses['/courses'] = {
        'data': {
          'items': [
            {
              'id': 'c-1',
              'sku': 'course-gupt-nadi',
              'slug': 'gupt-nadi-astrology',
              'title': 'Gupt Nadi Astrology',
              'shortDescription': 'Nadi course',
              'instructorName': 'Astro Sushil',
              'language': 'English',
              'level': 'BEGINNER',
              'pricePaise': 599900,
              'currency': 'INR',
              'totalDurationMinutes': 240,
              'totalLessons': 13,
              'rating': 5.0,
              'isEnrolled': false,
              'isFeatured': true,
            }
          ]
        }
      };

      final courses = await service.fetchCourses(
        search: 'nadi',
        level: 'BEGINNER',
        language: 'English',
      );

      expect(mockApi.lastGetPath, '/courses');
      expect(mockApi.lastGetQueryParams?['search'], 'nadi');
      expect(mockApi.lastGetQueryParams?['level'], 'BEGINNER');
      expect(mockApi.lastGetQueryParams?['language'], 'English');
      expect(courses.length, 1);
      expect(courses.first.slug, 'gupt-nadi-astrology');
    });

    test('fetchCourseDetails retrieves specific course curriculum', () async {
      mockApi.responses['/courses/gupt-nadi-astrology'] = {
        'data': {
          'course': {
            'id': 'c-1',
            'sku': 'course-gupt-nadi',
            'slug': 'gupt-nadi-astrology',
            'title': 'Gupt Nadi Astrology',
            'shortDescription': 'Nadi course',
            'instructorName': 'Astro Sushil',
            'language': 'English',
            'level': 'BEGINNER',
            'pricePaise': 599900,
            'currency': 'INR',
            'totalDurationMinutes': 240,
            'rating': 5.0,
            'isEnrolled': false,
            'progressPercent': 0,
            'sections': [],
          }
        }
      };

      final detail = await service.fetchCourseDetails('gupt-nadi-astrology');
      expect(mockApi.lastGetPath, '/courses/gupt-nadi-astrology');
      expect(detail.slug, 'gupt-nadi-astrology');
    });

    test('fetchMyLearning retrieves enrolled masterclasses', () async {
      mockApi.responses['/courses/my-learning'] = {
        'data': {
          'items': [
            {
              'id': 'c-1',
              'courseId': 'c-1',
              'sku': 'course-gupt-nadi',
              'slug': 'gupt-nadi-astrology',
              'title': 'Gupt Nadi Astrology',
              'shortDescription': 'Nadi course',
              'totalDurationMinutes': 240,
              'totalLessons': 13,
              'completedLessons': 1,
              'progressPercent': 8,
            }
          ]
        }
      };

      final myCourses = await service.fetchMyLearning();
      expect(mockApi.lastGetPath, '/courses/my-learning');
      expect(myCourses.length, 1);
      expect(myCourses.first.completedLessons, 1);
    });

    test('updateLessonProgress posts watchedSeconds and completion state', () async {
      mockApi.responses['/courses/lessons/l-1/progress'] = {
        'data': {
          'lessonId': 'l-1',
          'watchedSeconds': 300,
          'isCompleted': true,
        }
      };

      final result = await service.updateLessonProgress(
        lessonId: 'l-1',
        watchedSeconds: 300,
        isCompleted: true,
      );

      expect(mockApi.lastPostPath, '/courses/lessons/l-1/progress');
      expect(mockApi.lastPostData['watchedSeconds'], 300);
      expect(mockApi.lastPostData['isCompleted'], true);
      expect(result['isCompleted'], true);
    });

    test('enrollInCourse initiates commerce order', () async {
      mockApi.responses['/courses/enroll'] = {
        'data': {
          'order': {'id': 'ord-123', 'status': 'PENDING'},
          'payment': {'razorpayOrderId': 'order_rzp_123'},
        }
      };

      final result = await service.enrollInCourse('c-1');
      expect(mockApi.lastPostPath, '/courses/enroll');
      expect(mockApi.lastPostData['courseId'], 'c-1');
      expect(result['order']['id'], 'ord-123');
    });

    test('verifyPayment sends payment payload and creates entitlement', () async {
      mockApi.responses['/courses/verify-payment'] = {
        'data': {
          'entitlement': {'id': 'ent-123', 'status': 'ACTIVE'},
        }
      };

      final result = await service.verifyPayment(
        courseId: 'c-1',
        orderId: 'ord-123',
        razorpayPaymentId: 'pay_123',
        razorpaySignature: 'sig_123',
      );

      expect(mockApi.lastPostPath, '/courses/verify-payment');
      expect(mockApi.lastPostData['razorpayPaymentId'], 'pay_123');
      expect(result['entitlement']['status'], 'ACTIVE');
    });
  });
}
