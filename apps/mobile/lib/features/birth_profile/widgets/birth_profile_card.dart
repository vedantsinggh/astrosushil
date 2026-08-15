import 'package:flutter/material.dart';
import '../../../core/utils/formatters.dart';
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
                const Icon(Icons.calendar_today, size: 14, color: Color(0xFF94A3B8)),
                const SizedBox(width: 6),
                Text(
                  '${Formatters.formatDisplayDate(profile.dateOfBirth)} at ${profile.timeOfBirth}',
                  style: const TextStyle(fontSize: 13, color: Color(0xFFCBD5E1)),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Row(
              children: [
                const Icon(Icons.location_on, size: 14, color: Color(0xFF94A3B8)),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    profile.placeName,
                    style: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
        ),
        trailing: const Icon(Icons.chevron_right, color: Color(0xFF64748B)),
      ),
    );
  }
}
