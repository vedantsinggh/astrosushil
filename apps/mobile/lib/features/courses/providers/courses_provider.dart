import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/course_models.dart';
import '../services/courses_service.dart';

/// Provider for CoursesService
final coursesServiceProvider = Provider<CoursesService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return CoursesService(apiClient: apiClient);
});

/// Search and filter state providers
final courseSearchQueryProvider = StateProvider<String>((ref) => '');
final selectedCourseLevelProvider = StateProvider<String>((ref) => 'ALL');
final selectedCourseLanguageProvider = StateProvider<String>((ref) => 'ALL');
final coursesActiveTabProvider = StateProvider<int>((ref) => 0); // 0 = Explore, 1 = My Learning

/// Async provider for courses catalogue
final coursesListProvider = FutureProvider<List<CourseSummaryModel>>((ref) async {
  final service = ref.watch(coursesServiceProvider);
  final search = ref.watch(courseSearchQueryProvider);
  final level = ref.watch(selectedCourseLevelProvider);
  final language = ref.watch(selectedCourseLanguageProvider);

  return service.fetchCourses(
    search: search.isNotEmpty ? search : null,
    level: level != 'ALL' ? level : null,
    language: language != 'ALL' ? language : null,
  );
});

/// Async provider for learner's active enrollments
final myLearningProvider = FutureProvider<List<MyLearningCourseModel>>((ref) async {
  final service = ref.watch(coursesServiceProvider);
  return service.fetchMyLearning();
});

/// Family provider for course details by ID or slug
final courseDetailProvider =
    FutureProvider.family<CourseDetailModel, String>((ref, idOrSlug) async {
  final service = ref.watch(coursesServiceProvider);
  return service.fetchCourseDetails(idOrSlug);
});

/// Family provider for lesson playback stream
final lessonPlaybackProvider =
    FutureProvider.family<LessonPlaybackModel, String>((ref, lessonId) async {
  final service = ref.watch(coursesServiceProvider);
  return service.fetchLessonPlayback(lessonId);
});
