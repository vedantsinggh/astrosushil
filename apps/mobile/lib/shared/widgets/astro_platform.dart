import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Single place that decides "iOS feel" vs "Android feel". Components call
/// this so screens never branch on platform themselves.
///
/// It reads `Theme.of(context).platform` (which follows
/// `debugDefaultTargetPlatformOverride` in tests).
class AstroPlatform {
  AstroPlatform._();

  /// True on iOS and macOS: Cupertino behaviour (chevron + "Back", centred
  /// compact title, bounce, action sheets, wheel pickers, press highlight).
  static bool isCupertino(BuildContext context) {
    final p = Theme.of(context).platform;
    return p == TargetPlatform.iOS || p == TargetPlatform.macOS;
  }

  /// Same as [isCupertino] for code without a [BuildContext] (theme setup).
  static bool get isCupertinoDefault =>
      defaultTargetPlatform == TargetPlatform.iOS || defaultTargetPlatform == TargetPlatform.macOS;

  /// Edge-to-edge system bar style: transparent bars, icon brightness to
  /// match the surface behind them ([dark] = dark surface, light icons).
  static SystemUiOverlayStyle overlayStyle({required bool dark}) {
    final base = dark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark;
    return base.copyWith(
      statusBarColor: Colors.transparent,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarDividerColor: Colors.transparent,
      systemNavigationBarIconBrightness: Brightness.dark,
      systemNavigationBarContrastEnforced: false,
    );
  }
}

/// Adaptive icons for the few glyphs whose shape differs by platform.
///
/// `cupertino_icons` is not a dependency of this app (CupertinoIcons glyphs
/// would render as empty boxes), so the iOS variants use the iOS-shaped
/// glyphs that ship in the Material icon font.
class AstroIcons {
  AstroIcons._();

  static IconData back(BuildContext context) =>
      AstroPlatform.isCupertino(context) ? Icons.arrow_back_ios_new_rounded : Icons.arrow_back_rounded;

  static IconData chevron(BuildContext context) =>
      AstroPlatform.isCupertino(context) ? Icons.chevron_right_rounded : Icons.chevron_right_rounded;

  static IconData share(BuildContext context) =>
      AstroPlatform.isCupertino(context) ? Icons.ios_share_rounded : Icons.share_rounded;

  static IconData more(BuildContext context) =>
      AstroPlatform.isCupertino(context) ? Icons.more_horiz_rounded : Icons.more_vert_rounded;

  static IconData settings(BuildContext context) =>
      AstroPlatform.isCupertino(context) ? Icons.settings_outlined : Icons.settings_rounded;

  static IconData close(BuildContext context) => Icons.close_rounded;
}
