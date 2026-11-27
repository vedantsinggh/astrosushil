import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/widgets/astro_design_system.dart';
import '../../../shared/widgets/astro_loader/astro_loader_inline.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../providers/home_content_providers.dart';
import '../widgets/home_net_image.dart';

/// Every YouTube video from the website's podcast section. Tapping one opens YouTube.
class VideosScreen extends ConsumerWidget {
  const VideosScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isHindi = Localizations.maybeLocaleOf(context)?.languageCode == 'hi';
    final videos = ref.watch(homeYoutubeVideosProvider);

    final List<Widget> content = videos.when(
      loading: () => const [SliverFillRemaining(hasScrollBody: false, child: Center(child: AstroLoaderInline()))],
      error: (_, __) => [
        SliverFillRemaining(hasScrollBody: false, child: AstroErrorState(onRetry: () => ref.invalidate(homeYoutubeVideosProvider))),
      ],
      data: (list) => list.isEmpty
          ? [
              SliverFillRemaining(
                hasScrollBody: false,
                child: AstroEmptyState(title: isHindi ? 'अभी कोई वीडियो नहीं' : 'No videos yet', message: isHindi ? 'नए वीडियो जल्द आएंगे।' : 'New videos will appear here.'),
              ),
            ]
          : [
              AstroSliverContent(
                top: 8,
                bottom: 24 + MediaQuery.paddingOf(context).bottom,
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final v = list[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.md),
                        child: AstroCard(
                          padding: EdgeInsets.zero,
                          onTap: () => openExternal(v.url),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              ClipRRect(
                                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                                child: AspectRatio(
                                  aspectRatio: 16 / 9,
                                  child: Stack(fit: StackFit.expand, children: [
                                    HomeNetImage(v.thumbnailUrl, placeholderIcon: Icons.smart_display_outlined),
                                    const Center(child: PlayBadge()),
                                  ]),
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.all(AppSpacing.sm),
                                child: Text(v.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: AppTypography.titleSmall.copyWith(color: AppColors.textPrimary)),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                    childCount: list.length,
                  ),
                ),
              ),
            ],
    );

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      body: SubtleCelestialBackground(
        child: CustomScrollView(slivers: [AstroSliverNavBar(title: isHindi ? 'वीडियो' : 'Videos'), ...content]),
      ),
    );
  }
}

/// Round play mark drawn over a video thumbnail.
class PlayBadge extends StatelessWidget {
  final double size;

  const PlayBadge({super.key, this.size = 48});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.55), shape: BoxShape.circle),
      child: Icon(Icons.play_arrow_rounded, color: Colors.white, size: size * 0.6),
    );
  }
}
