import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../models/course_models.dart';
import '../providers/courses_provider.dart';
import 'course_detail_screen.dart';
import 'course_player_screen.dart';

/// Complete Online Courses & Video Masterclasses Hub Screen
/// Redesigned in Phase 7 according to the Astro Sushil Design System.
class CoursesHubScreen extends ConsumerStatefulWidget {
  final int initialTab; // 0 for Explore, 1 for My Learning

  const CoursesHubScreen({
    super.key,
    this.initialTab = 0,
  });

  @override
  ConsumerState<CoursesHubScreen> createState() => _CoursesHubScreenState();
}

class _CoursesHubScreenState extends ConsumerState<CoursesHubScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(coursesActiveTabProvider.notifier).state = widget.initialTab;
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final activeTab = ref.watch(coursesActiveTabProvider);
    final locale = Localizations.localeOf(context);
    final langCode = locale.languageCode;

    return AstroPage(
      title: l10n.coursesScreenTitle,
      style: AstroNavBarStyle.hero,
      onRefresh: () async {
        if (activeTab == 0) {
          ref.invalidate(coursesListProvider);
        } else {
          ref.invalidate(myLearningProvider);
        }
      },
      padding: const EdgeInsets.fromLTRB(AstroMetrics.gutter, 16, AstroMetrics.gutter, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.coursesSubtitle,
            style: AppTypography.rowSubtitle.copyWith(fontSize: 16, height: 1.45),
          ),
          const SizedBox(height: 16),
          // Explore vs My Learning: native-feeling segmented control.
          AstroSegmentedControl<int>(
            segments: [
              AstroSegment(value: 0, label: l10n.exploreCoursesTab, icon: Icons.school_outlined),
              AstroSegment(value: 1, label: l10n.myLearningTab, icon: Icons.play_lesson_outlined),
            ],
            selected: activeTab,
            onChanged: (v) => ref.read(coursesActiveTabProvider.notifier).state = v,
          ),
          const SizedBox(height: 20),
          activeTab == 0
              ? _ExploreCatalogueView(searchController: _searchController, langCode: langCode)
              : _MyLearningView(langCode: langCode),
        ],
      ),
    );
  }
}

class _ExploreCatalogueView extends ConsumerWidget {
  final TextEditingController searchController;
  final String langCode;

  const _ExploreCatalogueView({
    required this.searchController,
    required this.langCode,
  });

  void _resetFilters(WidgetRef ref) {
    searchController.clear();
    ref.read(courseSearchQueryProvider.notifier).state = '';
    ref.read(selectedCourseLevelProvider.notifier).state = 'ALL';
    ref.read(selectedCourseLanguageProvider.notifier).state = 'ALL';
  }

