import 'package:flutter/material.dart';
import '../../../core/utils/formatters.dart';
import '../../../shared/theme/app_theme.dart';
import '../models/birth_profile_model.dart';

/// Card widget displaying summarized birth profile information
class BirthProfileCard extends StatelessWidget {
  final BirthProfileModel profile;
  final VoidCallback onTap;

  const BirthProfileCard({
    super.key,
    required this.profile,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        onTap: onTap,
        title: Text(
          profile.name,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Row(
              children: [
                Icon(Icons.calendar_today, size: 14, color: theme.colorScheme.secondary),
                const SizedBox(width: 6),
                Text(
                  '${Formatters.formatDisplayDate(profile.dateOfBirth)} at ${profile.timeOfBirth}',
                  style: TextStyle(fontSize: 13, color: theme.colorScheme.onSurface),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Row(
              children: [
                Icon(Icons.location_on, size: 14, color: theme.colorScheme.textSecondary),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    profile.placeName,
                    style: TextStyle(fontSize: 13, color: theme.colorScheme.textSecondary),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
        ),
        trailing: Icon(Icons.chevron_right, color: theme.colorScheme.textSecondary),
      ),
    );
  }
}
