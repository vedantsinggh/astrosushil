import 'dart:math' as math;
// NOTE: use Material `Icons.*` only. `cupertino_icons` is not a dependency of
// this app, so `CupertinoIcons.*` glyphs would render as empty boxes.
import 'dart:ui' show ImageFilter;

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart' show OverScrollHeaderStretchConfiguration, SliverConstraints;
import 'package:flutter/services.dart';

import '../../l10n/app_localizations.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme_tokens.dart';
import '../theme/app_typography.dart';
import 'astro_platform.dart';

/// Visual flavours of the shared adaptive navigation bar.
///
/// * [standard] — cream canvas, navy title, indigo tint. Becomes frosted
///   glass with a hairline once content scrolls under it.
/// * [accent] — [standard] plus a short gold underline beneath the large
///   title. The default: a quiet brand touch.
/// * [hero] — navy→indigo gradient with white title, gold tint and a thin
///   gold line along the bottom edge. Use on at most one "hero" screen per
///   flow (shop front, report viewer, etc.).
enum AstroNavBarStyle { standard, accent, hero }

/// Resolved colours for a nav bar style.
class _NavPalette {
  final Color title;
  final Color tint;
  final bool dark;

  const _NavPalette({required this.title, required this.tint, required this.dark});

  static _NavPalette of(AstroNavBarStyle style, {Color? foreground}) {
    if (style == AstroNavBarStyle.hero) {
      return _NavPalette(title: foreground ?? Colors.white, tint: foreground ?? AppColors.gold, dark: true);
    }
    return _NavPalette(
      title: foreground ?? AppColors.textPrimary,
      tint: foreground ?? AppColors.accent,
      dark: false,
    );
  }
}

/// A pinned bar bottom (`AstroSliverNavBar.bottom` / `AstroPage.navBottom`)
/// whose height depends on the available width and text size, such as
/// `AstroSegmentedNavBottom`. The sliver bar asks [heightFor] at layout time
/// instead of trusting a fixed [preferredSize], so the slot always fits its
/// content (and nothing falls through to the page underneath).
abstract class AstroAdaptiveBottom implements PreferredSizeWidget {
  /// Height needed when the bar is [width] wide.
  double heightFor(BuildContext context, double width);
}

/// Extra horizontal inset that lines the bar's leading / trailing items and
/// large title up with the page's content column, which `AstroPage` /
/// `AstroSliverContent` centre at [AstroMetrics.maxContentWidth] on tablets.
/// Zero on phones.
double astroContentInset(double width) =>
    math.max(0.0, (width - AstroMetrics.maxContentWidth) / 2 - AstroMetrics.gutter);

/// Max text scale inside the compact bar row (back label, compact title,
/// actions) so the bar stays usable at 2.0x. Page content is never capped.
const double _kBarMaxTextScale = 1.3;

/// Max text scale for the large title. Large titles wrap (and step down in
/// size) instead of truncating.
const double _kLargeTitleMaxTextScale = 1.35;

// =============================================================================
// Back button & bar actions
// =============================================================================

/// Adaptive back button.
///
/// * iOS: chevron + label (defaults to the localized "Back"), 44pt min,
///   opacity feedback on press. Full-screen dialogs get a "Close" text button.
/// * Android: Material `arrow_back` icon button (close icon for full-screen
///   dialogs), 48dp, ripple, label as tooltip / semantics only.
class AstroBackButton extends StatelessWidget {
  final String? label;
  final VoidCallback? onPressed;
  final Color? color;

  const AstroBackButton({super.key, this.label, this.onPressed, this.color});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final route = ModalRoute.of(context);
    final isDialog = route is PageRoute && route.fullscreenDialog;
    final text = label ?? (isDialog ? (l10n?.commonClose ?? 'Close') : (l10n?.commonBack ?? 'Back'));
    final tint = color ?? AppColors.accent;
    final maxLabelWidth = math.max(64.0, MediaQuery.sizeOf(context).width * 0.32);
    final pop = onPressed ?? () => Navigator.of(context).maybePop();

    if (!AstroPlatform.isCupertino(context)) {
      return Padding(
        padding: const EdgeInsets.only(left: 4),
        child: IconButton(
          onPressed: pop,
          tooltip: text,
          color: tint,
          iconSize: 24,
          constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
          icon: Icon(isDialog ? Icons.close_rounded : AstroIcons.back(context)),
        ),
      );
    }