  Future<void> _openCourseLink(BuildContext context, WidgetRef ref, CourseLinkModel link) async {
    var targetUrl = link.redirectUrl;
    try {
      final trackedUrl = await ref
          .read(coursesServiceProvider)
          .registerCourseLinkClick(link.slug.isNotEmpty ? link.slug : link.id);
      if (trackedUrl.isNotEmpty) {
        targetUrl = trackedUrl;
      }
    } catch (_) {
      // Fallback to link.redirectUrl if click tracking fails
    }
    final uri = Uri.tryParse(targetUrl);
    if (uri != null) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final coursesAsync = ref.watch(coursesListProvider);
    final courseLinksAsync = ref.watch(courseLinksProvider);
    final selectedLevel = ref.watch(selectedCourseLevelProvider);
    final selectedLanguage = ref.watch(selectedCourseLanguageProvider);

    // Search + filters scroll together with the list so small screens and
    // large text sizes always leave room for the courses themselves.
    final header = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: searchController,
          style: const TextStyle(fontSize: 16, color: AppColors.lightTextPrimary),
          decoration: InputDecoration(
            hintText: l10n.searchCoursesHint,
            hintMaxLines: 3,
            hintStyle: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 16),
            prefixIcon: const Icon(Icons.search, color: AppColors.secondary, size: 24),
            suffixIcon: searchController.text.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear, size: 22, color: AppColors.lightTextSecondary),
                    tooltip: 'Clear search',
                    onPressed: () {
                      searchController.clear();
                      ref.read(courseSearchQueryProvider.notifier).state = '';
                    },
                  )
                : null,
            filled: true,
            fillColor: AppColors.cardSurface,
            contentPadding: const EdgeInsets.symmetric(vertical: 16),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: AppColors.cardBorder),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: AppColors.cardBorder),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: AppColors.secondary, width: 1.5),
            ),
          ),
          onChanged: (val) {
            ref.read(courseSearchQueryProvider.notifier).state = val;
          },
        ),
        const SizedBox(height: 12),

        // Filter chips wrap onto new lines instead of scrolling sideways
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _FilterChip(
              label: l10n.allLevels,
              isSelected: selectedLevel == 'ALL',
              onTap: () => ref.read(selectedCourseLevelProvider.notifier).state = 'ALL',
            ),
            _FilterChip(
              label: 'Beginner',
              isSelected: selectedLevel == 'BEGINNER',
              onTap: () => ref.read(selectedCourseLevelProvider.notifier).state = 'BEGINNER',
            ),
            _FilterChip(
              label: 'Advanced',
              isSelected: selectedLevel == 'ADVANCED',
              onTap: () => ref.read(selectedCourseLevelProvider.notifier).state = 'ADVANCED',
            ),
          ],
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _FilterChip(
              label: 'All Languages',
              isSelected: selectedLanguage == 'ALL',
              onTap: () => ref.read(selectedCourseLanguageProvider.notifier).state = 'ALL',
            ),
            _FilterChip(
              label: 'English',
              isSelected: selectedLanguage == 'English',
              onTap: () => ref.read(selectedCourseLanguageProvider.notifier).state = 'English',
            ),
            _FilterChip(
              label: 'Hindi',
              isSelected: selectedLanguage == 'Hindi',
              onTap: () => ref.read(selectedCourseLanguageProvider.notifier).state = 'Hindi',
            ),
          ],
        ),
        const SizedBox(height: 20),
      ],
    );

    final List<Widget> body = coursesAsync.when(
      loading: () => [
        const SizedBox(height: 200, child: AstroStateView.loading(message: 'Loading courses...')),
      ],
      error: (err, _) => [
        _CoursesStateMessage(
          icon: Icons.error_outline,
          iconColor: AppColors.error,
          message: err.toString(),
          actionLabel: 'Retry',
          onAction: () => ref.refresh(coursesListProvider),
        ),
      ],
      data: (courses) {
        if (courses.isEmpty) {
          return [
            _CoursesStateMessage(
              icon: Icons.search_off_rounded,
              iconColor: AppColors.lightTextSecondary,
              message: l10n.courseNoCoursesFound,
              actionLabel: 'Reset Filters',
              onAction: () => _resetFilters(ref),
            ),
          ];
        }
        return [
          for (final course in courses) ...[
            _CourseCard(
              course: course,
              langCode: langCode,
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => CourseDetailScreen(idOrSlug: course.id),
                  ),
                );
              },
            ),
            const SizedBox(height: 16),
          ],
          // Teaching method summary, kept below the courses
          _WhyStudyMasterclassesCard(langCode: langCode),
        ];
      },
    );

    final externalLinks = courseLinksAsync.valueOrNull ?? const <CourseLinkModel>[];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        header,
        ...body,
        if (externalLinks.isNotEmpty) ...[
          const SizedBox(height: 24),
          AstroSectionHeading(
            langCode == 'hi' ? 'बाहरी पाठ्यक्रम एवं कार्यशालाएँ' : 'External Courses & Workshops',
          ),
          const SizedBox(height: 12),
          for (final link in externalLinks) ...[
            AstroSurfaceCard(
              onTap: () => _openCourseLink(context, ref, link),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const AstroIconSquare(icon: Icons.open_in_new_rounded, tint: AstroTint.amber),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (link.platformName != null && link.platformName!.isNotEmpty)
                              Text(
                                link.platformName!,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.goldDark,
                                ),
                              ),
                            Text(
                              link.title,
                              style: AppTypography.headlineMedium,
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded, color: AppColors.textSecondary),
                    ],
                  ),
                  if (link.shortDescription != null && link.shortDescription!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      link.shortDescription!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 15, color: AppColors.lightTextSecondary),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],
        ],
      ],
    );
  }
}

/// Simple centred message with one clear action (empty / error states).
class _CoursesStateMessage extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String message;
  final String actionLabel;
  final VoidCallback onAction;

  const _CoursesStateMessage({
    required this.icon,
    required this.iconColor,
    required this.message,
    required this.actionLabel,
    required this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final isError = iconColor == AppColors.error;
    if (isError) {
      return AstroStateView.error(
          compact: true, icon: icon, title: message, onRetry: onAction, retryLabel: actionLabel);
    }
    return AstroStateView.empty(
      compact: true,
      icon: icon,
      title: message,
      actionLabel: actionLabel,
      onAction: onAction,
    );
  }
}

/// Educational guidance card explaining the classical Vedic lineage & methodology
class _WhyStudyMasterclassesCard extends StatelessWidget {
  final String langCode;

  const _WhyStudyMasterclassesCard({required this.langCode});

