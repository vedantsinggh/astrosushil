import '../utils/youtube.dart';

List<String> _strings(Object? value) => value is List ? value.whereType<String>().toList(growable: false) : const [];

List<Map<String, dynamic>> _maps(Object? value) =>
    value is List ? value.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList(growable: false) : const [];

String _str(Object? value) => value is String ? value : '';

String? _optStr(Object? value) => value is String && value.trim().isNotEmpty ? value : null;

bool _flag(Object? value) => value is bool ? value : true;

/// Ids staff chose in the admin (Mobile App → App Home), in order.
class HomeFeaturedIds {
  final List<String> consultationSkus;
  final List<String> reportIds;
  final List<String> productIds;

  const HomeFeaturedIds({this.consultationSkus = const [], this.reportIds = const [], this.productIds = const []});

  factory HomeFeaturedIds.fromJson(Map<String, dynamic> json) => HomeFeaturedIds(
        consultationSkus: _strings(json['consultationSkus']),
        reportIds: _strings(json['reportIds']),
        productIds: _strings(json['productIds']),
      );
}

/// Which content sections staff switched on.
class HomeSectionSwitches {
  final bool starVideos;
  final bool youtube;
  final bool testimonials;
  final bool blogs;

  const HomeSectionSwitches({this.starVideos = true, this.youtube = true, this.testimonials = true, this.blogs = true});

  factory HomeSectionSwitches.fromJson(Map<String, dynamic> json) => HomeSectionSwitches(
        starVideos: _flag(json['starVideos']),
        youtube: _flag(json['youtube']),
        testimonials: _flag(json['testimonials']),
        blogs: _flag(json['blogs']),
      );
}

/// A celebrity MP4 or a YouTube video. [subtitle] is the person's name for a celebrity video.
class HomeVideo {
  final String id;
  final String title;
  final String? subtitle;
  final String url;
  final String? thumbnailUrl;

  const HomeVideo({required this.id, required this.title, required this.url, this.subtitle, this.thumbnailUrl});

  static HomeVideo? celebrity(Map<String, dynamic> json) {
    final url = _str(json['videoUrl']);
    if (!url.startsWith('https://')) return null;
    return HomeVideo(id: _str(json['id']), title: _str(json['title']), subtitle: _optStr(json['personName']), url: url, thumbnailUrl: _optStr(json['thumbnailUrl']));
  }

  /// Null when the link has no YouTube video id.
  static HomeVideo? youtube(Map<String, dynamic> json) {
    // `url` from /app/home; `mediaUrl` from /media (the Videos screen).
    final url = _str(json['url']).isNotEmpty ? _str(json['url']) : _str(json['mediaUrl']);
    final videoId = youtubeIdOf(url);
    if (videoId == null) return null;
    return HomeVideo(id: _str(json['id']), title: _str(json['title']), url: url, thumbnailUrl: youtubeThumb(videoId));
  }
}

class HomeTestimonial {
  final String id;
  final String name;
  final int? rating;
  final String text;
  final String? imageUrl;

  const HomeTestimonial({required this.id, required this.name, required this.text, this.rating, this.imageUrl});

  factory HomeTestimonial.fromJson(Map<String, dynamic> json) => HomeTestimonial(
        id: _str(json['id']),
        name: _str(json['name']),
        rating: json['rating'] is num ? (json['rating'] as num).toInt() : null,
        text: _str(json['text']),
        imageUrl: _optStr(json['imageUrl']),
      );
}

class HomeBlogSummary {
  final String id;
  final String slug;
  final String title;
  final String shortDescription;
  final String category;
  final String? thumbnailUrl;
  final DateTime? publishedAt;

  const HomeBlogSummary({
    required this.id,
    required this.slug,
    required this.title,
    required this.shortDescription,
    required this.category,
    this.thumbnailUrl,
    this.publishedAt,
  });

  factory HomeBlogSummary.fromJson(Map<String, dynamic> json) => HomeBlogSummary(
        id: _str(json['id']),
        slug: _str(json['slug']),
        title: _str(json['title']),
        shortDescription: _str(json['shortDescription']),
        category: _str(json['category']),
        thumbnailUrl: _optStr(json['thumbnailUrl']) ?? _optStr((json['thumbnail'] is Map) ? (json['thumbnail'] as Map)['url'] : null),
        publishedAt: DateTime.tryParse(_str(json['publishedAt']).isNotEmpty ? _str(json['publishedAt']) : _str(json['createdAt'])),
      );
}

/// `GET /app/home`: featured ids, section switches and the CMS content of the home page.
class AppHomeContent {
  final HomeFeaturedIds featured;
  final HomeSectionSwitches show;
  final List<HomeVideo> celebrityVideos;
  final List<HomeVideo> youtubeVideos;
  final List<HomeTestimonial> testimonials;
  final List<HomeBlogSummary> blogs;

  const AppHomeContent({
    this.featured = const HomeFeaturedIds(),
    this.show = const HomeSectionSwitches(),
    this.celebrityVideos = const [],
    this.youtubeVideos = const [],
    this.testimonials = const [],
    this.blogs = const [],
  });

  factory AppHomeContent.fromJson(Map<String, dynamic> json) => AppHomeContent(
        featured: HomeFeaturedIds.fromJson(json['featured'] is Map ? Map<String, dynamic>.from(json['featured'] as Map) : const {}),
        show: HomeSectionSwitches.fromJson(json['show'] is Map ? Map<String, dynamic>.from(json['show'] as Map) : const {}),
        celebrityVideos: _maps(json['celebrityVideos']).map(HomeVideo.celebrity).whereType<HomeVideo>().toList(growable: false),
        youtubeVideos: _maps(json['youtubeVideos']).map(HomeVideo.youtube).whereType<HomeVideo>().toList(growable: false),
        testimonials: _maps(json['testimonials']).map(HomeTestimonial.fromJson).where((t) => t.text.trim().isNotEmpty).toList(growable: false),
        blogs: _maps(json['blogs']).map(HomeBlogSummary.fromJson).where((b) => b.slug.isNotEmpty).toList(growable: false),
      );
}

/// One published blog post (`GET /blogs/slug/:slug`), for the reading screen.
class HomeBlogPost {
  final String slug;
  final String title;
  final String category;
  final String content;
  final String? authorName;
  final String? thumbnailUrl;
  final DateTime? publishedAt;

  const HomeBlogPost({
    required this.slug,
    required this.title,
    required this.category,
    required this.content,
    this.authorName,
    this.thumbnailUrl,
    this.publishedAt,
  });

  factory HomeBlogPost.fromJson(Map<String, dynamic> json) {
    final author = json['author'] is Map ? Map<String, dynamic>.from(json['author'] as Map) : const <String, dynamic>{};
    final thumb = json['thumbnail'] is Map ? Map<String, dynamic>.from(json['thumbnail'] as Map) : const <String, dynamic>{};
    final published = _str(json['publishedAt']).isNotEmpty ? _str(json['publishedAt']) : _str(json['createdAt']);
    return HomeBlogPost(
      slug: _str(json['slug']),
      title: _str(json['title']),
      category: _str(json['category']),
      content: _str(json['content']),
      authorName: _optStr(author['name']),
      thumbnailUrl: _optStr(thumb['url']),
      publishedAt: DateTime.tryParse(published),
    );
  }
}

/// One page of the blog list.
class HomeBlogPage {
  final List<HomeBlogSummary> blogs;
  final int total;

  const HomeBlogPage({required this.blogs, required this.total});
}
