import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../shared/widgets/astro_design_system.dart';
import '../../consultations/models/consultation_models.dart';
import '../../reports/models/report_catalog_model.dart';
import '../../shop/models/product_model.dart';
import '../models/home_content_models.dart';
import '../screens/videos_screen.dart' show PlayBadge;
import 'home_net_image.dart';

TextStyle get _title => AppTypography.titleSmall.copyWith(color: AppColors.textPrimary);
TextStyle get _meta => AppTypography.caption.copyWith(color: AppColors.textMuted);
TextStyle get _price => AppTypography.titleSmall.copyWith(color: AppColors.primary, fontWeight: FontWeight.w700);

String consultationModeLabel(String mode, bool isHindi) {
  switch (consultationApiMode(mode)) {
    case 'CALL':
      return isHindi ? 'कॉल' : 'Call';
    case 'VIDEO':
      return isHindi ? 'वीडियो कॉल' : 'Video call';
    case 'IN_PERSON':
      return isHindi ? 'व्यक्तिगत भेंट' : 'In person';
    case 'MESSAGE':
      return isHindi ? 'WhatsApp संदेश' : 'WhatsApp message';
    default:
      return mode;
  }
}

IconData _modeIcon(String mode) {
  switch (consultationApiMode(mode)) {
    case 'VIDEO':
      return Icons.videocam_outlined;
    case 'IN_PERSON':
      return Icons.place_outlined;
    case 'MESSAGE':
      return Icons.chat_outlined;
    default:
      return Icons.call_outlined;
  }
}

class HomeConsultationCard extends StatelessWidget {
  final ConsultationOfferingModel offering;
  final VoidCallback onTap;

  const HomeConsultationCard({super.key, required this.offering, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isHindi = Localizations.maybeLocaleOf(context)?.languageCode == 'hi';
    final title = isHindi && (offering.hindiTitle?.isNotEmpty ?? false) ? offering.hindiTitle! : offering.title;
    final isMessage = isMessageConsultationMode(offering.mode);
    final details = [
      consultationModeLabel(offering.mode, isHindi),
      if (!isMessage && offering.durationMinutes > 0) isHindi ? '${offering.durationMinutes} मिनट' : '${offering.durationMinutes} min',
    ].join(' · ');
    return AstroCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            AstroIconSquare(icon: _modeIcon(offering.mode), tint: AstroTint.violet, size: 36),
            const SizedBox(width: AppSpacing.xs),
            Expanded(child: Text(details, maxLines: 1, overflow: TextOverflow.ellipsis, style: _meta)),
          ]),
          const SizedBox(height: AppSpacing.sm),
          Text(title, maxLines: 2, overflow: TextOverflow.ellipsis, style: _title),
          const Spacer(),
          Row(children: [
            Expanded(child: Text(formatInrPaise(offering.pricePaise), style: _price)),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 96),
              child: Text(isHindi ? 'बुक करें' : 'Book', maxLines: 1, overflow: TextOverflow.ellipsis, style: AppTypography.labelLarge.copyWith(color: AppColors.primary)),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.primary, size: 20),
          ]),
        ],
      ),
    );
  }
}

class HomeReportCard extends StatelessWidget {
  final ReportCatalogDisplayEntry entry;
  final VoidCallback onTap;

  const HomeReportCard({super.key, required this.entry, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isHindi = Localizations.maybeLocaleOf(context)?.languageCode == 'hi';
    return AstroCard(
      padding: EdgeInsets.zero,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              child: Image.asset(
                entry.brand.coverAsset,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(color: entry.brand.tintColor, child: Icon(entry.brand.icon, color: entry.brand.textAccentColor, size: 36)),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.sm, AppSpacing.xs, AppSpacing.sm, AppSpacing.sm),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(entry.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: _title),
                const SizedBox(height: 2),
                Text(
                  entry.isAvailable && entry.priceText.isNotEmpty ? entry.priceText : (isHindi ? 'जल्द आ रहा है' : 'Coming soon'),
                  style: entry.isAvailable ? _price : _meta,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class HomeProductCard extends StatelessWidget {
  final ProductModel product;
  final VoidCallback onTap;

  const HomeProductCard({super.key, required this.product, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final lang = Localizations.maybeLocaleOf(context)?.languageCode ?? 'en';
    final image = product.imageUrl ?? (product.galleryImages.isNotEmpty ? product.galleryImages.first : null);
    return AstroCard(
      padding: EdgeInsets.zero,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              child: HomeNetImage(image, placeholderIcon: Icons.shopping_bag_outlined),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.sm, AppSpacing.xs, AppSpacing.sm, AppSpacing.sm),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(product.displayTitle(lang), maxLines: 2, overflow: TextOverflow.ellipsis, style: _title),
                const SizedBox(height: 2),
                Wrap(
                  spacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(product.formattedPrice, style: _price),
                    if (product.mrp > product.price)
                      Text(product.formattedMrp, style: _meta.copyWith(decoration: TextDecoration.lineThrough)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Celebrity MP4 or YouTube video: thumbnail with a play mark, title under it.
class HomeVideoCard extends StatelessWidget {
  final HomeVideo video;
  final VoidCallback onTap;

  const HomeVideoCard({super.key, required this.video, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return AstroCard(
      padding: EdgeInsets.zero,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              child: Stack(fit: StackFit.expand, children: [
                HomeNetImage(video.thumbnailUrl, placeholderIcon: Icons.smart_display_outlined),
                const Center(child: PlayBadge(size: 40)),
              ]),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.sm, AppSpacing.xs, AppSpacing.sm, AppSpacing.sm),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(video.subtitle ?? video.title, maxLines: video.subtitle == null ? 2 : 1, overflow: TextOverflow.ellipsis, style: _title),
                if (video.subtitle != null) Text(video.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: _meta),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Testimonial text sometimes arrives already in quotes; strip them so the card adds one pair.
String _unquote(String text) => text.trim().replaceAll(RegExp('^["“”\'‘’]+|["“”\'‘’]+\$'), '').trim();

class HomeTestimonialCard extends StatelessWidget {
  final HomeTestimonial testimonial;

  const HomeTestimonialCard({super.key, required this.testimonial});

  @override
  Widget build(BuildContext context) {
    final rating = (testimonial.rating ?? 0).clamp(0, 5);
    return AstroCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (rating > 0)
            Semantics(
              label: '$rating of 5',
              child: Row(children: [for (var i = 0; i < rating; i++) const Icon(Icons.star_rounded, color: AppColors.gold, size: 18)]),
            ),
          const SizedBox(height: AppSpacing.xs),
          Expanded(
            child: Text('“${_unquote(testimonial.text)}”', maxLines: 4, overflow: TextOverflow.ellipsis, style: AppTypography.bodyMedium.copyWith(color: AppColors.textPrimary)),
          ),
          Text(testimonial.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: _title),
        ],
      ),
    );
  }
}

class HomeBlogCard extends StatelessWidget {
  final HomeBlogSummary post;
  final VoidCallback onTap;

  const HomeBlogCard({super.key, required this.post, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final date = post.publishedAt == null ? null : DateFormat.yMMMd().format(post.publishedAt!.toLocal());
    return AstroCard(
      padding: EdgeInsets.zero,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              child: HomeNetImage(post.thumbnailUrl, placeholderIcon: Icons.article_outlined),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.sm, AppSpacing.xs, AppSpacing.sm, AppSpacing.sm),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(post.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: _title),
                const SizedBox(height: 2),
                Text([if (post.category.isNotEmpty) post.category, if (date != null) date].join(' · '), maxLines: 1, overflow: TextOverflow.ellipsis, style: _meta),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
