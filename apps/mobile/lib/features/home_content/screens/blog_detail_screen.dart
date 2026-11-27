import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../shared/widgets/astro_design_system.dart';
import '../../../shared/widgets/astro_loader/astro_loader_inline.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../providers/home_content_providers.dart';
import '../widgets/home_net_image.dart';
import '../widgets/simple_html.dart';

/// The website serves a blog post at its root: astrosushil.com/<slug> (website router).
const String websiteBlogBase = 'https://astrosushil.com/';

/// Reading screen of one blog post.
class BlogDetailScreen extends ConsumerWidget {
  final String slug;

  const BlogDetailScreen({super.key, required this.slug});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isHindi = Localizations.maybeLocaleOf(context)?.languageCode == 'hi';
    final post = ref.watch(homeBlogPostProvider(slug));

    final List<Widget> content = post.when(
      loading: () => const [SliverFillRemaining(hasScrollBody: false, child: Center(child: AstroLoaderInline()))],
      error: (_, __) => [
        SliverFillRemaining(hasScrollBody: false, child: AstroErrorState(onRetry: () => ref.invalidate(homeBlogPostProvider(slug)))),
      ],
      data: (p) {
        final date = p.publishedAt == null ? null : DateFormat.yMMMMd().format(p.publishedAt!.toLocal());
        return [
          AstroSliverContent(
            top: 4,
            bottom: 32 + MediaQuery.paddingOf(context).bottom,
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (p.thumbnailUrl != null) ...[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: AspectRatio(aspectRatio: 16 / 9, child: HomeNetImage(p.thumbnailUrl)),
                    ),
                    const SizedBox(height: AppSpacing.md),
                  ],
                  Text(p.title, style: AppTypography.headlineMedium.copyWith(color: AppColors.textPrimary)),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    [if (p.authorName != null) p.authorName!, if (p.category.isNotEmpty) p.category, if (date != null) date].join(' · '),
                    style: AppTypography.caption.copyWith(color: AppColors.textMuted),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  SimpleHtml(p.content),
                  const SizedBox(height: AppSpacing.sm),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton.icon(
                      onPressed: () => openExternal('$websiteBlogBase${Uri.encodeComponent(p.slug)}'),
                      icon: const Icon(Icons.open_in_new_rounded, size: 18),
                      label: Text(isHindi ? 'वेबसाइट पर पढ़ें' : 'Read on website'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ];
      },
    );

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      body: SubtleCelestialBackground(
        child: CustomScrollView(slivers: [AstroSliverNavBar(title: isHindi ? 'ब्लॉग' : 'Blog'), ...content]),
      ),
    );
  }
}
