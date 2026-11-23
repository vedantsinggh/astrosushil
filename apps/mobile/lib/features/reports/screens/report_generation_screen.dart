import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../../shared/widgets/astro_loader/astro_solar_system_animation.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../models/report_language.dart';
import '../models/user_report_item_model.dart';
import '../providers/reports_provider.dart';
import '../widgets/report_ui.dart';
import 'report_pdf_viewer_screen.dart';

/// Universal report generation and status tracking screen
class ReportGenerationScreen extends ConsumerStatefulWidget {
  final String reportId;
  final String reportType;
  final String reportTitle;
  final BirthProfileModel profile;
  final BirthProfileModel? partnerProfile;

  /// Language the report was bought in, when the caller knows it. The
  /// language in the server's status for this report takes precedence.
  final String? language;

  const ReportGenerationScreen({
    super.key,
    required this.reportId,
    required this.reportType,
    required this.reportTitle,
    required this.profile,
    this.partnerProfile,
    this.language,
  });

  @override
  ConsumerState<ReportGenerationScreen> createState() => _ReportGenerationScreenState();
}

class _ReportGenerationScreenState extends ConsumerState<ReportGenerationScreen> {
  bool _hasAutoNavigated = false;

  /// Language of this report: from the server's status for this report, else
  /// what the caller passed.
  String? get _reportLanguage {
    final status = ref.read(reportGenerationNotifierProvider).status;
    if (status != null && status.id == widget.reportId && status.language != null) return status.language;
    return widget.language;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(reportGenerationNotifierProvider.notifier).startPolling(widget.reportId);
    });
  }

  void _checkAutoNavigation(UserReportItemModel? status) {
    if (_hasAutoNavigated) return;

    if (status != null && status.isCompleted) {
      _hasAutoNavigated = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => ReportPdfViewerScreen(
              reportId: widget.reportId,
              reportTitle: widget.reportTitle,
              clientName: widget.partnerProfile != null
                  ? '${widget.profile.name} & ${widget.partnerProfile!.name}'
                  : widget.profile.name,
              language: _reportLanguage,
            ),
          ),
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final genState = ref.watch(reportGenerationNotifierProvider);
    final status = genState.status;
    _checkAutoNavigation(status);

    final stage = status?.stage ?? 'QUEUED';
    final progress = status?.progress ?? 0;
    final isFailed = status?.isFailed ?? false;
    final isCompleted = status?.isCompleted ?? false;

    final clientLabel =
        widget.partnerProfile != null ? '${widget.profile.name} & ${widget.partnerProfile!.name}' : widget.profile.name;

    final Widget body = isFailed
        ? ReportStatusMessage(
            icon: Icons.error_outline_rounded,
            iconColor: AppColors.error,
            title: 'We couldn\'t finish your report',
            message: status?.errorMessage ?? 'A temporary calculation timeout occurred. Please retry.',
            actionLabel: context.l10n.reportActionRetry,
            actionIcon: Icons.refresh_rounded,
            onAction: () {
              ref.read(reportGenerationNotifierProvider.notifier).startPolling(widget.reportId);
            },
          )
        : isCompleted
            ? _buildCompletedView(context, clientLabel)
            : _buildProcessingView(context, stage, progress, clientLabel);

    return AstroPage(
      title: widget.reportTitle,
      slivers: [
        if (isFailed || isCompleted)
          SliverFillRemaining(hasScrollBody: false, child: body)
        else
          AstroSliverContent(sliver: SliverToBoxAdapter(child: body)),
      ],
    );
  }

  Widget _buildProcessingView(
    BuildContext context,
    String stage,
    int progress,
    String clientLabel,
  ) {
    final statusModel = ref.read(reportGenerationNotifierProvider).status;
    final stageDesc = statusModel?.stageDescription ?? _getStageDesc(stage);
    final languageLine = reportLanguageLine(context.l10n, _reportLanguage);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AstroGradientCard(
          child: Row(
            children: [
              const AstroSolarSystemAnimation(
                size: 56,
                isDark: true,
                numOrbits: 2,
                showStars: false,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Semantics(
                  header: true,
                  liveRegion: true,
                  child: Text(
                    'Preparing your report',
                    style: AppTypography.displayMedium.copyWith(fontSize: 24, color: Colors.white),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Who the report is for
        ReportCard(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              const AstroIconSquare(icon: Icons.person_outline_rounded, tint: AstroTint.indigo),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      clientLabel,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimaryDark,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${widget.profile.dateOfBirth} • ${widget.profile.placeName}',
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppColors.textSecondaryDark,
                      ),
                    ),
                    if (languageLine != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        languageLine,
                        key: const ValueKey('report-generation-language'),
                        style: const TextStyle(
                          fontSize: 14,
                          color: AppColors.textSecondaryDark,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        ReportCard(
          child: ReportProgressPanel(
            stage: stage,
            progress: progress,
            currentDetail: stageDesc,
            progressDetail: statusModel?.progressDetail,
          ),
        ),
        const SizedBox(height: 16),
        const ReportInfoNote(
          'This usually takes a few minutes. You can leave this screen. We will keep working in the background.',
          icon: Icons.schedule_rounded,
        ),
      ],
    );
  }

  Widget _buildCompletedView(BuildContext context, String clientLabel) {
    final languageLine = reportLanguageLine(context.l10n, _reportLanguage);
    return ReportStatusMessage(
      icon: Icons.check_circle_rounded,
      iconColor: AppColors.tintSageText,
      title: 'Your report is ready',
      message: languageLine == null ? 'Made for $clientLabel.' : 'Made for $clientLabel.\n$languageLine',
      actionLabel: context.l10n.reportActionViewPdf,
      actionIcon: Icons.picture_as_pdf_rounded,
      onAction: () {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => ReportPdfViewerScreen(
              reportId: widget.reportId,
              reportTitle: widget.reportTitle,
              clientName: clientLabel,
              language: _reportLanguage,
            ),
          ),
        );
      },
    );
  }

  String _getStageDesc(String stage) {
    switch (stage.toUpperCase()) {
      case 'QUEUED':
        return 'Preparing the deterministic calculation engine.';
      case 'CALCULATING':
        return 'Calculating exact astronomical placements and house alignments.';
      case 'ANALYZING':
        return 'Evaluating classical Vedic rules, dignities, and dasha timings.';
      case 'RENDERING':
        return 'Synthesizing charts, tables, and personalized insights.';
      case 'COMPILING':
        return 'Generating print-grade vector PDF document.';
      case 'UPLOADING':
        return 'Encrypting and saving in your private library.';
      case 'COMPLETED':
        return 'Your report has been successfully compiled and is ready to view.';
      default:
        return 'Compiling your personal astrology dossier.';
    }
  }
}
