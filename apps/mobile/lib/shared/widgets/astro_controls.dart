import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme_tokens.dart';
import '../theme/app_typography.dart';
import 'astro_nav_bar.dart' show AstroAdaptiveBottom;
import 'astro_platform.dart';

// =============================================================================
// Buttons
// =============================================================================

/// Where a button's [icon] sits relative to its label.
///
/// [leading] (the default) suits most actions ("Share", "Download").
/// [trailing] suits forward actions such as "Next", "Continue" or "Read",
/// typically with `Icons.arrow_forward_rounded` / `Icons.chevron_right_rounded`.
enum AstroIconPosition { leading, trailing }

/// The one gold primary action on a screen. 54pt tall, 14pt radius, navy
/// label, soft gold shadow. Full width by default; shows an adaptive
/// spinner while [isLoading].
///
/// ```dart
/// AstroPrimaryButton(
///   label: 'Continue',
///   icon: Icons.arrow_forward_rounded,
///   iconPosition: AstroIconPosition.trailing,
///   onPressed: next,
/// )
/// ```
class AstroPrimaryButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool expand;
  final Key? buttonKey;

  /// Icon before (default) or after the label. The loading spinner always
  /// sits before the label.
  final AstroIconPosition iconPosition;

  const AstroPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    this.expand = true,
    this.buttonKey,
    this.iconPosition = AstroIconPosition.leading,
  });

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && !isLoading;
    final button = ElevatedButton(
      key: buttonKey,
      onPressed: isLoading ? null : onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.gold,
        foregroundColor: AppColors.primary,
        disabledBackgroundColor: isLoading ? AppColors.gold : AppColors.gold.withValues(alpha: 0.45),
        disabledForegroundColor: AppColors.primary.withValues(alpha: isLoading ? 1 : 0.6),
        overlayColor: AppColors.primary,
        elevation: 0,
        minimumSize: Size(expand ? double.infinity : 64, AstroMetrics.buttonHeight),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AstroMetrics.buttonRadius)),
        textStyle: AppTypography.button,
      ),
      child: _ButtonContent(
        label: label,
        icon: icon,
        isLoading: isLoading,
        spinnerColor: AppColors.primary,
        iconPosition: iconPosition,
      ),
    );
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AstroMetrics.buttonRadius),
        boxShadow: enabled ? AstroShadows.goldButton : null,
      ),
      child: expand ? SizedBox(width: double.infinity, child: button) : button,
    );
  }
}

/// Look of [AstroSecondaryButton].
enum AstroSecondaryVariant {
  /// Soft indigo fill, indigo label (iOS "tinted"). The default.
  tinted,

  /// White fill, hairline border, navy label.
  outlined,

  /// Soft red fill, dark red label, for destructive actions.
  destructive,

  /// For dark / gradient surfaces: translucent white fill, white label.
  onDark,
}

/// Secondary action: tinted (default), outlined, destructive or on-dark.
/// 50pt tall, 14pt radius. Full width by default.
class AstroSecondaryButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final AstroSecondaryVariant variant;
  final bool expand;

  /// Overrides the label / icon colour.
  final Color? color;
  final bool isLoading;

  /// Icon before (default) or after the label.
  final AstroIconPosition iconPosition;

  const AstroSecondaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.variant = AstroSecondaryVariant.tinted,
    this.expand = true,
    this.color,
    this.isLoading = false,
    this.iconPosition = AstroIconPosition.leading,
  });

  @override
  Widget build(BuildContext context) {
    final (Color fg, Color bg, BorderSide side) = switch (variant) {
      AstroSecondaryVariant.tinted => (AppColors.accent, AppColors.accentFill, BorderSide.none),
      AstroSecondaryVariant.outlined => (
          AppColors.primary,
          AppColors.cardSurface,
          const BorderSide(color: AppColors.cardBorder, width: 1),
        ),
      AstroSecondaryVariant.destructive => (AppColors.errorText, AppColors.errorBg, BorderSide.none),
      AstroSecondaryVariant.onDark => (
          Colors.white,
          Colors.white.withValues(alpha: 0.12),
          BorderSide(color: Colors.white.withValues(alpha: 0.28)),
        ),
    };
    final effectiveFg = color ?? fg;
    final effectiveSide = (variant == AstroSecondaryVariant.outlined && color != null)
        ? BorderSide(color: color!.withValues(alpha: 0.45), width: 1)
        : side;
    final button = OutlinedButton(
      onPressed: isLoading ? null : onPressed,
      style: OutlinedButton.styleFrom(
        foregroundColor: effectiveFg,
        backgroundColor: bg,
        disabledForegroundColor: effectiveFg.withValues(alpha: 0.45),
        overlayColor: effectiveFg,
        side: effectiveSide,
        minimumSize: Size(expand ? double.infinity : 64, 50),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AstroMetrics.buttonRadius)),
        textStyle: AppTypography.button.copyWith(fontSize: 16, fontWeight: FontWeight.w600),
      ),
      child: _ButtonContent(
        label: label,
        icon: icon,
        isLoading: isLoading,
        spinnerColor: effectiveFg,
        iconSize: 20,
        iconPosition: iconPosition,
      ),
    );
    return expand ? SizedBox(width: double.infinity, child: button) : button;
  }
}

