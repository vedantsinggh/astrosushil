import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
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

  /// Displays the Auth Required Modal Sheet with feature highlights & preserved destination
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
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          decoration: const BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Drag Handle Bar
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 18),

                // Icon Badge
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: AppColors.premiumAccent.withOpacity(0.15),
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.premiumAccent, width: 1.5),
                  ),
                  child: const Icon(
                    Icons.lock_outline_rounded,
                    color: AppColors.premiumAccent,
                    size: 28,
                  ),
                ),
                const SizedBox(height: 14),

                Text(
                  'Create your account to unlock $featureTitle',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Your free astrology features are available without an account. Sign in or create an account to access personalized reports and premium services.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.white.withOpacity(0.8),
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 20),

                // Feature Highlights Section ("Why Join Astro Sushil?")
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.06),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withOpacity(0.1)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Why Join Astro Sushil?',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: AppColors.premiumAccent,
                        ),
                      ),
                      const SizedBox(height: 10),
                      _buildFeatureHighlight(
                        icon: Icons.brightness_7_rounded,
                        title: 'Personalized Birth Chart',
                        subtitle: 'Detailed Kundli with planetary insights',
                      ),
                      const SizedBox(height: 8),
                      _buildFeatureHighlight(
                        icon: Icons.auto_awesome_rounded,
                        title: 'Daily Predictions',
                        subtitle: 'Rashi Bhavishya & personalized guidance',
                      ),
                      const SizedBox(height: 8),
                      _buildFeatureHighlight(
                        icon: Icons.compass_calibration_rounded,
                        title: 'Vastu Shastra',
                        subtitle: 'Harmonize your home and workspace',
                      ),
                      const SizedBox(height: 8),
                      _buildFeatureHighlight(
                        icon: Icons.menu_book_rounded,
                        title: 'Premium Reports',
                        subtitle: 'In-depth life reports & consultations',
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // Action Buttons
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => RegisterScreen(
                            onRegisterSuccess: () {
                              if (onAuthenticated != null) onAuthenticated();
                            },
                          ),
                        ),
                      );
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
                      'Create Account',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => LoginScreen(
                            onLoginSuccess: () {
                              if (onAuthenticated != null) onAuthenticated();
                            },
                          ),
                        ),
                      );
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
                      'Login',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: Text(
                    'Continue Browsing',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.65),
                      fontSize: 13,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        );
      },
    );
  }

  static Widget _buildFeatureHighlight({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppColors.premiumAccent),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.white.withOpacity(0.7),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
