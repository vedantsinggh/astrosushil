import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_theme_tokens.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/astro_controls.dart';
import '../../../shared/widgets/astro_surfaces.dart';
import '../../../l10n/app_localizations.dart';

/// Small presentation-only building blocks shared by the report screens.
///
/// Buttons, cards, step headings, notes, expanders and states delegate to
/// the shared design system in `lib/shared/widgets`; report-specific pieces
/// (progress panel, PDF bars) stay here.
///
/// Designed for readers of all ages: large text, 56dp primary actions,
/// labelled icons, and layouts that wrap rather than clip at large text sizes.

/// High-contrast red for error text on light surfaces (AppColors.error is too light for text).
const Color kReportErrorText = AppColors.errorText;

/// Large, full-width primary action (gold, one per screen).
/// Delegates to the shared [AstroPrimaryButton].
class ReportPrimaryButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool isLoading;
  final Key? buttonKey;

  const ReportPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    this.buttonKey,
  });

  @override
  Widget build(BuildContext context) {
    return AstroPrimaryButton(label: label, icon: icon, onPressed: onPressed, isLoading: isLoading, buttonKey: buttonKey);
  }
}

/// Full-width secondary action (tinted; translucent on dark surfaces).
/// Delegates to the shared [AstroSecondaryButton].
class ReportSecondaryButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool onDark;

  const ReportSecondaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.onDark = false,
  });

  @override
  Widget build(BuildContext context) {
    return AstroSecondaryButton(
      label: label,
      icon: icon,
      onPressed: onPressed,
      variant: onDark ? AstroSecondaryVariant.onDark : AstroSecondaryVariant.tinted,
    );
  }
}

/// White content card. Delegates to the shared [AstroSurfaceCard].
class ReportCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color color;
  final Color borderColor;

  const ReportCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.color = AppColors.cardSurface,
    this.borderColor = AppColors.cardBorder,
  });

  @override
  Widget build(BuildContext context) {
    return AstroSurfaceCard(
      padding: padding,
      color: color,
      borderColor: borderColor == AppColors.cardBorder ? null : borderColor,
      child: child,
    );
  }
}

/// "Step X of Y" label above a short section heading.
/// Delegates to the shared [AstroStepIndicator].
class ReportStepHeading extends StatelessWidget {
  final int step;
  final int total;
  final String title;

  const ReportStepHeading({super.key, required this.step, required this.total, required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: AstroStepIndicator(current: step, total: total, title: title),
    );
  }
}

/// Section heading used across report screens.
class ReportHeading extends StatelessWidget {
  final String text;
  final Color color;

  const ReportHeading(this.text, {super.key, this.color = AppColors.textPrimary});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      header: true,
      child: Text(text, style: AppTypography.headlineLarge.copyWith(color: color)),
    );
  }
}

/// A row with a leading check icon and wrapping text.
class ReportBullet extends StatelessWidget {
  final String text;
  final IconData icon;

  const ReportBullet(this.text, {super.key, this.icon = Icons.check_circle_rounded});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Icon(icon, size: 20, color: AppColors.tintSageText),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 16, height: 1.4, color: AppColors.textPrimary),
            ),
          ),
        ],
      ),
    );
  }
}

/// A tappable "Learn more" toggle that reveals extra detail. Labels default
/// to the localized "Learn more" / "Show less". Delegates to [AstroExpander].
class ReportLearnMore extends StatelessWidget {
  final String? label;
  final String? expandedLabel;
  final Widget child;
  final bool onDark;

  const ReportLearnMore({
    super.key,
    required this.child,
    this.label,
    this.expandedLabel,
    this.onDark = false,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return AstroExpander(
      label: label ?? l10n?.commonLearnMore ?? 'Learn more',
      expandedLabel: expandedLabel ?? l10n?.commonShowLess ?? 'Show less',
      onDark: onDark,
      child: child,
    );
  }
}

/// Centered status message (empty / error / done) with at most one action.
/// Delegates to the shared [AstroStateView].
class ReportStatusMessage extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String? message;
  final String? actionLabel;
  final IconData? actionIcon;
  final VoidCallback? onAction;
  final bool onDark;