  @override
  Widget build(BuildContext context) {
    return AstroSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const AstroIconSquare(icon: Icons.menu_book_rounded, tint: AstroTint.violet, size: 44),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      langCode == 'hi' ? 'प्रामाणिक वैदिक ज्योतिष शिक्षण' : 'Authentic Vedic Astrology Lineage',
                      style: AppTypography.headlineMedium,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      langCode == 'hi'
                          ? 'श्री के.एन. राव एवं गुप्त नाड़ी पद्धति'
                          : 'Shri K.N. Rao Method & Gupta Nadi Shastra',
                      style: const TextStyle(fontSize: 15, color: AppColors.lightTextSecondary, height: 1.35),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _FeaturePill(
                icon: Icons.check_circle_outline_rounded,
                label: langCode == 'hi' ? 'सटीक फलकथन' : 'Rule-Based Timing',
              ),
              _FeaturePill(
                icon: Icons.ondemand_video_rounded,
                label: langCode == 'hi' ? 'विस्तृत व्याख्यान' : 'Detailed Lectures',
              ),
              _FeaturePill(
                icon: Icons.all_inclusive_rounded,
                label: langCode == 'hi' ? 'आजीवन पहुँच' : 'Lifetime Access',
              ),
            ],
          ),
          const SizedBox(height: 12),
          SushilExplainerButton(
            isCompact: true,
            label: langCode == 'hi' ? 'पाठ्यक्रम पद्धति समझें' : 'Explain teaching methodology',
            contextData: const ExplanationContext(
              feature: 'courses_overview',
              screenTitle: 'Courses & Masterclasses',
              data: {
                'lineage': 'Gupta Nadi & Shri K.N. Rao Method',
                'teacher': 'Astro Sushil Kumar Singh',
                'format': 'Structured video lectures with real horoscopes & remedies',
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _FeaturePill extends StatelessWidget {
  final IconData icon;
  final String label;

  const _FeaturePill({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AstroTint.violet.background,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18, color: AstroTint.violet.foreground),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.lightTextPrimary),
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => AstroPill(label: label, selected: isSelected, onTap: onTap);
}

class _CourseCard extends StatelessWidget {
  final CourseSummaryModel course;
  final String langCode;
  final VoidCallback onTap;

  const _CourseCard({
    required this.course,
    required this.langCode,
    required this.onTap,
  });

  Widget _buildCourseThumbnail() {
    final localAsset = AppAssets.getCourseAsset(course.sku);
    if (localAsset != null) {
      return Image.asset(
        localAsset,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _buildNetworkOrFallback(),
      );
    }
    return _buildNetworkOrFallback();
  }

  Widget _buildNetworkOrFallback() {
    if (course.thumbnail != null && course.thumbnail!.isNotEmpty) {
      return Image.network(
        course.thumbnail!,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _ThumbnailFallback(title: course.title),
      );
    }
    return _ThumbnailFallback(title: course.title);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    return AstroSurfaceCard(
      padding: EdgeInsets.zero,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Thumbnail Banner
          Stack(
            children: [
              Container(
                height: 188,
                width: double.infinity,
                color: AppColors.primary,
                child: _buildCourseThumbnail(),
              ),
              // Free Preview Badge
              Positioned(
                bottom: 12,
                right: 12,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.9),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.play_circle_filled_rounded, color: AppColors.gold, size: 18),
                      const SizedBox(width: 6),
                      Text(
                        l10n.courseFreePreview,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          // 2. Details
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Level / language
                Text(
                  '${course.level.displayName} · ${course.language}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.goldDark,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  course.getLocalizedTitle(langCode),
                  style: AppTypography.headlineLarge.copyWith(fontSize: 21, height: 1.25, letterSpacing: -0.2),
                ),
                const SizedBox(height: 6),
                Text(
                  course.getLocalizedDescription(langCode),
                  style: const TextStyle(
                    fontSize: 16,
                    color: AppColors.lightTextSecondary,
                    height: 1.4,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 12),

                // Metadata
                Wrap(
                  spacing: 16,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    _MetaItem(icon: Icons.access_time_rounded, text: course.formattedDuration),
                    _MetaItem(
                      icon: Icons.video_library_outlined,
                      text: l10n.courseLessonCount(course.totalLessons.toString()),
                    ),
                    const _MetaItem(icon: Icons.verified, text: 'Astro Sushil', iconColor: AppColors.gold),
                  ],
                ),
                const SizedBox(height: 16),

                // Price
                Wrap(
                  spacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.end,
                  children: [
                    Text(
                      '₹${course.priceRupees}',
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                    if (course.originalPriceRupees != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 2),
                        child: Text(
                          '₹${course.originalPriceRupees}',
                          style: const TextStyle(
                            fontSize: 15,
                            decoration: TextDecoration.lineThrough,
                            color: AppColors.lightTextSecondary,
                          ),
                        ),
                      ),
                  ],
                ),
                Text(
                  l10n.courseIncludesGst,
                  style: const TextStyle(fontSize: 14, color: AppColors.lightTextSecondary),
                ),
                const SizedBox(height: 14),

                // One clear action
                course.isEnrolled
                    ? AstroSecondaryButton(
                        label: l10n.courseContinueLearning,
                        icon: Icons.play_circle_fill_rounded,
                        onPressed: onTap,
                      )
                    : AstroSecondaryButton(
                        label: l10n.courseEnrollNow,
                        onPressed: onTap,
                      ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Small icon + text metadata item used on course cards.
class _MetaItem extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color iconColor;

  const _MetaItem({required this.icon, required this.text, this.iconColor = AppColors.secondary});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 18, color: iconColor),
        const SizedBox(width: 6),
        Flexible(
          child: Text(
            text,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.lightTextSecondary),
          ),
        ),
      ],
    );
  }
}

class _ThumbnailFallback extends StatelessWidget {
  final String title;

  const _ThumbnailFallback({required this.title});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary, AppColors.tertiary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.auto_stories_rounded, color: AppColors.premiumAccent, size: 40),
          const SizedBox(height: 6),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

class _MyLearningView extends ConsumerWidget {
  final String langCode;

  const _MyLearningView({required this.langCode});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final myLearningAsync = ref.watch(myLearningProvider);

    return myLearningAsync.when(
      loading: () => const SizedBox(height: 200, child: AstroStateView.loading(message: 'Loading enrolled courses...')),
      error: (err, _) => _CoursesStateMessage(
        icon: Icons.lock_outline_rounded,
        iconColor: AppColors.secondary,
        message: err.toString(),
        actionLabel: 'Refresh',
        onAction: () => ref.refresh(myLearningProvider),
      ),
      data: (enrolledCourses) {
        if (enrolledCourses.isEmpty) {
          return _CoursesStateMessage(
            icon: Icons.menu_book_rounded,
            iconColor: AppColors.secondary,
            message: l10n.courseNoMyLearning,
            actionLabel: l10n.courseBrowseCourses,
            onAction: () {
              ref.read(coursesActiveTabProvider.notifier).state = 0;
            },
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (var i = 0; i < enrolledCourses.length; i++) ...[
              if (i > 0) const SizedBox(height: 16),
              Builder(builder: (context) {
                final course = enrolledCourses[i];
                return _MyLearningCard(
                  course: course,
                  langCode: langCode,
                  onTap: () {
                    if (course.nextLessonId != null) {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => CoursePlayerScreen(lessonId: course.nextLessonId!),
                        ),
                      );
                    } else {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => CourseDetailScreen(idOrSlug: course.id),
                        ),
                      );
                    }
                  },
                );
              }),
            ],
          ],
        );
      },
    );
  }
}

