import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../../shared/assets/app_assets.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../models/career_report_models.dart';
import '../providers/career_report_provider.dart';
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
      purpose: 'Explain the career potential, stage of progress (${detail?.stage ?? "READY"}), and vocational dossier for ${profile.name}.',
      astrologyData: {
        'reportId': reportId,
        'reportStatus': detail?.status ?? 'COMPLETED',
        'reportStage': detail?.stage ?? 'COMPLETED',
        'reportVersion': detail?.reportVersion ?? '1.0.0',
        'userName': profile.name,
        'pageCount': detail?.pageCount,
        'fileSize': detail?.fileSize,
      },
      importantValues: {
        'reportStatus': detail?.status ?? 'COMPLETED',
        'reportStage': detail?.stage ?? 'COMPLETED',
      },
      userProfileContext: {
        'name': profile.name,
      },
    );
  }

  void _showRegenerateConfirmation(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.lightSurface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Regenerate Career Report?',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: AppColors.lightTextPrimary,
          ),
        ),
        content: const Text(
          'This will create a fresh interpretation using your current birth profile. Your existing completed report remains available until generation finishes.',
          style: TextStyle(
            fontSize: 14,
            color: AppColors.lightTextSecondary,
            height: 1.4,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              final newReportId = await ref
                  .read(careerReportNotifierProvider.notifier)
                  .regenerateCareerReport(reportId);

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
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text('Regenerate'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportState = ref.watch(careerReportNotifierProvider);
    final detail = reportState.detail;

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AstroAppBar(
        title: 'Career & Professional Life',
        actions: [
          IconButton(
            icon: const Icon(Icons.share_rounded, color: AppColors.primary),
            tooltip: 'Share Report',
            onPressed: () {
              ref
                  .read(careerReportNotifierProvider.notifier)
                  .shareReport(reportId, profile.name);
            },
          ),
        ],
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20.0),
            physics: const BouncingScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Personalization Header Box
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.15),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.premiumAccent.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              'VERIFIED DOSSIER',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1.2,
                                color: AppColors.premiumAccent,
                              ),
                            ),
                          ),
                          const Spacer(),
                          Text(
                            detail?.reportVersion != null
                                ? 'v${detail!.reportVersion}'
                                : 'v1.0.0',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.white.withValues(alpha: 0.7),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 14),

                      Text(
                        profile.name,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),

                      const SizedBox(height: 4),

                      Text(
                        'Born: ${profile.dateOfBirth} at ${profile.timeOfBirth}',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.white.withValues(alpha: 0.85),
                        ),
                      ),

                      if (profile.placeName.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          profile.placeName,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.white.withValues(alpha: 0.7),
                          ),
                        ),
                      ],
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

                // 2. Primary CTA: View Full PDF
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => CareerReportPdfScreen(
                            reportId: reportId,
                            clientName: profile.name,
                          ),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      elevation: 4,
                    ),
                    icon: const Icon(Icons.picture_as_pdf_rounded, size: 22),
                    label: const Text(
                      'View Full PDF Report',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),

                const SizedBox(height: 12),

                // 3. Secondary CTAs: Download & Share & Regenerate
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          ref
                              .read(careerReportNotifierProvider.notifier)
                              .downloadAndCachePdf(reportId);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Report PDF cached for offline viewing.'),
                            ),
                          );
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primary,
                          side: const BorderSide(color: AppColors.primary),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        icon: const Icon(Icons.download_rounded, size: 18),
                        label: const Text(
                          'Download',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _showRegenerateConfirmation(context, ref),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.secondary,
                          side: const BorderSide(color: AppColors.secondary),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        icon: const Icon(Icons.refresh_rounded, size: 18),
                        label: const Text(
                          'Regenerate',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 28),

                // 4. Report Overview Navigation Sections
                const Text(
                  'REPORT SECTIONS OVERVIEW',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.1,
                    color: AppColors.lightTextMuted,
                  ),
                ),

                const SizedBox(height: 14),

                _buildSectionOverviewTile(
                  icon: Icons.fingerprint_rounded,
                  title: 'Career DNA',
                  subtitle: '10th House, Lagna & Core Vocational Signature',
                  accentColor: AppColors.primary,
                ),

                _buildSectionOverviewTile(
                  icon: Icons.star_border_rounded,
                  title: 'Professional Strengths',
                  subtitle: 'Key Talents, Planetary Forces & Workplace Dominance',
                  accentColor: AppColors.secondary,
                ),

                _buildSectionOverviewTile(
                  icon: Icons.shield_outlined,
                  title: 'Career Challenges & Lessons',
                  subtitle: 'Saturn Obstacles, Karmic Blocks & Astrological Remedies',
                  accentColor: AppColors.supportingAccent,
                ),

                _buildSectionOverviewTile(
                  icon: Icons.explore_outlined,
                  title: 'Ideal Career Directions',
                  subtitle: 'Recommended Industries, Roles & Growth Avenues',
                  accentColor: Colors.teal,
                ),

                _buildSectionOverviewTile(
                  icon: Icons.workspace_premium_rounded,
                  title: 'Leadership & Entrepreneurship',
                  subtitle: 'Sun & Mars Executive Power and Business Potential',
                  accentColor: AppColors.premiumAccent,
                ),

                _buildSectionOverviewTile(
                  icon: Icons.access_time_rounded,
                  title: 'Career Timing & Periods',
                  subtitle: 'Dasha Shifts, Major Transitions & Favorable Windows',
                  accentColor: Colors.indigo,
                ),

                _buildSectionOverviewTile(
                  icon: Icons.check_circle_outline_rounded,
                  title: 'Practical Recommendations',
                  subtitle: 'Strategic Action Steps & Professional Guidance',
                  accentColor: Colors.green.shade700,
                ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionOverviewTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color accentColor,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.lightSurface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.lightBorder),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: accentColor, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.lightTextSecondary,
                  ),
                ),
              ],
            ),
          ),
          const Icon(
            Icons.chevron_right_rounded,
            color: AppColors.lightTextMuted,
            size: 20,
          ),
        ],
      ),
    );
  }
}
