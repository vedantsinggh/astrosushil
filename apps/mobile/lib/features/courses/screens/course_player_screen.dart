import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../models/course_models.dart';
import '../providers/courses_provider.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';

/// Player screen for Course Lesson playback with progress tracking and LMS integration
class CoursePlayerScreen extends ConsumerStatefulWidget {
  final String lessonId;

  const CoursePlayerScreen({
    super.key,
    required this.lessonId,
  });

  @override
  ConsumerState<CoursePlayerScreen> createState() => _CoursePlayerScreenState();
}

class _CoursePlayerScreenState extends ConsumerState<CoursePlayerScreen>
    with WidgetsBindingObserver {
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
      _currentSeconds = playbackData.lesson.durationSeconds > 0
          ? (playbackData.lesson.durationSeconds ~/ 4) // resume position
          : 0;
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
        // Auto-save progress every 15 seconds
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

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          playbackAsync.valueOrNull?.lesson.courseTitle ?? 'Lesson Player',
          style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
        ),
        actions: [
          playbackAsync.maybeWhen(
            data: (playbackData) => Padding(
              padding: const EdgeInsets.only(right: 8),
              child: SushilExplainerButton(
                isCompact: true,
                label: langCode == 'hi' ? 'पाठ समझें' : 'Explain lesson',
                contextData: ExplanationContext(
                  feature: 'course_lesson',
                  screenTitle: playbackData.lesson.getLocalizedTitle(langCode),
                  data: {
                    'lessonId': playbackData.lesson.id,
                    'courseTitle': playbackData.lesson.courseTitle,
                    'sectionTitle': playbackData.lesson.sectionTitle,
                    'lessonTitle': playbackData.lesson.getLocalizedTitle(langCode),
                    'description': playbackData.lesson.description,
                  },
                ),
              ),
            ),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      body: playbackAsync.when(
        loading: () => const LoadingIndicator(message: 'Preparing secure lesson playback...'),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.videocam_off_rounded, size: 54, color: AppColors.error),
                const SizedBox(height: 14),
                Text(
                  err.toString(),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                ),
                const SizedBox(height: 18),
                ElevatedButton(
                  onPressed: () => ref.refresh(lessonPlaybackProvider(widget.lessonId)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.premiumAccent,
                    foregroundColor: AppColors.primary,
                  ),
                  child: const Text('Retry Playback'),
                ),
              ],
            ),
          ),
        ),
        data: (playbackData) {
          _initPlayerState(playbackData);
          final lesson = playbackData.lesson;

          return Column(
            children: [
              // Media Player Surface Area
              Container(
                height: 230,
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

              // Lesson Details & Action Controls
              Expanded(
                child: Container(
                  color: AppColors.lightBackground,
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      // Section Header Tag
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.secondary.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              lesson.sectionTitle ?? 'Curriculum',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: AppColors.secondary,
                              ),
                            ),
                          ),
                          if (lesson.isFreePreview) ...[
                            const SizedBox(width: 8),
                            Container(
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
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Lesson Title
                      Text(
                        lesson.getLocalizedTitle(langCode),
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppColors.lightTextPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),

                      // Description
                      if (lesson.description != null && lesson.description!.isNotEmpty) ...[
                        Text(
                          lesson.description!,
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppColors.lightTextSecondary,
                            height: 1.5,
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Sushil Sir Contextual Lesson Explainer
                      SushilExplainerButton(
                        label: langCode == 'hi'
                            ? 'सुशील सर से यह पाठ समझें'
                            : 'Let Sushil Sir explain this lesson',
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
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.lightBorder),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _isCompleted
                                      ? 'Completed Lesson'
                                      : 'Mark as Finished',
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.lightTextPrimary,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  _isCompleted
                                      ? 'Tracked in your course progress'
                                      : 'Updates your masterclass completion rate',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.lightTextMuted,
                                  ),
                                ),
                              ],
                            ),
                            ElevatedButton.icon(
                              onPressed: _markCompleted,
                              icon: Icon(
                                _isCompleted ? Icons.check_circle_rounded : Icons.check_rounded,
                                size: 18,
                              ),
                              label: Text(_isCompleted ? 'Done' : 'Complete'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor:
                                    _isCompleted ? AppColors.success : AppColors.primary,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Bottom Navigation Bar (Prev / Next Lesson)
              Container(
                color: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                child: Row(
                  children: [
                    if (playbackData.prevLessonId != null)
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            Navigator.of(context).pushReplacement(
                              MaterialPageRoute(
                                builder: (_) =>
                                    CoursePlayerScreen(lessonId: playbackData.prevLessonId!),
                              ),
                            );
                          },
                          icon: const Icon(Icons.arrow_back_rounded, size: 16),
                          label: Text(
                            l10n.coursePreviousLesson,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.lightTextPrimary,
                            side: const BorderSide(color: AppColors.lightBorder),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      )
                    else
                      const Spacer(),
                    const SizedBox(width: 12),
                    if (playbackData.nextLessonId != null)
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.of(context).pushReplacement(
                              MaterialPageRoute(
                                builder: (_) =>
                                    CoursePlayerScreen(lessonId: playbackData.nextLessonId!),
                              ),
                            );
                          },
                          icon: const Icon(Icons.arrow_forward_rounded, size: 16),
                          label: Text(
                            l10n.courseNextLesson,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
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
        // Simulated video background surface
        Container(
          color: Colors.black,
          alignment: Alignment.center,
          child: Opacity(
            opacity: 0.15,
            child: Image.asset(
              'assets/images/vedic_constellation.png',
              errorBuilder: (_, __, ___) => const Icon(
                Icons.auto_stories,
                size: 80,
                color: Colors.white30,
              ),
            ),
          ),
        ),

        // Centered Play/Pause & Seek Controls
        Center(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                onPressed: onSeekBack,
                icon: const Icon(Icons.replay_10_rounded, color: Colors.white, size: 36),
              ),
              const SizedBox(width: 16),
              GestureDetector(
                onTap: onPlayPause,
                child: Container(
                  width: 60,
                  height: 60,
                  decoration: const BoxDecoration(
                    color: AppColors.premiumAccent,
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
              ),
            ],
          ),
        ),

        // Speed Pill
        Positioned(
          top: 12,
          right: 12,
          child: GestureDetector(
            onTap: onSpeedTap,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '${playbackSpeed}x',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
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
                colors: [Colors.transparent, Colors.black.withOpacity(0.8)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    thumbColor: AppColors.premiumAccent,
                    activeTrackColor: AppColors.premiumAccent,
                    inactiveTrackColor: Colors.white30,
                    trackHeight: 3,
                    thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
                  ),
                  child: Slider(
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
      padding: const EdgeInsets.all(20),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.tertiary, AppColors.background],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.lock_rounded,
            color: AppColors.premiumAccent,
            size: 38,
          ),
          const SizedBox(height: 10),
          const Text(
            'Official Masterclass Protected Stream',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 15,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            unavailableNotice,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 12,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 14),
          if (platformUrl != null && platformUrl!.isNotEmpty)
            ElevatedButton.icon(
              onPressed: onOpenPortal,
              icon: const Icon(Icons.open_in_new_rounded, size: 16),
              label: const Text('Open in Learning Portal'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.premiumAccent,
                foregroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
