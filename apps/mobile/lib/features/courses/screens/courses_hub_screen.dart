import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../models/course_models.dart';
import '../providers/courses_provider.dart';
import 'course_detail_screen.dart';
import 'course_player_screen.dart';

/// Hub screen for Courses: includes Course Catalogue, Filters, Search & My Learning
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
      backgroundColor: AppColors.lightBackground,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        elevation: 0,
        leading: Navigator.canPop(context)
            ? IconButton(
                icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
                onPressed: () => Navigator.of(context).pop(),
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
              ),
            ),
            Text(
              l10n.coursesSubtitle,
              style: TextStyle(
                color: Colors.white.withOpacity(0.8),
                fontSize: 11,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Segmented Navigation Pill Bar: Explore vs My Learning
          Container(
            color: AppColors.primary,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Container(
              height: 46,
              decoration: BoxDecoration(
                color: AppColors.tertiary,
                borderRadius: BorderRadius.circular(24),
              ),
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
          ),

          // Main Tab Body
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
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.premiumAccent : Colors.transparent,
          borderRadius: BorderRadius.circular(24),
        ),
        alignment: Alignment.center,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 18,
              color: isSelected ? AppColors.primary : Colors.white70,
            ),
            const SizedBox(width: 8),
            Text(
              title,
              style: TextStyle(
                color: isSelected ? AppColors.primary : Colors.white70,
                fontSize: 14,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
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
        // Search & Filter Header
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.white,
          child: Column(
            children: [
              // Search Field
              TextField(
                controller: searchController,
                decoration: InputDecoration(
                  hintText: l10n.searchCoursesHint,
                  hintStyle: const TextStyle(color: AppColors.lightTextMuted, fontSize: 14),
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
                  fillColor: AppColors.lightBackground,
                  contentPadding: const EdgeInsets.symmetric(vertical: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.lightBorder),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.lightBorder),
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
              const SizedBox(height: 12),

              // Filter Chips Row
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
                    const SizedBox(width: 12),
                    Container(height: 20, width: 1, color: AppColors.lightBorder),
                    const SizedBox(width: 12),
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

        // Courses List
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
                      ],
                    ),
                  ),
                );
              }

              return RefreshIndicator(
                onRefresh: () async => ref.refresh(coursesListProvider),
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: courses.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 16),
                  itemBuilder: (ctx, i) {
                    final course = courses[i];
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
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : AppColors.lightBackground,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? AppColors.primary : AppColors.lightBorder,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
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

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    return Card(
      elevation: 2,
      shadowColor: Colors.black.withOpacity(0.08),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: AppColors.lightBorder),
      ),
      color: Colors.white,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thumbnail Banner
            Stack(
              children: [
                Container(
                  height: 150,
                  width: double.infinity,
                  color: AppColors.primary,
                  child: course.thumbnail != null && course.thumbnail!.isNotEmpty
                      ? Image.network(
                          course.thumbnail!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _ThumbnailFallback(title: course.title),
                        )
                      : _ThumbnailFallback(title: course.title),
                ),
                Positioned(
                  top: 12,
                  right: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.7),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.star_rounded, color: AppColors.premiumAccent, size: 16),
                        const SizedBox(width: 4),
                        Text(
                          course.rating.toStringAsFixed(1),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Positioned(
                  bottom: 12,
                  left: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.tertiary.withOpacity(0.9),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '${course.level.displayName} • ${course.language}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
            ),

            // Details
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

                  // Metadata Badges Row
                  Row(
                    children: [
                      const Icon(Icons.access_time_rounded, size: 15, color: AppColors.secondary),
                      const SizedBox(width: 4),
                      Text(
                        course.formattedDuration,
                        style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary),
                      ),
                      const SizedBox(width: 14),
                      const Icon(Icons.video_library_outlined, size: 15, color: AppColors.secondary),
                      const SizedBox(width: 4),
                      Text(
                        l10n.courseLessonCount(course.totalLessons.toString()),
                        style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Divider(height: 1, color: AppColors.lightBorder),
                  const SizedBox(height: 14),

                  // Pricing & CTA Action
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
                                  fontSize: 18,
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
                              icon: const Icon(Icons.check_circle_rounded, size: 16),
                              label: Text(l10n.courseContinueLearning),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.success,
                                foregroundColor: Colors.white,
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
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: AppColors.secondary.withOpacity(0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.menu_book_rounded,
                      size: 36,
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

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    return Card(
      elevation: 2,
      shadowColor: Colors.black.withOpacity(0.06),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.lightBorder),
      ),
      color: Colors.white,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: course.thumbnail != null && course.thumbnail!.isNotEmpty
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.network(
                              course.thumbnail!,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => const Icon(
                                Icons.play_circle_fill,
                                color: AppColors.premiumAccent,
                                size: 30,
                              ),
                            ),
                          )
                        : const Icon(
                            Icons.play_circle_fill,
                            color: AppColors.premiumAccent,
                            size: 30,
                          ),
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
                  backgroundColor: AppColors.lightBorder,
                  valueColor: const AlwaysStoppedAnimation<Color>(AppColors.success),
                ),
              ),
              const SizedBox(height: 12),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
