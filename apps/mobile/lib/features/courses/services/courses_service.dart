import '../../../core/network/api_client.dart';
import '../models/course_models.dart';

class CoursesService {
  final ApiClient _apiClient;

  CoursesService({required ApiClient apiClient}) : _apiClient = apiClient;

  /// Fetch public or user-personalized course catalog
  Future<List<CourseSummaryModel>> fetchCourses({
    String? search,
    String? level,
    String? language,
  }) async {
    final queryParams = <String, dynamic>{};
    if (search != null && search.trim().isNotEmpty) {
      queryParams['search'] = search.trim();
    }
    if (level != null && level.isNotEmpty && level != 'ALL') {
      queryParams['level'] = level.toUpperCase();
    }
    if (language != null && language.isNotEmpty && language != 'ALL') {
      queryParams['language'] = language;
    }

    final response = await _apiClient.get(
      '/courses',
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );

    final data = response['data'] as Map<String, dynamic>? ?? {};
    final items = data['items'] as List<dynamic>? ?? [];

    return items
        .map((e) => CourseSummaryModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Fetch full curriculum & details for a specific course
  Future<CourseDetailModel> fetchCourseDetails(String idOrSlug) async {
    final response = await _apiClient.get('/courses/$idOrSlug');
    final data = response['data'] as Map<String, dynamic>? ?? {};
    final courseJson = data['course'] as Map<String, dynamic>? ?? {};

    return CourseDetailModel.fromJson(courseJson);
  }

  /// Fetch list of enrolled courses for authenticated learner
  Future<List<MyLearningCourseModel>> fetchMyLearning() async {
    final response = await _apiClient.get('/courses/my-learning');
    final data = response['data'] as Map<String, dynamic>? ?? {};
    final items = data['items'] as List<dynamic>? ?? [];

    return items
        .map((e) => MyLearningCourseModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Retrieve secure playback information & stream URL for a lesson
  Future<LessonPlaybackModel> fetchLessonPlayback(String lessonId) async {
    final response = await _apiClient.get('/courses/lessons/$lessonId/playback');
    final data = response['data'] as Map<String, dynamic>? ?? {};

    return LessonPlaybackModel.fromJson(data);
  }

  /// Save watched seconds and completion state for a lesson
  Future<Map<String, dynamic>> updateLessonProgress({
    required String lessonId,
    required int watchedSeconds,
    bool isCompleted = false,
  }) async {
    final response = await _apiClient.post(
      '/courses/lessons/$lessonId/progress',
      data: {
        'watchedSeconds': watchedSeconds,
        'isCompleted': isCompleted,
      },
    );

    return response['data'] as Map<String, dynamic>? ?? {};
  }

  /// Initiate course enrollment order via unified commerce
  Future<Map<String, dynamic>> enrollInCourse(String courseId) async {
    final response = await _apiClient.post(
      '/courses/enroll',
      data: {
        'courseId': courseId,
      },
    );

    return response['data'] as Map<String, dynamic>? ?? {};
  }

  /// Verify Razorpay payment and immediately grant active course entitlement
  Future<Map<String, dynamic>> verifyPayment({
    required String courseId,
    required String orderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    final response = await _apiClient.post(
      '/courses/verify-payment',
      data: {
        'courseId': courseId,
        'orderId': orderId,
        'razorpayPaymentId': razorpayPaymentId,
        'razorpaySignature': razorpaySignature,
      },
    );

    return response['data'] as Map<String, dynamic>? ?? {};
  }

  /// Fetch public external course links (`GET /course-links`)
  Future<List<CourseLinkModel>> fetchCourseLinks({
    String? search,
    String? category,
    bool? featured,
    int? page,
    int? limit,
  }) async {
    final queryParams = <String, dynamic>{};
    if (search != null && search.trim().isNotEmpty) {
      queryParams['search'] = search.trim();
    }
    if (category != null && category.trim().isNotEmpty) {
      queryParams['category'] = category.trim();
    }
    if (featured != null) {
      queryParams['featured'] = featured.toString();
    }
    if (page != null) queryParams['page'] = page;
    if (limit != null) queryParams['limit'] = limit;

    final response = await _apiClient.get(
      '/course-links',
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );
    final data = response['data'] as Map<String, dynamic>? ?? {};
    final items = data['items'] as List<dynamic>? ?? [];
    return items
        .map((e) => CourseLinkModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Record click on an external course link (`POST /course-links/$idOrSlug/click`)
  Future<String> registerCourseLinkClick(String idOrSlug) async {
    final response = await _apiClient.post('/course-links/$idOrSlug/click');
    final data = response['data'] as Map<String, dynamic>? ?? {};
    return data['redirectUrl'] as String? ?? '';
  }
}
