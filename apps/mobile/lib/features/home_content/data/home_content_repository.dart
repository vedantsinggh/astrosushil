import '../../../core/network/api_client.dart';
import '../models/home_content_models.dart';

/// Home page content and the blog / video screens. Only public endpoints.
class HomeContentRepository {
  final ApiClient _api;

  HomeContentRepository(this._api);

  static Map<String, dynamic> _data(Map<String, dynamic> response) {
    final data = response['data'];
    return data is Map ? Map<String, dynamic>.from(data) : const {};
  }

  /// `GET /app/home`.
  Future<AppHomeContent> fetchHome() async => AppHomeContent.fromJson(_data(await _api.get('/app/home')));

  /// `GET /blogs`: published posts, newest first.
  Future<HomeBlogPage> fetchBlogs({int page = 1, int limit = 12, String? category}) async {
    final data = _data(await _api.get('/blogs', queryParameters: {
      'page': '$page',
      'limit': '$limit',
      if (category != null && category.isNotEmpty) 'category': category,
    }));
    final list = data['blogs'] is List ? data['blogs'] as List : const [];
    final blogs = list
        .whereType<Map>()
        .map((e) => HomeBlogSummary.fromJson(Map<String, dynamic>.from(e)))
        .where((b) => b.slug.isNotEmpty)
        .toList(growable: false);
    return HomeBlogPage(blogs: blogs, total: data['total'] is num ? (data['total'] as num).toInt() : blogs.length);
  }

  /// `GET /blogs/slug/:slug`.
  Future<HomeBlogPost> fetchBlog(String slug) async =>
      HomeBlogPost.fromJson(_data(await _api.get('/blogs/slug/${Uri.encodeComponent(slug)}')));

  /// `GET /media?section=podcast`: every YouTube video, without links that have no video id.
  Future<List<HomeVideo>> fetchYoutubeVideos() async {
    final response = await _api.get('/media', queryParameters: {'section': 'podcast'});
    final list = response['data'] is List ? response['data'] as List : const [];
    return list
        .whereType<Map>()
        .map((e) => HomeVideo.youtube(Map<String, dynamic>.from(e)))
        .whereType<HomeVideo>()
        .toList(growable: false);
  }
}
