import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/auth/auth_required_gate.dart';
import '../../../core/auth/feature_access_service.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/assets/app_assets.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../models/course_models.dart';
import '../providers/courses_provider.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import 'course_player_screen.dart';

/// Comprehensive Course Detail screen with curriculum syllabus and enrollment checkout
/// Redesigned in Phase 7 according to the Astro Sushil Design System.
class CourseDetailScreen extends ConsumerStatefulWidget {
  final String idOrSlug;

  const CourseDetailScreen({
    super.key,
    required this.idOrSlug,
  });

  @override
  ConsumerState<CourseDetailScreen> createState() => _CourseDetailScreenState();
}

class _CourseDetailScreenState extends ConsumerState<CourseDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isProcessingEnrollment = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _handleEnrollment(CourseDetailModel course) async {
    AuthRequiredGate.checkAndProceed(
      context: context,
      ref: ref,
      feature: AppFeature.courses,
      featureTitle: 'Course Enrollment',
      onAllowed: () async {
        setState(() => _isProcessingEnrollment = true);
        try {
          final service = ref.read(coursesServiceProvider);
          final enrollResult = await service.enrollInCourse(course.id);

          if (!mounted) return;

          _showEnrollmentCheckoutModal(course, enrollResult);
        } catch (e) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to initiate checkout: $e'),
              backgroundColor: AppColors.error,
            ),
          );
        } finally {
          if (mounted) {
            setState(() => _isProcessingEnrollment = false);
          }
        }
      },
    );
  }

  void _showEnrollmentCheckoutModal(CourseDetailModel course, Map<String, dynamic> enrollData) {
    final basePriceRupees = (course.priceRupees * 10000) ~/ 11800;
    final gstRupees = course.priceRupees - basePriceRupees;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          decoration: const BoxDecoration(
            color: AppColors.cardSurfaceWarm,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            border: Border(
              top: BorderSide(color: AppColors.cardBorder, width: 1.5),
              left: BorderSide(color: AppColors.cardBorder, width: 1),
              right: BorderSide(color: AppColors.cardBorder, width: 1),
            ),
          ),
          padding: EdgeInsets.only(
            top: 16,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.cardBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.school_rounded, color: AppColors.primary, size: 22),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'Complete Masterclass Enrollment',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.lightTextPrimary,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.canvas,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.cardBorder),
                ),
                child: Column(
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Masterclass:', style: TextStyle(color: AppColors.lightTextSecondary, fontSize: 13)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            course.title,
                            textAlign: TextAlign.end,
                            style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.lightTextPrimary, fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Base Course Fee:', style: TextStyle(color: AppColors.lightTextSecondary, fontSize: 13)),
                        Text('₹$basePriceRupees', style: const TextStyle(color: AppColors.lightTextPrimary, fontSize: 13)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('GST (18% Included):', style: TextStyle(color: AppColors.lightTextSecondary, fontSize: 13)),
                        Text('₹$gstRupees', style: const TextStyle(color: AppColors.lightTextPrimary, fontSize: 13)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    const Divider(height: 1, color: AppColors.cardBorder),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Payable:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.primary)),
                        Text(
                          '₹${course.priceRupees}',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.1)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.lock_outline_rounded, size: 18, color: AppColors.primary),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Instant unlocking across both mobile app and Astro Sushil Graphy Learning Cloud portal upon confirmation.',
                        style: TextStyle(fontSize: 12, color: AppColors.lightTextSecondary, height: 1.4),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Payment order initialized. Secure gateway checkout ready.'),
                        backgroundColor: AppColors.primary,
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: Text(
                    'Proceed to Pay ₹${course.priceRupees}',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final locale = Localizations.localeOf(context);
    final langCode = locale.languageCode;
    final courseAsync = ref.watch(courseDetailProvider(widget.idOrSlug));

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
          onPressed: () => Navigator.of(context).pop(),
          tooltip: 'Back',
        ),
        title: Text(
          l10n.coursesNavTitle,
          style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
        ),
        actions: [
          courseAsync.maybeWhen(
            data: (course) => Padding(
              padding: const EdgeInsets.only(right: 8),
              child: SushilExplainerButton(
                isCompact: true,
                label: langCode == 'hi' ? 'पाठ्यक्रम समझें' : 'Explain syllabus',
                contextData: ExplanationContext(
                  feature: 'course_detail',
                  screenTitle: course.title,
                  data: {
                    'courseId': course.id,
                    'title': course.title,
                    'level': course.level.displayName,
                    'durationMinutes': course.totalDurationMinutes,
                    'lessonsCount': course.sections.fold<int>(0, (acc, s) => acc + s.lessons.length),
                    'curriculum': course.sections
                        .map((s) => {
                              'title': s.title,
                              'lessons': s.lessons.map((l) => l.title).toList(),
                            })
                        .toList(),
                  },
                ),
              ),
            ),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      body: SubtleCelestialBackground(
        child: courseAsync.when(
          loading: () => const LoadingIndicator(message: 'Loading course syllabus...'),
          error: (err, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                  const SizedBox(height: 12),
                  Text(err.toString(), textAlign: TextAlign.center),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => ref.refresh(courseDetailProvider(widget.idOrSlug)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(0, 48),
                    ),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
          data: (course) {
            final firstLessonId = course.sections.isNotEmpty &&
                    course.sections.first.lessons.isNotEmpty
                ? course.sections.first.lessons.first.id
                : null;

            return Column(
              children: [
                Expanded(
                  child: NestedScrollView(
                    headerSliverBuilder: (ctx, innerBoxIsScrolled) {
                      return [
                        SliverToBoxAdapter(
                          child: _CourseHeaderBanner(
                            course: course,
                            langCode: langCode,
                          ),
                        ),
                        SliverPersistentHeader(
                          pinned: true,
                          delegate: _SliverTabHeaderDelegate(
                            TabBar(
                              controller: _tabController,
                              indicatorColor: AppColors.gold,
                              indicatorWeight: 3,
                              labelColor: AppColors.primary,
                              unselectedLabelColor: AppColors.lightTextSecondary,
                              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              tabs: [
                                Tab(text: l10n.courseSyllabus),
                                Tab(text: l10n.courseOverview),
                              ],
                            ),
                          ),
                        ),
                      ];
                    },
                    body: TabBarView(
                      controller: _tabController,
                      children: [
                        // Curriculum & Syllabus Tab
                        _SyllabusView(
                          course: course,
                          langCode: langCode,
                          onLessonTap: (lesson) {
                            if (course.isEnrolled || lesson.isFreePreview) {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => CoursePlayerScreen(lessonId: lesson.id),
                                ),
                              );
                            } else {
                              _showLockedLessonDialog(lesson);
                            }
                          },
                        ),

                        // Overview Tab
                        _OverviewView(
                          course: course,
                          langCode: langCode,
                        ),
                      ],
                    ),
                  ),
                ),

                // Bottom Sticky Purchase & Action Bar
                _BottomPurchaseBar(
                  course: course,
                  isProcessing: _isProcessingEnrollment,
                  onEnroll: () => _handleEnrollment(course),
                  onContinue: () {
                    if (firstLessonId != null) {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => CoursePlayerScreen(lessonId: firstLessonId),
                        ),
                      );
                    }
                  },
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  void _showLockedLessonDialog(CourseLessonModel lesson) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.cardSurfaceWarm,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: AppColors.cardBorder),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.lock_rounded, color: AppColors.secondary, size: 22),
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Premium Masterclass Lesson',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: AppColors.primary),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              lesson.title,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: AppColors.lightTextPrimary),
            ),
            const SizedBox(height: 10),
            const Text(
              'This lesson contains exclusive proprietary techniques from Astro Sushil Kumar Singh. Enroll in the masterclass to unlock instant streaming access to all lectures.',
              style: TextStyle(fontSize: 13, color: AppColors.lightTextSecondary, height: 1.4),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel', style: TextStyle(color: AppColors.lightTextSecondary)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('View Enrollment'),
          ),
        ],
      ),
    );
  }
}

