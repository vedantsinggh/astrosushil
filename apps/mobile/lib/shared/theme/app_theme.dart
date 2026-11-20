import 'package:flutter/foundation.dart' show defaultTargetPlatform;
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_typography.dart';

export 'app_colors.dart';
export 'app_typography.dart';
export 'app_theme_tokens.dart';

/// Extension providing easy access to official brand accent tokens via ColorScheme
extension AstroColorSchemeExtension on ColorScheme {
  Color get premiumAccent => AppColors.premiumAccent;
  Color get supportingAccent => AppColors.supportingAccent;
  Color get textSecondary => AppColors.textSecondary;
  Color get border => AppColors.border;
}

/// Platform-native scroll behaviour, driven by the *theme* platform (so
/// tests and previews that set `ThemeData.platform` get the right feel):
/// iOS / macOS bounce; Android clamps with the Material 3 stretch overscroll.
/// Set on `MaterialApp.scrollBehavior`.
class AstroScrollBehavior extends MaterialScrollBehavior {
  const AstroScrollBehavior();

  @override
  TargetPlatform getPlatform(BuildContext context) => Theme.of(context).platform;

  @override
  ScrollPhysics getScrollPhysics(BuildContext context) {
    final p = getPlatform(context);
    if (p == TargetPlatform.iOS || p == TargetPlatform.macOS) {
      return const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics());
    }
    return const ClampingScrollPhysics();
  }
}

/// Official Application Theme for Astro Sushil Mobile Application
class AppTheme {
  AppTheme._();

  /// Native page transitions: iOS / macOS slide with edge swipe-back;
  /// Android uses predictive back (system back button and gesture keep
  /// working); other platforms fade forwards.
  static const PageTransitionsTheme pageTransitions = PageTransitionsTheme(
    builders: {
      TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
      TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
      TargetPlatform.android: PredictiveBackPageTransitionsBuilder(),
      TargetPlatform.windows: FadeForwardsPageTransitionsBuilder(),
      TargetPlatform.linux: FadeForwardsPageTransitionsBuilder(),
      TargetPlatform.fuchsia: FadeForwardsPageTransitionsBuilder(),
    },
  );

  static bool get _cupertino =>
      defaultTargetPlatform == TargetPlatform.iOS || defaultTargetPlatform == TargetPlatform.macOS;

  /// Base text sizes for unstyled text (body >= 16, secondary >= 14,
  /// captions >= 13). Brand families are applied per style.
  static const TextTheme _lightTextTheme = TextTheme(
    bodyLarge: TextStyle(fontSize: 17, height: 1.45, color: AppColors.textPrimary),
    bodyMedium: TextStyle(fontSize: 16, height: 1.45, color: AppColors.textPrimary),
    bodySmall: TextStyle(fontSize: 14, height: 1.4, color: AppColors.textSecondary),
    labelLarge: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
    labelMedium: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
    labelSmall: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
    titleLarge: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
    titleMedium: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
    titleSmall: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
  );

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      pageTransitionsTheme: pageTransitions,
      scaffoldBackgroundColor: AppColors.background,
      primaryColor: AppColors.primary,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        secondary: AppColors.secondary,
        tertiary: AppColors.tertiary,
        surface: AppColors.surface,
        error: AppColors.error,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onTertiary: Colors.white,
        onSurface: AppColors.textInversePrimary,
        onError: Colors.white,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.primary,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: AppColors.textInversePrimary),
        actionsIconTheme: IconThemeData(color: AppColors.textInversePrimary),
        titleTextStyle: AppTypography.inverseHeadlineLarge,
      ),
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 1,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.border, width: 1),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.background,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.gold, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.error, width: 2),
        ),
        labelStyle: const TextStyle(color: AppColors.textInverseMuted),
        hintStyle: const TextStyle(color: AppColors.textMuted),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          minimumSize: const Size(64, 48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: AppTypography.labelLarge,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.textInversePrimary,
          minimumSize: const Size(64, 48),
          side: const BorderSide(color: AppColors.secondary),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: AppTypography.labelLarge,
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.border,
        thickness: 1,
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppColors.gold,
      ),
    );
  }

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      pageTransitionsTheme: pageTransitions,
      textTheme: _lightTextTheme,
      // iOS: soft grey press highlight; Android: Material ink ripples.
      splashFactory: _cupertino ? NoSplash.splashFactory : InkSparkle.splashFactory,
      highlightColor: AppColors.primary.withValues(alpha: 0.06),
      scaffoldBackgroundColor: AppColors.canvas,
      primaryColor: AppColors.primary,
      cupertinoOverrideTheme: const NoDefaultCupertinoThemeData(
        primaryColor: AppColors.accent,
        scaffoldBackgroundColor: AppColors.canvas,
        barBackgroundColor: AppColors.navBarFrost,
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected) ? Colors.white : AppColors.textSecondary,
        ),
        trackColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected) ? AppColors.successText : AppColors.segmentedTrack,
        ),
        trackOutlineColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected) ? Colors.transparent : AppColors.cardBorder,
        ),
      ),
      sliderTheme: const SliderThemeData(
        activeTrackColor: AppColors.accent,
        thumbColor: Colors.white,
        inactiveTrackColor: AppColors.segmentedTrack,
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.accent,
          minimumSize: const Size(44, 44),
          textStyle: AppTypography.navAction.copyWith(fontWeight: FontWeight.w600, fontSize: 16),
        ),
      ),
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        secondary: AppColors.secondary,
        tertiary: AppColors.tertiary,
        surface: AppColors.cardSurface,
        error: AppColors.error,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onTertiary: Colors.white,
        onSurface: AppColors.textPrimary,
        onError: Colors.white,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.canvas,
        foregroundColor: AppColors.textPrimary,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: AppColors.accent),
        actionsIconTheme: IconThemeData(color: AppColors.accent),
        titleTextStyle: AppTypography.navTitle,
      ),
      cardTheme: CardThemeData(
        color: AppColors.cardSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.cardBorder, width: 1),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.cardSurfaceWarm,
        elevation: 6,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: AppColors.cardBorder, width: 1),
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.cardSurfaceWarm,
        elevation: 8,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.cardSurfaceWarm,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.cardBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.cardBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.error, width: 2),
        ),
        labelStyle: AppTypography.bodyMedium.copyWith(color: AppColors.textSecondary),
        hintStyle: AppTypography.bodyMedium.copyWith(color: AppColors.textMuted),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          minimumSize: const Size(64, 48),
          elevation: 1,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: AppTypography.labelLarge.copyWith(color: Colors.white),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.textPrimary,
          minimumSize: const Size(64, 48),
          side: const BorderSide(color: AppColors.cardBorder, width: 1.2),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: AppTypography.labelLarge,
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.cardSurfaceWarm,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textMuted,
        elevation: 8,
        type: BottomNavigationBarType.fixed,
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.separator,
        thickness: 0.5,
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppColors.primary,
      ),
    );
  }
}
