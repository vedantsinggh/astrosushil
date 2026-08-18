import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/utils/formatters.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/error_banner.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../astrology/screens/birth_chart_screen.dart';
import '../providers/birth_profile_provider.dart';

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
      appBar: AppBar(
        title: const Text('Birth Profile Details'),
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
                          value: profile.placeName,
                        ),
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
                  text: 'Calculate & View Kundli Chart',
                  icon: Icons.auto_awesome,
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => BirthChartScreen(profile: profile),
                      ),
                    );
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
