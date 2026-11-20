import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';

/// Reusable banner for non-fatal or form error messages.
///
/// High-contrast dark-red text (16px) on a soft red fill. When [onRetry] is
/// given it shows a labelled "Try again" button (not an icon-only button),
/// which wraps below the message on narrow screens or at large text sizes.
class ErrorBanner extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const ErrorBanner({
    super.key,
    required this.message,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final retryLabel = AppLocalizations.of(context)?.commonTryAgain ?? 'Try again';

    return Semantics(
      liveRegion: true,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
        decoration: BoxDecoration(
          color: AppColors.errorBg,
          border: Border.all(color: AppColors.errorBorder),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Wrap(
          crossAxisAlignment: WrapCrossAlignment.center,
          alignment: WrapAlignment.spaceBetween,
          runSpacing: 6,
          spacing: 8,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.only(top: 1),
                  child: Icon(Icons.error_outline_rounded, color: AppColors.errorText, size: 22),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    message,
                    style: AppTypography.bodyLarge.copyWith(color: AppColors.errorText, height: 1.4),
                  ),
                ),
              ],
            ),
            if (onRetry != null)
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: TextButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh_rounded, size: 20),
                  label: Text(retryLabel),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.errorText,
                    minimumSize: const Size(48, 44),
                    textStyle: AppTypography.labelLarge.copyWith(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