    // Like iOS: drop the text and keep the chevron when the bar is tight
    // (narrow phone and/or large text), so the title keeps its room.
    final scale = MediaQuery.textScalerOf(context).clamp(maxScaleFactor: _kBarMaxTextScale).scale(1);
    final showLabel = isDialog || MediaQuery.sizeOf(context).width / scale >= 300;

    return Tooltip(
      message: text,
      excludeFromSemantics: true,
      child: AstroPressable(
        semanticLabel: text,
        onPressed: pop,
        child: Padding(
          padding: EdgeInsets.only(left: isDialog ? 12 : 4, right: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (!isDialog) Icon(Icons.arrow_back_ios_new_rounded, size: 21, color: tint),
              if (showLabel)
                ConstrainedBox(
                constraints: BoxConstraints(maxWidth: maxLabelWidth),
                child: Text(
                  text,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  softWrap: false,
                  style: AppTypography.navAction.copyWith(color: tint),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A trailing nav bar action: an icon (with a required tooltip that is also
/// its accessibility label) or, with [AstroNavAction.text], a text button
/// such as "Done". iOS: 44pt with press highlight; Android: 48dp
/// `IconButton` / `TextButton` with ripple.
class AstroNavAction extends StatelessWidget {
  final IconData? icon;
  final String label;
  final VoidCallback? onPressed;
  final bool isText;
  final bool emphasized;
  final Color? color;

  /// Icon action. [tooltip] is shown on long-press and read by screen readers.
  const AstroNavAction({
    super.key,
    required IconData this.icon,
    required String tooltip,
    required this.onPressed,
    this.color,
  })  : label = tooltip,
        isText = false,
        emphasized = false;

  /// Text action ("Done", "Edit"). [emphasized] makes it semibold, like
  /// the iOS confirm action.
  const AstroNavAction.text({
    super.key,
    required this.label,
    required this.onPressed,
    this.emphasized = false,
    this.color,
  })  : icon = null,
        isText = true;

  /// Widest a text action may get, as a share of the screen width. Longer
  /// labels (or very large text) scale down instead of overflowing, so
  /// [AstroNavAction.text] is safe outside a nav bar too.
  static const double _maxTextWidthFactor = 0.45;

  /// One-line label that scales down rather than overflow its row.
  Widget _textLabel(BuildContext context, Color tint, FontWeight weight) {
    return ConstrainedBox(
      constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * _maxTextWidthFactor),
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Text(
          label,
          maxLines: 1,
          softWrap: false,
          style: AppTypography.navAction.copyWith(color: tint, fontWeight: weight),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tint = color ?? IconTheme.of(context).color ?? AppColors.accent;
    final child = isText
        ? Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: _textLabel(context, tint, emphasized ? FontWeight.w700 : FontWeight.w500),
          )
        : Icon(icon, size: 24, color: tint);

    if (!AstroPlatform.isCupertino(context)) {
      if (isText) {
        return TextButton(
          onPressed: onPressed,
          style: TextButton.styleFrom(foregroundColor: tint, minimumSize: const Size(48, 48)),
          child: _textLabel(context, tint, emphasized ? FontWeight.w700 : FontWeight.w600),
        );
      }
      return IconButton(
        onPressed: onPressed,
        tooltip: label,
        color: tint,
        constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
        icon: Icon(icon, size: 24),
      );
    }

    return Tooltip(
      message: label,
      excludeFromSemantics: true,
      child: AstroPressable(semanticLabel: label, onPressed: onPressed, child: child),
    );
  }
}

/// Minimal iOS-style pressable: dims to 40% while pressed, 44x44pt minimum,
/// exposed to assistive tech as a button with [semanticLabel].
class AstroPressable extends StatefulWidget {
  final Widget child;
  final VoidCallback? onPressed;
  final String? semanticLabel;
  final double minSize;

  const AstroPressable({
    super.key,
    required this.child,
    required this.onPressed,
    this.semanticLabel,
    this.minSize = AppTouchTargets.ios,
  });

  @override
  State<AstroPressable> createState() => _AstroPressableState();
}

class _AstroPressableState extends State<AstroPressable> {
  bool _down = false;

  void _set(bool v) {
    if (_down != v && mounted) setState(() => _down = v);
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onPressed != null;
    return Semantics(
      button: true,
      enabled: enabled,
      label: widget.semanticLabel,
      excludeSemantics: widget.semanticLabel != null,
      child: MouseRegion(
        cursor: enabled ? SystemMouseCursors.click : MouseCursor.defer,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: enabled ? (_) => _set(true) : null,
          onTapCancel: () => _set(false),
          onTapUp: (_) => _set(false),
          onTap: widget.onPressed,
          child: ConstrainedBox(
            constraints: BoxConstraints(minWidth: widget.minSize, minHeight: widget.minSize),
            child: AnimatedOpacity(
              duration: Duration(milliseconds: _down ? 10 : 160),
              opacity: !enabled ? 0.35 : (_down ? 0.4 : 1),
              child: Center(widthFactor: 1, heightFactor: 1, child: widget.child),
            ),
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// Shared bar pieces
// =============================================================================

Widget? _resolveLeading(
  BuildContext context, {
  required Widget? leading,
  required bool showBack,
  required VoidCallback? onBack,
  required String? backLabel,
  required Color tint,
}) {
  if (leading != null) return leading;
  if (!showBack) return null;
  final canPop = ModalRoute.of(context)?.impliesAppBarDismissal ?? Navigator.of(context).canPop();
  if (onBack == null && !canPop) return null;
  return AstroBackButton(label: backLabel, onPressed: onBack, color: tint);
}

/// Applies the bar's tint to legacy `IconButton` / `TextButton` actions that
/// screens pass in, so they match [AstroNavAction].
Widget _tintActions(Color tint, Widget child) {
  return IconTheme.merge(
    data: IconThemeData(color: tint, size: 24),
    child: IconButtonTheme(
      data: IconButtonThemeData(
        style: IconButton.styleFrom(foregroundColor: tint, minimumSize: const Size(44, 44)),
      ),
      child: TextButtonTheme(
        data: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: tint,
            minimumSize: const Size(44, 44),
            textStyle: AppTypography.navAction.copyWith(fontWeight: FontWeight.w600),
          ),
        ),
        child: child,
      ),
    ),
  );
}

class _BarRow extends StatelessWidget {
  final Widget? leading;
  final Widget? middle;
  final List<Widget>? actions;
  final Color tint;
  final double height;

  /// Extra side inset (tablet content column), see [astroContentInset].
  final double inset;

  const _BarRow({
    required this.leading,
    required this.middle,
    required this.actions,
    required this.tint,
    this.height = AstroMetrics.navBarHeight,
    this.inset = 0,
  });

  @override
  Widget build(BuildContext context) {
    final trailing = (actions == null || actions!.isEmpty)
        ? null
        : Padding(
            padding: const EdgeInsets.only(right: 6),
            child: Row(mainAxisSize: MainAxisSize.min, children: actions!),
          );
    return MediaQuery.withClampedTextScaling(
      maxScaleFactor: _kBarMaxTextScale,
      child: _tintActions(
        tint,
        Container(
          height: height,
          padding: EdgeInsets.symmetric(horizontal: inset),
          child: NavigationToolbar(
            leading: leading,
            middle: middle,
            trailing: trailing,
            // iOS centres the compact title; Android aligns it to the start.
            centerMiddle: AstroPlatform.isCupertino(context),
            middleSpacing: AstroPlatform.isCupertino(context) ? 8 : (leading == null ? AstroMetrics.gutter + 2 : 12),
          ),
        ),
      ),
    );
  }
}

class _CompactTitle extends StatelessWidget {
  final String? title;
  final Widget? titleWidget;
  final Color color;

  const _CompactTitle({required this.title, required this.titleWidget, required this.color});

  @override
  Widget build(BuildContext context) {
    if (titleWidget != null) {
      return DefaultTextStyle.merge(style: AppTypography.navTitle.copyWith(color: color), child: titleWidget!);
    }
    if (title == null) return const SizedBox.shrink();
    return Semantics(
      header: true,
      child: Text(
        title!,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        softWrap: false,
        textAlign: AstroPlatform.isCupertino(context) ? TextAlign.center : TextAlign.start,
        style: AppTypography.navTitle.copyWith(color: color),
      ),
    );
  }
}

/// Frosted glass background (blur + ~82% cream) with a hairline bottom
/// border. [amount] 0..1 fades both in.
class _FrostedBackground extends StatelessWidget {
  final double amount;
  const _FrostedBackground({required this.amount});

  @override
  Widget build(BuildContext context) {
    if (amount <= 0) return const SizedBox.expand();
    final hairline = 1 / MediaQuery.devicePixelRatioOf(context);
    return Opacity(
      opacity: amount.clamp(0.0, 1.0),
      child: ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: AppColors.navBarFrost,
              border: Border(bottom: BorderSide(color: AppColors.separator, width: math.max(hairline, 0.5))),
            ),
            child: const SizedBox.expand(),
          ),
        ),
      ),
    );
  }
}

/// Navy→indigo gradient background with a thin gold line at the bottom.
class _HeroBackground extends StatelessWidget {
  const _HeroBackground();

  @override
  Widget build(BuildContext context) {
    return const DecoratedBox(
      decoration: BoxDecoration(gradient: AppGradients.heroNavy),
      child: Align(
        alignment: Alignment.bottomCenter,
        child: SizedBox(
          height: 1,
          width: double.infinity,
          child: DecoratedBox(decoration: BoxDecoration(gradient: AppGradients.goldLine)),
        ),
      ),
    );
  }
}

// =============================================================================
// Plain (box) nav bar
// =============================================================================

/// Shared adaptive navigation bar as a plain `PreferredSizeWidget`, for
/// `Scaffold.appBar`. Compact centred serif title, chevron + "Back" in the
/// accent colour, optional trailing [actions]. Transparent at rest; turns to
/// frosted glass with a hairline when the page body scrolls under it.
///
/// Prefer [AstroSliverNavBar] (or `AstroPage`) for new screens: it adds the
/// iOS large title that collapses into this compact bar.
///
/// ```dart
/// Scaffold(
///   appBar: AstroNavBar(
///     title: 'Order details',
///     actions: [AstroNavAction(icon: Icons.ios_share_rounded, tooltip: 'Share', onPressed: share)],
///   ),
///   body: ...,
/// )
/// ```
class AstroNavBar extends StatefulWidget implements PreferredSizeWidget {
  final String? title;

  /// Custom compact title (overrides [title]).
  final Widget? titleWidget;

  /// Replaces the automatic back button.
  final Widget? leading;
  final List<Widget>? actions;

  /// Show the automatic back button when the route can be popped (or when
  /// [onBack] is given).
  final bool showBack;
  final VoidCallback? onBack;

  /// Back label; defaults to the localized "Back".
  final String? backLabel;
  final AstroNavBarStyle style;

  /// Optional widget under the bar row (e.g. a segmented control).
  final PreferredSizeWidget? bottom;

  /// Overrides the title / tint colour.
  final Color? foregroundColor;

  /// Solid background override (disables the frosted effect).
  final Color? backgroundColor;

  /// Bar row height. Raise it (e.g. 64) for a two-line custom [titleWidget].
  final double toolbarHeight;

  const AstroNavBar({
    super.key,
    this.title,
    this.titleWidget,
    this.leading,
    this.actions,
    this.showBack = true,
    this.onBack,
    this.backLabel,
    this.style = AstroNavBarStyle.accent,
    this.bottom,
    this.foregroundColor,
    this.backgroundColor,
    this.toolbarHeight = AstroMetrics.navBarHeight,
  });

  @override
  Size get preferredSize => Size.fromHeight(toolbarHeight + (bottom?.preferredSize.height ?? 0));

  @override
  State<AstroNavBar> createState() => _AstroNavBarState();
}

class _AstroNavBarState extends State<AstroNavBar> {
  ScrollNotificationObserverState? _observer;
  bool _scrolledUnder = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _observer?.removeListener(_onScroll);
    _observer = ScrollNotificationObserver.maybeOf(context);
    _observer?.addListener(_onScroll);
  }

  @override
  void dispose() {
    _observer?.removeListener(_onScroll);
    _observer = null;
    super.dispose();
  }

  void _onScroll(ScrollNotification n) {
    if (n is! ScrollUpdateNotification || n.depth != 0) return;
    if (n.metrics.axis != Axis.vertical) return;
    final under = n.metrics.extentBefore > 0.5;
    if (under != _scrolledUnder && mounted) setState(() => _scrolledUnder = under);
  }

  @override
  Widget build(BuildContext context) {
    final w = widget;
    final palette = _NavPalette.of(w.style, foreground: w.foregroundColor);
    final topPad = MediaQuery.paddingOf(context).top;
    final leading = _resolveLeading(
      context,
      leading: w.leading,
      showBack: w.showBack,
      onBack: w.onBack,
      backLabel: w.backLabel,
      tint: palette.tint,
    );

    final Widget background;
    if (w.backgroundColor != null) {
      background = ColoredBox(color: w.backgroundColor!);
    } else if (w.style == AstroNavBarStyle.hero) {
      background = const _HeroBackground();
    } else {
      background = TweenAnimationBuilder<double>(
        tween: Tween(end: _scrolledUnder ? 1 : 0),
        duration: const Duration(milliseconds: 180),
        builder: (context, v, _) => _FrostedBackground(amount: v),
      );
    }

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: AstroPlatform.overlayStyle(dark: palette.dark),
      child: Material(
        type: MaterialType.transparency,
        child: Stack(
          children: [
            Positioned.fill(child: background),
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(height: topPad),
                _BarRow(
                  leading: leading,
                  middle: _CompactTitle(title: w.title, titleWidget: w.titleWidget, color: palette.title),
                  actions: w.actions,
                  tint: palette.tint,
                  height: w.toolbarHeight,
                ),
                if (w.bottom != null) w.bottom!,
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// Sliver nav bar with collapsing large title
// =============================================================================

/// Shared adaptive large-title navigation bar (iOS large title / Material 3
/// large top app bar) for `CustomScrollView`s.
///
/// A left-aligned serif large title (34pt, tight tracking) sits under the
/// bar row and slides up beneath it on scroll; a compact centred title fades
/// in once it is gone. The bar turns to frosted glass with a hairline only
/// when content scrolls under it. Long titles wrap (up to 3 lines) and step
/// down in size; only the compact title ellipsizes.
///
/// Place it first in the slivers list (or use `AstroPage`, which does it
/// for you):
///
/// ```dart
/// CustomScrollView(slivers: [
///   const AstroSliverNavBar(title: 'Settings'),
///   SliverToBoxAdapter(child: ...),
/// ])
/// ```
class AstroSliverNavBar extends StatelessWidget {
  final String title;

  /// Optional one-line context under the large title (e.g. a date or name).
  final String? subtitle;
  final Widget? leading;
  final List<Widget>? actions;
  final bool showBack;
  final VoidCallback? onBack;
  final String? backLabel;
  final AstroNavBarStyle style;

  /// When false only the compact bar is shown (no large title).
  final bool largeTitle;

  /// Optional pinned widget under the bar row (e.g. a segmented control).
  final PreferredSizeWidget? bottom;

  const AstroSliverNavBar({
    super.key,
    required this.title,
    this.subtitle,
    this.leading,
    this.actions,
    this.showBack = true,
    this.onBack,
    this.backLabel,
    this.style = AstroNavBarStyle.accent,
    this.largeTitle = true,
    this.bottom,
  });

  static TextStyle largeTitleStyle(double fontSize, Color color) =>
      AppTypography.largeTitle.copyWith(fontSize: fontSize, color: color, letterSpacing: -0.02 * fontSize);

  static const TextStyle _subtitleStyle = TextStyle(
    fontFamily: AppTypography.bodyFamily,
    fontFamilyFallback: AppTypography.bodyFontFamilies,
    fontSize: 15,
    fontWeight: FontWeight.w500,
    height: 1.3,
  );

  /// Max text scale for the subtitle.
  static const double _subtitleMaxTextScale = 1.6;

  /// Large title block paddings and gaps (shared by measuring and painting).
  static const double _blockSide = AstroMetrics.gutter + 2;
  static const double _blockTop = 2;
  static const double _blockBottom = 12;
  static const double _subtitleGap = 4;
  static const double _accentGap = 10;
  static const double _accentHeight = 3;

  @override
  Widget build(BuildContext context) {
    // Rebuild (and re-measure) when fonts finish loading, so the expanded
    // height never lags behind the real glyph metrics.
    return ListenableBuilder(
      listenable: PaintingBinding.instance.systemFonts,
      builder: (context, _) => SliverLayoutBuilder(builder: _buildForWidth),
    );
  }

  Widget _buildForWidth(BuildContext context, SliverConstraints constraints) {
    final mq = MediaQuery.of(context);
    final palette = _NavPalette.of(style);
    final width = constraints.crossAxisExtent;
    final inset = astroContentInset(width);
    final textWidth = math.max(80.0, width - 2 * (inset + _blockSide));

    double largeExtent = 0;
    double fontSize = 34;
    if (largeTitle) {
      // Measure exactly what _LargeTitleBlock paints: same effective style
      // (merged with the ambient DefaultTextStyle), text scaler, locale,
      // height behaviour and width.
      final defaults = DefaultTextStyle.of(context);
      final locale = Localizations.maybeLocaleOf(context);
      final dir = Directionality.of(context);
      final heightBehavior = DefaultTextHeightBehavior.maybeOf(context) ?? defaults.textHeightBehavior;
      TextPainter painter(String text, TextStyle style, TextScaler scaler, int maxLines) => TextPainter(
            text: TextSpan(text: text, style: defaults.style.merge(style)),
            textDirection: dir,
            textScaler: scaler,
            locale: locale,
            maxLines: maxLines,
            ellipsis: '…',
            textHeightBehavior: heightBehavior,
            textWidthBasis: defaults.textWidthBasis,
          )..layout(maxWidth: textWidth);

      final scaler = mq.textScaler.clamp(maxScaleFactor: _kLargeTitleMaxTextScale);
      TextPainter measure(double size, int lines) => painter(title, largeTitleStyle(size, palette.title), scaler, lines);
      // Up to 3 lines while stepping 34 -> 24pt; if still too long, up to
      // 4 lines stepping down to 18pt. Only past that does it ellipsize.
      var tp = measure(fontSize, 3);
      while (tp.didExceedMaxLines && fontSize > 24) {
        tp.dispose();
        fontSize -= 2;
        tp = measure(fontSize, 3);
      }
      while (tp.didExceedMaxLines && fontSize > 18) {
        tp.dispose();
        tp = measure(fontSize, 4);
        if (tp.didExceedMaxLines) fontSize -= 2;
      }
      // Always measure at the final size with the 4 lines the block allows.
      tp.dispose();
      tp = measure(fontSize, 4);
      largeExtent = _blockTop + tp.height + _blockBottom;
      tp.dispose();
      if (subtitle != null) {
        final sp = painter(
          subtitle!,
          _subtitleStyle,
          mq.textScaler.clamp(maxScaleFactor: _subtitleMaxTextScale),
          2,
        );
        largeExtent += _subtitleGap + sp.height;
        sp.dispose();
      }
      if (style == AstroNavBarStyle.accent) largeExtent += _accentGap + _accentHeight;
      largeExtent = largeExtent.ceilToDouble() + 1;
    }

    final leading = _resolveLeading(
      context,
      leading: this.leading,
      showBack: showBack,
      onBack: onBack,
      backLabel: backLabel,
      tint: palette.tint,
    );

    final b = bottom;
    final bottomHeight = b == null ? 0.0 : (b is AstroAdaptiveBottom ? b.heightFor(context, width) : b.preferredSize.height);

    return SliverPersistentHeader(
      pinned: true,
      delegate: _AstroNavDelegate(
        bar: this,
        palette: palette,
        leading: leading,
        topPadding: mq.padding.top,
        largeExtent: largeExtent,
        largeFontSize: fontSize,
        inset: inset,
        bottomHeight: bottomHeight,
      ),
    );
  }

  /// Total height of a collapsed [AstroSliverNavBar] (status bar + bar row
  /// + pinned bottom): what stays on screen over scrolled content.
  /// `AstroScroll.reveal` uses the live value; this is for layout math.
  static double collapsedHeight(BuildContext context, {double bottomHeight = 0}) =>
      MediaQuery.paddingOf(context).top + AstroMetrics.navBarHeight + bottomHeight;
}

class _AstroNavDelegate extends SliverPersistentHeaderDelegate {
  final AstroSliverNavBar bar;
  final _NavPalette palette;
  final Widget? leading;
  final double topPadding;
  final double largeExtent;
  final double largeFontSize;
  final double inset;
  final double bottomHeight;

  _AstroNavDelegate({
    required this.bar,
    required this.palette,
    required this.leading,
    required this.topPadding,
    required this.largeExtent,
    required this.largeFontSize,
    required this.inset,
    required this.bottomHeight,
  });

  double get _bottomHeight => bottomHeight;

  @override
  double get minExtent => topPadding + AstroMetrics.navBarHeight + _bottomHeight;

  @override
  double get maxExtent => minExtent + largeExtent;

  @override
  OverScrollHeaderStretchConfiguration get stretchConfiguration => OverScrollHeaderStretchConfiguration();

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    final range = maxExtent - minExtent;
    final t = range <= 0 ? 1.0 : (shrinkOffset / range).clamp(0.0, 1.0);
    final under = range <= 0
        ? (shrinkOffset > 0.5 ? 1.0 : 0.0)
        : ((shrinkOffset - range) / 10).clamp(0.0, 1.0);
    final compactOpacity = range <= 0 ? 1.0 : ((t - 0.62) / 0.28).clamp(0.0, 1.0);
    final largeOpacity = (1 - (t - 0.35) / 0.5).clamp(0.0, 1.0);
    final isHero = bar.style == AstroNavBarStyle.hero;

    final largeTitle = largeExtent <= 0 || largeOpacity <= 0
        ? null
        : Opacity(
            opacity: largeOpacity,
            child: _LargeTitleBlock(
              title: bar.title,
              subtitle: bar.subtitle,
              fontSize: largeFontSize,
              palette: palette,
              accent: bar.style == AstroNavBarStyle.accent,
              inset: inset,
            ),
          );

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: AstroPlatform.overlayStyle(dark: palette.dark),
      child: Material(
        type: MaterialType.transparency,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (isHero) const _HeroBackground() else _FrostedBackground(amount: under),
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(height: topPadding),
                _BarRow(
                  leading: leading,
                  middle: compactOpacity <= 0
                      ? null
                      : Opacity(
                          opacity: compactOpacity,
                          child: _CompactTitle(title: bar.title, titleWidget: null, color: palette.title),
                        ),
                  actions: bar.actions,
                  tint: palette.tint,
                  inset: inset,
                ),
                Expanded(
                  child: largeTitle == null
                      ? const SizedBox.shrink()
                      : ClipRect(
                          // Bottom-aligned at its natural height: it slides up
                          // under the bar row as the header shrinks.
                          child: OverflowBox(
                            alignment: Alignment.bottomLeft,
                            minHeight: 0,
                            maxHeight: double.infinity,
                            child: largeTitle,
                          ),
                        ),
                ),
                if (bar.bottom != null) SizedBox(height: bottomHeight, child: bar.bottom!),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  bool shouldRebuild(covariant _AstroNavDelegate old) =>
      old.bar != bar ||
      old.leading != leading ||
      old.topPadding != topPadding ||
      old.largeExtent != largeExtent ||
      old.largeFontSize != largeFontSize ||
      old.inset != inset ||
      old.bottomHeight != bottomHeight;
}

class _LargeTitleBlock extends StatelessWidget {
  final String title;
  final String? subtitle;
  final double fontSize;
  final _NavPalette palette;
  final bool accent;
  final double inset;

  const _LargeTitleBlock({
    required this.title,
    required this.subtitle,
    required this.fontSize,
    required this.palette,
    required this.accent,
    this.inset = 0,
  });

  @override
  Widget build(BuildContext context) {
    const side = AstroSliverNavBar._blockSide;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        side + inset,
        AstroSliverNavBar._blockTop,
        side + inset,
        AstroSliverNavBar._blockBottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          MediaQuery.withClampedTextScaling(
            maxScaleFactor: _kLargeTitleMaxTextScale,
            child: Semantics(
              header: true,
              namesRoute: true,
              child: Text(
                title,
                maxLines: 4,
                overflow: TextOverflow.ellipsis,
                style: AstroSliverNavBar.largeTitleStyle(fontSize, palette.title),
              ),
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: AstroSliverNavBar._subtitleGap),
            MediaQuery.withClampedTextScaling(
              maxScaleFactor: AstroSliverNavBar._subtitleMaxTextScale,
              child: Text(
                subtitle!,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: AstroSliverNavBar._subtitleStyle.copyWith(
                  color: palette.dark ? AppColors.textInverseSecondary : AppColors.textSecondary,
                ),
              ),
            ),
          ],
          if (accent) ...[
            const SizedBox(height: AstroSliverNavBar._accentGap),
            Container(
              width: 28,
              height: AstroSliverNavBar._accentHeight,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(2),
                gradient: const LinearGradient(colors: [AppColors.gold, Color(0xFFE9C766)]),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
