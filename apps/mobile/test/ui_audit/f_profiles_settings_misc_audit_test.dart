// UI audit: extra states for the simplified birth profile / settings /
// notifications / system screens (QA only).
@Tags(['ui_audit'])
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/features/settings/screens/app_settings_screen.dart';
import 'package:astro_mobile/features/notifications/providers/notifications_provider.dart';
import 'package:astro_mobile/features/notifications/screens/notifications_screen.dart';
import 'package:astro_mobile/features/birth_profile/screens/create_birth_profile_screen.dart';
import '../helpers/notification_fixtures.dart';
import 'audit_fixtures.dart';
import 'audit_harness.dart';

List<Override> _withNotifications() => [
      ...baseOverrides(),
      notificationsNotifierProvider.overrideWith((ref) => SeededNotificationsNotifier()),
    ];

void main() {
  final cases = <AuditCase>[
    AuditCase('notifications_seeded', () => const NotificationsScreen(), overrides: _withNotifications),
    AuditCase('edit_birth_profile', () => CreateBirthProfileScreen(existingProfile: kProfile),
        overrides: () => baseOverrides(), matrix: kLiteMatrix),
    // Shared nav bar after scrolling: compact title + frosted bar + hairline.
    AuditCase('app_settings_scrolled', () => const AppSettingsScreen(),
        overrides: () => baseOverrides(),
        matrix: kLiteMatrix,
        interact: (tester) async {
          await tester.drag(find.byType(Scrollable).first, const Offset(0, -320));
          await tester.pump(const Duration(milliseconds: 300));
        }),
  ];
  registerAuditCases('F', cases);
}
