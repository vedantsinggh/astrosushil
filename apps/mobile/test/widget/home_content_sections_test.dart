import 'package:astro_mobile/features/consultations/models/consultation_models.dart';
import 'package:astro_mobile/features/home_content/models/home_content_models.dart';
import 'package:astro_mobile/features/home_content/providers/home_content_providers.dart';
import 'package:astro_mobile/features/home_content/widgets/home_content_sections.dart';
import 'package:astro_mobile/features/reports/models/report_brand_assets.dart';
import 'package:astro_mobile/features/reports/models/report_catalog_model.dart';
import 'package:astro_mobile/features/shop/models/product_model.dart';
import 'package:astro_mobile/features/shop/screens/product_detail_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

final _consult = ConsultationOfferingModel.fromJson(const {
  'sku': 'consult-call-30', 'title': 'Career Call', 'mode': 'CALL', 'durationMinutes': 30, 'pricePaise': 210000,
});
final _report = ReportCatalogDisplayEntry(
  brand: ReportBrandRegistry.canonicalReports.first,
  serverItem: const ReportCatalogItem(id: 'KUNDLI', title: 'Kundli Report', description: 'Full chart', pricePaise: 99900, currency: 'INR', isActive: true, reportType: 'KUNDLI'),
);
final _product = ProductModel.fromJson(const {'id': 'p1', 'slug': 'rudraksha', 'title': 'Rudraksha Mala', 'price': 150000, 'mrp': 200000, 'stock': 5, 'isAvailable': true});

const _content = AppHomeContent(
  celebrityVideos: [HomeVideo(id: 'v1', title: 'With a star', subtitle: 'A Star', url: 'https://cdn/x.mp4')],
  youtubeVideos: [HomeVideo(id: 'y1', title: 'Career Guidance', url: 'https://youtu.be/abc123DEF45', thumbnailUrl: 'https://img.youtube.com/vi/abc123DEF45/hqdefault.jpg')],
  testimonials: [HomeTestimonial(id: 't1', name: 'Asha', rating: 5, text: 'Very helpful guidance.')],
  blogs: [HomeBlogSummary(id: 'b1', slug: 'post', title: 'Dash Mahavidya', shortDescription: 'Ten forms', category: 'Spiritual')],
);

Widget _app({
  AsyncValue<AppHomeContent>? content,
  List<ConsultationOfferingModel>? consultations,
  List<ReportCatalogDisplayEntry>? reports,
  List<ProductModel>? products,
}) {
  final c = content ?? const AsyncValue.data(_content);
  return ProviderScope(
    overrides: [
      appHomeContentProvider.overrideWith((ref) => c.when(data: (v) => Future.value(v), error: (e, _) => Future.error(e), loading: () => Future.value(_content))),
      homeFeaturedConsultationsProvider.overrideWithValue(consultations ?? [_consult]),
      homeFeaturedReportsProvider.overrideWithValue(reports ?? [_report]),
      homeFeaturedProductsProvider.overrideWithValue(AsyncValue.data(products ?? [_product])),
    ],
    child: const MaterialApp(home: Scaffold(body: SingleChildScrollView(child: HomeContentSections()))),
  );
}

const _order = ['consult', 'reports', 'shop', 'stars', 'youtube', 'testimonials', 'blog'];

void main() {
  testWidgets('every section shows, in order, when it has items', (tester) async {
    tester.view.physicalSize = const Size(1080, 8000);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(_app());
    await tester.pumpAndSettle();
    final tops = [for (final k in _order) tester.getTopLeft(find.byKey(ValueKey('home-section-$k'))).dy];
    expect(tops, [...tops]..sort());
    expect(find.text('Career Call'), findsOneWidget);
    expect(find.text('Rudraksha Mala'), findsOneWidget);
    expect(find.text('Dash Mahavidya'), findsOneWidget);
  });

  testWidgets('a section without items is hidden', (tester) async {
    await tester.pumpWidget(_app(consultations: const []));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('home-section-consult')), findsNothing);
    expect(find.byKey(const ValueKey('home-section-reports')), findsOneWidget);
  });

  testWidgets('switched-off blog section is hidden', (tester) async {
    const off = AppHomeContent(show: HomeSectionSwitches(blogs: false), blogs: [HomeBlogSummary(id: 'b1', slug: 'post', title: 'Hidden post', shortDescription: '', category: '')]);
    await tester.pumpWidget(_app(content: const AsyncValue.data(off)));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('home-section-blog')), findsNothing);
  });

  testWidgets('home content failing hides content sections but keeps consult, reports and shop', (tester) async {
    await tester.pumpWidget(_app(content: AsyncValue.error(Exception('offline'), StackTrace.empty)));
    await tester.pumpAndSettle();
    for (final k in ['stars', 'youtube', 'testimonials', 'blog']) {
      expect(find.byKey(ValueKey('home-section-$k')), findsNothing);
    }
    for (final k in ['consult', 'reports', 'shop']) {
      expect(find.byKey(ValueKey('home-section-$k')), findsOneWidget);
    }
  });

  testWidgets('tapping a product opens its page', (tester) async {
    await tester.pumpWidget(_app());
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Rudraksha Mala'));
    await tester.tap(find.text('Rudraksha Mala'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byType(ProductDetailScreen), findsOneWidget);
  });

  testWidgets('no overflow on a 360 px phone with large text (1.3x and 2x)', (tester) async {
    tester.view.physicalSize = const Size(360 * 3, 9000);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    for (final scale in [1.3, 2.0]) {
      tester.platformDispatcher.textScaleFactorTestValue = scale;
      await tester.pumpWidget(_app());
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull, reason: 'text scale $scale');
    }
  });

  testWidgets('a testimonial already in quotes gets one pair of quotes', (tester) async {
    const quoted = AppHomeContent(testimonials: [HomeTestimonial(id: 't2', name: 'Tarun', rating: 5, text: '""Sushil sir is amazing"')]);
    await tester.pumpWidget(_app(content: const AsyncValue.data(quoted)));
    await tester.pumpAndSettle();
    expect(find.text('“Sushil sir is amazing”'), findsOneWidget);
  });
}
