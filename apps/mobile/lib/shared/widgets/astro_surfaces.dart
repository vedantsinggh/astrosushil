import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme_tokens.dart';
import '../theme/app_typography.dart';
import 'astro_controls.dart';

/// White content card: 20pt radius, very soft layered shadow and a barely
/// visible hairline so it reads on the cream canvas. Tappable when [onTap]
/// is set.
class AstroSurfaceCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color color;

  /// Optional border (e.g. a gold highlight for the selected item).
  final Color? borderColor;
  final double borderWidth;
  final double radius;

  const AstroSurfaceCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.onTap,
    this.color = AppColors.cardSurface,
    this.borderColor,
    this.borderWidth = 1,
    this.radius = AstroMetrics.cardRadius,
  });

  @override
  Widget build(BuildContext context) {
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(radius),
      side: BorderSide(color: borderColor ?? const Color(0x0F121440), width: borderColor == null ? 0.5 : borderWidth),
    );
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(radius), boxShadow: AstroShadows.card),
      child: Material(
        color: color,
        shape: shape,
        clipBehavior: Clip.antiAlias,
        child: onTap == null
            ? Padding(padding: padding, child: child)
            : InkWell(onTap: onTap, child: Padding(padding: padding, child: child)),
      ),
    );
  }
}

/// Hero card: navy→indigo gradient, 20pt radius, lifted shadow and a subtle
/// gold hairline edge. Text defaults to white and icons to gold. Use at most
/// one per screen for the main summary.
class AstroGradientCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Gradient gradient;

  const AstroGradientCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.onTap,
    this.gradient = AppGradients.heroNavy,
  });

  @override
  Widget build(BuildContext context) {
    final content = DefaultTextStyle.merge(
      style: const TextStyle(color: Colors.white),
      child: IconTheme.merge(
        data: const IconThemeData(color: AppColors.gold),
        child: Padding(padding: padding, child: child),
      ),
    );
    final radius = BorderRadius.circular(AstroMetrics.cardRadius);
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: radius,
        boxShadow: AstroShadows.hero,
        border: Border.all(color: AppColors.gold.withValues(alpha: 0.28), width: 0.8),
      ),
      child: Material(
        type: MaterialType.transparency,
        borderRadius: radius,
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
            // Soft gold glint along the top edge: the one brand accent.
            const Positioned(
              left: 24,
              right: 24,
              top: 0,
              height: 1,
              child: DecoratedBox(decoration: BoxDecoration(gradient: AppGradients.goldLine)),
            ),
            onTap == null ? content : InkWell(onTap: onTap, child: content),
          ],
        ),
      ),
    );
  }
}

/// Soft informational note: one icon + short text on a light tint.
class AstroNote extends StatelessWidget {
  final String text;
  final IconData icon;
  final AstroTint tint;

  const AstroNote(this.text, {super.key, this.icon = Icons.info_outline_rounded, this.tint = AstroTint.indigo});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: tint.background, borderRadius: BorderRadius.circular(14)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 22, color: tint.foreground),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text, style: AppTypography.bodyLarge.copyWith(fontSize: 15, color: AppColors.textPrimary, height: 1.4)),
          ),
        ],
      ),
    );
  }
}

enum _StateKind { loading, empty, error }

/// Calm full-area state with at most one action: loading, empty or error.
///
/// Centred when it fits and scrollable when it doesn't (landscape, 2.0x
/// text), with no `LayoutBuilder`, so it is safe inside slivers and
/// fixed-height parents. Use [compact] inside a card.
///
/// ```dart
/// AstroStateView.loading(message: 'Loading your chart…')
/// AstroStateView.empty(icon: Icons.inbox_rounded, title: 'No orders yet', actionLabel: 'Browse shop', onAction: ...)
/// AstroStateView.error(message: e.toString(), onRetry: () => ref.invalidate(p))
/// ```
class AstroStateView extends StatelessWidget {
  final _StateKind _kind;
  final IconData? icon;
  final String? title;
  final String? message;
  final String? actionLabel;
  final IconData? actionIcon;
  final VoidCallback? onAction;
  final bool compact;
  final bool onDark;
  final Widget? extra;

  /// Icon circle colours for empty states (e.g. [AstroTint.sage] for a
  /// "done" state). Defaults to indigo.
  final AstroTint? tint;

