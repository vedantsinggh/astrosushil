import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/utils/formatters.dart';
import '../../../shared/screens/simple_screen_kit.dart';
import '../../../shared/widgets/error_banner.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../astrology/screens/birth_chart_screen.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/birth_profile_model.dart';
import '../providers/birth_profile_provider.dart';
import 'create_birth_profile_screen.dart';

class BirthProfileDetailScreen extends ConsumerWidget {
  final String profileId;

  const BirthProfileDetailScreen({
    super.key,
    required this.profileId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(singleBirthProfileProvider(profileId));

    void openEdit(BirthProfileModel profile) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => CreateBirthProfileScreen(existingProfile: profile),
        ),
      );
    }

    return AstroPage(
      title: 'Birth Profile Details',
      backgroundColor: AppColors.lightBackground,
      actions: [
        profileAsync.maybeWhen(
          data: (profile) => AstroNavAction.text(
            label: 'Edit',
            emphasized: true,
            onPressed: () => openEdit(profile),
          ),
          orElse: () => const SizedBox.shrink(),
        ),
      ],
      child: profileAsync.when(
        loading: () => const Padding(
          padding: EdgeInsets.only(top: 48),
          child: AstroStateView.loading(message: 'Loading birth profile...', compact: true),
        ),
        error: (err, stack) => ErrorBanner(
          message: err.toString(),
          onRetry: () => ref.refresh(singleBirthProfileProvider(profileId)),
        ),
        data: (profile) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // HERO: who this chart belongs to
            _ProfileHero(profile: profile),
            const SizedBox(height: 20),

            // UNRESOLVED LOCATION WARNING (IF LEGACY/UNVERIFIED)
            if (!profile.isResolved) ...[
              Container(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                decoration: BoxDecoration(
                  color: AppColors.warningBg,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.warningBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.warning_amber_rounded, size: 24, color: Colors.amber.shade800),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Location Confirmation Required',
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                              height: 1.3,
                              color: Colors.amber.shade900,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'This profile does not have verified coordinates and timezone. Please confirm birthplace to generate accurate astrological calculations.',
                      style: TextStyle(fontSize: 15, color: Colors.amber.shade900, height: 1.4),
                    ),
                    TextButton.icon(
                      onPressed: () => openEdit(profile),
                      icon: const Icon(Icons.arrow_forward_rounded, size: 20),
                      label: const Text(
                        'Confirm Birthplace Now',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.amber.shade900,
                        minimumSize: const Size(48, 48),
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // MAIN DETAILS
            SimpleGroupCard(
              children: [
                _buildDetailRow(
                  context: context,
                  icon: Icons.calendar_today,
                  tint: AstroTint.amber,
                  label: 'Date of Birth',
                  value: Formatters.formatDisplayDate(profile.dateOfBirth),
                ),
                _buildDetailRow(
                  context: context,
                  icon: Icons.access_time,
                  tint: AstroTint.violet,
                  label: 'Time of Birth',
                  value: profile.timeOfBirth,
                ),
                _buildDetailRow(
                  context: context,
                  icon: Icons.place,
                  tint: AstroTint.sage,
                  label: 'Place Name',
                  value: profile.placeName.isNotEmpty ? profile.placeName : 'Unspecified',
                ),
                if (profile.country != null && profile.country!.isNotEmpty)
                  _buildDetailRow(
                    context: context,
                    icon: Icons.flag_outlined,
                    tint: AstroTint.sky,
                    label: 'Country',
                    value: profile.country!,
                  ),
              ],
            ),

            const SizedBox(height: 8),

            // TECHNICAL DETAILS (hidden by default)
            SimpleExpander(
              label: 'More details (time zone & coordinates)',
              child: SimpleGroupCard(
                children: [
                  _buildDetailRow(
                    context: context,
                    icon: Icons.public,
                    label: 'Timezone',
                    value: profile.timezone,
                  ),
                  _buildDetailRow(
                    context: context,
                    icon: Icons.my_location,
                    label: 'Coordinates',
                    value:
                        '${Formatters.formatCoordinate(profile.latitude, true)}, ${Formatters.formatCoordinate(profile.longitude, false)}',
                  ),
                  if (profile.normalizedDetails != null) ...[
                    _buildDetailRow(
                      context: context,
                      icon: Icons.schedule,
                      label: 'UTC DateTime',
                      value: profile.normalizedDetails!.utcDateTime.toIso8601String(),
                    ),
                    _buildDetailRow(
                      context: context,
                      icon: Icons.timelapse,
                      label: 'Offset Minutes',
                      value: '${profile.normalizedDetails!.timezoneOffsetMinutes} mins',
                    ),
                  ],
                  _buildDetailRow(
                    context: context,
                    icon: Icons.tag_rounded,
                    label: 'Profile ID',
                    value: profile.id,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // PRIMARY ACTION
            SimplePrimaryButton(
              label: profile.isResolved ? 'Calculate & View Kundli Chart' : 'Confirm Birthplace to Continue',
              icon: profile.isResolved ? Icons.auto_awesome : Icons.edit_location_alt,
              onPressed: () {
                if (profile.isResolved) {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => BirthChartScreen(profile: profile),
                    ),
                  );
                } else {
                  openEdit(profile);
                }
              },
            ),
            const SizedBox(height: 12),

            // Set as Active Profile Action
            Consumer(
              builder: (context, ref, _) {
                final active = ref.watch(selectedBirthProfileProvider);
                final isCurrentActive = active?.id == profile.id;
                if (isCurrentActive) {
                  return Container(
                    constraints: const BoxConstraints(minHeight: 54),
                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                    decoration: BoxDecoration(
                      color: AstroTint.amber.background,
                      borderRadius: BorderRadius.circular(AstroMetrics.buttonRadius),
                      border: Border.all(color: AppColors.gold.withValues(alpha: 0.45)),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.check_circle_rounded, color: Color(0xFFB45309), size: 22),
                        SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            'Current Active Profile',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF92400E),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return SimpleSecondaryButton(
                  label: 'Set as Active Profile',
                  icon: Icons.star_outline_rounded,
                  onPressed: () {
                    ref.read(selectedBirthProfileIdProvider.notifier).state = profile.id;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('${profile.name} is now your active birth profile')),
                    );
                  },
                );
              },
            ),

            const SizedBox(height: 28),

            // Destructive Delete Profile Action
            SimpleSecondaryButton(
              label: 'Delete Profile',
              icon: Icons.delete_outline_rounded,
              color: AppColors.error,
              onPressed: () => _confirmAndDeleteProfile(context, ref, profile),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmAndDeleteProfile(BuildContext context, WidgetRef ref, BirthProfileModel profile) async {
    final confirmed = await showAstroConfirm(
      context: context,
      title: 'Delete Birth Profile?',
      message:
          'Are you sure you want to delete the birth profile for "${profile.name}"? This action cannot be undone and will permanently remove associated local chart caches.',
      confirmLabel: 'Delete Profile',
      destructive: true,
    );
    if (!confirmed) return;
    try {
      final auth = ref.read(authStateProvider);
      await ref.read(birthProfileRepositoryProvider).deleteProfile(profile.id, isGuest: auth.isGuest);
      await ref.read(birthProfilesListNotifierProvider.notifier).fetchProfiles();
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Birth profile for "${profile.name}" deleted.'),
            backgroundColor: AppColors.primary,
          ),
        );
        Navigator.of(context).pop();
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to delete birth profile. Please try again.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Widget _buildDetailRow({
    required BuildContext context,
    required IconData icon,
    required String label,
    required String value,
    AstroTint tint = AstroTint.indigo,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AstroIconSquare(icon: icon, tint: tint, size: 38),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                    height: 1.3,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Hero summary card: initial avatar, name, verified state and birth place.
class _ProfileHero extends StatelessWidget {
  final BirthProfileModel profile;

  const _ProfileHero({required this.profile});

  @override
  Widget build(BuildContext context) {
    final name = profile.name.trim();
    final place = profile.placeName.trim();
    return AstroGradientCard(
      child: Row(
        children: [
          Container(
            width: 58,
            height: 58,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.gold.withValues(alpha: 0.14),
              border: Border.all(color: AppColors.gold.withValues(alpha: 0.7), width: 1.2),
            ),
            child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : '•',
              style: AppTypography.largeTitle.copyWith(fontSize: 26, color: AppColors.gold),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  profile.name,
                  style: AppTypography.headlineLarge.copyWith(fontSize: 24, height: 1.2, color: Colors.white),
                ),
                if (place.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    place,
                    style: const TextStyle(fontSize: 15, height: 1.3, color: AppColors.textInverseSecondary),
                  ),
                ],
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        profile.isResolved ? Icons.verified_rounded : Icons.warning_amber_rounded,
                        size: 17,
                        color: profile.isResolved ? const Color(0xFF6EE7B7) : const Color(0xFFFCD34D),
                      ),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          profile.isResolved ? 'Verified' : 'Needs birthplace',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
