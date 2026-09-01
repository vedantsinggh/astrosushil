import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/auth_required_gate.dart';
import '../../core/auth/feature_access_service.dart';
import '../../features/birth_profile/models/birth_profile_model.dart';
import '../../features/birth_profile/providers/birth_profile_provider.dart';
import '../../features/birth_profile/screens/create_birth_profile_screen.dart';
import '../../features/reports/providers/career_report_provider.dart';
import '../../features/reports/screens/career_report_generation_screen.dart';
import '../../features/reports/screens/career_report_overview_screen.dart';
import '../../features/reports/screens/career_report_pdf_screen.dart';
import '../../features/reports/screens/report_view_screen.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/widgets/subtle_celestial_background.dart';

final selectedReportProfileIdProvider = StateProvider<String?>((ref) => null);

/// Premium Client-Facing Reports Home Screen for Astro Sushil
class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  void _onReportAction({
    required BuildContext context,
    required WidgetRef ref,
    required String title,
    required String reportType,
    required String birthProfileId,
  }) {
    AuthRequiredGate.checkAndProceed(
      context: context,
      ref: ref,
      feature: AppFeature.reports,
      featureTitle: title,
      onAllowed: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => ReportViewScreen(
              birthProfileId: birthProfileId,
              reportType: reportType,
            ),
          ),
        );
      },
    );
  }

  void _onCareerReportAction({
    required BuildContext context,
    required WidgetRef ref,
    required BirthProfileModel profile,
  }) {
    AuthRequiredGate.checkAndProceed(
      context: context,
      ref: ref,
      feature: AppFeature.premiumReportCareer,
      featureTitle: 'Career & Professional Life Report',
      onAllowed: () async {
        final careerState = ref.read(careerReportNotifierProvider);
        final isSameProfile = careerState.detail?.birthProfileId == profile.id;

        if (isSameProfile &&
            careerState.status != null &&
            careerState.status!.isCompleted &&
            careerState.activeReportId != null) {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => CareerReportOverviewScreen(
                reportId: careerState.activeReportId!,
                profile: profile,
              ),
            ),
          );
        } else if (isSameProfile &&
            careerState.status != null &&
            careerState.status!.isProcessing &&
            careerState.activeReportId != null) {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => CareerReportGenerationScreen(
                reportId: careerState.activeReportId!,
                profile: profile,
              ),
            ),
          );
        } else {
          final reportId = await ref
              .read(careerReportNotifierProvider.notifier)
              .createCareerReport(birthProfileId: profile.id);

          if (reportId != null && context.mounted) {
            final updatedState = ref.read(careerReportNotifierProvider);
            if (updatedState.status != null &&
                updatedState.status!.isCompleted) {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => CareerReportOverviewScreen(
                    reportId: reportId,
                    profile: profile,
                  ),
                ),
              );
            } else {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => CareerReportGenerationScreen(
                    reportId: reportId,
                    profile: profile,
                  ),
                ),
              );
            }
          }
        }
      },
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profilesState = ref.watch(birthProfilesListNotifierProvider);
    final profiles = profilesState.profiles;
    final selectedProfileId = ref.watch(selectedReportProfileIdProvider) ??
        (profiles.isNotEmpty ? profiles.first.id : null);

    final activeProfile = profiles.firstWhere(
      (p) => p.id == selectedProfileId,
      orElse: () => profiles.isNotEmpty
          ? profiles.first
          : BirthProfileModel(
              id: '',
              userId: '',
              name: 'Guest',
              dateOfBirth: '',
              timeOfBirth: '',
              latitude: 0,
              longitude: 0,
              timezone: 'Asia/Kolkata',
              placeName: '',
              createdAt: DateTime(2026, 1, 1),
              updatedAt: DateTime(2026, 1, 1),
            ),
    );

    final careerState = ref.watch(careerReportNotifierProvider);
    final isMatchingProfile = careerState.detail?.birthProfileId == activeProfile.id;
    final isCareerCompleted = isMatchingProfile && (careerState.status?.isCompleted ?? false);
    final isCareerProcessing = isMatchingProfile && (careerState.status?.isProcessing ?? false);

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AppBar(
        title: const Text(
          'Your Astrology Reports',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: AppColors.lightSurface,
        foregroundColor: AppColors.lightTextPrimary,
        elevation: 0,
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 12.0),
            physics: const BouncingScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Premium Header Banner
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withOpacity(0.15),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                    border: Border.all(
                      color: AppColors.premiumAccent.withOpacity(0.35),
                      width: 1.2,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: AppColors.premiumAccent.withOpacity(0.2),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.star_rounded,
                              color: AppColors.premiumAccent,
                              size: 16,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'ASTRO SUSHIL REPORTS',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.3,
                              color: AppColors.premiumAccent.withOpacity(0.95),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Your Astrology Reports',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Deeper insights from your birth chart.',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.white.withOpacity(0.85),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 22),

                // 2. Profile Selector Header / Gate
                if (profiles.isNotEmpty) ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Active Birth Profile',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: AppColors.lightTextPrimary,
                        ),
                      ),
                      InkWell(
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const CreateBirthProfileScreen(),
                            ),
                          );
                        },
                        child: const Row(
                          children: [
                            Icon(Icons.add_circle_outline,
                                size: 16, color: AppColors.secondary),
                            SizedBox(width: 4),
                            Text(
                              'Add New',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.secondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 42,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: profiles.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 10),
                      itemBuilder: (context, index) {
                        final p = profiles[index];
                        final isSelected = p.id == activeProfile.id;

                        return ChoiceChip(
                          label: Text(p.name),
                          selected: isSelected,
                          selectedColor: AppColors.primary,
                          backgroundColor: AppColors.lightSurface,
                          labelStyle: TextStyle(
                            color: isSelected
                                ? Colors.white
                                : AppColors.lightTextPrimary,
                            fontWeight: isSelected
                                ? FontWeight.bold
                                : FontWeight.normal,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                            side: BorderSide(
                              color: isSelected
                                  ? AppColors.primary
                                  : AppColors.lightBorder,
                            ),
                          ),
                          onSelected: (_) {
                            ref
                                .read(selectedReportProfileIdProvider.notifier)
                                .state = p.id;
                          },
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 24),
                ] else ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.lightSurface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.lightBorder),
                    ),
                    child: Column(
                      children: [
                        const Icon(
                          Icons.account_box_outlined,
                          size: 44,
                          color: AppColors.secondary,
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'Your report is waiting.',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.lightTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Create your Kundli profile to unlock your personalized report.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) =>
                                    const CreateBirthProfileScreen(),
                              ),
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          icon: const Icon(Icons.add, size: 18),
                          label: const Text('Create Kundli Profile'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ],

                // 3. Reports List Title
                Row(
                  children: [
                    Text(
                      'AVAILABLE REPORTS',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.1,
                        color: AppColors.lightTextMuted,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.success.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        '100% Deterministic Engine',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: AppColors.success,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 4. CAREER & PROFESSIONAL LIFE REPORT CARD (PRIMARY FEATURED)
                _ReportCard(
                  title: 'Career & Professional Life',
                  tagline: '10TH HOUSE & VOCATIONAL DNA',
                  description:
                      'A deeper look at your professional strengths, career patterns and opportunities.',
                  icon: Icons.work_outline_rounded,
                  accentColor: Colors.teal,
                  isAvailable: true,
                  badgeText: 'PREMIUM PDF',
                  primaryActionText: isCareerCompleted
                      ? 'View Report'
                      : isCareerProcessing
                          ? 'In Progress (${careerState.status?.progress ?? 0}%)'
                          : 'Generate Report',
                  onViewTap: () => _onCareerReportAction(
                    context: context,
                    ref: ref,
                    profile: activeProfile,
                  ),
                  onDownloadTap: isCareerCompleted && careerState.activeReportId != null
                      ? () {
                          AuthRequiredGate.checkAndProceed(
                            context: context,
                            ref: ref,
                            feature: AppFeature.premiumReportCareer,
                            featureTitle: 'Career Report PDF',
                            onAllowed: () {
                              ref
                                  .read(careerReportNotifierProvider.notifier)
                                  .downloadAndCachePdf(careerState.activeReportId!);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Career PDF downloaded and cached.'),
                                ),
                              );
                            },
                          );
                        }
                      : null,
                ),

                const SizedBox(height: 16),

                // 5. KUNDLI REPORT CARD
                _ReportCard(
                  title: 'Birth Chart & Kundli',
                  tagline: 'YOUR COSMIC BLUEPRINT',
                  description:
                      'Explore your birth chart, planetary placements, houses and Nakshatra.',
                  icon: Icons.auto_awesome_rounded,
                  accentColor: AppColors.premiumAccent,
                  isAvailable: true,
                  onViewTap: () => _onReportAction(
                    context: context,
                    ref: ref,
                    title: 'Birth Chart & Kundli',
                    reportType: 'KUNDLI',
                    birthProfileId: activeProfile.id,
                  ),
                  onDownloadTap: () => _onReportAction(
                    context: context,
                    ref: ref,
                    title: 'Birth Chart & Kundli',
                    reportType: 'KUNDLI',
                    birthProfileId: activeProfile.id,
                  ),
                ),

                const SizedBox(height: 16),

                // 6. PLANETARY REPORT CARD
                _ReportCard(
                  title: 'Planetary Summary',
                  tagline: 'PLANETARY DYNAMICS',
                  description:
                      'Understand how each planet is placed in your birth chart.',
                  icon: Icons.brightness_6_rounded,
                  accentColor: AppColors.secondary,
                  isAvailable: true,
                  onViewTap: () => _onReportAction(
                    context: context,
                    ref: ref,
                    title: 'Planetary Summary',
                    reportType: 'PLANETARY_SUMMARY',
                    birthProfileId: activeProfile.id,
                  ),
                  onDownloadTap: () => _onReportAction(
                    context: context,
                    ref: ref,
                    title: 'Planetary Summary',
                    reportType: 'PLANETARY_SUMMARY',
                    birthProfileId: activeProfile.id,
                  ),
                ),

                const SizedBox(height: 24),

                // 7. UPCOMING REPORTS
                Text(
                  'UPCOMING REPORTS',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.1,
                    color: AppColors.lightTextMuted,
                  ),
                ),
                const SizedBox(height: 12),

                _ReportCard(
                  title: 'Marriage & Relationship Report',
                  tagline: 'KUNDLI MILAN & COMPATIBILITY',
                  description:
                      'Deep compatibility assessment based on 7th house and Venus placements.',
                  icon: Icons.favorite_border_rounded,
                  accentColor: AppColors.supportingAccent,
                  isAvailable: false,
                  badgeText: 'COMING SOON',
                ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final String title;
  final String tagline;
  final String description;
  final IconData icon;
  final Color accentColor;
  final bool isAvailable;
  final String? badgeText;
  final String? primaryActionText;
  final VoidCallback? onViewTap;
  final VoidCallback? onDownloadTap;

  const _ReportCard({
    required this.title,
    required this.tagline,
    required this.description,
    required this.icon,
    required this.accentColor,
    this.isAvailable = true,
    this.badgeText,
    this.primaryActionText,
    this.onViewTap,
    this.onDownloadTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.lightSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isAvailable
              ? accentColor.withOpacity(0.3)
              : AppColors.lightBorder,
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(18.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: accentColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: accentColor, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        tagline,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1.1,
                          color: accentColor,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                          color: AppColors.lightTextPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
                if (!isAvailable || badgeText != null)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: isAvailable
                          ? accentColor.withOpacity(0.15)
                          : AppColors.lightBorder,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      badgeText ?? 'LOCKED',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: isAvailable
                            ? accentColor
                            : AppColors.lightTextMuted,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              description,
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.lightTextSecondary,
                height: 1.4,
              ),
            ),
            if (isAvailable) ...[
              const SizedBox(height: 16),
              const Divider(height: 1),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: onViewTap,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      icon: const Icon(Icons.remove_red_eye_outlined, size: 18),
                      label: Text(
                        primaryActionText ?? 'View Report',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  if (onDownloadTap != null) ...[
                    const SizedBox(width: 10),
                    OutlinedButton.icon(
                      onPressed: onDownloadTap,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(
                            color: AppColors.primary, width: 1.2),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      icon: const Icon(Icons.picture_as_pdf_outlined, size: 18),
                      label: const Text(
                        'PDF',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
