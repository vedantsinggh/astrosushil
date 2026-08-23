import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import 'jyoti_avatar.dart';

/// Floating Assistant Orb / Button for Jyoti AI Assistant on Home Screen.
class JyotiFloatingButton extends StatelessWidget {
  final VoidCallback onTap;
  final bool isExpanded;

  const JyotiFloatingButton({
    super.key,
    required this.onTap,
    this.isExpanded = true,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Open Jyoti',
      button: true,
      hint: 'Ask Jyoti, your personal astrology guide',
      child: Material(
        color: Colors.transparent,
        shape: const StadiumBorder(),
        elevation: 6,
        shadowColor: AppColors.primary.withOpacity(0.4),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(30),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            padding: EdgeInsets.symmetric(
              horizontal: isExpanded ? 14 : 10,
              vertical: 10,
            ),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  AppColors.primary,
                  AppColors.tertiary,
                ],
              ),
              borderRadius: BorderRadius.circular(30),
              border: Border.all(
                color: AppColors.premiumAccent,
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: AppColors.premiumAccent.withOpacity(0.3),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const JyotiAvatar(size: 30, showSparkle: true),
                if (isExpanded) ...[
                  const SizedBox(width: 8),
                  const Text(
                    'Ask Jyoti',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      letterSpacing: -0.2,
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Icon(
                    Icons.auto_awesome_rounded,
                    size: 14,
                    color: AppColors.premiumAccent,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
