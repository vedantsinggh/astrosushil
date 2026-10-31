import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/utils/formatters.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/error_banner.dart';
import '../../../shared/widgets/loading_indicator.dart';
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
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AstroAppBar(
        title: 'Birth Profile Details',
        actions: [
          profileAsync.maybeWhen(
            data: (profile) => IconButton(
              icon: const Icon(Icons.edit_outlined, color: AppColors.primary),
              tooltip: 'Edit Birth Details',
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => CreateBirthProfileScreen(existingProfile: profile),
                  ),
                );
              },
            ),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      body: SafeArea(
        child: profileAsync.when(
          loading: () => const LoadingIndicator(message: 'Loading birth profile...'),
          error: (err, stack) => Padding(
            padding: const EdgeInsets.all(16.0),
            child: ErrorBanner(
              message: err.toString(),
              onRetry: () => ref.refresh(singleBirthProfileProvider(profileId)),
            ),
          ),
          data: (profile) => SingleChildScrollView(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // UNRESOLVED LOCATION WARNING BANNER (IF LEGACY/UNVERIFIED)
                if (!profile.isResolved) ...[
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.amber.shade300),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.warning_amber_rounded, size: 22, color: Colors.amber.shade800),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Location Confirmation Required',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.amber.shade900,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'This profile does not have verified coordinates and timezone. Please confirm birthplace to generate accurate astrological calculations.',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.amber.shade900,
                                  height: 1.3,
                                ),
                              ),
                              const SizedBox(height: 8),
                              InkWell(
                                onTap: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => CreateBirthProfileScreen(existingProfile: profile),
                                    ),
                                  );
                                },
                                child: Text(
                                  'Confirm Birthplace Now →',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.amber.shade900,
                                    decoration: TextDecoration.underline,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              backgroundColor: theme.colorScheme.primary,
                              child: Icon(Icons.person, color: theme.colorScheme.secondary),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    profile.name,
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Text(
                                    'Profile ID: ${profile.id}',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: theme.colorScheme.textSecondary,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            if (profile.isResolved)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppColors.premiumAccent.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.verified, size: 12, color: AppColors.primary),
                                    SizedBox(width: 4),
                                    Text(
                                      'Verified',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                        const Divider(height: 24),
                        _buildDetailRow(
                          context: context,
                          icon: Icons.calendar_today,
                          label: 'Date of Birth',
                          value: Formatters.formatDisplayDate(profile.dateOfBirth),
                        ),
                        const SizedBox(height: 12),
                        _buildDetailRow(
                          context: context,
                          icon: Icons.access_time,
                          label: 'Time of Birth',
                          value: profile.timeOfBirth,
                        ),
                        const SizedBox(height: 12),
                        _buildDetailRow(
                          context: context,
                          icon: Icons.public,
                          label: 'Timezone',
                          value: profile.timezone,
                        ),
                        const SizedBox(height: 12),
                        _buildDetailRow(
                          context: context,
                          icon: Icons.place,
                          label: 'Place Name',
                          value: profile.placeName.isNotEmpty ? profile.placeName : 'Unspecified',
                        ),
                        if (profile.country != null && profile.country!.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          _buildDetailRow(
                            context: context,
                            icon: Icons.flag_outlined,
                            label: 'Country',
                            value: profile.country!,
                          ),
                        ],
                        const SizedBox(height: 12),
                        _buildDetailRow(
                          context: context,
                          icon: Icons.my_location,
                          label: 'Coordinates',
                          value:
                              '${Formatters.formatCoordinate(profile.latitude, true)}, ${Formatters.formatCoordinate(profile.longitude, false)}',
                        ),
                      ],
                    ),
                  ),
                ),
                if (profile.normalizedDetails != null) ...[
                  const SizedBox(height: 16),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Normalized Server Details',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: theme.colorScheme.secondary,
                            ),
                          ),
                          const SizedBox(height: 12),
                          _buildDetailRow(
                            context: context,
                            icon: Icons.schedule,
                            label: 'UTC DateTime',
                            value: profile.normalizedDetails!.utcDateTime.toIso8601String(),
                          ),
                          const SizedBox(height: 8),
                          _buildDetailRow(
                            context: context,
                            icon: Icons.timelapse,
                            label: 'Offset Minutes',
                            value: '${profile.normalizedDetails!.timezoneOffsetMinutes} mins',
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 32),
                CustomButton(
                  text: profile.isResolved ? 'Calculate & View Kundli Chart' : 'Confirm Birthplace to Continue',
                  icon: profile.isResolved ? Icons.auto_awesome : Icons.edit_location_alt,
                  onPressed: () {
                    if (profile.isResolved) {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => BirthChartScreen(profile: profile),
                        ),
                      );
                    } else {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => CreateBirthProfileScreen(existingProfile: profile),
                        ),
                      );
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
                        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                        decoration: BoxDecoration(
                          color: AppColors.premiumAccent.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.premiumAccent.withOpacity(0.4)),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 18),
                            SizedBox(width: 8),
                            Flexible(
                              child: Text(
                                'Current Active Profile',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }

                    return SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.star_outline_rounded, color: AppColors.primary, size: 20),
                        label: const Text(
                          'Set as Active Profile',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.primary, width: 1.5),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () {
                          ref.read(selectedBirthProfileIdProvider.notifier).state = profile.id;
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('${profile.name} is now your active birth profile')),
                          );
                        },
                      ),
                    );
                  },
                ),

                const SizedBox(height: 12),

                // Destructive Delete Profile Action
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.delete_outline_rounded, color: AppColors.error, size: 20),
                    label: const Text(
                      'Delete Profile',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: AppColors.error,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.error, width: 1.2),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () => _confirmAndDeleteProfile(context, ref, profile),
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _confirmAndDeleteProfile(BuildContext context, WidgetRef ref, BirthProfileModel profile) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: AppColors.error, size: 24),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Delete Birth Profile?',
                style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.lightTextPrimary),
              ),
            ),
          ],
        ),
        content: Text(
          'Are you sure you want to delete the birth profile for "${profile.name}"? This action cannot be undone and will permanently remove associated local chart caches.',
          style: const TextStyle(fontSize: 14, color: AppColors.lightTextSecondary, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              try {
                final auth = ref.read(authStateProvider);
                await ref
                    .read(birthProfileRepositoryProvider)
                    .deleteProfile(profile.id, isGuest: auth.isGuest);
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
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            child: const Text('Delete Profile'),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow({
    required BuildContext context,
    required IconData icon,
    required String label,
    required String value,
  }) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Icon(icon, size: 18, color: theme.colorScheme.textSecondary),
        const SizedBox(width: 10),
        SizedBox(
          width: 110,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              color: theme.colorScheme.textSecondary,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: theme.colorScheme.onSurface,
            ),
          ),
        ),
      ],
    );
  }
}
