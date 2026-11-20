import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../../shared/widgets/astro_loader/astro_loader.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../models/career_report_models.dart';
import '../providers/career_report_provider.dart';
import '../widgets/report_ui.dart';
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
  ConsumerState<CareerReportGenerationScreen> createState() => _CareerReportGenerationScreenState();
}

class _CareerReportGenerationScreenState extends ConsumerState<CareerReportGenerationScreen> {
  bool _hasNavigated = false;

  @override
  void initState() {
    super.initState();
    // Start status polling
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(careerReportNotifierProvider.notifier).startPolling(widget.reportId);
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
    final stage = status?.stage ?? 'QUEUED';
    final stageDesc = status?.humanFriendlyTitle ?? 'Preparing your report...';
    final progressDetail = status?.progressDetail;
    final isFailed = status?.isFailed ?? false;

    return AstroPage(
      title: 'Career Report',
      slivers: [
        if (isFailed)
          SliverFillRemaining(hasScrollBody: false, child: _buildFailedView(context, status))
        else
          AstroSliverContent(
            sliver: SliverToBoxAdapter(
              child: _buildProcessingView(context, stage, progress, stageDesc, reportState.isOffline, progressDetail),
            ),
          ),
      ],
    );
  }

  Widget _buildProcessingView(
    BuildContext context,
    String stage,
    int progress,
    String stageDesc,
    bool isOffline, [
    String? progressDetail,
  ]) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AstroGradientCard(
          child: Row(
            children: [
              const AstroLoader.inline(size: 48, isDark: true),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Semantics(
                      header: true,
                      liveRegion: true,
                      child: Text(
                        'Preparing your career report',
                        style: AppTypography.displayMedium.copyWith(fontSize: 24, color: Colors.white),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Personalized for ${widget.profile.name}',
                      style: const TextStyle(fontSize: 16, color: AppColors.textInverseSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        ReportCard(
          child: ReportProgressPanel(
            stage: stage,
            progress: progress,
            currentDetail: stageDesc,
            progressDetail: progressDetail,
          ),
        ),
        const SizedBox(height: 16),
        if (isOffline)
          const ReportInfoNote(
            'You are offline. We will continue as soon as you are back online.',
            icon: Icons.wifi_off_rounded,
            color: kReportErrorText,
          )
        else
          const ReportInfoNote(
            'This usually takes a few minutes. You can leave this screen. We will keep working in the background.',
            icon: Icons.schedule_rounded,
          ),
      ],
    );
  }

  Widget _buildFailedView(BuildContext context, CareerReportStatusModel? status) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ReportStatusMessage(
                icon: Icons.error_outline_rounded,
                iconColor: AppColors.error,
                title: 'We couldn\'t prepare your report.',
                message: status?.humanFriendlyDescription ??
                    'An unexpected issue occurred while compiling your report. Please try again.',
                actionLabel: 'Try Again',
                actionIcon: Icons.refresh_rounded,
                onAction: () {
                  ref.read(careerReportNotifierProvider.notifier).createCareerReport(
                        birthProfileId: widget.profile.id,
                        forceRegenerate: true,
                      );
                },
              ),
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.lightTextSecondary,
                  minimumSize: const Size(120, 48),
                  textStyle: const TextStyle(
                      fontFamily: AppTypography.bodyFamily,
                      fontFamilyFallback: AppTypography.bodyFontFamilies,
                      fontSize: 16,
                      fontWeight: FontWeight.w600),
                ),
                child: const Text('Go Back'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
