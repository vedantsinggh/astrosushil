import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/assets/app_assets.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_gradients.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
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

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        elevation: 0,
        centerTitle: false,
        leading: Navigator.canPop(context)
            ? IconButton(
                icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
                onPressed: () => Navigator.of(context).pop(),
                tooltip: 'Back',
              )
            : null,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.coursesScreenTitle,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.2,
              ),
            ),
            Text(
              l10n.coursesSubtitle,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.8),
                fontSize: 11,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
      body: SubtleCelestialBackground(
        child: Column(
          children: [
            // 1. Cosmic Hero Header & Segmented Navigation
            Container(
              decoration: const BoxDecoration(
                gradient: AppGradients.heroCosmic,
              ),
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
              child: Column(
                children: [
                  // Dual Segmented Pill Bar: Explore vs My Learning (Min 48dp height)
                  Container(
                    height: 50,
                    decoration: BoxDecoration(
                      color: AppColors.tertiary,
                      borderRadius: BorderRadius.circular(26),
                      border: Border.all(color: AppColors.cardBorder.withValues(alpha: 0.2)),
                    ),
                    padding: const EdgeInsets.all(4),
                    child: Row(
                      children: [
                        Expanded(
                          child: _TabButton(
                            title: l10n.exploreCoursesTab,
                            icon: Icons.school_outlined,
                            isSelected: activeTab == 0,
                            onTap: () {
                              ref.read(coursesActiveTabProvider.notifier).state = 0;
                            },
                          ),
                        ),
                        Expanded(
                          child: _TabButton(
                            title: l10n.myLearningTab,
                            icon: Icons.play_lesson_outlined,
                            isSelected: activeTab == 1,
                            onTap: () {
                              ref.read(coursesActiveTabProvider.notifier).state = 1;
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // 2. Main Tab Body
            Expanded(
              child: activeTab == 0
                  ? _ExploreCatalogueView(
                      searchController: _searchController,
                      langCode: langCode,
                    )
                  : _MyLearningView(langCode: langCode),
            ),
          ],
        ),
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  final String title;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _TabButton({
    required this.title,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.premiumAccent : Colors.transparent,
          borderRadius: BorderRadius.circular(22),
        ),
        alignment: Alignment.center,
        constraints: const BoxConstraints(minHeight: 48),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 18,
              color: isSelected ? AppColors.primary : Colors.white70,
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: isSelected ? AppColors.primary : Colors.white70,
                  fontSize: 14,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
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

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final coursesAsync = ref.watch(coursesListProvider);
    final selectedLevel = ref.watch(selectedCourseLevelProvider);
    final selectedLanguage = ref.watch(selectedCourseLanguageProvider);

    return Column(
      children: [
        // 1. Search & Filter Header
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          decoration: const BoxDecoration(
            color: AppColors.cardSurfaceWarm,
            border: Border(
              bottom: BorderSide(color: AppColors.cardBorder, width: 1),
            ),
          ),
          child: Column(
            children: [
              // Search Field
              SizedBox(
                height: 48,
                child: TextField(
                  controller: searchController,
                  decoration: InputDecoration(
                    hintText: l10n.searchCoursesHint,
                    hintStyle: const TextStyle(color: AppColors.lightTextMuted, fontSize: 13),
                    prefixIcon: const Icon(Icons.search, color: AppColors.secondary, size: 22),
                    suffixIcon: searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18, color: AppColors.lightTextMuted),
                            onPressed: () {
                              searchController.clear();
                              ref.read(courseSearchQueryProvider.notifier).state = '';
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: AppColors.canvas,
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.cardBorder),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.cardBorder),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppColors.secondary, width: 1.5),
                    ),
                  ),
                  onChanged: (val) {
                    ref.read(courseSearchQueryProvider.notifier).state = val;
                  },
                ),
              ),
              const SizedBox(height: 10),

              // Filter Chips Row (Min 48dp Touch Targets)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _FilterChip(
                      label: l10n.allLevels,
                      isSelected: selectedLevel == 'ALL',
                      onTap: () => ref.read(selectedCourseLevelProvider.notifier).state = 'ALL',
                    ),
                    const SizedBox(width: 8),
                    _FilterChip(
                      label: 'Beginner',
                      isSelected: selectedLevel == 'BEGINNER',
                      onTap: () =>
                          ref.read(selectedCourseLevelProvider.notifier).state = 'BEGINNER',
                    ),
                    const SizedBox(width: 8),
                    _FilterChip(
                      label: 'Advanced',
                      isSelected: selectedLevel == 'ADVANCED',
                      onTap: () =>
                          ref.read(selectedCourseLevelProvider.notifier).state = 'ADVANCED',
                    ),
                    const SizedBox(width: 10),
                    Container(height: 24, width: 1, color: AppColors.cardBorder),
                    const SizedBox(width: 10),
                    _FilterChip(
                      label: 'All Languages',
                      isSelected: selectedLanguage == 'ALL',
                      onTap: () =>
                          ref.read(selectedCourseLanguageProvider.notifier).state = 'ALL',
                    ),
                    const SizedBox(width: 8),
                    _FilterChip(
                      label: 'English',
                      isSelected: selectedLanguage == 'English',
                      onTap: () =>
                          ref.read(selectedCourseLanguageProvider.notifier).state = 'English',
                    ),
                    const SizedBox(width: 8),
                    _FilterChip(
                      label: 'Hindi',
                      isSelected: selectedLanguage == 'Hindi',
                      onTap: () =>
                          ref.read(selectedCourseLanguageProvider.notifier).state = 'Hindi',
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        // 2. Courses List View
        Expanded(
          child: coursesAsync.when(
            loading: () => const LoadingIndicator(message: 'Loading courses...'),
            error: (err, _) => Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                    const SizedBox(height: 12),
                    Text(
                      err.toString(),
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: AppColors.lightTextPrimary),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () => ref.refresh(coursesListProvider),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        minimumSize: const Size(120, 48),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            ),
            data: (courses) {
              if (courses.isEmpty) {
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.search_off_rounded, size: 54, color: AppColors.lightTextMuted),
                        const SizedBox(height: 16),
                        Text(
                          l10n.courseNoCoursesFound,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppColors.lightTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 16),
                        OutlinedButton(
                          onPressed: () {
                            searchController.clear();
                            ref.read(courseSearchQueryProvider.notifier).state = '';
                            ref.read(selectedCourseLevelProvider.notifier).state = 'ALL';
                            ref.read(selectedCourseLanguageProvider.notifier).state = 'ALL';
                          },
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            side: const BorderSide(color: AppColors.cardBorder),
                            minimumSize: const Size(0, 48),
                          ),
                          child: const Text('Reset Filters'),
                        ),
                      ],
                    ),
                  ),
                );
              }

              return RefreshIndicator(
                onRefresh: () async => ref.refresh(coursesListProvider),
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: courses.length + 1, // +1 for educational guidance card at top
                  separatorBuilder: (_, __) => const SizedBox(height: 16),
                  itemBuilder: (ctx, i) {
                    if (i == 0) {
                      return _WhyStudyMasterclassesCard(langCode: langCode);
                    }
                    final course = courses[i - 1];
                    return _CourseCard(
                      course: course,
                      langCode: langCode,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => CourseDetailScreen(idOrSlug: course.id),
                          ),
                        );
                      },
                    );
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

/// Educational guidance card explaining the classical Vedic lineage & methodology
class _WhyStudyMasterclassesCard extends StatelessWidget {
  final String langCode;

  const _WhyStudyMasterclassesCard({required this.langCode});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.cardBorder),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.menu_book_rounded, color: AppColors.primary, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      langCode == 'hi' ? 'प्रामाणिक वैदिक ज्योतिष शिक्षण' : 'Authentic Vedic Astrology Lineage',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: AppColors.lightTextPrimary,
                      ),
                    ),
                    Text(
                      langCode == 'hi'
                          ? 'श्री के.एन. राव एवं गुप्त नाड़ी पद्धति'
                          : 'Shri K.N. Rao Method & Gupta Nadi Shastra',
                      style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: AppColors.cardBorder),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _FeaturePill(
                  icon: Icons.check_circle_outline_rounded,
                  label: langCode == 'hi' ? 'सटीक फलकथन' : 'Rule-Based Timing',
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _FeaturePill(
                  icon: Icons.ondemand_video_rounded,
                  label: langCode == 'hi' ? '12+ वीडियो व्याख्यान' : 'Detailed Lectures',
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _FeaturePill(
                  icon: Icons.all_inclusive_rounded,
                  label: langCode == 'hi' ? 'आजीवन पहुँच' : 'Lifetime Access',
                ),
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
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.canvas,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 14, color: AppColors.secondary),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              label,
              style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: AppColors.lightTextPrimary),
              overflow: TextOverflow.ellipsis,
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
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        constraints: const BoxConstraints(minHeight: 48, minWidth: 64),
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.cardSurfaceWarm,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.cardBorder,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? Colors.white : AppColors.lightTextSecondary,
          ),
        ),
      ),
    );
  }
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

    return Container(
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.cardBorder, width: 1.2),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF121440).withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Thumbnail Banner
            Stack(
              children: [
                Container(
                  height: 155,
                  width: double.infinity,
                  color: AppColors.primary,
                  child: _buildCourseThumbnail(),
                ),
                // Top Level / Language Pill
                Positioned(
                  top: 12,
                  left: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.tertiary.withValues(alpha: 0.9),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.gold.withValues(alpha: 0.4), width: 0.8),
                    ),
                    child: Text(
                      '${course.level.displayName.toUpperCase()} • ${course.language.toUpperCase()}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ),
                // Free Preview Badge
                Positioned(
                  bottom: 12,
                  right: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.85),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.gold, width: 1),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.play_circle_filled_rounded, color: AppColors.gold, size: 14),
                        const SizedBox(width: 4),
                        Text(
                          l10n.courseFreePreview,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
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
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    course.getLocalizedTitle(langCode),
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: AppColors.lightTextPrimary,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    course.getLocalizedDescription(langCode),
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.lightTextSecondary,
                      height: 1.4,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 12),

                  // Metadata Badges
                  Wrap(
                    spacing: 12,
                    runSpacing: 6,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.access_time_rounded, size: 15, color: AppColors.secondary),
                          const SizedBox(width: 4),
                          Text(
                            course.formattedDuration,
                            style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary),
                          ),
                        ],
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.video_library_outlined, size: 15, color: AppColors.secondary),
                          const SizedBox(width: 4),
                          Text(
                            l10n.courseLessonCount(course.totalLessons.toString()),
                            style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary),
                          ),
                        ],
                      ),
                      const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.verified, size: 14, color: AppColors.gold),
                          SizedBox(width: 4),
                          Text(
                            'Astro Sushil',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Divider(height: 1, color: AppColors.cardBorder),
                  const SizedBox(height: 14),

                  // Pricing & CTA Action
                  Wrap(
                    spacing: 12,
                    runSpacing: 10,
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Text(
                                '₹${course.priceRupees}',
                                style: const TextStyle(
                                  fontSize: 19,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              ),
                              if (course.originalPriceRupees != null) ...[
                                const SizedBox(width: 6),
                                Text(
                                  '₹${course.originalPriceRupees}',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    decoration: TextDecoration.lineThrough,
                                    color: AppColors.lightTextMuted,
                                  ),
                                ),
                              ],
                            ],
                          ),
                          Text(
                            l10n.courseIncludesGst,
                            style: const TextStyle(fontSize: 10, color: AppColors.lightTextMuted),
                          ),
                        ],
                      ),
                      course.isEnrolled
                          ? ElevatedButton.icon(
                              onPressed: onTap,
                              icon: const Icon(Icons.play_circle_fill_rounded, size: 18),
                              label: Text(l10n.courseContinueLearning),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.success,
                                foregroundColor: Colors.white,
                                minimumSize: const Size(0, 48),
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            )
                          : ElevatedButton(
                              onPressed: onTap,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                foregroundColor: Colors.white,
                                minimumSize: const Size(0, 48),
                                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: Text(
                                l10n.courseEnrollNow,
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                            ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
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
      loading: () => const LoadingIndicator(message: 'Loading enrolled courses...'),
      error: (err, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.lock_outline_rounded, size: 48, color: AppColors.secondary),
              const SizedBox(height: 12),
              Text(
                err.toString(),
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.lightTextPrimary),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.refresh(myLearningProvider),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(0, 48),
                ),
                child: const Text('Refresh'),
              ),
            ],
          ),
        ),
      ),
      data: (enrolledCourses) {
        if (enrolledCourses.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 76,
                    height: 76,
                    decoration: BoxDecoration(
                      color: AppColors.secondary.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.menu_book_rounded,
                      size: 38,
                      color: AppColors.secondary,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    l10n.courseNoMyLearning,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 15,
                      color: AppColors.lightTextSecondary,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () {
                      ref.read(coursesActiveTabProvider.notifier).state = 0;
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(0, 48),
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: Text(
                      l10n.courseBrowseCourses,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async => ref.refresh(myLearningProvider),
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: enrolledCourses.length,
            separatorBuilder: (_, __) => const SizedBox(height: 16),
            itemBuilder: (ctx, i) {
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
            },
          ),
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

    return Container(
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.cardBorder),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF121440).withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: _buildThumbnail(),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          course.getLocalizedTitle(langCode),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.lightTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${course.completedLessons} / ${course.totalLessons} lessons completed',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.lightTextSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Progress Bar
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(
                  value: course.progressFraction,
                  minHeight: 8,
                  backgroundColor: AppColors.cardBorder,
                  valueColor: const AlwaysStoppedAnimation<Color>(AppColors.success),
                ),
              ),
              const SizedBox(height: 12),

              Wrap(
                spacing: 12,
                runSpacing: 8,
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text(
                    '${course.progressPercent}% completed',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.success,
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: onTap,
                    icon: const Icon(Icons.play_arrow_rounded, size: 18),
                    label: Text(l10n.courseContinueLearning),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(0, 48),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
