import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../widgets/astro_app_bar.dart';
import '../widgets/astro_offline_state.dart';
import '../widgets/subtle_celestial_background.dart';

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
      appBar: AstroAppBar(
        title: isHindi ? 'कनेक्शन त्रुटि' : 'Network Connectivity',
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: AstroOfflineState(
                onRetry: onRetry,
                message: isHindi
                    ? 'इंटरनेट कनेक्शन उपलब्ध नहीं है। कृपया नेटवर्क जांचें और पुनः प्रयास करें। आपकी सहेजी गई कुंडलियां सुरक्षित हैं।'
                    : 'Unable to connect to astrology calculation servers. Please check your internet connection and try again.',
              ),
            ),
          ),
        ),
      ),
    );
  }
}
