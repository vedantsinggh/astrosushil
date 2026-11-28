import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/locale_provider.dart';
import '../../core/network/network_state_manager.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../widgets/astro_controls.dart';
import '../widgets/astro_state_illustration.dart';
import '../widgets/subtle_celestial_background.dart';
import 'simple_screen_kit.dart';

/// Distinguishes between device/network connectivity loss and temporary server failures.
enum NetworkErrorType {
  offline,
  serverError,
}

/// Full-screen offline / server error view featuring a centered animated
/// celestial widget, plain-language copy, and a Retry button with loading feedback.
class NetworkErrorScreen extends StatefulWidget {
  final FutureOr<void> Function()? onRetry;
  final NetworkErrorType type;
  final String? title;
  final String? message;
  final bool animate;
  final bool showBackButton;
  final String? secondaryActionLabel;
  final VoidCallback? onSecondaryAction;

  const NetworkErrorScreen({
    super.key,
    this.onRetry,
    this.type = NetworkErrorType.offline,
    this.title,
    this.message,
    this.animate = true,
    this.showBackButton = true,
    this.secondaryActionLabel,
    this.onSecondaryAction,
  });

  const NetworkErrorScreen.offline({
    super.key,
    this.onRetry,
    this.title,
    this.message,
    this.animate = true,
    this.showBackButton = true,
    this.secondaryActionLabel,
    this.onSecondaryAction,
  }) : type = NetworkErrorType.offline;

  const NetworkErrorScreen.serverError({
    super.key,
    this.onRetry,
    this.title,
    this.message,
    this.animate = true,
    this.showBackButton = true,
    this.secondaryActionLabel,
    this.onSecondaryAction,
  }) : type = NetworkErrorType.serverError;

  @override
  State<NetworkErrorScreen> createState() => _NetworkErrorScreenState();
}

class _NetworkErrorScreenState extends State<NetworkErrorScreen> {
  bool _retrying = false;

  Future<void> _handleRetry() async {
    if (_retrying) return;
    setState(() => _retrying = true);
    try {
      if (widget.onRetry != null) {
        final result = widget.onRetry!();
        if (result is Future) {
          await result;
        }
      } else {
        // Fallback when presented globally without a custom handler
        final container = ProviderScope.containerOf(context, listen: false);
        await container
            .read(networkStateProvider.notifier)
            .checkServerReachability();
      }
    } finally {
      if (mounted) {
        setState(() => _retrying = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isHindi = Localizations.localeOf(context).languageCode == 'hi';
    final l10n = context.l10n;
    final short = MediaQuery.sizeOf(context).height < 540;
    final isOffline = widget.type == NetworkErrorType.offline;

    final badgeLabel = isOffline
        ? (isHindi ? 'इंटरनेट बंद है' : 'NO CONNECTION')
        : (isHindi ? 'सर्वर अस्थायी समस्या' : 'SERVER UNAVAILABLE');
    final effectiveTitle = widget.title ??
        (isOffline
            ? (isHindi ? 'आप ऑफ़लाइन हैं' : "You're offline")
            : (isHindi
                ? 'सर्वर से संपर्क नहीं हो पा रहा'
                : 'Astro Sushil servers are busy'));
    final effectiveMessage = widget.message ??
        (isOffline
            ? (isHindi
                ? 'इंटरनेट कनेक्शन उपलब्ध नहीं है। कृपया नेटवर्क जांचें और पुनः प्रयास करें। आपकी सहेजी गई कुंडलियां सुरक्षित हैं।'
                : 'Unable to connect to astrology calculation servers. Please check your internet connection and try again.')
            : (isHindi
                ? 'हमारे सर्वर पर अस्थायी तकनीकी समस्या है। कृपया कुछ सेकंड प्रतीक्षा करें और पुनः प्रयास करें।'
                : 'We ran into a temporary server issue while fetching your astrological data. Please try again in a moment.'));

    final canPop = widget.showBackButton && Navigator.of(context).canPop();

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: SimpleScreenAppBar(showBack: canPop),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: EdgeInsets.symmetric(
                horizontal: 24,
                vertical: short ? 16 : 32,
              ),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                          color: AppColors.gold.withValues(alpha: 0.45),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            isOffline
                                ? Icons.wifi_off_rounded
                                : Icons.cloud_off_rounded,
                            size: 14,
                            color: AppColors.primary,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            badgeLabel,
                            style: AppTypography.labelSmall.copyWith(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.9,
                            ),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(height: short ? 14 : 24),
                    Container(
                      key: const Key('network_error_animated_center'),
                      padding: EdgeInsets.all(short ? 12 : 18),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.72),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AppColors.gold.withValues(alpha: 0.35),
                          width: 1.2,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.08),
                            blurRadius: 24,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: AnimatedAstroStateIllustration(
                        type: isOffline
                            ? AstroStateType.offline
                            : AstroStateType.serverError,
                        size: short ? 112 : 156,
                        animate: widget.animate,
                      ),
                    ),
                    SizedBox(height: short ? 16 : 26),
                    Semantics(
                      header: true,
                      child: Text(
                        effectiveTitle,
                        textAlign: TextAlign.center,
                        style: AppTypography.headlineLarge.copyWith(
                          fontSize: short ? 22 : 25,
                          height: 1.25,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      effectiveMessage,
                      textAlign: TextAlign.center,
                      style: AppTypography.bodyLarge.copyWith(
                        color: AppColors.textSecondary,
                        height: 1.5,
                      ),
                    ),
                    SizedBox(height: short ? 20 : 28),
                    AstroPrimaryButton(
                      key: const Key('network_error_retry_button'),
                      label: _retrying
                          ? (isHindi ? 'पुनः प्रयास हो रहा है…' : 'Retrying…')
                          : l10n.commonTryAgain,
                      icon: Icons.refresh_rounded,
                      isLoading: _retrying,
                      onPressed: _retrying ? null : _handleRetry,
                    ),
                    if (widget.secondaryActionLabel != null &&
                        widget.onSecondaryAction != null) ...[
                      const SizedBox(height: 12),
                      AstroSecondaryButton(
                        key: const Key('network_error_secondary_button'),
                        label: widget.secondaryActionLabel!,
                        icon: Icons.folder_outlined,
                        onPressed: widget.onSecondaryAction,
                      ),
                    ] else if (canPop) ...[
                      const SizedBox(height: 12),
                      AstroSecondaryButton(
                        label: isHindi ? 'वापस जाएं' : 'Go back',
                        icon: Icons.arrow_back_rounded,
                        onPressed: () => Navigator.of(context).maybePop(),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
