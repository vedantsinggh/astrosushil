import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/auth_provider.dart';
import '../../consultations/models/consultation_models.dart';
import '../../consultations/providers/consultation_provider.dart';
import '../../reports/models/report_catalog_model.dart';
import '../../reports/providers/report_catalog_provider.dart';
import '../../shop/models/product_model.dart';
import '../../shop/providers/shop_provider.dart';
import '../data/home_content_repository.dart';
import '../models/home_content_models.dart';
import '../utils/pick_featured.dart';

const int homeConsultationFallback = 6;
const int homeReportFallback = 6;
const int homeProductFallback = 8;

final homeContentRepositoryProvider = Provider<HomeContentRepository>((ref) => HomeContentRepository(ref.watch(apiClientProvider)));

/// `GET /app/home`. On error the content sections hide; featured lists fall back to defaults.
final appHomeContentProvider = FutureProvider<AppHomeContent>((ref) => ref.watch(homeContentRepositoryProvider).fetchHome());

HomeFeaturedIds _featured(Ref ref) => ref.watch(appHomeContentProvider).valueOrNull?.featured ?? const HomeFeaturedIds();

/// Bookable consultations staff featured (by catalog id / sku), else the first few.
final homeFeaturedConsultationsProvider = Provider<List<ConsultationOfferingModel>>((ref) {
  final catalog = ref.watch(consultationNotifierProvider.select((s) => s.catalog));
  return pickFeatured(catalog, _featured(ref).consultationSkus, (o) => o.sku, (o) => o.isAvailable, homeConsultationFallback);
});

/// Reports on sale staff featured (by catalog id), else the first few of the canonical list.
final homeFeaturedReportsProvider = Provider<List<ReportCatalogDisplayEntry>>((ref) {
  final catalog = ref.watch(reportCatalogProvider).valueOrNull;
  if (catalog == null) return const [];
  final entries = buildCanonicalReportCatalog(catalog);
  return pickFeatured(entries, _featured(ref).reportIds, (e) => e.serverItem?.id ?? e.brand.reportType, (e) => e.isAvailable, homeReportFallback);
});

/// The whole shop, unfiltered (the shop screen's own list follows its search box and filters).
final homeShopProductsProvider = FutureProvider<List<ProductModel>>((ref) => ref.watch(shopServiceProvider).fetchProducts(limit: 50));

/// Products staff featured, else the first few.
final homeFeaturedProductsProvider = Provider<AsyncValue<List<ProductModel>>>((ref) {
  final ids = _featured(ref).productIds;
  return ref.watch(homeShopProductsProvider).whenData(
        (all) => pickFeatured(all, ids, (p) => p.id, (p) => p.isAvailable, homeProductFallback),
      );
});

/// One blog post by slug (reading screen).
final homeBlogPostProvider = FutureProvider.family<HomeBlogPost, String>((ref, slug) => ref.watch(homeContentRepositoryProvider).fetchBlog(slug));

/// Every YouTube video (Videos screen).
final homeYoutubeVideosProvider = FutureProvider<List<HomeVideo>>((ref) => ref.watch(homeContentRepositoryProvider).fetchYoutubeVideos());