class _CourseHeaderBanner extends StatelessWidget {
  final CourseDetailModel course;
  final String langCode;

  const _CourseHeaderBanner({
    required this.course,
    required this.langCode,
  });

  Widget _buildThumbnail() {
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
        errorBuilder: (_, __, ___) => _FallbackBanner(title: course.title),
      );
    }
    return _FallbackBanner(title: course.title);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    return Container(
      color: AppColors.cardSurfaceWarm,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Thumbnail
          ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: Container(
              height: 185,
              width: double.infinity,
              color: AppColors.primary,
              child: _buildThumbnail(),
            ),
          ),
          const SizedBox(height: 14),

          // Badges
          Wrap(
            spacing: 8,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.tertiary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.cardBorder),
                ),
                child: Text(
                  course.level.displayName.toUpperCase(),
                  style: const TextStyle(
                    color: AppColors.secondary,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.canvas,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.cardBorder),
                ),
                child: Text(
                  course.language,
                  style: const TextStyle(
                    color: AppColors.lightTextSecondary,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.gold.withValues(alpha: 0.5)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.verified, size: 14, color: AppColors.gold),
                    SizedBox(width: 4),
                    Text(
                      'Official Course',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Title
          Text(
            course.getLocalizedTitle(langCode),
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppColors.lightTextPrimary,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 8),

          // Instructor
          Row(
            children: [
              const CircleAvatar(
                radius: 14,
                backgroundColor: AppColors.primary,
                child: Icon(Icons.person, size: 16, color: Colors.white),
              ),
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  course.instructorName,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.lightTextSecondary,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 6),
              const Icon(Icons.verified, size: 16, color: AppColors.gold),
            ],
          ),
          const SizedBox(height: 12),

          // Duration & Lessons Count
          Wrap(
            spacing: 16,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.access_time_rounded, size: 16, color: AppColors.secondary),
                  const SizedBox(width: 6),
                  Text(
                    '${course.totalDurationMinutes} mins total duration',
                    style: const TextStyle(fontSize: 13, color: AppColors.lightTextSecondary),
                  ),
                ],
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.play_circle_outline, size: 16, color: AppColors.secondary),
                  const SizedBox(width: 6),
                  Text(
                    l10n.courseLessonCount(course.totalLessonsCount.toString()),
                    style: const TextStyle(fontSize: 13, color: AppColors.lightTextSecondary),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _FallbackBanner extends StatelessWidget {
  final String title;

  const _FallbackBanner({required this.title});

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
          const Icon(Icons.school_rounded, color: AppColors.premiumAccent, size: 48),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SyllabusView extends StatelessWidget {
  final CourseDetailModel course;
  final String langCode;
  final ValueChanged<CourseLessonModel> onLessonTap;

  const _SyllabusView({
    required this.course,
    required this.langCode,
    required this.onLessonTap,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: course.sections.length,
      itemBuilder: (ctx, sIndex) {
        final section = course.sections[sIndex];

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          child: Material(
            color: AppColors.cardSurfaceWarm,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: const BorderSide(color: AppColors.cardBorder),
            ),
            child: ExpansionTile(
              initiallyExpanded: true,
              tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              title: Text(
                section.getLocalizedTitle(langCode),
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: AppColors.lightTextPrimary,
                ),
              ),
              subtitle: Text(
                '${section.lessons.length} lessons',
                style: const TextStyle(fontSize: 12, color: AppColors.lightTextMuted),
              ),
              children: section.lessons.map((lesson) {
                final isUnlocked = course.isEnrolled || lesson.isFreePreview;

                return ListTile(
                  onTap: () => onLessonTap(lesson),
                  leading: CircleAvatar(
                    radius: 16,
                    backgroundColor: isUnlocked
                        ? (lesson.isFreePreview
                            ? AppColors.gold.withValues(alpha: 0.18)
                            : AppColors.success.withValues(alpha: 0.15))
                        : AppColors.canvas,
                    child: Icon(
                      isUnlocked
                          ? (lesson.isCompleted ? Icons.check : Icons.play_arrow_rounded)
                          : Icons.lock_outline_rounded,
                      size: 18,
                      color: isUnlocked
                          ? (lesson.isFreePreview ? AppColors.primary : AppColors.success)
                          : AppColors.lightTextMuted,
                    ),
                  ),
                  title: Text(
                    lesson.getLocalizedTitle(langCode),
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isUnlocked ? AppColors.lightTextPrimary : AppColors.lightTextSecondary,
                    ),
                  ),
                  subtitle: Text(
                    '${lesson.durationMinutes} mins',
                    style: const TextStyle(fontSize: 12, color: AppColors.lightTextMuted),
                  ),
                  trailing: lesson.isFreePreview && !course.isEnrolled
                      ? Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.gold.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: AppColors.gold, width: 0.8),
                          ),
                          child: Text(
                            l10n.courseFreePreview,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                        )
                      : null,
                );
              }).toList(),
            ),
          ),
        );
      },
    );
  }
}

