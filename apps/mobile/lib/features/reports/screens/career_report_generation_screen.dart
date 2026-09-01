import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_loader/astro_loader.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../models/career_report_models.dart';
import '../providers/career_report_provider.dart';
import 'career_report_overview_screen.dart';

class CareerReportGenerationScreen extends ConsumerStatefulWidget {
  final String reportId;
  final BirthProfileModel profile;

  const CareerReportGenerationScreen({
    super.key,
    required this.reportId,
    required this.profile,
  });

  @override
  ConsumerState<CareerReportGenerationScreen> createState() =>
      _CareerReportGenerationScreenState();
}

class _CareerReportGenerationScreenState
    extends ConsumerState<CareerReportGenerationScreen> {
  bool _hasNavigated = false;

  @override
  void initState() {
    super.initState();
    // Start status polling
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref
          .read(careerReportNotifierProvider.notifier)
          .startPolling(widget.reportId);
    });
  }

  void _checkNavigation(CareerReportState reportState) {
    if (_hasNavigated) return;

    if (reportState.status != null && reportState.status!.isCompleted) {
      _hasNavigated = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => CareerReportOverviewScreen(
              reportId: widget.reportId,
              profile: widget.profile,
            ),
          ),
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final reportState = ref.watch(careerReportNotifierProvider);
    _checkNavigation(reportState);

    final status = reportState.status;
    final progress = status?.progress ?? 0;
    final stageTitle = status?.humanFriendlyTitle ?? 'Preparing your report...';
    final stageDesc = status?.humanFriendlyDescription ??
        'Reading your professional patterns and birth chart details...';
    final isFailed = status?.isFailed ?? false;

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AppBar(
        title: const Text(
          'Preparing Career Report',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: AppColors.lightSurface,
        foregroundColor: AppColors.lightTextPrimary,
        elevation: 0,
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Center(
              child: isFailed
                  ? _buildFailedView(context, status)
                  : _buildProcessingView(
                      context, progress, stageTitle, stageDesc, reportState.isOffline),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildProcessingView(
    BuildContext context,
    int progress,
    String stageTitle,
    String stageDesc,
    bool isOffline,
  ) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // 1. Cosmic Loader Visual
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AppColors.lightSurface,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withOpacity(0.08),
                blurRadius: 24,
                spreadRadius: 4,
              ),
            ],
          ),
          child: const AstroLoader.inline(
            size: 64,
            isDark: false,
          ),
        ),

        const SizedBox(height: 36),

        // 2. Personalization Header
        Text(
          'Personalized for ${widget.profile.name}',
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.1,
            color: AppColors.secondary,
          ),
        ),

        const SizedBox(height: 8),

        // 3. Stage Title
        Text(
          stageTitle,
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: AppColors.lightTextPrimary,
          ),
          textAlign: TextAlign.center,
        ),

        const SizedBox(height: 12),

        // 4. Stage Description
        Text(
          stageDesc,
          style: const TextStyle(
            fontSize: 14,
            color: AppColors.lightTextSecondary,
            height: 1.4,
          ),
          textAlign: TextAlign.center,
        ),

        const SizedBox(height: 32),

        // 5. Backend Progress Bar Indicator
        Container(
          width: double.infinity,
          height: 10,
          decoration: BoxDecoration(
            color: AppColors.lightBorder,
            borderRadius: BorderRadius.circular(5),
          ),
          child: FractionallySizedBox(
            alignment: Alignment.centerLeft,
            widthFactor: (progress.clamp(5, 100)) / 100.0,
            child: Container(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.secondary, AppColors.premiumAccent],
                ),
                borderRadius: BorderRadius.circular(5),
              ),
            ),
          ),
        ),

        const SizedBox(height: 12),

        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              isOffline ? 'Offline - Waiting for connection' : 'Cosmic Engine Running...',
              style: TextStyle(
                fontSize: 12,
                color: isOffline ? AppColors.error : AppColors.lightTextMuted,
                fontWeight: FontWeight.w500,
              ),
            ),
            Text(
              '$progress%',
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildFailedView(BuildContext context, CareerReportStatusModel? status) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            color: AppColors.error.withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.error_outline_rounded,
            color: AppColors.error,
            size: 36,
          ),
        ),

        const SizedBox(height: 24),

        const Text(
          'We couldn\'t prepare your report.',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: AppColors.lightTextPrimary,
          ),
          textAlign: TextAlign.center,
        ),

        const SizedBox(height: 8),

        Text(
          status?.humanFriendlyDescription ??
              'An unexpected issue occurred while compiling your report. Please try again.',
          style: const TextStyle(
            fontSize: 14,
            color: AppColors.lightTextSecondary,
            height: 1.4,
          ),
          textAlign: TextAlign.center,
        ),

        const SizedBox(height: 32),

        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () {
              ref
                  .read(careerReportNotifierProvider.notifier)
                  .createCareerReport(
                    birthProfileId: widget.profile.id,
                    forceRegenerate: true,
                  );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            icon: const Icon(Icons.refresh_rounded, size: 18),
            label: const Text(
              'Try Again',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
            ),
          ),
        ),

        const SizedBox(height: 12),

        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text(
            'Go Back',
            style: TextStyle(
              color: AppColors.lightTextSecondary,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }
}