class _ButtonContent extends StatelessWidget {
  final String label;
  final IconData? icon;
  final bool isLoading;
  final Color spinnerColor;
  final double iconSize;
  final AstroIconPosition iconPosition;

  const _ButtonContent({
    required this.label,
    required this.icon,
    required this.isLoading,
    required this.spinnerColor,
    this.iconSize = 22,
    this.iconPosition = AstroIconPosition.leading,
  });

  @override
  Widget build(BuildContext context) {
    final trailingIcon = !isLoading && icon != null && iconPosition == AstroIconPosition.trailing;
    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (isLoading)
          SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator.adaptive(
              strokeWidth: 2.4,
              valueColor: AlwaysStoppedAnimation<Color>(spinnerColor),
            ),
          )
        else if (icon != null && !trailingIcon)
          Icon(icon, size: iconSize),
        if (isLoading || (icon != null && !trailingIcon)) const SizedBox(width: 10),
        Flexible(child: Text(label, textAlign: TextAlign.center)),
        if (trailingIcon) ...[
          const SizedBox(width: 8),
          Icon(icon, size: iconSize),
        ],
      ],
    );
  }
}

// =============================================================================
// Segmented control & pills
// =============================================================================

/// One option in an [AstroSegmentedControl].
class AstroSegment<T> {
  final T value;
  final String label;
  final IconData? icon;

  const AstroSegment({required this.value, required this.label, this.icon});
}

/// How [AstroSegmentedControl] lays its options out at a given width.
enum _SegLayout { row, scaledRow, wrap }

class _SegPlan {
  final _SegLayout layout;
  final double height;
  const _SegPlan(this.layout, this.height);
}

/// iOS sliding segmented control look for 2–4 options: a warm grey track
/// with a white "thumb" that slides to the selected option. Each segment is
/// at least 44pt tall on iOS and 48dp on Android.
///
/// When the labels don't fit on one row (narrow phone, large text) it first
/// stays on one row with the labels scaled down (to no less than 75%), and
/// only then falls back to a wrapping row of [AstroPill]s, so nothing is
/// ever cut off.
///
/// In a fixed-height slot (e.g. `AstroPage.navBottom`) use
/// [AstroSegmentedNavBottom], or size the slot with [preferredHeight], so a
/// wrapped fallback is never clipped or left untappable.
class AstroSegmentedControl<T> extends StatelessWidget {
  final List<AstroSegment<T>> segments;
  final T selected;
  final ValueChanged<T> onChanged;

  /// Use on dark / gradient surfaces.
  final bool onDark;

  const AstroSegmentedControl({
    super.key,
    required this.segments,
    required this.selected,
    required this.onChanged,
    this.onDark = false,
  });

  static const _labelStyle = TextStyle(
    fontFamily: AppTypography.bodyFamily,
    fontFamilyFallback: AppTypography.bodyFontFamilies,
    fontSize: 15,
    fontWeight: FontWeight.w600,
    height: 1.2,
  );

  /// Track padding around the segments (the thumb's inset).
  static const double _trackPadding = 3;

  /// Smallest label scale used before falling back to wrapping pills.
  static const double _minLabelScale = 0.75;

  /// Spacing between wrapped pills (both axes).
  static const double _pillSpacing = 8;

