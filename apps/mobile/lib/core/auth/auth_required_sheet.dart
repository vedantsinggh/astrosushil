import 'package:flutter/material.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/jyoti/widgets/jyoti_avatar.dart';
import '../../shared/theme/app_colors.dart';

/// Reusable Authentication Gating Bottom Sheet for restricted features (Jyoti, Reports, etc.).
class AuthRequiredSheet extends StatelessWidget {
  final String title;
  final String subtitle;
  final String description;
  final String primaryButtonText;
  final String secondaryButtonText;
  final String cancelButtonText;
  final VoidCallback? onAuthenticated;

  const AuthRequiredSheet({
    super.key,
    this.title = 'Meet Jyoti',
    this.subtitle = 'Your personal astrology guide',
    this.description =
        'Ask questions about your birth chart, planets, houses and more. Login or create an account to get started.',
    this.primaryButtonText = 'Login to use Jyoti',
    this.secondaryButtonText = 'Create an Account',
    this.cancelButtonText = 'Maybe Later',
    this.onAuthenticated,
  });

  /// Static helper to display the sheet easily anywhere in the app
  static Future<void> show({
    required BuildContext context,
    String title = 'Meet Jyoti',
    String subtitle = 'Your personal astrology guide',
    String description =
        'Ask questions about your birth chart, planets, houses and more.',
    String primaryButtonText = 'Login to use Jyoti',
    String secondaryButtonText = 'Create an Account',
    String cancelButtonText = 'Maybe Later',
    VoidCallback? onAuthenticated,
  }) async {
    await showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => AuthRequiredSheet(
        title: title,
        subtitle: subtitle,
        description: description,
        primaryButtonText: primaryButtonText,
        secondaryButtonText: secondaryButtonText,
        cancelButtonText: cancelButtonText,
        onAuthenticated: onAuthenticated,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      decoration: const BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
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
            const SizedBox(height: 20),

            // Icon / Avatar Header
            const JyotiAvatar(size: 56),

            const SizedBox(height: 14),

            // Title
            Text(
              title,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                letterSpacing: -0.3,
              ),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 4),

            // Subtitle
            Text(
              subtitle,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.premiumAccent,
              ),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 10),

            // Description
            Text(
              description,
              style: TextStyle(
                fontSize: 13,
                color: Colors.white.withOpacity(0.8),
                height: 1.4,
              ),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 24),

            // Primary Button ("Login to use Jyoti")
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => LoginScreen(
                        onLoginSuccess: () {
                          if (onAuthenticated != null) {
                            onAuthenticated!();
                          }
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
                  elevation: 0,
                ),
                child: Text(
                  primaryButtonText,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),

            const SizedBox(height: 10),

            // Secondary Button ("Create an Account")
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => RegisterScreen(
                        onRegisterSuccess: () {
                          if (onAuthenticated != null) {
                            onAuthenticated!();
                          }
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
                child: Text(
                  secondaryButtonText,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),

            const SizedBox(height: 8),

            // Cancel Button ("Maybe Later")
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(
                cancelButtonText,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.65),
                  fontSize: 13,
                ),
              ),
            ),
            const SizedBox(height: 4),
          ],
        ),
      ),
    );
  }
}
