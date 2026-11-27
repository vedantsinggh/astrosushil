import 'package:astro_mobile/features/home_content/data/home_content_repository.dart';
import 'package:astro_mobile/features/home_content/models/home_content_models.dart';
import 'package:astro_mobile/features/home_content/providers/home_content_providers.dart';
import 'package:astro_mobile/features/home_content/screens/blog_detail_screen.dart';
import 'package:astro_mobile/features/home_content/screens/blog_list_screen.dart';
import 'package:astro_mobile/features/home_content/screens/videos_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeRepo extends Fake implements HomeContentRepository {
  @override
  Future<HomeBlogPage> fetchBlogs({int page = 1, int limit = 12, String? category}) async => HomeBlogPage(
        total: 2,
        blogs: page > 1
            ? const []
            : const [
                HomeBlogSummary(id: 'b1', slug: 'dash-mahavidya', title: 'Dash Mahavidya', shortDescription: 'Ten forms', category: 'Spiritual'),
                HomeBlogSummary(id: 'b2', slug: 'saturn', title: 'Saturn return', shortDescription: 'Slow planet', category: 'Planets'),
              ],
      );

  @override
  Future<HomeBlogPost> fetchBlog(String slug) async => HomeBlogPost(
        slug: slug,
        title: 'Dash Mahavidya',
        category: 'Spiritual',
        content: '<h2>The ten forms</h2><p>Kali and <strong>Tara</strong>.</p>',
        authorName: 'Astro Sushil',
      );

  @override
  Future<List<HomeVideo>> fetchYoutubeVideos() async => [
        HomeVideo.youtube({'id': 'y1', 'title': 'Career Guidance', 'mediaUrl': 'https://www.youtube.com/watch?v=V9nPdq47b74'})!,
      ];
}

Widget _app(Widget child) => ProviderScope(
      overrides: [homeContentRepositoryProvider.overrideWithValue(_FakeRepo())],
      child: MaterialApp(home: child),
    );

void main() {
  testWidgets('blog list shows posts and opens one', (tester) async {
    await tester.pumpWidget(_app(const BlogListScreen()));
    await tester.pumpAndSettle();
    expect(find.text('Dash Mahavidya'), findsOneWidget);
    expect(find.text('Saturn return'), findsOneWidget);
    await tester.tap(find.text('Dash Mahavidya'));
    await tester.pumpAndSettle();
    expect(find.byType(BlogDetailScreen), findsOneWidget);
  });

  testWidgets('blog post renders headings and text from its HTML', (tester) async {
    await tester.pumpWidget(_app(const BlogDetailScreen(slug: 'dash-mahavidya')));
    await tester.pumpAndSettle();
    expect(find.text('The ten forms'), findsOneWidget);
    expect(find.textContaining('Kali and', findRichText: true), findsOneWidget);
    expect(find.textContaining('Read on website'), findsOneWidget);
  });

  testWidgets('videos screen lists YouTube videos', (tester) async {
    await tester.pumpWidget(_app(const VideosScreen()));
    await tester.pumpAndSettle();
    expect(find.text('Career Guidance'), findsOneWidget);
  });
}