  /// Minimum segment height: 44pt on iOS, 48dp on Android.
  static double segmentMinHeight(BuildContext context) =>
      AstroPlatform.isCupertino(context) ? AppTouchTargets.ios : AppTouchTargets.minTouchTarget;

  /// The height this control will occupy when given [maxWidth], with the
  /// ambient (or the given [textScaler]) text scale. Mirrors the layout the
  /// control picks (one row, scaled-down row or wrapped pills), so a pinned
  /// slot sized with it always fits.
  static double preferredHeight(
    BuildContext context,
    List<AstroSegment<Object?>> segments, {
    required double maxWidth,
    TextScaler? textScaler,
  }) {
    return _plan(
      segments,
      textScaler ?? MediaQuery.textScalerOf(context),
      Directionality.maybeOf(context) ?? TextDirection.ltr,
      Localizations.maybeLocaleOf(context),
      maxWidth,
      segmentMinHeight(context),
    ).height;
  }

  static _SegPlan _plan(
    List<AstroSegment<Object?>> segments,
    TextScaler scaler,
    TextDirection dir,
    Locale? locale,
    double maxWidth,
    double minSegment,
  ) {
    TextPainter paint(String text, TextStyle style, {double width = double.infinity, int? maxLines}) =>
        TextPainter(
          text: TextSpan(text: text, style: style),
          textScaler: scaler,
          textDirection: dir,
          locale: locale,
          maxLines: maxLines,
        )..layout(maxWidth: width);

    double widest = 0;
    double lineHeight = 0;
    for (final s in segments) {
      final tp = paint(s.label, _labelStyle, maxLines: 1);
      final w = tp.width + 24 + (s.icon != null ? scaler.scale(18) + 6 : 0);
      widest = math.max(widest, w);
      lineHeight = math.max(lineHeight, tp.height);
      tp.dispose();
    }
    final rowHeight = math.max(minSegment, lineHeight + 16) + 2 * _trackPadding;
    final rowNeed = widest * segments.length + 4;
    final bounded = maxWidth.isFinite;
    if (bounded && rowNeed <= maxWidth) return _SegPlan(_SegLayout.row, rowHeight);
    if (bounded && maxWidth / rowNeed >= _minLabelScale) return _SegPlan(_SegLayout.scaledRow, rowHeight);

    // Wrapped pills. Over-estimates slightly (bold label, prefix icon on
    // every pill) so a slot sized from this is never too small.
    const pillPadH = 32.0;
    const prefix = 24.0;
    final labelMax = bounded ? math.max(1.0, maxWidth - pillPadH - prefix) : double.infinity;
    double x = 0, rowH = 0, total = 0;
    var rows = 0;
    for (final s in segments) {
      final tp = paint(s.label, AstroPill._labelStyle.copyWith(fontWeight: FontWeight.w700), width: labelMax);
      final w = math.max(AppTouchTargets.minTouchTarget, tp.width + pillPadH + prefix);
      final h = math.max(AppTouchTargets.minTouchTarget, tp.height + 20);
      tp.dispose();
      if (rows == 0) {
        rows = 1;
        x = w;
        rowH = h;
      } else if (bounded && x + _pillSpacing + w > maxWidth) {
        total += rowH + _pillSpacing;
        rows++;
        x = w;
        rowH = h;
      } else {
        x += _pillSpacing + w;
        rowH = math.max(rowH, h);
      }
    }
    total += rowH;
    return _SegPlan(_SegLayout.wrap, total);
  }

