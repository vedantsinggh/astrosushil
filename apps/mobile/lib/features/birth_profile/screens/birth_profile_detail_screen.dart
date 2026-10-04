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
              ],
            ),
          ),
        ),
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
