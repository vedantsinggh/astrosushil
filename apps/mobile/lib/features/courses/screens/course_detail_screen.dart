import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/auth/auth_required_gate.dart';
import '../../../core/auth/feature_access_service.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/widgets/astro_design_system.dart';
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

class _CourseDetailScreenState extends ConsumerState<CourseDetailScreen> {
  /// 0 = curriculum & syllabus, 1 = overview.
  int _section = 0;
  bool _isProcessingEnrollment = false;

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

    Widget line(String label, String value, {bool total = false}) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  label,
                  style: total
                      ? const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary)
                      : const TextStyle(color: AppColors.textSecondary, fontSize: 15),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                value,
                style: total
                    ? const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primary)
                    : const TextStyle(color: AppColors.textPrimary, fontSize: 15),
              ),
            ],
          ),
        );

    showAstroSheet<void>(
      context: context,
      builder: (ctx) => Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 8),
          Row(
            children: [
              const AstroIconSquare(icon: Icons.school_rounded, tint: AstroTint.violet, size: 44),
              const SizedBox(width: 14),
              Expanded(
                child: Semantics(
                  header: true,
                  child: Text(
                    'Complete Masterclass Enrollment',
                    style: AppTypography.headlineLarge.copyWith(fontSize: 20, height: 1.25),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          AstroSurfaceCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Masterclass:', style: TextStyle(color: AppColors.textSecondary, fontSize: 15)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        course.title,
                        textAlign: TextAlign.end,
                        style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary, fontSize: 15),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                line('Base Course Fee:', '₹$basePriceRupees'),
                line('GST (18% Included):', '₹$gstRupees'),
                const Divider(height: 20, color: AppColors.separator),
                line('Total Payable:', '₹${course.priceRupees}', total: true),
              ],
            ),
          ),
          const SizedBox(height: 14),
          const AstroNote(
            'Instant unlocking across both mobile app and Astro Sushil Graphy Learning Cloud portal upon confirmation.',
            icon: Icons.lock_outline_rounded,
          ),
          const SizedBox(height: 20),
          AstroPrimaryButton(
            label: 'Proceed to Pay ₹${course.priceRupees}',
            icon: Icons.lock_rounded,
            onPressed: () {
              Navigator.of(ctx).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Payment order initialized. Secure gateway checkout ready.'),
                  backgroundColor: AppColors.primary,
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final locale = Localizations.localeOf(context);
    final langCode = locale.languageCode;
    final courseAsync = ref.watch(courseDetailProvider(widget.idOrSlug));
    final course = courseAsync.valueOrNull;

    final firstLessonId = course != null && course.sections.isNotEmpty && course.sections.first.lessons.isNotEmpty
        ? course.sections.first.lessons.first.id
        : null;

    return AstroPage(
      title: l10n.coursesNavTitle,
      onRefresh: () async => ref.invalidate(courseDetailProvider(widget.idOrSlug)),
      bottomBar: course == null
          ? null
          : _BottomPurchaseBar(
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
      child: courseAsync.when(
        loading: () =>
            const SizedBox(height: 320, child: AstroStateView.loading(message: 'Loading course syllabus...')),
        error: (err, _) => AstroStateView.error(
          compact: true,
          message: err.toString(),
          retryLabel: 'Retry',
          onRetry: () => ref.refresh(courseDetailProvider(widget.idOrSlug)),
        ),
        data: (course) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _CourseHeaderBanner(course: course, langCode: langCode),
            const SizedBox(height: 16),
            SushilExplainerButton(
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
            const SizedBox(height: 24),
            AstroSegmentedControl<int>(
              segments: [
                AstroSegment(value: 0, label: l10n.courseSyllabus),
                AstroSegment(value: 1, label: l10n.courseOverview),
              ],
              selected: _section,
              onChanged: (v) => setState(() => _section = v),
            ),
            const SizedBox(height: 20),
            if (_section == 0)
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
              )
            else
              _OverviewView(course: course, langCode: langCode),
          ],
        ),
      ),
    );
  }

  void _showLockedLessonDialog(CourseLessonModel lesson) {
    // Both choices simply close the dialog (enrollment lives in the bottom bar).
    showAstroConfirm(
      context: context,
      title: 'Premium Masterclass Lesson',
      message: '${lesson.title}\n\n'
          'This lesson contains exclusive proprietary techniques from Astro Sushil Kumar Singh. Enroll in the masterclass to unlock instant streaming access to all lectures.',
      confirmLabel: 'View Enrollment',
    );
  }
}

