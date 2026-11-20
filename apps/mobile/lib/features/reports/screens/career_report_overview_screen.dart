import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../models/career_report_models.dart';
import '../providers/career_report_provider.dart';
import '../widgets/report_ui.dart';
import 'career_report_generation_screen.dart';
import 'career_report_pdf_screen.dart';

class CareerReportOverviewScreen extends ConsumerWidget {
  final String reportId;
  final BirthProfileModel profile;

  const CareerReportOverviewScreen({
    super.key,
    required this.reportId,
    required this.profile,
  });

  ExplanationContext _buildExplanationContext(CareerReportDetailModel? detail) {
    return ExplanationContext(
      feature: 'career_report',
      screenTitle: 'Career Report Dossier',
      purpose:
          'Explain the career potential, stage of progress (${detail?.stage ?? "READY"}), and vocational dossier for ${profile.name}.',
      astrologyData: {
        'reportId': reportId,
        'reportStatus': detail?.status ?? 'UNKNOWN',
        'reportStage': detail?.stage ?? 'UNKNOWN',
        'reportVersion': detail?.reportVersion ?? '',
        'userName': profile.name,
        'pageCount': detail?.pageCount,
        'fileSize': detail?.fileSize,
      },
      importantValues: {
        'reportStatus': detail?.status ?? 'UNKNOWN',
        'reportStage': detail?.stage ?? 'UNKNOWN',
      },
      userProfileContext: {
        'name': profile.name,
      },
    );
  }

  void _showRegenerateConfirmation(BuildContext context, WidgetRef ref) {
    showAstroConfirm(
      context: context,
      title: 'Regenerate Career Report?',
      message:
          'This will create a fresh interpretation using your current birth profile. Your existing completed report remains available until generation finishes.',
      confirmLabel: 'Regenerate',
    ).then((confirmed) async {
      if (!confirmed) return;
      final newReportId = await ref.read(careerReportNotifierProvider.notifier).regenerateCareerReport(reportId);

      if (newReportId != null && context.mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => CareerReportGenerationScreen(
              reportId: newReportId,
              profile: profile,
            ),
          ),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportState = ref.watch(careerReportNotifierProvider);
    final detail = reportState.detail;

    void openPdf() {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => CareerReportPdfScreen(
            reportId: reportId,
            clientName: profile.name,
          ),
        ),
      );
    }

    return AstroPage(
      title: 'Career Report',
      bottomBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.cardSurfaceWarm,
          border: Border(top: BorderSide(color: AppColors.cardBorder)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: Center(
              heightFactor: 1,
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 640),
                child: ReportPrimaryButton(
                  label: 'View Full PDF Report',
                  icon: Icons.picture_as_pdf_rounded,
                  onPressed: openPdf,
                ),
              ),
            ),
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Who the report is for
          AstroGradientCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.check_circle_rounded, size: 22, color: AppColors.gold),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Your report is ready',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.gold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Text(
                  'Career & Professional Life',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textInverseSecondary),
                ),
                const SizedBox(height: 2),
                Semantics(
                  header: true,
                  child: Text(profile.name, style: AppTypography.displayMedium.copyWith(color: Colors.white)),
                ),
                const SizedBox(height: 6),
                Text(
                  'Born: ${profile.dateOfBirth} at ${profile.timeOfBirth}',
                  style: const TextStyle(fontSize: 16, color: AppColors.textInverseSecondary),
                ),
                if (profile.placeName.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    profile.placeName,
                    style: const TextStyle(fontSize: 15, color: AppColors.textInverseSecondary),
                  ),
                ],
                const SizedBox(height: 8),
                Text(
                  detail?.reportVersion != null ? 'Version ${detail!.reportVersion}' : 'Version 1.0.0',
                  style: const TextStyle(fontSize: 14, color: AppColors.textInverseSecondary),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Sushil Sir Explainer Button
          SushilExplainerButton(
            contextBuilder: () => _buildExplanationContext(detail),
            poseAsset: AppAssets.sushilGuiding,
          ),

          const SizedBox(height: 16),

          // 2. Secondary actions: Download, Share, Regenerate (all labelled)
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _CareerActionChip(
                icon: Icons.download_rounded,
                label: 'Download',
                onPressed: () {
                  ref.read(careerReportNotifierProvider.notifier).downloadAndCachePdf(reportId);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Report PDF cached for offline viewing.'),
                    ),
                  );
                },
              ),
              _CareerActionChip(
                icon: Icons.ios_share_rounded,
                label: 'Share',
                onPressed: () {
                  ref.read(careerReportNotifierProvider.notifier).shareReport(reportId, profile.name);
                },
              ),
              _CareerActionChip(
                icon: Icons.refresh_rounded,
                label: 'Regenerate',
                onPressed: () => _showRegenerateConfirmation(context, ref),
              ),
            ],
          ),

          const SizedBox(height: 28),

          // 3. What's inside the report
          const ReportHeading('What\'s inside'),
          const SizedBox(height: 4),
          const Text(
            'Open the full PDF to read each section.',
            style: TextStyle(fontSize: 15, color: AppColors.lightTextSecondary),
          ),
          const SizedBox(height: 12),

          const AstroGroupedSection(
            children: [
              AstroListRow(
                icon: Icons.fingerprint_rounded,
                tint: AstroTint.indigo,
                title: 'Career DNA',
                subtitle: '10th House, Lagna & Core Vocational Signature',
              ),
              AstroListRow(
                icon: Icons.star_border_rounded,
                tint: AstroTint.amber,
                title: 'Professional Strengths',
                subtitle: 'Key Talents, Planetary Forces & Workplace Dominance',
              ),
              AstroListRow(
                icon: Icons.shield_outlined,
                tint: AstroTint.rose,
                title: 'Career Challenges & Lessons',
                subtitle: 'Saturn Obstacles, Karmic Blocks & Astrological Remedies',
              ),
              AstroListRow(
                icon: Icons.explore_outlined,
                tint: AstroTint.sky,
                title: 'Ideal Career Directions',
                subtitle: 'Recommended Industries, Roles & Growth Avenues',
              ),
              AstroListRow(
                icon: Icons.workspace_premium_rounded,
                tint: AstroTint.violet,
                title: 'Leadership & Entrepreneurship',
                subtitle: 'Sun & Mars Executive Power and Business Potential',
              ),
              AstroListRow(
                icon: Icons.access_time_rounded,
                tint: AstroTint.coral,
                title: 'Career Timing & Periods',
                subtitle: 'Dasha Shifts, Major Transitions & Favorable Windows',
              ),
              AstroListRow(
                icon: Icons.check_circle_outline_rounded,
                tint: AstroTint.sage,
                title: 'Practical Recommendations',
                subtitle: 'Strategic Action Steps & Professional Guidance',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CareerActionChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onPressed;

  const _CareerActionChip({required this.icon, required this.label, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return AstroSecondaryButton(
      label: label,
      icon: icon,
      expand: false,
      onPressed: onPressed,
    );
  }
}
