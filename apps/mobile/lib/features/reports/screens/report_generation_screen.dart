import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_gradients.dart';
import '../../../shared/widgets/astro_card.dart';
import '../../../shared/widgets/astro_loader/astro_solar_system_animation.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../models/user_report_item_model.dart';
import '../providers/reports_provider.dart';
import 'report_pdf_viewer_screen.dart';

/// Universal report generation and status tracking screen
class ReportGenerationScreen extends ConsumerStatefulWidget {
  final String reportId;
  final String reportType;
  final String reportTitle;
  final BirthProfileModel profile;
  final BirthProfileModel? partnerProfile;

  const ReportGenerationScreen({
    super.key,
    required this.reportId,
    required this.reportType,
    required this.reportTitle,
    required this.profile,
    this.partnerProfile,
  });

  @override
  ConsumerState<ReportGenerationScreen> createState() =>
      _ReportGenerationScreenState();
}

class _ReportGenerationScreenState
    extends ConsumerState<ReportGenerationScreen> {
  bool _hasAutoNavigated = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref
          .read(reportGenerationNotifierProvider.notifier)
          .startPolling(widget.reportId);
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

    final clientLabel = widget.partnerProfile != null
        ? '${widget.profile.name} & ${widget.partnerProfile!.name}'
        : widget.profile.name;

    return Scaffold(
      backgroundColor: AppColors.backgroundCream,
      appBar: AppBar(
        title: Text(
          widget.reportTitle,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        backgroundColor: AppColors.cardSurfaceWarm,
        foregroundColor: AppColors.textPrimaryDark,
        elevation: 0,
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 500),
                child: isFailed
                    ? _buildFailedView(context, status)
                    : isCompleted
                        ? _buildCompletedView(context, clientLabel)
                        : _buildProcessingView(context, stage, progress, clientLabel),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildProcessingView(
    BuildContext context,
    String stage,
    int progress,
    String clientLabel,
  ) {
    final statusModel = ref.read(reportGenerationNotifierProvider).status;
    final stageTitle = statusModel?.stageTitle ?? _getStageTitle(stage);
    final stageDesc = statusModel?.stageDescription ?? _getStageDesc(stage);

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Cosmic Hero Status Container
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: AppGradients.heroCosmic,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.cardBorderGold, width: 1.2),
            boxShadow: const [
              BoxShadow(
                color: Color(0x22121440),
                blurRadius: 18,
                offset: Offset(0, 6),
              ),
            ],
          ),
          child: Column(
            children: [
              const SizedBox(height: 8),
              const AstroSolarSystemAnimation(
                size: 80,
                isDark: true,
                numOrbits: 3,
                showStars: true,
              ),
              const SizedBox(height: 24),
              Text(
                stageTitle,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                  color: AppColors.cardSurfaceWarm,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                stageDesc,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 13.5,
                  color: AppColors.parchmentMuted,
                  height: 1.4,
                ),
              ),
              if (progress > 0) ...[
                const SizedBox(height: 20),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: progress / 100.0,
                    minHeight: 8,
                    backgroundColor: Colors.white.withValues(alpha: 0.15),
                    valueColor:
                        const AlwaysStoppedAnimation<Color>(AppColors.accentGold),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '$progress%',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors.accentGold,
                  ),
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 20),

        // Subject / Profile Metadata Card
        AstroCard(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.cardSurfaceParchment,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: const Icon(
                    Icons.person_pin_circle_rounded,
                    color: AppColors.midnightNavy,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        clientLabel,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimaryDark,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${widget.profile.dateOfBirth} • ${widget.profile.placeName}',
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: AppColors.textMutedDark,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.accentGold.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.accentGold),
                  ),
                  child: const Text(
                    'PROCESSING',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: AppColors.midnightNavy,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 20),
        const Text(
          'Calculations are running in the background. You can navigate away safely.',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 12, color: AppColors.textMutedDark),
        ),
      ],
    );
  }

  Widget _buildCompletedView(BuildContext context, String clientLabel) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.success.withValues(alpha: 0.12),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.check_circle_rounded,
            size: 64,
            color: AppColors.success,
          ),
        ),
        const SizedBox(height: 20),
        const Text(
          'Your Report is Ready!',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimaryDark,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Personalized vector PDF compiled for $clientLabel.',
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 14, color: AppColors.textMutedDark),
        ),
        const SizedBox(height: 28),
        ElevatedButton.icon(
          onPressed: () {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (_) => ReportPdfViewerScreen(
                  reportId: widget.reportId,
                  reportTitle: widget.reportTitle,
                  clientName: clientLabel,
                ),
              ),
            );
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.midnightNavy,
            foregroundColor: AppColors.cardSurfaceWarm,
            minimumSize: const Size(220, 50),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          icon: const Icon(Icons.picture_as_pdf_rounded, size: 20),
          label: Text(
            context.l10n.reportActionViewPdf,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
          ),
        ),
      ],
    );
  }

  Widget _buildFailedView(BuildContext context, UserReportItemModel? status) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.error.withValues(alpha: 0.12),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.error_outline_rounded,
            size: 64,
            color: AppColors.error,
          ),
        ),
        const SizedBox(height: 20),
        const Text(
          'Report Generation Failed',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimaryDark,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          status?.errorMessage ??
              'A temporary calculation timeout occurred. Please retry.',
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 14, color: AppColors.textMutedDark),
        ),
        const SizedBox(height: 28),
        ElevatedButton.icon(
          onPressed: () {
            ref
                .read(reportGenerationNotifierProvider.notifier)
                .startPolling(widget.reportId);
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.midnightNavy,
            foregroundColor: AppColors.cardSurfaceWarm,
            minimumSize: const Size(180, 48),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          icon: const Icon(Icons.refresh_rounded, size: 20),
          label: Text(
            context.l10n.reportActionRetry,
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ),
      ],
    );
  }

  String _getStageTitle(String stage) {
    switch (stage.toUpperCase()) {
      case 'QUEUED':
        return 'In Queue...';
      case 'CALCULATING':
        return 'Calculating coordinates...';
      case 'ANALYZING':
        return 'Analyzing astrological yogas...';
      case 'RENDERING':
        return 'Rendering visual charts...';
      case 'COMPILING':
        return 'Compiling vector PDF...';
      case 'UPLOADING':
        return 'Securing report in storage...';
      case 'COMPLETED':
        return 'Report Ready';
      case 'FAILED':
        return 'Generation Failed';
      default:
        return 'Processing Report...';
    }
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
