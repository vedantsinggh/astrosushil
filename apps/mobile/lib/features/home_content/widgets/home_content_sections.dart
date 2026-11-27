import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_required_gate.dart';
import '../../../core/auth/feature_access_service.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../home/providers/home_provider.dart';
import '../../consultations/models/consultation_models.dart';
import '../../consultations/widgets/booking_flow_sheet.dart';
import '../../shop/screens/product_detail_screen.dart';
import '../../shop/screens/shop_catalog_screen.dart';
import '../home_report_opener.dart';
import '../models/home_content_models.dart';
import '../providers/home_content_providers.dart';
import '../screens/blog_detail_screen.dart';
import '../screens/blog_list_screen.dart';
import '../screens/videos_screen.dart';
import 'home_carousel.dart';
import 'home_content_cards.dart';
import 'home_net_image.dart';

/// The home page sections below the free tools (owner decision 2026-11-27), in this order:
/// consultations, reports, shop, celebrity videos, YouTube, testimonials, blog. A section with no
/// items, still loading, or whose data failed is left out; the rest of home is unaffected.
class HomeContentSections extends ConsumerWidget {
  const HomeContentSections({super.key});

  static const Widget _gap = SizedBox(height: 32);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final consultations = ref.watch(homeFeaturedConsultationsProvider);
    final reports = ref.watch(homeFeaturedReportsProvider);
    final products = ref.watch(homeFeaturedProductsProvider).valueOrNull ?? const [];
    final content = ref.watch(appHomeContentProvider).valueOrNull ?? const AppHomeContent(show: HomeSectionSwitches(starVideos: false, youtube: false, testimonials: false, blogs: false));
    final show = content.show;

    final sections = <Widget>[
      if (consultations.isNotEmpty)
        HomeCarousel(
          key: const ValueKey('home-section-consult'),
          title: l10n.homeSectionConsult,
          seeAllLabel: l10n.homeSeeAll,
          onSeeAll: () => ref.read(homeTabControllerProvider.notifier).state = 2,
          height: 172,
          itemCount: consultations.length,
          itemBuilder: (context, i) => HomeConsultationCard(offering: consultations[i], onTap: () => _book(context, ref, consultations[i])),
        ),
      if (reports.isNotEmpty)
        HomeCarousel(
          key: const ValueKey('home-section-reports'),
          title: l10n.homeSectionReports,
          seeAllLabel: l10n.homeSeeAll,
          onSeeAll: () => ref.read(homeTabControllerProvider.notifier).state = 1,
          widthFactor: 0.42,
          height: 250,
          itemCount: reports.length,
          itemBuilder: (context, i) => HomeReportCard(entry: reports[i], onTap: () => openHomeReport(context, ref, reports[i])),
        ),
      if (products.isNotEmpty)
        HomeCarousel(
          key: const ValueKey('home-section-shop'),
          title: l10n.homeSectionShop,
          seeAllLabel: l10n.homeSeeAll,
          onSeeAll: () => _push(context, const ShopCatalogScreen()),
          widthFactor: 0.42,
          height: 236,
          itemCount: products.length,
          itemBuilder: (context, i) => HomeProductCard(product: products[i], onTap: () => _push(context, ProductDetailScreen(product: products[i]))),
        ),
      if (show.starVideos && content.celebrityVideos.isNotEmpty)
        HomeCarousel(
          key: const ValueKey('home-section-stars'),
          title: l10n.homeSectionStars,
          widthFactor: 0.42,
          height: 236,
          itemCount: content.celebrityVideos.length,
          itemBuilder: (context, i) => HomeVideoCard(video: content.celebrityVideos[i], onTap: () => openExternal(content.celebrityVideos[i].url)),
        ),
      if (show.youtube && content.youtubeVideos.isNotEmpty)
        HomeCarousel(
          key: const ValueKey('home-section-youtube'),
          title: l10n.homeSectionYoutube,
          seeAllLabel: l10n.homeSeeAll,
          onSeeAll: () => _push(context, const VideosScreen()),
          height: 214,
          itemCount: content.youtubeVideos.length,
          itemBuilder: (context, i) => HomeVideoCard(video: content.youtubeVideos[i], onTap: () => openExternal(content.youtubeVideos[i].url)),
        ),
      if (show.testimonials && content.testimonials.isNotEmpty)
        HomeCarousel(
          key: const ValueKey('home-section-testimonials'),
          title: l10n.homeSectionTestimonials,
          height: 168,
          itemCount: content.testimonials.length,
          itemBuilder: (context, i) => HomeTestimonialCard(testimonial: content.testimonials[i]),
        ),
      if (show.blogs && content.blogs.isNotEmpty)
        HomeCarousel(
          key: const ValueKey('home-section-blog'),
          title: l10n.homeSectionBlog,
          seeAllLabel: l10n.homeSeeAll,
          onSeeAll: () => _push(context, const BlogListScreen()),
          height: 230,
          itemCount: content.blogs.length,
          itemBuilder: (context, i) => HomeBlogCard(post: content.blogs[i], onTap: () => _push(context, BlogDetailScreen(slug: content.blogs[i].slug))),
        ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final section in sections) ...[section, _gap],
      ],
    );
  }

  static void _push(BuildContext context, Widget screen) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));
  }

  static void _book(BuildContext context, WidgetRef ref, ConsultationOfferingModel offering) {
    AuthRequiredGate.checkAndProceed(
      context: context,
      ref: ref,
      feature: AppFeature.payments,
      featureTitle: context.l10n.consultBookingTitle,
      onAllowed: () => BookingFlowSheet.show(context, offering),
    );
  }
}
