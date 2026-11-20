import 'package:flutter/material.dart';

/// Astro Sushil brand colours (docs/design-system.md; apps/mobile AppColors). These are the raw
/// brand values. Widgets should read the theme-aware [AppPalette] (`context.palette`) so light
/// and dark themes both work.
class DesktopColors {
  DesktopColors._();
  static const primary = Color(0xFF121440); // Deep Space Navy
  static const secondary = Color(0xFF61568C); // Muted Amethyst
  static const tertiary = Color(0xFF1D2059); // Dark Indigo Surface
  static const midnight = Color(0xFF0D0E2B);
  static const gold = Color(0xFFD9B13B); // Celestial Gold — sparing accent only
  static const goldDark = Color(0xFFB45309); // readable gold-ish text on light surfaces
  static const burgundy = Color(0xFF824661); // retrograde / special markers
  static const canvas = Color(0xFFFAF7F2); // warm ivory workspace
  static const canvasSecondary = Color(0xFFF3EDE2);
  static const card = Color(0xFFFFFFFF);
  static const border = Color(0xFFE2DACB);
  static const textPrimary = Color(0xFF1A1B3A);
  static const textSecondary = Color(0xFF5B5E7A);
  static const success = Color(0xFF10B981);
  static const warning = Color(0xFFF59E0B);
  static const error = Color(0xFFEF4444);
}

/// Semantic, theme-dependent colours used across the workspace.
@immutable
class AppPalette extends ThemeExtension<AppPalette> {
  const AppPalette({
    required this.canvas,
    required this.canvasAlt,
    required this.card,
    required this.border,
    required this.text,
    required this.textMuted,
    required this.heading,
    required this.accent,
    required this.accentText,
    required this.retro,
    required this.chartLine,
    required this.chartBg,
    required this.lagnaFill,
    required this.zebra,
    required this.highlightRow,
    required this.sidebar,
    required this.sidebarText,
    required this.sidebarMuted,
    required this.sidebarSelected,
    required this.topBar,
    required this.success,
    required this.warning,
    required this.error,
    required this.tableHeader,
  });

  final Color canvas, canvasAlt, card, border, text, textMuted, heading, accent, accentText, retro;
  final Color chartLine, chartBg, lagnaFill, zebra, highlightRow;
  final Color sidebar, sidebarText, sidebarMuted, sidebarSelected, topBar;
  final Color success, warning, error, tableHeader;

  static const light = AppPalette(
    canvas: DesktopColors.canvas,
    canvasAlt: DesktopColors.canvasSecondary,
    card: DesktopColors.card,
    border: DesktopColors.border,
    text: DesktopColors.textPrimary,
    textMuted: DesktopColors.textSecondary,
    heading: DesktopColors.primary,
    accent: DesktopColors.gold,
    accentText: DesktopColors.goldDark,
    retro: DesktopColors.burgundy,
    chartLine: Color(0xFF2A2D63),
    chartBg: Color(0xFFFFFDF8),
    lagnaFill: Color(0x1FD9B13B),
    zebra: Color(0xFFFBF8F2),
    highlightRow: Color(0x29D9B13B),
    sidebar: DesktopColors.primary,
    sidebarText: Color(0xFFF2F0FA),
    sidebarMuted: Color(0xFF9EA1C9),
    sidebarSelected: Color(0xFF26296B),
    topBar: Color(0xFFFFFFFF),
    success: Color(0xFF0E9F6E),
    warning: Color(0xFFB7791F),
    error: Color(0xFFC53030),
    tableHeader: Color(0xFFF4EFE5),
  );

