import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/signup_screen.dart';
import '../../shared/theme/app_colors.dart';
import 'feature_access_service.dart';

class AuthRequiredGate {
  /// Checks if the feature can be accessed. If allowed, invokes `onAllowed`.
  /// If restricted, shows the authentication modal sheet.
  static void checkAndProceed({
    required BuildContext context,
    required WidgetRef ref,
    required AppFeature feature,
    required String featureTitle,
    required VoidCallback onAllowed,
  }) {
    final authState = ref.read(authStateProvider);

    if (FeatureAccessService.canAccessFeature(feature, authState)) {
      onAllowed();
      return;
    }

    showAuthRequiredModal(
      context: context,
      featureTitle: featureTitle,
      onAuthenticated: onAllowed,
    );
  }

  /// Displays the Auth Required Modal Sheet
  static Future<void> showAuthRequiredModal({
    required BuildContext context,
    required String featureTitle,
    VoidCallback? onAuthenticated,
  }) async {
    await showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(24),
          decoration: const BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: AppColors.premiumAccent.withOpacity(0.15),
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.premiumAccent, width: 1.5),
                ),
                child: const Icon(
                  Icons.lock_outline_rounded,
                  color: AppColors.premiumAccent,
                  size: 30,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Unlock $featureTitle',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Create an account or sign in to access premium reports, sync saved birth profiles across devices, and get personalized insights.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.white.withOpacity(0.8),
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const SignupScreen(),
                      ),
                    ).then((_) {
                      if (onAuthenticated != null) onAuthenticated();
                    });
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.premiumAccent,
                    foregroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Create Free Account',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const LoginScreen(),
                      ),
                    ).then((_) {
                      if (onAuthenticated != null) onAuthenticated();
                    });
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Colors.white54),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Sign In',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: Text(
                  'Continue Browsing Free Features',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.6),
                    fontSize: 14,
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }
}
