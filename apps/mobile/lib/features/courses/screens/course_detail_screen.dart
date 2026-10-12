import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/auth/auth_required_gate.dart';
import '../../../core/auth/feature_access_service.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../models/course_models.dart';
import '../providers/courses_provider.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import 'course_player_screen.dart';

/// Comprehensive Course Detail screen with curriculum syllabus and enrollment checkout
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
      feature: AppFeature.courses, // Requires standard auth for purchases
      featureTitle: 'Course Enrollment',
      onAllowed: () async {
        setState(() => _isProcessingEnrollment = true);
        try {
          final service = ref.read(coursesServiceProvider);
          final enrollResult = await service.enrollInCourse(course.id);

          if (!mounted) return;

          // In local dev/test or when Razorpay key is test, show confirmation dialog
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
    final order = enrollData['order'] as Map<String, dynamic>? ?? {};
    final orderId = order['id'] as String? ?? order['orderId'] as String? ?? '';
    final rzpOrderId = (enrollData['payment'] as Map<String, dynamic>?)?['razorpayOrderId'] as String? ??
        (enrollData['razorpayConfig'] as Map<String, dynamic>?)?['orderId'] as String? ??
        '';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.lightBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  const Icon(Icons.shopping_bag_outlined, color: AppColors.primary, size: 26),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'Complete Course Enrollment',
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
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.lightBackground,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.lightBorder),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Course:', style: TextStyle(color: AppColors.lightTextSecondary)),
                        Text(
                          course.title,
                          style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.lightTextPrimary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Amount:', style: TextStyle(color: AppColors.lightTextSecondary)),
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
                    const SizedBox(height: 8),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Taxes:', style: TextStyle(fontSize: 12, color: AppColors.lightTextMuted)),
                        Text('18% GST Included', style: TextStyle(fontSize: 12, color: AppColors.lightTextMuted)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
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
      backgroundColor: AppColors.lightBackground,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
          onPressed: () => Navigator.of(context).pop(),
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
      body: courseAsync.when(
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
                            indicatorColor: AppColors.premiumAccent,
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
    );
  }

  void _showLockedLessonDialog(CourseLessonModel lesson) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            const Icon(Icons.lock_rounded, color: AppColors.secondary, size: 24),
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
              'This lesson contains exclusive proprietary techniques from Astro Sushil Kumar Singh. Enroll in the course to unlock instant access to all lectures.',
              style: TextStyle(fontSize: 13, color: AppColors.lightTextSecondary, height: 1.4),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
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

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Thumbnail
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Container(
              height: 180,
              width: double.infinity,
              color: AppColors.primary,
              child: course.thumbnail != null && course.thumbnail!.isNotEmpty
                  ? Image.network(
                      course.thumbnail!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _FallbackBanner(title: course.title),
                    )
                  : _FallbackBanner(title: course.title),
            ),
          ),
          const SizedBox(height: 16),

          // Badges
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.secondary.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  course.level.displayName,
                  style: const TextStyle(
                    color: AppColors.secondary,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.lightBorder,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  course.language,
                  style: const TextStyle(
                    color: AppColors.lightTextSecondary,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const Spacer(),
              Row(
                children: [
                  const Icon(Icons.star_rounded, color: AppColors.premiumAccent, size: 20),
                  const SizedBox(width: 4),
                  Text(
                    course.rating.toStringAsFixed(1),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ],
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
              Text(
                course.instructorName,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.lightTextSecondary,
                ),
              ),
              const SizedBox(width: 4),
              const Icon(Icons.verified, size: 16, color: AppColors.premiumAccent),
            ],
          ),
          const SizedBox(height: 12),

          // Duration & Lessons Count
          Row(
            children: [
              const Icon(Icons.access_time_rounded, size: 16, color: AppColors.secondary),
              const SizedBox(width: 6),
              Text(
                '${course.totalDurationMinutes} mins total duration',
                style: const TextStyle(fontSize: 13, color: AppColors.lightTextSecondary),
              ),
              const SizedBox(width: 16),
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
            color: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: const BorderSide(color: AppColors.lightBorder),
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
                          ? AppColors.premiumAccent.withOpacity(0.18)
                          : AppColors.success.withOpacity(0.15))
                      : AppColors.lightBackground,
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
                          color: AppColors.premiumAccent.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(6),
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
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.lightBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.info_outline_rounded, color: AppColors.primary, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'About This Masterclass',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.lightTextPrimary,
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
                    height: 1.6,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Features Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.lightBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'What You Will Learn',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 12),
                _FeatureBullet(text: 'Original Vedic & Gupta Nadi timing rules'),
                _FeatureBullet(text: 'Step-by-step case chart studies by Astro Sushil Kumar Singh'),
                _FeatureBullet(text: 'Real-world application for marriage, wealth, and life events'),
                _FeatureBullet(text: 'Comprehensive syllabus and self-paced progress tracking'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FeatureBullet extends StatelessWidget {
  final String text;

  const _FeatureBullet({required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 13, color: AppColors.lightTextSecondary),
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
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 10,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Row(
        children: [
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    '₹${course.priceRupees}',
                    style: const TextStyle(
                      fontSize: 22,
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
          const Spacer(),
          course.isEnrolled
              ? ElevatedButton.icon(
                  onPressed: onContinue,
                  icon: const Icon(Icons.play_circle_fill, size: 20),
                  label: Text(l10n.courseContinueLearning),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.success,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                )
              : ElevatedButton(
                  onPressed: isProcessing ? null : onEnroll,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: isProcessing
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text(
                          l10n.courseEnrollNow,
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                        ),
                ),
        ],
      ),
    );
  }
}

class _SliverTabHeaderDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;

  _SliverTabHeaderDelegate(this.tabBar);

  @override
  double get minExtent => tabBar.preferredSize.height;

  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: Colors.white,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverTabHeaderDelegate oldDelegate) {
    return false;
  }
}