  @override
  Widget build(BuildContext context) {
    final scaler = MediaQuery.textScalerOf(context);
    final dir = Directionality.of(context);
    final locale = Localizations.maybeLocaleOf(context);
    final minSegment = segmentMinHeight(context);
    return LayoutBuilder(
      builder: (context, constraints) {
        final plan = _plan(segments, scaler, dir, locale, constraints.maxWidth, minSegment);
        if (plan.layout == _SegLayout.wrap) {
          return Wrap(
            spacing: _pillSpacing,
            runSpacing: _pillSpacing,
            children: [
              for (final s in segments)
                AstroPill(
                  label: s.label,
                  icon: s.icon,
                  selected: s.value == selected,
                  onDark: onDark,
                  onTap: () => onChanged(s.value),
                ),
            ],
          );
        }
        final index = segments.indexWhere((s) => s.value == selected);
        final track = onDark ? Colors.white.withValues(alpha: 0.12) : AppColors.segmentedTrack;
        return Container(
          padding: const EdgeInsets.all(_trackPadding),
          decoration: BoxDecoration(color: track, borderRadius: BorderRadius.circular(12)),
          child: Stack(
            children: [
              if (index >= 0)
                Positioned.fill(
                  child: AnimatedAlign(
                    duration: const Duration(milliseconds: 220),
                    curve: Curves.easeOutCubic,
                    alignment: Alignment(
                      segments.length == 1 ? 0 : -1 + 2 * index / (segments.length - 1),
                      0,
                    ),
                    child: FractionallySizedBox(
                      widthFactor: 1 / segments.length,
                      heightFactor: 1,
                      child: Container(
                        decoration: BoxDecoration(
                          color: onDark ? AppColors.gold : Colors.white,
                          borderRadius: BorderRadius.circular(9),
                          boxShadow: const [
                            BoxShadow(color: Color(0x1F121440), blurRadius: 6, offset: Offset(0, 2)),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              Row(
                children: [
                  for (final s in segments)
                    Expanded(
                      child: _Segment(
                        segment: s,
                        selected: s.value == selected,
                        onDark: onDark,
                        minHeight: minSegment,
                        scaleDown: plan.layout == _SegLayout.scaledRow,
                        onTap: () => onChanged(s.value),
                      ),
                    ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

class _Segment<T> extends StatelessWidget {
  final AstroSegment<T> segment;
  final bool selected;
  final bool onDark;
  final double minHeight;
  final bool scaleDown;
  final VoidCallback onTap;

  const _Segment({
    required this.segment,
    required this.selected,
    required this.onDark,
    required this.minHeight,
    required this.scaleDown,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final fg = onDark
        ? (selected ? AppColors.primary : Colors.white)
        : (selected ? AppColors.textPrimary : AppColors.textSecondary);
    Widget label = Text(
      segment.label,
      maxLines: 1,
      overflow: scaleDown ? TextOverflow.visible : TextOverflow.ellipsis,
      softWrap: false,
      textAlign: TextAlign.center,
      style: AstroSegmentedControl._labelStyle.copyWith(
        color: fg,
        fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
      ),
    );
    if (scaleDown) label = FittedBox(fit: BoxFit.scaleDown, child: label);
    return Semantics(
      button: true,
      selected: selected,
      label: segment.label,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: minHeight),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (segment.icon != null) ...[
                  Icon(segment.icon, size: 18, color: fg),
                  const SizedBox(width: 6),
                ],
                Flexible(child: label),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// A pinned segmented control for `AstroPage.navBottom` /
/// `AstroSliverNavBar.bottom` (e.g. "My reports | Get a report").
///
/// The bar asks it for its real height at the current width and text size
/// (one row, scaled-down row or wrapped pills), so the slot always fits and
/// every option stays tappable. Text is capped at [maxTextScale] like the
/// bar row itself.
///
/// ```dart
/// AstroPage(
///   title: 'Reports',
///   navBottom: AstroSegmentedNavBottom<Tab>(
///     segments: const [AstroSegment(value: Tab.mine, label: 'My reports'), ...],
///     selected: tab,
///     onChanged: setTab,
///   ),
///   child: ...,
/// )
/// ```
///
/// In the plain (box) `AstroNavBar` only [preferredSize] (one row) is used.
class AstroSegmentedNavBottom<T> extends StatelessWidget implements AstroAdaptiveBottom {
  final List<AstroSegment<T>> segments;
  final T selected;
  final ValueChanged<T> onChanged;
  final bool onDark;

  /// Accessibility label for the group.
  final String? semanticsLabel;

  /// Key for the inner [AstroSegmentedControl] (handy in tests).
  final Key? controlKey;
  final EdgeInsets padding;
  final double maxWidth;
  final double maxTextScale;

  const AstroSegmentedNavBottom({
    super.key,
    required this.segments,
    required this.selected,
    required this.onChanged,
    this.onDark = false,
    this.semanticsLabel,
    this.controlKey,
    this.padding = const EdgeInsets.fromLTRB(AstroMetrics.gutter, 4, AstroMetrics.gutter, 10),
    this.maxWidth = 480,
    this.maxTextScale = 1.3,
  });

  @override
  Size get preferredSize => Size.fromHeight(AppTouchTargets.minTouchTarget + 6 + padding.vertical);

  @override
  double heightFor(BuildContext context, double width) {
    final available = math.max(1.0, math.min(maxWidth, width - padding.horizontal));
    final scaler = MediaQuery.textScalerOf(context).clamp(maxScaleFactor: maxTextScale);
    return AstroSegmentedControl.preferredHeight(context, segments, maxWidth: available, textScaler: scaler) +
        padding.vertical;
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: maxWidth),
          child: MediaQuery.withClampedTextScaling(
            maxScaleFactor: maxTextScale,
            child: Semantics(
              container: true,
              label: semanticsLabel,
              child: AstroSegmentedControl<T>(
                key: controlKey,
                segments: segments,
                selected: selected,
                onChanged: onChanged,
                onDark: onDark,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Selectable pill / filter chip. 48pt min height, sentence-case label.
/// Selected: navy fill with a gold check. Unselected: white with hairline.
///
/// With [onDark] (for navy / gradient surfaces): unselected is a translucent
/// white fill with a white hairline and white label; selected is a gold fill
/// with a navy label and check.
class AstroPill extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback? onTap;
  final IconData? icon;

  /// Show a check mark when selected (default true).
  final bool showCheck;

  /// Use on dark / gradient surfaces.
  final bool onDark;

  const AstroPill({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
    this.icon,
    this.showCheck = true,
    this.onDark = false,
  });

  static const TextStyle _labelStyle = TextStyle(
    fontFamily: AppTypography.bodyFamily,
    fontFamilyFallback: AppTypography.bodyFontFamilies,
    fontSize: 15,
    height: 1.25,
    fontWeight: FontWeight.w600,
  );

  @override
  Widget build(BuildContext context) {
    final Color fg, fill, border, iconColor, checkColor;
    if (onDark) {
      fg = selected ? AppColors.primary : Colors.white;
      fill = selected ? AppColors.gold : Colors.white.withValues(alpha: 0.12);
      border = selected ? AppColors.gold : Colors.white.withValues(alpha: 0.32);
      iconColor = selected ? AppColors.primary : AppColors.gold;
      checkColor = AppColors.primary;
    } else {
      fg = selected ? Colors.white : AppColors.textPrimary;
      fill = selected ? AppColors.primary : AppColors.cardSurface;
      border = selected ? AppColors.primary : AppColors.cardBorder;
      iconColor = selected ? AppColors.gold : AppColors.accent;
      checkColor = AppColors.gold;
    }
    return Semantics(
      button: true,
      selected: selected,
      child: Material(
        color: fill,
        shape: StadiumBorder(side: BorderSide(color: border)),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          splashColor: onDark ? Colors.white.withValues(alpha: 0.16) : null,
          highlightColor: onDark ? Colors.white.withValues(alpha: 0.08) : null,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48, minWidth: 48),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (selected && showCheck) ...[
                    Icon(Icons.check_rounded, size: 18, color: checkColor),
                    const SizedBox(width: 6),
                  ] else if (icon != null) ...[
                    Icon(icon, size: 18, color: iconColor),
                    const SizedBox(width: 6),
                  ],
                  Flexible(
                    child: Text(
                      label,
                      style: _labelStyle.copyWith(
                        fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
                        color: fg,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// Step indicator
// =============================================================================

/// "Step X of Y" with a segmented progress track and optional step names.
///
/// ```dart
/// AstroStepIndicator(current: 2, total: 3, labels: ['Cart', 'Address', 'Pay'])
/// ```
/// With [title] it becomes a step heading for forms ("Step 1 of 3" eyebrow
/// above a section title) and the track is hidden unless [showTrack].
class AstroStepIndicator extends StatelessWidget {
  /// 1-based current step.
  final int current;
  final int total;
  final List<String>? labels;
  final String? title;
  final String? hint;
  final bool? showTrack;

  const AstroStepIndicator({
    super.key,
    required this.current,
    required this.total,
    this.labels,
    this.title,
    this.hint,
    this.showTrack,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final stepText = l10n?.commonStepOf(current, total) ?? 'Step $current of $total';
    final track = showTrack ?? (title == null);
    final currentLabel = (labels != null && current >= 1 && current <= labels!.length) ? labels![current - 1] : null;

    return Semantics(
      label: [stepText, if (currentLabel != null) currentLabel, if (title != null) title!].join(': '),
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            stepText,
            style: const TextStyle(
              fontFamily: AppTypography.bodyFamily,
              fontFamilyFallback: AppTypography.bodyFontFamilies,
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: AppColors.goldDark,
              height: 1.3,
            ),
          ),
          if (title != null) ...[
            const SizedBox(height: 2),
            Text(title!, style: AppTypography.headlineLarge),
          ],
          if (hint != null) ...[
            const SizedBox(height: 4),
            Text(hint!, style: AppTypography.rowSubtitle),
          ],
          if (track) ...[
            const SizedBox(height: 10),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (var i = 0; i < total; i++) ...[
                  if (i > 0) const SizedBox(width: 6),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 220),
                          height: 5,
                          decoration: BoxDecoration(
                            color: i < current ? AppColors.gold : AppColors.segmentedTrack,
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                        if (labels != null && i < labels!.length) ...[
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              if (i < current - 1) ...[
                                const Icon(Icons.check_circle_rounded, size: 15, color: AppColors.successText),
                                const SizedBox(width: 4),
                              ],
                              Flexible(
                                child: FittedBox(
                                  fit: BoxFit.scaleDown,
                                  alignment: Alignment.centerLeft,
                                  child: Text(
                                    labels![i],
                                    maxLines: 1,
                                    style: TextStyle(
                                      fontFamily: AppTypography.bodyFamily,
                                      fontFamilyFallback: AppTypography.bodyFontFamilies,
                                      fontSize: 14,
                                      fontWeight: i == current - 1 ? FontWeight.w700 : FontWeight.w500,
                                      color: i == current - 1 ? AppColors.textPrimary : AppColors.textSecondary,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// =============================================================================
// Expander
// =============================================================================

/// "Learn more" expander: an accent text row (44pt tall on iOS, 48dp on
/// Android) with a rotating chevron that
/// reveals [child] (built only when open). Labels default to the localized
/// "Learn more" / "Show less".
class AstroExpander extends StatefulWidget {
  final Widget child;
  final String? label;
  final String? expandedLabel;
  final bool initiallyExpanded;
  final bool onDark;
  final IconData? icon;

  const AstroExpander({
    super.key,
    required this.child,
    this.label,
    this.expandedLabel,
    this.initiallyExpanded = false,
    this.onDark = false,
    this.icon,
  });

  @override
  State<AstroExpander> createState() => _AstroExpanderState();
}

class _AstroExpanderState extends State<AstroExpander> {
  late bool _open = widget.initiallyExpanded;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final closedLabel = widget.label ?? l10n?.commonLearnMore ?? 'Learn more';
    final openLabel = widget.expandedLabel ?? widget.label ?? l10n?.commonShowLess ?? 'Show less';
    final color = widget.onDark ? AppColors.gold : AppColors.accent;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Semantics(
          button: true,
          expanded: _open,
          child: InkWell(
            borderRadius: BorderRadius.circular(10),
            onTap: () => setState(() => _open = !_open),
            child: ConstrainedBox(
              // 44pt on iOS, 48dp on Android.
              constraints: BoxConstraints(
                minHeight: AstroPlatform.isCupertino(context) ? AppTouchTargets.ios : AppTouchTargets.minTouchTarget,
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 8),
                child: Row(
                  children: [
                    if (widget.icon != null) ...[
                      Icon(widget.icon, size: 20, color: color),
                      const SizedBox(width: 8),
                    ],
                    Flexible(
                      child: Text(
                        _open ? openLabel : closedLabel,
                        style: TextStyle(
                          fontFamily: AppTypography.bodyFamily,
                          fontFamilyFallback: AppTypography.bodyFontFamilies,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: color,
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    AnimatedRotation(
                      turns: _open ? 0.5 : 0,
                      duration: const Duration(milliseconds: 200),
                      child: Icon(Icons.keyboard_arrow_down_rounded, size: 22, color: color),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        if (_open)
          Padding(
            padding: const EdgeInsets.only(top: 2, bottom: 4),
            child: widget.child,
          ),
      ],
    );
  }
}