  static const dark = AppPalette(
    canvas: Color(0xFF0E0F26),
    canvasAlt: Color(0xFF151738),
    card: Color(0xFF17193D),
    border: Color(0xFF2C2F5E),
    text: Color(0xFFE9E7F5),
    textMuted: Color(0xFFA3A5C8),
    heading: Color(0xFFF1EBDB),
    accent: DesktopColors.gold,
    accentText: Color(0xFFE6C463),
    retro: Color(0xFFE29AB9),
    chartLine: Color(0xFF8E91C9),
    chartBg: Color(0xFF121433),
    lagnaFill: Color(0x2BD9B13B),
    zebra: Color(0xFF1B1D45),
    highlightRow: Color(0x33D9B13B),
    sidebar: Color(0xFF0A0B1F),
    sidebarText: Color(0xFFE9E7F5),
    sidebarMuted: Color(0xFF8D90BA),
    sidebarSelected: Color(0xFF22255A),
    topBar: Color(0xFF13153A),
    success: Color(0xFF34D399),
    warning: Color(0xFFF6C453),
    error: Color(0xFFF87171),
    tableHeader: Color(0xFF1F2250),
  );

  @override
  AppPalette copyWith() => this;

  @override
  AppPalette lerp(ThemeExtension<AppPalette>? other, double t) {
    if (other is! AppPalette) return this;
    Color l(Color a, Color b) => Color.lerp(a, b, t)!;
    return AppPalette(
      canvas: l(canvas, other.canvas),
      canvasAlt: l(canvasAlt, other.canvasAlt),
      card: l(card, other.card),
      border: l(border, other.border),
      text: l(text, other.text),
      textMuted: l(textMuted, other.textMuted),
      heading: l(heading, other.heading),
      accent: l(accent, other.accent),
      accentText: l(accentText, other.accentText),
      retro: l(retro, other.retro),
      chartLine: l(chartLine, other.chartLine),
      chartBg: l(chartBg, other.chartBg),
      lagnaFill: l(lagnaFill, other.lagnaFill),
      zebra: l(zebra, other.zebra),
      highlightRow: l(highlightRow, other.highlightRow),
      sidebar: l(sidebar, other.sidebar),
      sidebarText: l(sidebarText, other.sidebarText),
      sidebarMuted: l(sidebarMuted, other.sidebarMuted),
      sidebarSelected: l(sidebarSelected, other.sidebarSelected),
      topBar: l(topBar, other.topBar),
      success: l(success, other.success),
      warning: l(warning, other.warning),
      error: l(error, other.error),
      tableHeader: l(tableHeader, other.tableHeader),
    );
  }
}

extension PaletteContext on BuildContext {
  AppPalette get palette => Theme.of(this).extension<AppPalette>() ?? AppPalette.light;
}

/// Spacing scale (4-pt grid) used for consistent layout.
class Gap {
  Gap._();
  static const xs = 4.0;
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const xl = 24.0;
  static const xxl = 32.0;
}

/// Durations for the app's subtle motion (150–250 ms).
class Motion {
  Motion._();
  static const fast = Duration(milliseconds: 150);
  static const medium = Duration(milliseconds: 200);
  static const slow = Duration(milliseconds: 250);
  static const curve = Curves.easeOutCubic;
}

/// Tabular (fixed-width) digits so numbers line up in tables.
const tabularFigures = [FontFeature.tabularFigures()];

/// System fonts used as fallbacks for symbols (degree, prime, dashes) on every OS.
const fontFallback = ['Noto Sans', 'Segoe UI', 'Helvetica Neue', 'DejaVu Sans', 'Arial'];