class _OverviewView extends StatelessWidget {
  final CourseDetailModel course;
  final String langCode;

  const _OverviewView({
    required this.course,
    required this.langCode,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.cardSurfaceWarm,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.info_outline_rounded, color: AppColors.primary, size: 20),
                    SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        'About This Masterclass',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.lightTextPrimary,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  course.getLocalizedDescription(langCode),
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.lightTextSecondary,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 16),
                const Divider(height: 1, color: AppColors.cardBorder),
                const SizedBox(height: 16),
                const Text(
                  'Key Deliverables & Learning Objectives',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: AppColors.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 10),
                const _ObjectiveBullet(text: 'Structured video lectures covering foundational and advanced techniques.'),
                const _ObjectiveBullet(text: 'Practical case studies and real horoscope breakdowns for event timing.'),
                const _ObjectiveBullet(text: 'Classical Gupta Nadi and Shri K.N. Rao methodology rules.'),
                const _ObjectiveBullet(text: 'Exclusive access to learning community on official Graphy Cloud LMS.'),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Instructor Information Card
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.cardSurfaceWarm,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.person_pin_rounded, color: AppColors.primary, size: 20),
                    SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        'Instructor Profile',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.lightTextPrimary,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 12),
                Text(
                  'Astro Sushil Kumar Singh',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Principal Astrologer & Vedic Shastra Expert with 25+ years of active consultation, research, and astrological teaching experience.',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.lightTextSecondary,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ObjectiveBullet extends StatelessWidget {
  final String text;

  const _ObjectiveBullet({required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 13, color: AppColors.lightTextSecondary, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}

class _BottomPurchaseBar extends StatelessWidget {
  final CourseDetailModel course;
  final bool isProcessing;
  final VoidCallback onEnroll;
  final VoidCallback onContinue;

  const _BottomPurchaseBar({
    required this.course,
    required this.isProcessing,
    required this.onEnroll,
    required this.onContinue,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        border: const Border(top: BorderSide(color: AppColors.cardBorder)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF121440).withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -3),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: course.isEnrolled
            ? SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: onContinue,
                  icon: const Icon(Icons.play_circle_fill_rounded, size: 20),
                  label: Text(
                    l10n.courseContinueLearning,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.success,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              )
            : Row(
                children: [
                  Expanded(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 6,
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
                              Text(
                                '₹${course.originalPriceRupees}',
                                style: const TextStyle(
                                  fontSize: 13,
                                  decoration: TextDecoration.lineThrough,
                                  color: AppColors.lightTextMuted,
                                ),
                              ),
                          ],
                        ),
                        Text(
                          l10n.courseIncludesGst,
                          style: const TextStyle(fontSize: 11, color: AppColors.lightTextMuted),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  SizedBox(
                    height: 50,
                    child: ElevatedButton(
                      onPressed: isProcessing ? null : onEnroll,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: isProcessing
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : Text(
                              l10n.courseEnrollNow,
                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                            ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

class _SliverTabHeaderDelegate extends SliverPersistentHeaderDelegate {
  final TabBar _tabBar;

  _SliverTabHeaderDelegate(this._tabBar);

  @override
  double get minExtent => _tabBar.preferredSize.height;
  @override
  double get maxExtent => _tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: AppColors.canvas,
      child: _tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverTabHeaderDelegate oldDelegate) {
    return false;
  }
}