  const ReportStatusMessage({
    super.key,
    required this.icon,
    required this.iconColor,
    required this.title,
    this.message,
    this.actionLabel,
    this.actionIcon,
    this.onAction,
    this.onDark = false,
  });

  @override
  Widget build(BuildContext context) {
    return AstroStateView.empty(
      icon: icon,
      title: title,
      message: message,
      actionLabel: actionLabel,
      actionIcon: actionIcon,
      onAction: onAction,
      onDark: onDark,
      tint: AstroTint(iconColor, iconColor.withValues(alpha: 0.12)),
    );
  }
}

/// Plain-language names for the backend report generation stages.
/// Presentation only: these describe progress, not astrological content.
const List<String> kReportStageCodes = [
  'QUEUED',
  'CALCULATING',
  'ANALYZING',
  'RENDERING',
  'COMPILING',
  'UPLOADING',
];

const Map<String, String> kReportStageLabels = {
  'QUEUED': 'Getting started',
  'CALCULATING': 'Working out planet positions',
  'ANALYZING': 'Reading your chart',
  'RENDERING': 'Drawing charts and tables',
  'COMPILING': 'Creating your PDF',
  'UPLOADING': 'Saving to your reports',
};

/// Calm progress panel: percentage bar, "Step X of Y" and a step checklist.
class ReportProgressPanel extends StatelessWidget {
  final String stage;
  final int progress;
  final String? currentDetail;

  /// Optional live line under the active step (e.g. "Writing section 23 of 60").
  final String? progressDetail;

  const ReportProgressPanel({
    super.key,
    required this.stage,
    required this.progress,
    this.currentDetail,
    this.progressDetail,
  });

  @override
  Widget build(BuildContext context) {
    final idx = kReportStageCodes.indexOf(stage.toUpperCase());
    final current = idx < 0 ? 0 : idx;
    final total = kReportStageCodes.length;
    final pct = progress.clamp(0, 100);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 12,
          runSpacing: 4,
          children: [
            Text(
              AppLocalizations.of(context)?.commonStepOf(current + 1, total) ?? 'Step ${current + 1} of $total',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.goldDark),
            ),
            Text(
              '$pct%',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.primary),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Semantics(
          label: 'Report progress',
          value: '$pct percent',
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: pct == 0 ? null : pct / 100.0,
              minHeight: 10,
              backgroundColor: AppColors.cardBorderSubtle,
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.gold),
            ),
          ),
        ),
        const SizedBox(height: 20),
        for (var i = 0; i < total; i++)
          _StageRow(
            label: kReportStageLabels[kReportStageCodes[i]]!,
            state: i < current
                ? _StageState.done
                : i == current
                    ? _StageState.active
                    : _StageState.pending,
            detail: i == current ? currentDetail : null,
            note: i == current ? progressDetail : null,
          ),
      ],
    );
  }
}

enum _StageState { done, active, pending }

class _StageRow extends StatelessWidget {
  final String label;
  final _StageState state;
  final String? detail;
  final String? note;

  const _StageRow({required this.label, required this.state, this.detail, this.note});

