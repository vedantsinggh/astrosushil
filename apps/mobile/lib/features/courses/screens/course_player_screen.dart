import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../models/course_models.dart';
import '../providers/courses_provider.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';

/// Player screen for Course Lesson playback with progress tracking and LMS integration
/// Redesigned in Phase 7 according to the Astro Sushil Design System.
class CoursePlayerScreen extends ConsumerStatefulWidget {
  final String lessonId;

  const CoursePlayerScreen({
    super.key,
    required this.lessonId,
  });

  @override
  ConsumerState<CoursePlayerScreen> createState() => _CoursePlayerScreenState();
}

class _CoursePlayerScreenState extends ConsumerState<CoursePlayerScreen> with WidgetsBindingObserver {
  bool _isPlaying = false;
  int _currentSeconds = 0;
  int _totalDurationSeconds = 0;
  double _playbackSpeed = 1.0;
  bool _isCompleted = false;
  Timer? _progressTicker;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused || state == AppLifecycleState.inactive) {
      _pauseAndPersistProgress();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _progressTicker?.cancel();
    _saveProgressQuietly();
    super.dispose();
  }

  void _initPlayerState(LessonPlaybackModel playbackData) {
    if (_totalDurationSeconds == 0) {
      _totalDurationSeconds = playbackData.lesson.durationSeconds > 0
          ? playbackData.lesson.durationSeconds
          : (playbackData.lesson.durationMinutes * 60);
      _currentSeconds = playbackData.lesson.durationSeconds > 0 ? (playbackData.lesson.durationSeconds ~/ 4) : 0;
      _isCompleted = playbackData.lesson.isCompleted;
    }
  }

  void _togglePlayPause() {
    setState(() {
      _isPlaying = !_isPlaying;
    });

    if (_isPlaying) {
      _startTicker();
    } else {
      _progressTicker?.cancel();
      _saveProgressQuietly();
    }
  }

  void _startTicker() {
    _progressTicker?.cancel();
    _progressTicker = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_currentSeconds < _totalDurationSeconds) {
        setState(() {
          _currentSeconds++;
        });
        if (_currentSeconds % 15 == 0) {
          _saveProgressQuietly();
        }
      } else {
        timer.cancel();
        setState(() {
          _isPlaying = false;
          _isCompleted = true;
        });
        _markCompleted();
      }
    });
  }

  void _seekBy(int deltaSeconds) {
    setState(() {
      _currentSeconds = (_currentSeconds + deltaSeconds).clamp(0, _totalDurationSeconds);
    });
    _saveProgressQuietly();
  }

  void _seekTo(double value) {
    setState(() {
      _currentSeconds = value.toInt().clamp(0, _totalDurationSeconds);
    });
    _saveProgressQuietly();
  }

  void _cycleSpeed() {
    setState(() {
      if (_playbackSpeed == 1.0) {
        _playbackSpeed = 1.25;
      } else if (_playbackSpeed == 1.25) {
        _playbackSpeed = 1.5;
      } else if (_playbackSpeed == 1.5) {
        _playbackSpeed = 2.0;
      } else {
        _playbackSpeed = 1.0;
      }
    });
  }

  void _pauseAndPersistProgress() {
    if (_isPlaying) {
      setState(() => _isPlaying = false);
      _progressTicker?.cancel();
    }
    _saveProgressQuietly();
  }

  Future<void> _saveProgressQuietly() async {
    try {
      final service = ref.read(coursesServiceProvider);
      await service.updateLessonProgress(
        lessonId: widget.lessonId,
        watchedSeconds: _currentSeconds,
        isCompleted: _isCompleted,
      );
    } catch (_) {
      // Background auto-save failures are non-fatal
    }
  }

  Future<void> _markCompleted() async {
    setState(() => _isCompleted = true);
    try {
      final service = ref.read(coursesServiceProvider);
      await service.updateLessonProgress(
        lessonId: widget.lessonId,
        watchedSeconds: _totalDurationSeconds,
        isCompleted: true,
      );
      if (mounted) {
        ref.invalidate(myLearningProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Lesson marked as completed! Course progress updated.'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update progress: $e')),
        );
      }
    }
  }

  Future<void> _launchExternalPortal(String? url) async {
    if (url == null || url.isEmpty) return;
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open learning portal browser')),
        );
      }
    }
  }

  String _formatTime(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final locale = Localizations.localeOf(context);
    final langCode = locale.languageCode;
    final playbackAsync = ref.watch(lessonPlaybackProvider(widget.lessonId));

    final playback = playbackAsync.valueOrNull;

    return AstroPage(
      title: playback?.lesson.courseTitle ?? 'Lesson Player',
      subtitle: playback?.lesson.sectionTitle,
      child: playbackAsync.when(
        loading: () =>
            const SizedBox(height: 320, child: AstroStateView.loading(message: 'Preparing secure lesson playback...')),
        error: (err, _) => AstroStateView.error(
          compact: true,
          icon: Icons.videocam_off_rounded,
          message: err.toString(),
          retryLabel: 'Retry Playback',
          onRetry: () => ref.refresh(lessonPlaybackProvider(widget.lessonId)),
        ),
        data: (playbackData) {
          _initPlayerState(playbackData);
          final lesson = playbackData.lesson;

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Media player: a rounded black "screen" with a soft lift.
              DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(AstroMetrics.cardRadius),
                  boxShadow: AstroShadows.hero,
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(AstroMetrics.cardRadius),
                  child: Container(
                    // Keep room for the lesson controls in landscape / short screens.
                    height:
                        MediaQuery.sizeOf(context).height * 0.45 < 235 ? MediaQuery.sizeOf(context).height * 0.45 : 235,
                    width: double.infinity,
                    color: Colors.black,
                    child: playbackData.isAvailable
                        ? _DirectVideoPlayerSurface(
                            title: lesson.getLocalizedTitle(langCode),
                            isPlaying: _isPlaying,
                            currentSeconds: _currentSeconds,
                            totalDurationSeconds: _totalDurationSeconds,
                            playbackSpeed: _playbackSpeed,
                            onPlayPause: _togglePlayPause,
                            onSeekBack: () => _seekBy(-10),
                            onSeekForward: () => _seekBy(10),
                            onSliderChanged: _seekTo,
                            onSpeedTap: _cycleSpeed,
                            formatTime: _formatTime,
                          )
                        : _ProtectedStreamSurface(
                            unavailableNotice: playbackData.unavailableNotice ??
                                'Protected stream is active on the official Astro Sushil Learning Cloud.',
                            platformUrl: playbackData.platformUrl,
                            onOpenPortal: () => _launchExternalPortal(playbackData.platformUrl),
                          ),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // 2. Lesson details & action controls
              ...[
                // The section name is the page subtitle; only the preview tag stays here.
                if (lesson.isFreePreview) ...[
                  Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                      decoration: BoxDecoration(
                        color: AstroTint.amber.background,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        l10n.courseFreePreview,
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AstroTint.amber.foreground),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],

                // Lesson Title
                Semantics(
                  header: true,
                  child: Text(
                    lesson.getLocalizedTitle(langCode),
                    style: AppTypography.headlineLarge.copyWith(fontSize: 23, height: 1.25),
                  ),
                ),
                const SizedBox(height: 8),

                // Description
                if (lesson.description != null && lesson.description!.isNotEmpty) ...[
                  Text(
                    lesson.description!,
                    style: const TextStyle(
                      fontSize: 16,
                      color: AppColors.lightTextSecondary,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Sushil Sir Contextual Lesson Explainer
                SushilExplainerButton(
                  label: langCode == 'hi' ? 'सुशील सर से यह पाठ समझें' : 'Let Sushil Sir explain this lesson',
                  contextData: ExplanationContext(
                    feature: 'course_lesson',
                    screenTitle: lesson.getLocalizedTitle(langCode),
                    data: {
                      'lessonId': lesson.id,
                      'courseTitle': lesson.courseTitle,
                      'sectionTitle': lesson.sectionTitle,
                      'lessonTitle': lesson.getLocalizedTitle(langCode),
                      'description': lesson.description,
                    },
                  ),
                ),
                const SizedBox(height: 16),

                // Completion Toggle Card
                AstroSurfaceCard(
                  borderColor: _isCompleted ? AppColors.successBorder : null,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        _isCompleted ? 'Completed Lesson' : 'Mark as Finished',
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                          color: AppColors.lightTextPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _isCompleted ? 'Tracked in your course progress' : 'Updates your masterclass completion rate',
                        style: const TextStyle(
                          fontSize: 14,
                          color: AppColors.lightTextSecondary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton.icon(
                        onPressed: _markCompleted,
                        icon: Icon(
                          _isCompleted ? Icons.check_circle_rounded : Icons.check_rounded,
                          size: 22,
                        ),
                        label: Text(_isCompleted ? 'Done' : 'Complete'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _isCompleted ? AppColors.successBg : AppColors.cardSurface,
                          foregroundColor: _isCompleted ? AppColors.tintSageText : AppColors.primary,
                          elevation: 0,
                          side: BorderSide(
                            color: _isCompleted ? AppColors.successBorder : AppColors.primary,
                            width: 1.2,
                          ),
                          minimumSize: const Size.fromHeight(52),
                          textStyle: AppTypography.labelLarge.copyWith(fontSize: 16, fontWeight: FontWeight.bold),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Lesson Navigation Controls (Next & Previous)
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    if (playbackData.nextLessonId != null)
                      AstroPrimaryButton(
                        label: l10n.courseNextLesson,
                        icon: Icons.arrow_forward_rounded,
                        onPressed: () {
                          Navigator.of(context).pushReplacement(
                            MaterialPageRoute(
                              builder: (_) => CoursePlayerScreen(lessonId: playbackData.nextLessonId!),
                            ),
                          );
                        },
                      ),
                    if (playbackData.prevLessonId != null)
                      AstroSecondaryButton(
                        label: l10n.coursePreviousLesson,
                        icon: Icons.arrow_back_rounded,
                        variant: AstroSecondaryVariant.outlined,
                        onPressed: () {
                          Navigator.of(context).pushReplacement(
                            MaterialPageRoute(
                              builder: (_) => CoursePlayerScreen(lessonId: playbackData.prevLessonId!),
                            ),
                          );
                        },
                      ),
                  ],
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _DirectVideoPlayerSurface extends StatelessWidget {
  final String title;
  final bool isPlaying;
  final int currentSeconds;
  final int totalDurationSeconds;
  final double playbackSpeed;
  final VoidCallback onPlayPause;
  final VoidCallback onSeekBack;
  final VoidCallback onSeekForward;
  final ValueChanged<double> onSliderChanged;
  final VoidCallback onSpeedTap;
  final String Function(int) formatTime;

  const _DirectVideoPlayerSurface({
    required this.title,
    required this.isPlaying,
    required this.currentSeconds,
    required this.totalDurationSeconds,
    required this.playbackSpeed,
    required this.onPlayPause,
    required this.onSeekBack,
    required this.onSeekForward,
    required this.onSliderChanged,
    required this.onSpeedTap,
    required this.formatTime,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Simulated video background graphic
        Container(
          color: const Color(0xFF0A0B1A),
          child: Center(
            child: Icon(
              Icons.ondemand_video_rounded,
              size: 80,
              color: Colors.white.withValues(alpha: 0.12),
            ),
          ),
        ),

        // Center Controls Overlay
        Center(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                onPressed: onSeekBack,
                icon: const Icon(Icons.replay_10_rounded, color: Colors.white, size: 36),
                tooltip: 'Rewind 10s',
              ),
              const SizedBox(width: 16),
              GestureDetector(
                onTap: onPlayPause,
                child: Container(
                  width: 64,
                  height: 64,
                  decoration: const BoxDecoration(
                    color: AppColors.gold,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                    color: AppColors.primary,
                    size: 40,
                  ),
                ),
              ),
              const SizedBox(width: 16),
              IconButton(
                onPressed: onSeekForward,
                icon: const Icon(Icons.forward_10_rounded, color: Colors.white, size: 36),
                tooltip: 'Forward 10s',
              ),
            ],
          ),
        ),

        // Speed Pill (>= 48dp touch target, labelled for screen readers)
        Positioned(
          top: 4,
          right: 4,
          child: Semantics(
            button: true,
            label: 'Playback speed ${playbackSpeed}x',
            excludeSemantics: true,
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: onSpeedTap,
                borderRadius: BorderRadius.circular(12),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minWidth: 56, minHeight: 48),
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white24,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${playbackSpeed}x',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),

        // Timeline Scrubber & Duration at Bottom
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.transparent, Colors.black.withValues(alpha: 0.85)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    thumbColor: AppColors.gold,
                    activeTrackColor: AppColors.gold,
                    inactiveTrackColor: Colors.white30,
                    trackHeight: 3,
                    thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
                  ),
                  child: Slider.adaptive(
                    value: currentSeconds.toDouble().clamp(0.0, totalDurationSeconds.toDouble()),
                    min: 0.0,
                    max: totalDurationSeconds > 0 ? totalDurationSeconds.toDouble() : 1.0,
                    onChanged: onSliderChanged,
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        formatTime(currentSeconds),
                        style: const TextStyle(color: Colors.white70, fontSize: 11),
                      ),
                      Text(
                        formatTime(totalDurationSeconds),
                        style: const TextStyle(color: Colors.white70, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ProtectedStreamSurface extends StatelessWidget {
  final String unavailableNotice;
  final String? platformUrl;
  final VoidCallback onOpenPortal;

  const _ProtectedStreamSurface({
    required this.unavailableNotice,
    required this.platformUrl,
    required this.onOpenPortal,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: AppGradients.heroCosmic,
      ),
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          physics: const BouncingScrollPhysics(),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.gold.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.lock_rounded,
                  color: AppColors.gold,
                  size: 26,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Official Masterclass Protected Stream',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                unavailableNotice,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.8),
                  fontSize: 11,
                  height: 1.3,
                ),
              ),
              const SizedBox(height: 10),
              if (platformUrl != null && platformUrl!.isNotEmpty)
                ElevatedButton.icon(
                  onPressed: onOpenPortal,
                  icon: const Icon(Icons.open_in_new_rounded, size: 16),
                  label: const Text('Open in Learning Portal'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.gold,
                    foregroundColor: AppColors.primary,
                    minimumSize: const Size(0, 48),
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