ThemeData buildDesktopTheme({Brightness brightness = Brightness.light}) {
  final dark = brightness == Brightness.dark;
  final pal = dark ? AppPalette.dark : AppPalette.light;
  final scheme = ColorScheme.fromSeed(
    seedColor: DesktopColors.primary,
    brightness: brightness,
  ).copyWith(
    primary: dark ? const Color(0xFFC9C6F5) : DesktopColors.primary,
    onPrimary: dark ? DesktopColors.midnight : Colors.white,
    secondary: dark ? const Color(0xFFB7ACE6) : DesktopColors.secondary,
    tertiary: DesktopColors.gold,
    onTertiary: DesktopColors.midnight,
    surface: pal.card,
    onSurface: pal.text,
    onSurfaceVariant: pal.textMuted,
    surfaceContainerLowest: pal.card,
    surfaceContainerLow: pal.card,
    surfaceContainer: pal.canvasAlt,
    surfaceContainerHigh: pal.canvasAlt,
    surfaceContainerHighest: pal.tableHeader,
    outline: pal.border,
    outlineVariant: pal.border,
    error: pal.error,
    secondaryContainer: dark ? const Color(0xFF2C2F66) : const Color(0xFFE9E5F5),
    onSecondaryContainer: pal.text,
    primaryContainer: dark ? const Color(0xFF2C2F66) : const Color(0xFFE3E1F4),
    onPrimaryContainer: pal.text,
  );

  final base = ThemeData(useMaterial3: true, colorScheme: scheme, brightness: brightness);
  final text = base.textTheme.apply(bodyColor: pal.text, displayColor: pal.heading, fontFamilyFallback: fontFallback);
  final textTheme = text.copyWith(
    headlineSmall: text.headlineSmall?.copyWith(fontSize: 24, fontWeight: FontWeight.w700, color: pal.heading, letterSpacing: -0.2),
    titleLarge: text.titleLarge?.copyWith(fontSize: 19, fontWeight: FontWeight.w700, color: pal.heading),
    titleMedium: text.titleMedium?.copyWith(fontSize: 15, fontWeight: FontWeight.w600, color: pal.heading),
    titleSmall: text.titleSmall?.copyWith(fontSize: 13.5, fontWeight: FontWeight.w700, color: pal.heading),
    bodyLarge: text.bodyLarge?.copyWith(fontSize: 14.5, height: 1.4),
    bodyMedium: text.bodyMedium?.copyWith(fontSize: 13.5, height: 1.4),
    bodySmall: text.bodySmall?.copyWith(fontSize: 12, color: pal.textMuted, height: 1.35),
    labelLarge: text.labelLarge?.copyWith(fontSize: 13.5, fontWeight: FontWeight.w600),
    labelMedium: text.labelMedium?.copyWith(fontSize: 12.5),
    labelSmall: text.labelSmall?.copyWith(fontSize: 11, letterSpacing: 0.6, fontWeight: FontWeight.w600, color: pal.textMuted),
  );

  // Every component text style derives from the theme font so typography is consistent
  // (a bare TextStyle would fall back to a different engine default font).
  final font = textTheme.bodyMedium!;
  TextStyle ts({double? size, FontWeight? weight, Color? color}) => font.copyWith(fontSize: size, fontWeight: weight, color: color, height: 1.2);

  const radius = BorderRadius.all(Radius.circular(8));
  return base.copyWith(
    extensions: [pal],
    textTheme: textTheme,
    scaffoldBackgroundColor: pal.canvas,
    canvasColor: pal.canvas,
    visualDensity: VisualDensity.standard,
    dividerColor: pal.border,
    dividerTheme: DividerThemeData(color: pal.border, thickness: 1, space: 1),
    cardTheme: CardThemeData(
      color: pal.card,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(side: BorderSide(color: pal.border), borderRadius: const BorderRadius.all(Radius.circular(10))),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: pal.card,
      surfaceTintColor: Colors.transparent,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(14))),
      titleTextStyle: textTheme.titleLarge,
    ),
    tooltipTheme: TooltipThemeData(
      waitDuration: const Duration(milliseconds: 450),
      textStyle: ts(size: 12.5, color: dark ? DesktopColors.midnight : Colors.white),
      decoration: BoxDecoration(color: dark ? const Color(0xFFE9E7F5) : const Color(0xF0121440), borderRadius: const BorderRadius.all(Radius.circular(6))),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: dark ? const Color(0xFF111332) : Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      border: OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: pal.border)),
      enabledBorder: OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: pal.border)),
      focusedBorder: OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: scheme.primary, width: 1.6)),
      errorBorder: OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: pal.error)),
      labelStyle: ts(color: pal.textMuted),
      helperStyle: ts(color: pal.textMuted, size: 12),
      errorStyle: ts(color: pal.error, size: 12.5, weight: FontWeight.w500),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(0, 40),
        padding: const EdgeInsets.symmetric(horizontal: 18),
        shape: const RoundedRectangleBorder(borderRadius: radius),
        textStyle: ts(weight: FontWeight.w600, size: 13.5),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 40),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        foregroundColor: scheme.primary,
        side: BorderSide(color: pal.border),
        shape: const RoundedRectangleBorder(borderRadius: radius),
        textStyle: ts(weight: FontWeight.w600, size: 13.5),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: scheme.primary,
        shape: const RoundedRectangleBorder(borderRadius: radius),
        textStyle: ts(weight: FontWeight.w600, size: 13),
      ),
    ),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: SegmentedButton.styleFrom(
        visualDensity: VisualDensity.compact,
        selectedBackgroundColor: dark ? const Color(0xFF2C2F66) : const Color(0xFFE9E5F5),
        side: BorderSide(color: pal.border),
        textStyle: ts(size: 12.5, weight: FontWeight.w600),
      ),
    ),
    menuTheme: MenuThemeData(
      style: MenuStyle(
        backgroundColor: WidgetStatePropertyAll(pal.card),
        surfaceTintColor: const WidgetStatePropertyAll(Colors.transparent),
        side: WidgetStatePropertyAll(BorderSide(color: pal.border)),
        shape: const WidgetStatePropertyAll(RoundedRectangleBorder(borderRadius: radius)),
        padding: const WidgetStatePropertyAll(EdgeInsets.symmetric(vertical: 6)),
      ),
    ),
    menuBarTheme: MenuBarThemeData(
      style: MenuStyle(
        backgroundColor: WidgetStatePropertyAll(pal.topBar),
        surfaceTintColor: const WidgetStatePropertyAll(Colors.transparent),
        elevation: const WidgetStatePropertyAll(0),
        padding: const WidgetStatePropertyAll(EdgeInsets.symmetric(horizontal: 6)),
        shape: const WidgetStatePropertyAll(RoundedRectangleBorder()),
      ),
    ),
    menuButtonTheme: MenuButtonThemeData(
      style: MenuItemButton.styleFrom(
        minimumSize: const Size(0, 34),
        padding: const EdgeInsets.symmetric(horizontal: 14),
        textStyle: ts(size: 13.5),
      ),
    ),
    popupMenuTheme: PopupMenuThemeData(color: pal.card, surfaceTintColor: Colors.transparent, textStyle: ts(color: pal.text, size: 13.5)),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      width: 520,
      backgroundColor: dark ? const Color(0xFFE9E7F5) : DesktopColors.primary,
      contentTextStyle: ts(color: dark ? DesktopColors.midnight : Colors.white, size: 13.5),
      shape: const RoundedRectangleBorder(borderRadius: radius),
    ),
    chipTheme: ChipThemeData(
      side: BorderSide(color: pal.border),
      shape: const StadiumBorder(),
      labelStyle: ts(size: 12.5, color: pal.text),
      selectedColor: dark ? const Color(0xFF2C2F66) : const Color(0xFFE9E5F5),
      backgroundColor: pal.card,
    ),
    tabBarTheme: TabBarThemeData(labelColor: pal.heading, unselectedLabelColor: pal.textMuted, indicatorColor: DesktopColors.gold),
    scrollbarTheme: ScrollbarThemeData(
      thickness: const WidgetStatePropertyAll(8),
      radius: const Radius.circular(4),
      thumbColor: WidgetStatePropertyAll(pal.textMuted.withValues(alpha: 0.35)),
    ),
    expansionTileTheme: ExpansionTileThemeData(
      iconColor: pal.textMuted,
      collapsedIconColor: pal.textMuted,
      shape: const Border(),
      collapsedShape: const Border(),
    ),
    listTileTheme: ListTileThemeData(iconColor: pal.textMuted, textColor: pal.text),
    progressIndicatorTheme: ProgressIndicatorThemeData(color: DesktopColors.gold, linearTrackColor: pal.border.withValues(alpha: 0.5)),
  );
}