/// Hero card: course artwork, serif title, badges, instructor and length.
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

    Widget chip(String label, {IconData? icon, bool gold = false}) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: gold ? AppColors.gold.withValues(alpha: 0.16) : Colors.white.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: gold ? AppColors.gold.withValues(alpha: 0.6) : Colors.white24),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 16, color: AppColors.gold),
                const SizedBox(width: 5),
              ],
              Flexible(
                child: Text(
                  label,
                  style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        );

    Widget meta(IconData icon, String text) => Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: AppColors.gold),
            const SizedBox(width: 6),
            Flexible(
              child: Text(text, style: const TextStyle(fontSize: 15, color: AppColors.textInverseSecondary)),
            ),
          ],
        );

    return AstroGradientCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Artwork, full bleed at the top of the card.
          AspectRatio(
            aspectRatio: 16 / 9,
            child: ColoredBox(color: AppColors.primary, child: _buildThumbnail()),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    chip(course.level.displayName),
                    chip(course.language),
                    chip('Official Course', icon: Icons.verified, gold: true),
                  ],
                ),
                const SizedBox(height: 12),
                Semantics(
                  header: true,
                  child: Text(
                    course.getLocalizedTitle(langCode),
                    style: AppTypography.headlineLarge.copyWith(fontSize: 24, color: Colors.white, height: 1.25),
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    const CircleAvatar(
                      radius: 14,
                      backgroundColor: AppColors.gold,
                      child: Icon(Icons.person, size: 16, color: AppColors.primary),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        course.instructorName,
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white),
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Icon(Icons.verified, size: 16, color: AppColors.gold),
                  ],
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 16,
                  runSpacing: 6,
                  children: [
                    meta(Icons.access_time_rounded, '${course.totalDurationMinutes} mins total duration'),
                    meta(Icons.play_circle_outline, l10n.courseLessonCount(course.totalLessonsCount.toString())),
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

/// Curriculum: one inset-grouped section per module, one row per lesson.
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

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final section in course.sections)
          Padding(
            padding: const EdgeInsets.only(bottom: 22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Semantics(
                        header: true,
                        child: Text(
                          section.getLocalizedTitle(langCode),
                          style: AppTypography.headlineMedium.copyWith(fontSize: 18),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text('${section.lessons.length} lessons', style: AppTypography.rowSubtitle),
                    ],
                  ),
                ),
                AstroGroupedSection(
                  children: [
                    for (final lesson in section.lessons)
                      Builder(builder: (context) {
                        final isUnlocked = course.isEnrolled || lesson.isFreePreview;
                        return AstroListRow(
                          icon: isUnlocked
                              ? (lesson.isCompleted ? Icons.check_rounded : Icons.play_arrow_rounded)
                              : Icons.lock_outline_rounded,
                          tint:
                              isUnlocked ? (lesson.isFreePreview ? AstroTint.amber : AstroTint.sage) : AstroTint.slate,
                          title: lesson.getLocalizedTitle(langCode),
                          titleColor: isUnlocked ? AppColors.textPrimary : AppColors.textSecondary,
                          subtitle: '${lesson.durationMinutes} mins',
                          trailing: lesson.isFreePreview && !course.isEnrolled
                              ? Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: AstroTint.amber.background,
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    l10n.courseFreePreview,
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                      color: AstroTint.amber.foreground,
                                    ),
                                  ),
                                )
                              : null,
                          showChevron: true,
                          onTap: () => onLessonTap(lesson),
                        );
                      }),
                  ],
                ),
              ],
            ),
          ),
      ],
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
    Widget heading(IconData icon, AstroTint tint, String text) => Row(
          children: [
            AstroIconSquare(icon: icon, tint: tint),
            const SizedBox(width: 12),
            Expanded(
              child: Semantics(
                header: true,
                child: Text(text, style: AppTypography.headlineMedium),
              ),
            ),
          ],
        );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AstroSurfaceCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              heading(Icons.info_outline_rounded, AstroTint.indigo, 'About This Masterclass'),
              const SizedBox(height: 12),
              Text(
                course.getLocalizedDescription(langCode),
                style: const TextStyle(fontSize: 16, color: AppColors.textSecondary, height: 1.5),
              ),
              const SizedBox(height: 16),
              const Divider(height: 1, color: AppColors.separator),
              const SizedBox(height: 16),
              Text(
                'Key Deliverables & Learning Objectives',
                style: AppTypography.rowTitle.copyWith(fontWeight: FontWeight.w700),
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
        AstroSurfaceCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              heading(Icons.person_pin_rounded, AstroTint.amber, 'Instructor Profile'),
              const SizedBox(height: 12),
              const Text(
                'Astro Sushil Kumar Singh',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary),
              ),
              const SizedBox(height: 4),
              const Text(
                'Principal Astrologer & Vedic Shastra Expert with 25+ years of active consultation, research, and astrological teaching experience.',
                style: TextStyle(fontSize: 15, color: AppColors.textSecondary, height: 1.45),
              ),
            ],
          ),
        ),
      ],
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
          const Padding(
            padding: EdgeInsets.only(top: 2),
            child: Icon(Icons.check_circle_rounded, color: AppColors.successText, size: 18),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 15, color: AppColors.textSecondary, height: 1.4),
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
    final isHindi = Localizations.localeOf(context).languageCode == 'hi';

    final Widget content;
    if (course.isEnrolled) {
      final started = course.progressPercent > 0;
      final progress = (course.progressPercent / 100).clamp(0.0, 1.0);
      content = Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Visible progress
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 8,
                    backgroundColor: AppColors.cardBorder,
                    valueColor: const AlwaysStoppedAnimation<Color>(AppColors.success),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                isHindi ? '${course.progressPercent}% पूरा' : '${course.progressPercent}% done',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.tintSageText),
              ),
            ],
          ),
          const SizedBox(height: 12),
          AstroPrimaryButton(
            label: started ? l10n.courseContinueLearning : (isHindi ? 'पाठ्यक्रम शुरू करें' : 'Start Course'),
            icon: Icons.play_circle_fill_rounded,
            onPressed: onContinue,
          ),
        ],
      );
    } else {
      content = Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.end,
            spacing: 8,
            runSpacing: 2,
            children: [
              Text(
                '₹${course.priceRupees}',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.primary),
              ),
              if (course.originalPriceRupees != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Text(
                    '₹${course.originalPriceRupees}',
                    style: const TextStyle(
                      fontSize: 15,
                      decoration: TextDecoration.lineThrough,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              Padding(
                padding: const EdgeInsets.only(bottom: 3),
                child: Text(
                  l10n.courseIncludesGst,
                  style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          AstroPrimaryButton(
            label: l10n.courseEnrollNow,
            isLoading: isProcessing,
            onPressed: onEnroll,
          ),
        ],
      );
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(AstroMetrics.gutter, 12, AstroMetrics.gutter, 12),
      decoration: const BoxDecoration(
        color: AppColors.cardSurface,
        border: Border(top: BorderSide(color: AppColors.separator, width: 0.5)),
      ),
      child: SafeArea(
        top: false,
        child: Center(
          heightFactor: 1,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: AstroMetrics.maxContentWidth),
            child: content,
          ),
        ),
      ),
    );
  }
}