class _MyLearningCard extends StatelessWidget {
  final MyLearningCourseModel course;
  final String langCode;
  final VoidCallback onTap;

  const _MyLearningCard({
    required this.course,
    required this.langCode,
    required this.onTap,
  });

  Widget _buildThumbnail() {
    final localAsset = AppAssets.getCourseAsset(course.sku);
    if (localAsset != null) {
      return Image.asset(
        localAsset,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _buildFallbackIcon(),
      );
    }
    if (course.thumbnail != null && course.thumbnail!.isNotEmpty) {
      return Image.network(
        course.thumbnail!,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _buildFallbackIcon(),
      );
    }
    return _buildFallbackIcon();
  }

  Widget _buildFallbackIcon() {
    return const Icon(
      Icons.play_circle_fill,
      color: AppColors.premiumAccent,
      size: 30,
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    return AstroSurfaceCard(
      padding: const EdgeInsets.all(16),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(14),
                ),
                clipBehavior: Clip.antiAlias,
                child: _buildThumbnail(),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  course.getLocalizedTitle(langCode),
                  style: AppTypography.headlineMedium.copyWith(fontSize: 19, height: 1.3),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Progress: plain words + a thick bar
          Wrap(
            spacing: 12,
            runSpacing: 4,
            alignment: WrapAlignment.spaceBetween,
            children: [
              Text(
                '${course.completedLessons} / ${course.totalLessons} lessons completed',
                style: const TextStyle(
                  fontSize: 15,
                  color: AppColors.lightTextSecondary,
                ),
              ),
              Text(
                '${course.progressPercent}% completed',
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppColors.tintSageText,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: course.progressFraction,
              minHeight: 10,
              backgroundColor: AppColors.cardBorder,
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.success),
            ),
          ),
          const SizedBox(height: 16),

          AstroPrimaryButton(
            label: l10n.courseContinueLearning,
            icon: Icons.play_arrow_rounded,
            onPressed: onTap,
          ),
        ],
      ),
    );
  }
}