  @override
  Widget build(BuildContext context) {
    Widget leading;
    switch (state) {
      case _StageState.done:
        leading = const Icon(Icons.check_circle_rounded, size: 24, color: AppColors.tintSageText);
        break;
      case _StageState.active:
        leading = const SizedBox(
          width: 24,
          height: 24,
          child: Padding(
            padding: EdgeInsets.all(2),
            child: CircularProgressIndicator(strokeWidth: 2.6, color: AppColors.goldDark),
          ),
        );
        break;
      case _StageState.pending:
        leading = const Icon(Icons.radio_button_unchecked_rounded, size: 24, color: AppColors.disabled);
        break;
    }
    final statusWord = switch (state) {
      _StageState.done => 'done',
      _StageState.active => 'in progress',
      _StageState.pending => 'waiting',
    };

    return Semantics(
      label: '$label, $statusWord',
      excludeSemantics: true,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 7),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            leading,
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 16,
                      height: 1.35,
                      fontWeight: state == _StageState.active ? FontWeight.w700 : FontWeight.w500,
                      color: state == _StageState.pending ? AppColors.textSecondary : AppColors.textPrimary,
                    ),
                  ),
                  if (detail != null && detail!.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      detail!,
                      style: const TextStyle(fontSize: 14, height: 1.4, color: AppColors.textSecondary),
                    ),
                  ],
                  if (note != null && note!.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      note!,
                      key: const ValueKey('report-progress-detail'),
                      style: const TextStyle(
                        fontSize: 13,
                        height: 1.4,
                        fontWeight: FontWeight.w600,
                        color: AppColors.goldDark,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Reassuring note shown under the progress panel. Delegates to [AstroNote].
class ReportInfoNote extends StatelessWidget {
  final String text;
  final IconData icon;
  final Color color;

  const ReportInfoNote(this.text, {super.key, this.icon = Icons.info_outline_rounded, this.color = AppColors.secondary});

  @override
  Widget build(BuildContext context) {
    final fg = color == AppColors.secondary ? AppColors.accent : color;
    return AstroNote(text, icon: icon, tint: AstroTint(fg, color.withValues(alpha: 0.08)));
  }
}

/// Bottom bar for PDF screens: one clear "Save or share" action plus Print.
class ReportPdfActionBar extends StatelessWidget {
  final VoidCallback onShare;
  final VoidCallback? onPrint;
  final String shareLabel;
  final String printLabel;
  final bool onDark;

  const ReportPdfActionBar({
    super.key,
    required this.onShare,
    this.onPrint,
    this.shareLabel = 'Save or share PDF',
    this.printLabel = 'Print',
    this.onDark = true,
  });

  @override
  Widget build(BuildContext context) {
    final share = ReportPrimaryButton(
      label: shareLabel,
      icon: Icons.ios_share_rounded,
      onPressed: onShare,
    );
    final print = onPrint == null
        ? null
        : AstroSecondaryButton(
            label: printLabel,
            icon: Icons.print_rounded,
            expand: false,
            variant: onDark ? AstroSecondaryVariant.onDark : AstroSecondaryVariant.outlined,
            onPressed: onPrint,
          );

    return Container(
      decoration: BoxDecoration(
        color: onDark ? AppColors.primary : AppColors.cardSurfaceWarm,
        border: Border(top: BorderSide(color: onDark ? AppColors.cardBorderDark : AppColors.cardBorder)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          child: Center(
            heightFactor: 1,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 640),
              child: print == null
                  ? share
                  : LayoutBuilder(
                      builder: (context, constraints) {
                        // Side by side when there is room, stacked on narrow
                        // screens or with very large text.
                        final scale = MediaQuery.textScalerOf(context).scale(1);
                        if (constraints.maxWidth / scale < 300) {
                          return Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              share,
                              const SizedBox(height: 8),
                              SizedBox(width: double.infinity, child: print),
                            ],
                          );
                        }
                        return Row(
                          children: [
                            Expanded(child: share),
                            const SizedBox(width: 10),
                            print,
                          ],
                        );
                      },
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Header strip above a PDF preview showing the full report title and name.
class ReportPdfHeader extends StatelessWidget {
  final String title;
  final String clientName;
  final bool onDark;

  /// One-line title, used when vertical space is short (landscape, very large text).
  final bool compact;

  const ReportPdfHeader({
    super.key,
    required this.title,
    required this.clientName,
    this.onDark = true,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(AstroMetrics.gutter + 2, 6, AstroMetrics.gutter + 2, 14),
      color: onDark ? AppColors.primary : AppColors.cardSurfaceWarm,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            maxLines: compact ? 1 : 3,
            overflow: TextOverflow.ellipsis,
            style: AppTypography.headlineLarge.copyWith(
              fontSize: 20,
              height: 1.3,
              color: onDark ? AppColors.textInversePrimary : AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            clientName,
            maxLines: compact ? 1 : null,
            overflow: compact ? TextOverflow.ellipsis : null,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
              color: onDark ? AppColors.gold : AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

/// Simple, text-scale-safe loading indicator for report screens.
/// Delegates to the shared [AstroStateView.loading].
class ReportLoading extends StatelessWidget {
  final String message;
  final bool onDark;

  const ReportLoading({super.key, required this.message, this.onDark = false});

  @override
  Widget build(BuildContext context) {
    return AstroStateView.loading(message: message, onDark: onDark);
  }
}
