import 'package:astro_mobile/features/home_content/models/home_content_models.dart';
import 'package:astro_mobile/features/home_content/utils/pick_featured.dart';
import 'package:astro_mobile/features/home_content/utils/youtube.dart';
import 'package:flutter_test/flutter_test.dart';

class _Item {
  final String id;
  final bool ok;
  const _Item(this.id, {this.ok = true});
}

void main() {
  const all = [_Item('a'), _Item('b', ok: false), _Item('c'), _Item('d')];
  String keyOf(_Item i) => i.id;
  bool usable(_Item i) => i.ok;

  group('pickFeatured', () {
    test('keeps the chosen order and skips unknown and unusable ids', () {
      final picked = pickFeatured(all, ['c', 'z', 'b', 'a'], keyOf, usable, 6);
      expect(picked.map(keyOf), ['c', 'a']);
    });
    test('no ids: the first N usable items', () {
      expect(pickFeatured(all, const [], keyOf, usable, 2).map(keyOf), ['a', 'c']);
    });
    test('ids that all fail: falls back to the first N usable items', () {
      expect(pickFeatured(all, ['z', 'b'], keyOf, usable, 1).map(keyOf), ['a']);
    });
  });

  group('youtubeIdOf', () {
    test('reads every link form the website uses', () {
      expect(youtubeIdOf('https://www.youtube.com/watch?v=_jmCNWLZT0s'), '_jmCNWLZT0s');
      expect(youtubeIdOf('https://www.youtube.com/watch?si=Bt5IHtUfhIK3M-XN&v=dw1gbV7--Bk&feature=youtu.be'), 'dw1gbV7--Bk');
      expect(youtubeIdOf('https://youtu.be/abc123DEF45'), 'abc123DEF45');
      expect(youtubeIdOf('https://youtube.com/shorts/abc123DEF45'), 'abc123DEF45');
      expect(youtubeIdOf('https://www.youtube.com/embed/abc123DEF45'), 'abc123DEF45');
    });
    test('anything else is null', () {
      expect(youtubeIdOf('not a url'), isNull);
      expect(youtubeIdOf('https://vimeo.com/123'), isNull);
      expect(youtubeIdOf('https://www.youtube.com/watch?v=short'), isNull);
    });
    test('thumbnail url', () {
      expect(youtubeThumb('abc123DEF45'), 'https://img.youtube.com/vi/abc123DEF45/hqdefault.jpg');
    });
  });

  group('AppHomeContent.fromJson', () {
    test('missing data: empty lists and every section on', () {
      final c = AppHomeContent.fromJson(const {});
      expect(c.featured.consultationSkus, isEmpty);
      expect(c.featured.reportIds, isEmpty);
      expect(c.featured.productIds, isEmpty);
      expect([c.show.starVideos, c.show.youtube, c.show.testimonials, c.show.blogs], [true, true, true, true]);
      expect(c.celebrityVideos, isEmpty);
      expect(c.youtubeVideos, isEmpty);
      expect(c.testimonials, isEmpty);
      expect(c.blogs, isEmpty);
    });
    test('parses a full response and drops YouTube links without an id', () {
      final c = AppHomeContent.fromJson({
        'featured': {'consultationSkus': ['s1'], 'reportIds': ['KUNDLI'], 'productIds': ['p1']},
        'show': {'starVideos': false, 'youtube': true, 'testimonials': true, 'blogs': false},
        'celebrityVideos': [
          {'id': 'v1', 'title': 'With a star', 'personName': 'A Star', 'videoUrl': 'https://cdn/x.mp4', 'thumbnailUrl': 'https://cdn/x.webp'}
        ],
        'youtubeVideos': [
          {'id': 'y1', 'title': 'Good', 'url': 'https://youtu.be/abc123DEF45', 'thumbnailUrl': null},
          {'id': 'y2', 'title': 'Bad', 'url': 'https://example.com', 'thumbnailUrl': null},
        ],
        'testimonials': [
          {'id': 't1', 'name': 'Asha', 'rating': 5, 'text': 'Helpful', 'imageUrl': null}
        ],
        'blogs': [
          {'id': 'b1', 'slug': 'post', 'title': 'Post', 'shortDescription': 'Short', 'category': 'Vedic', 'thumbnailUrl': null, 'publishedAt': '2026-11-20T10:00:00.000Z'}
        ],
      });
      expect(c.featured.reportIds, ['KUNDLI']);
      expect(c.show.starVideos, isFalse);
      expect(c.show.blogs, isFalse);
      expect(c.celebrityVideos.single.url, 'https://cdn/x.mp4');
      expect(c.celebrityVideos.single.subtitle, 'A Star');
      expect(c.youtubeVideos.map((v) => v.id), ['y1']);
      expect(c.youtubeVideos.single.thumbnailUrl, 'https://img.youtube.com/vi/abc123DEF45/hqdefault.jpg');
      expect(c.testimonials.single.rating, 5);
      expect(c.blogs.single.publishedAt, DateTime.utc(2026, 11, 20, 10));
    });
  });
}
