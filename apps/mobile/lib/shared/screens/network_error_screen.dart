import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../widgets/subtle_celestial_background.dart';
import 'simple_screen_kit.dart';
import '../../core/localization/locale_provider.dart';

/// Full screen network connectivity error view
class NetworkErrorScreen extends StatelessWidget {
  final VoidCallback? onRetry;

  const NetworkErrorScreen({
    super.key,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final isHindi = Localizations.localeOf(context).languageCode == 'hi';

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: const SimpleScreenAppBar(),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: SimpleStateView(
            icon: Icons.wifi_off_rounded,
            iconColor: AppColors.secondary,
            title: isHindi ? 'आप ऑफ़लाइन हैं' : "You're offline",
            message: isHindi
                ? 'इंटरनेट कनेक्शन उपलब्ध नहीं है। कृपया नेटवर्क जांचें और पुनः प्रयास करें। आपकी सहेजी गई कुंडलियां सुरक्षित हैं।'
                : 'Unable to connect to astrology calculation servers. Please check your internet connection and try again.',
            actionLabel: context.l10n.commonTryAgain,
            actionIcon: Icons.refresh_rounded,
            onAction: onRetry,
          ),
        ),
      ),
    );
  }
}
