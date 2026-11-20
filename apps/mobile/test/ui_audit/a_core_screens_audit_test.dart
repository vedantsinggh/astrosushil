// UI audit: core / account / system screens (QA only).
@Tags(['ui_audit'])
library;

import 'package:flutter_test/flutter_test.dart' show Tags;

import 'package:astro_mobile/home/screens/home_screen.dart';
import 'package:astro_mobile/home/screens/profile_screen.dart';
import 'package:astro_mobile/features/settings/screens/app_settings_screen.dart';
import 'package:astro_mobile/features/notifications/screens/notifications_screen.dart';
import 'package:astro_mobile/features/support/screens/help_support_screen.dart';
import 'package:astro_mobile/features/legal/screens/legal_documents_screen.dart';
import 'package:astro_mobile/shared/screens/system_maintenance_screen.dart';
import 'package:astro_mobile/shared/screens/not_found_screen.dart';
import 'package:astro_mobile/shared/screens/network_error_screen.dart';
import 'package:astro_mobile/features/jyoti/screens/jyoti_chat_screen.dart';
import 'package:astro_mobile/features/onboarding/screens/onboarding_screen.dart';
import 'package:astro_mobile/features/auth/screens/login_screen.dart';
import 'package:astro_mobile/features/auth/screens/register_screen.dart';
import 'package:astro_mobile/features/auth/screens/register_success_screen.dart';
import 'package:astro_mobile/features/auth/screens/verification_screen.dart';
import 'package:astro_mobile/features/auth/screens/forgot_password_screen.dart';
import 'package:astro_mobile/features/auth/screens/reset_password_screen.dart';
import 'package:astro_mobile/features/birth_profile/screens/birth_profile_list_screen.dart';
import 'package:astro_mobile/features/birth_profile/screens/create_birth_profile_screen.dart';
import 'package:astro_mobile/features/birth_profile/screens/birth_profile_detail_screen.dart';

import 'audit_fixtures.dart';
import 'audit_harness.dart';

void main() {
  final cases = <AuditCase>[
    AuditCase('home', () => const HomeScreen(), overrides: () => baseOverrides()),
    AuditCase('home_long', () => const HomeScreen(), overrides: () => baseOverrides(long: true), matrix: kLiteMatrix),
    AuditCase('home_noprofile', () => const HomeScreen(), overrides: () => baseOverrides(noProfile: true), matrix: kLiteMatrix),
    AuditCase('home_guest', () => const HomeScreen(), overrides: () => baseOverrides(authenticated: false, noProfile: true), matrix: kLiteMatrix),
    AuditCase('profile_tab', () => const ProfileScreen(), overrides: () => baseOverrides()),
    AuditCase('profile_tab_long', () => const ProfileScreen(), overrides: () => baseOverrides(long: true), matrix: kLiteMatrix),
    AuditCase('profile_tab_signed_out', () => const ProfileScreen(), overrides: () => baseOverrides(authenticated: false, noProfile: true), matrix: kLiteMatrix),
    AuditCase('profile_tab_noprofile', () => const ProfileScreen(), overrides: () => baseOverrides(noProfile: true), matrix: kLiteMatrix),
    AuditCase('app_settings', () => const AppSettingsScreen(), overrides: () => baseOverrides()),
    AuditCase('notifications', () => const NotificationsScreen(), overrides: () => baseOverrides()),
    AuditCase('help_support', () => const HelpSupportScreen(), overrides: () => baseOverrides()),
    AuditCase('legal_privacy', () => const LegalDocumentsScreen(), overrides: () => baseOverrides()),
    AuditCase('maintenance', () => const SystemMaintenanceScreen(), overrides: () => baseOverrides()),
    AuditCase('not_found', () => const NotFoundScreen(routePath: '/deeplink/kundli/an-extremely-long-invalid-celestial-route-token-1234567890'),
        overrides: () => baseOverrides()),
    AuditCase('network_error', () => const NetworkErrorScreen(), overrides: () => baseOverrides()),
    AuditCase('jyoti_chat', () => const JyotiChatScreen(), overrides: () => baseOverrides()),
    AuditCase('jyoti_chat_long', () => const JyotiChatScreen(), overrides: () => baseOverrides(long: true), matrix: kLiteMatrix),
    AuditCase('onboarding', () => const OnboardingScreen(), overrides: () => baseOverrides(authenticated: false)),
    AuditCase('login', () => const LoginScreen(), overrides: () => baseOverrides(authenticated: false)),
    AuditCase('register', () => const RegisterScreen(), overrides: () => baseOverrides(authenticated: false)),
    AuditCase('register_success', () => const RegisterSuccessScreen(), overrides: () => baseOverrides()),
    AuditCase('verification_phone', () => const VerificationScreen(phoneNumber: '+919876543210'),
        overrides: () => baseOverrides(authenticated: false)),
    AuditCase('verification_email_long', () => const VerificationScreen(email: 'annapurna.venkatalakshmi.subramaniam.raghunathan@example-mail.co.in'),
        overrides: () => baseOverrides(authenticated: false), matrix: kLiteMatrix),
    AuditCase('forgot_password', () => const ForgotPasswordScreen(), overrides: () => baseOverrides(authenticated: false)),
    AuditCase('reset_password', () => const ResetPasswordScreen(email: 'seeker@astrosushil.com'),
        overrides: () => baseOverrides(authenticated: false)),
    AuditCase('birth_profiles', () => const BirthProfileListScreen(), overrides: () => baseOverrides()),
    AuditCase('birth_profiles_long', () => const BirthProfileListScreen(), overrides: () => baseOverrides(long: true), matrix: kLiteMatrix),
    AuditCase('birth_profiles_empty', () => const BirthProfileListScreen(), overrides: () => baseOverrides(noProfile: true), matrix: kLiteMatrix),
    AuditCase('create_birth_profile', () => const CreateBirthProfileScreen(), overrides: () => baseOverrides()),
    AuditCase('edit_birth_profile_long', () => CreateBirthProfileScreen(existingProfile: kLongProfile),
        overrides: () => baseOverrides(long: true), matrix: kLiteMatrix),
    AuditCase('birth_profile_detail', () => BirthProfileDetailScreen(profileId: kProfile.id), overrides: () => baseOverrides()),
    AuditCase('birth_profile_detail_long', () => BirthProfileDetailScreen(profileId: kLongProfile.id),
        overrides: () => baseOverrides(long: true), matrix: kLiteMatrix),
  ];
  registerAuditCases('A', cases);
}