  const AstroStateView.loading({super.key, this.message, this.compact = false, this.onDark = false})
      : _kind = _StateKind.loading,
        tint = null,
        icon = null,
        title = null,
        actionLabel = null,
        actionIcon = null,
        onAction = null,
        extra = null;

  const AstroStateView.empty({
    super.key,
    required IconData this.icon,
    required String this.title,
    this.message,
    this.actionLabel,
    this.actionIcon,
    this.onAction,
    this.compact = false,
    this.onDark = false,
    this.extra,
    this.tint,
  }) : _kind = _StateKind.empty;

  /// [actionLabel] defaults to the localized "Try again".
  const AstroStateView.error({
    super.key,
    this.icon = Icons.cloud_off_rounded,
    this.title,
    this.message,
    VoidCallback? onRetry,
    String? retryLabel,
    this.compact = false,
    this.onDark = false,
    this.extra,
  })  : _kind = _StateKind.error,
        tint = null,
        onAction = onRetry,
        actionLabel = retryLabel,
        actionIcon = Icons.refresh_rounded;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final short = MediaQuery.sizeOf(context).height < 520;
    final titleColor = onDark ? Colors.white : AppColors.textPrimary;
    final bodyColor = onDark ? AppColors.textInverseSecondary : AppColors.textSecondary;
    final children = <Widget>[];

    if (_kind == _StateKind.loading) {
      children.addAll([
        SizedBox(
          width: 32,
          height: 32,
          child: CircularProgressIndicator.adaptive(
            strokeWidth: 3,
            valueColor: AlwaysStoppedAnimation<Color>(onDark ? AppColors.gold : AppColors.accent),
          ),
        ),
        const SizedBox(height: 14),
        Text(
          message ?? l10n?.commonLoading ?? 'Loading…',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontFamily: AppTypography.bodyFamily,
            fontFamilyFallback: AppTypography.bodyFontFamilies,
            fontSize: 16,
            height: 1.4,
            color: bodyColor,
          ),
        ),
      ]);
    } else {
      final isError = _kind == _StateKind.error;
      final circle = (compact || short) ? 60.0 : 84.0;
      final fg = isError ? AppColors.errorText : (tint?.foreground ?? AppColors.accent);
      final bg = isError ? AppColors.errorBg : (tint?.background ?? AppColors.accentFill);
      final effectiveTitle = title ?? (isError ? 'Something went wrong' : '');
      final effectiveAction = actionLabel ?? (isError ? (l10n?.commonTryAgain ?? 'Try again') : null);
      children.addAll([
        Container(
          width: circle,
          height: circle,
          decoration: BoxDecoration(color: onDark ? Colors.white.withValues(alpha: 0.1) : bg, shape: BoxShape.circle),
          child: Icon(icon, size: circle * 0.48, color: onDark ? AppColors.gold : fg),
        ),
        SizedBox(height: compact || short ? 12 : 20),
        if (effectiveTitle.isNotEmpty)
          Semantics(
            header: true,
            child: MediaQuery.withClampedTextScaling(
              maxScaleFactor: 1.5,
              child: Text(
                effectiveTitle,
                textAlign: TextAlign.center,
                style: AppTypography.headlineLarge.copyWith(fontSize: compact ? 19 : 22, color: titleColor, height: 1.25),
              ),
            ),
          ),
        if (message != null && message!.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            message!,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: AppTypography.bodyFamily,
              fontFamilyFallback: AppTypography.bodyFontFamilies,
              fontSize: 16,
              height: 1.45,
              color: bodyColor,
            ),
          ),
        ],
        if (extra != null) ...[const SizedBox(height: 16), extra!],
        if (effectiveAction != null && onAction != null) ...[
          SizedBox(height: compact || short ? 16 : 24),
          isError
              ? AstroSecondaryButton(
                  label: effectiveAction,
                  icon: actionIcon,
                  onPressed: onAction,
                  variant: onDark ? AstroSecondaryVariant.onDark : AstroSecondaryVariant.tinted,
                )
              : AstroPrimaryButton(label: effectiveAction, icon: actionIcon, onPressed: onAction),
        ],
      ]);
    }

    final column = ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 420),
      child: Column(mainAxisSize: MainAxisSize.min, children: children),
    );

    if (compact) {
      return Padding(padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8), child: Center(child: column));
    }
    return Center(
      child: SingleChildScrollView(
        padding: EdgeInsets.symmetric(horizontal: 24, vertical: short ? 12 : 32),
        child: column,
      ),
    );
  }
}
