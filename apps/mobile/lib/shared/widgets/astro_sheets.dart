import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme_tokens.dart';
import '../theme/app_typography.dart';
import 'astro_platform.dart';

/// Small rounded grabber shown at the top of bottom sheets.
class AstroSheetGrabber extends StatelessWidget {
  const AstroSheetGrabber({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        margin: const EdgeInsets.only(top: 8, bottom: 6),
        width: 36,
        height: 5,
        decoration: BoxDecoration(color: const Color(0x33121440), borderRadius: BorderRadius.circular(3)),
      ),
    );
  }
}

/// Stable key of the "Cancel" row in [showAstroActionSheet] (both platforms).
const Key kAstroActionSheetCancelKey = Key('astroActionSheetCancel');

/// Stable key of the "Done" button in [showAstroSheet]'s title row.
const Key kAstroSheetDoneKey = Key('astroSheetDone');

/// Shows a bottom sheet: cream surface, rounded top, optional centred
/// [title] with a "Done" button, safe-area aware. iOS draws its grabber;
/// Android uses the standard Material 3 drag handle (`showDragHandle`).
/// The sheet sizes to its content and scrolls when taller than ~90% of the
/// screen.
///
/// ```dart
/// final picked = await showAstroSheet<String>(
///   context: context,
///   title: 'Choose profile',
///   builder: (ctx) => Column(children: [...]),
/// );
/// ```
Future<T?> showAstroSheet<T>({
  required BuildContext context,
  required WidgetBuilder builder,
  String? title,
  bool showDone = true,
  bool isDismissible = true,
  EdgeInsetsGeometry padding = const EdgeInsets.fromLTRB(16, 4, 16, 16),
}) {
  final cupertino = AstroPlatform.isCupertino(context);
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    isDismissible: isDismissible,
    showDragHandle: !cupertino,
    enableDrag: true,
    backgroundColor: AppColors.cardSurfaceWarm,
    barrierColor: const Color(0x66121440),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(cupertino ? 20 : 28))),
    clipBehavior: Clip.antiAlias,
    builder: (ctx) {
      final l10n = AppLocalizations.of(ctx);
      return ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(ctx).height * 0.9),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (cupertino) const AstroSheetGrabber(),
              if (title != null)
                MediaQuery.withClampedTextScaling(
                  maxScaleFactor: 1.3,
                  child: SizedBox(
                    height: 48,
                    child: NavigationToolbar(
                      middle: Semantics(
                        header: true,
                        child: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppTypography.navTitle),
                      ),
                      trailing: showDone
                          ? TextButton(
                              key: kAstroSheetDoneKey,
                              onPressed: () => Navigator.of(ctx).maybePop(),
                              child: Text(l10n?.commonDone ?? 'Done',
                                  style: AppTypography.navAction.copyWith(fontWeight: FontWeight.w700)),
                            )
                          : null,
                      middleSpacing: 8,
                    ),
                  ),
                ),
              Flexible(
                child: SingleChildScrollView(
                  padding: padding.add(EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(ctx).bottom)),
                  child: builder(ctx),
                ),
              ),
            ],
          ),
        ),
      );
    },
  );
}

/// One choice in [showAstroActionSheet].
class AstroSheetAction<T> {
  final String label;
  final T value;
  final IconData? icon;
  final bool isDestructive;
  final bool isDefault;

  /// Shows a check mark (current choice in a picker-style sheet).
  final bool selected;

  /// Key for the tappable row (handy in widget tests).
  final Key? key;

  const AstroSheetAction({
    required this.label,
    required this.value,
    this.icon,
    this.isDestructive = false,
    this.isDefault = false,
    this.selected = false,
    this.key,
  });
}

/// Shows an action sheet: a native `CupertinoActionSheet` on iOS and a
/// standard Material 3 modal bottom sheet (drag handle, rounded top, list
/// rows, then "Cancel") elsewhere. Returns the chosen action's value, or
/// null when cancelled. [cancelLabel] defaults to "Cancel". The cancel row
/// has the key [kAstroActionSheetCancelKey] on both platforms.
Future<T?> showAstroActionSheet<T>({
  required BuildContext context,
  required List<AstroSheetAction<T>> actions,
  String? title,
  String? message,
  String? cancelLabel,
}) {
  final l10n = AppLocalizations.of(context);
  final cancel = cancelLabel ?? l10n?.commonCancel ?? 'Cancel';
  if (AstroPlatform.isCupertino(context)) {
    return showCupertinoModalPopup<T>(
      context: context,
      builder: (ctx) => CupertinoActionSheet(
        title: title == null ? null : Text(title),
        message: message == null ? null : Text(message),
        actions: [
          for (final a in actions)
            CupertinoActionSheetAction(
              key: a.key,
              isDestructiveAction: a.isDestructive,
              isDefaultAction: a.isDefault,
              onPressed: () => Navigator.of(ctx).pop(a.value),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Flexible(child: Text(a.label, textAlign: TextAlign.center, overflow: TextOverflow.ellipsis)),
                  if (a.selected) ...[const SizedBox(width: 8), const Icon(Icons.check_rounded, size: 22)],
                ],
              ),
            ),
        ],
        cancelButton: CupertinoActionSheetAction(
          key: kAstroActionSheetCancelKey,
          isDefaultAction: true,
          onPressed: () => Navigator.of(ctx).pop(),
          child: Text(cancel),
        ),
      ),
    );
  }

  return showModalBottomSheet<T>(
    context: context,
    useSafeArea: true,
    isScrollControlled: true,
    showDragHandle: true,
    backgroundColor: AppColors.cardSurfaceWarm,
    barrierColor: const Color(0x66121440),
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
    clipBehavior: Clip.antiAlias,
    builder: (ctx) => ConstrainedBox(
      constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(ctx).height * 0.85),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (title != null || message != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
                child: Column(
                  children: [
                    if (title != null)
                      Text(title,
                          textAlign: TextAlign.center,
                          style: AppTypography.rowSubtitle.copyWith(fontWeight: FontWeight.w600)),
                    if (message != null) ...[
                      const SizedBox(height: 4),
                      Text(message, textAlign: TextAlign.center, style: AppTypography.rowSubtitle.copyWith(fontSize: 14)),
                    ],
                  ],
                ),
              ),
            Flexible(
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (var i = 0; i < actions.length; i++) ...[
                      if (i > 0) const Divider(height: 0.5, thickness: 0.5, indent: 16, endIndent: 16, color: AppColors.separator),
                      _ActionRow(
                        key: actions[i].key,
                        selected: actions[i].selected,
                        label: actions[i].label,
                        icon: actions[i].icon,
                        color: actions[i].isDestructive ? AppColors.errorText : AppColors.accent,
                        bold: actions[i].isDefault,
                        onTap: () => Navigator.of(ctx).pop(actions[i].value),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 4),
            const Divider(height: 1, thickness: 1, color: AppColors.separator),
            _ActionRow(
              key: kAstroActionSheetCancelKey,
              label: cancel,
              color: AppColors.textPrimary,
              bold: true,
              onTap: () => Navigator.of(ctx).pop(),
            ),
          ],
        ),
      ),
    ),
  );
}

class _ActionRow extends StatelessWidget {
  final String label;
  final IconData? icon;
  final Color color;
  final bool bold;
  final VoidCallback onTap;

  final bool selected;

  const _ActionRow({
    super.key,
    required this.label,
    this.icon,
    required this.color,
    this.bold = false,
    this.selected = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 56),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[Icon(icon, size: 22, color: color), const SizedBox(width: 10)],
              Flexible(
                child: Text(
                  label,
                  textAlign: TextAlign.center,
                  style: AppTypography.rowTitle.copyWith(
                    fontSize: 18,
                    color: color,
                    fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
              ),
              if (selected) ...[const SizedBox(width: 8), Icon(Icons.check_rounded, size: 22, color: color)],
            ],
          ),
        ),
      ),
    );
  }
}

/// Adaptive confirmation dialog: `CupertinoAlertDialog` on iOS, Material 3
/// `AlertDialog` on Android. Returns true when confirmed, false otherwise.
/// Set [destructive] for "Sign out" / "Delete" style confirmations.
Future<bool> showAstroConfirm({
  required BuildContext context,
  required String title,
  String? message,
  required String confirmLabel,
  String? cancelLabel,
  bool destructive = false,
}) async {
  final l10n = AppLocalizations.of(context);
  final cancel = cancelLabel ?? l10n?.commonCancel ?? 'Cancel';
  final bool? result;
  if (AstroPlatform.isCupertino(context)) {
    result = await showCupertinoDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => CupertinoAlertDialog(
        title: Text(title),
        content: message == null ? null : Padding(padding: const EdgeInsets.only(top: 6), child: Text(message)),
        actions: [
          CupertinoDialogAction(onPressed: () => Navigator.of(ctx).pop(false), child: Text(cancel)),
          CupertinoDialogAction(
            isDefaultAction: !destructive,
            isDestructiveAction: destructive,
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
  } else {
    result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title, style: AppTypography.headlineLarge),
        content: message == null ? null : Text(message, style: AppTypography.bodyLarge),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text(cancel)),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: destructive ? AppColors.errorText : AppColors.accent),
            child: Text(confirmLabel, style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
  return result ?? false;
}

/// Adaptive date picker: Cupertino wheel in a bottom sheet (with Done) on
/// iOS, the Material 3 calendar dialog on Android. Returns null if cancelled.
Future<DateTime?> showAstroDatePicker({
  required BuildContext context,
  required DateTime initialDate,
  required DateTime firstDate,
  required DateTime lastDate,
  String? title,
  String? helpText,
  DatePickerMode initialDatePickerMode = DatePickerMode.day,
  TransitionBuilder? builder,
}) async {
  if (!AstroPlatform.isCupertino(context)) {
    return showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: firstDate,
      lastDate: lastDate,
      helpText: helpText,
      initialDatePickerMode: initialDatePickerMode,
      builder: builder,
    );
  }
  title ??= helpText;
  var picked = initialDate;
  final done = await showAstroSheet<bool>(
    context: context,
    title: title,
    showDone: false,
    builder: (ctx) => _WheelSheetBody(
      onDone: () => Navigator.of(ctx).pop(true),
      picker: CupertinoDatePicker(
        mode: CupertinoDatePickerMode.date,
        initialDateTime: initialDate,
        minimumDate: firstDate,
        maximumDate: lastDate,
        onDateTimeChanged: (d) => picked = d,
      ),
    ),
  );
  return done == true ? picked : null;
}

/// Adaptive time picker: Cupertino wheel on iOS, Material dial on Android.
Future<TimeOfDay?> showAstroTimePicker({
  required BuildContext context,
  required TimeOfDay initialTime,
  String? title,
  String? helpText,
  TransitionBuilder? builder,
}) async {
  if (!AstroPlatform.isCupertino(context)) {
    return showTimePicker(context: context, initialTime: initialTime, helpText: helpText, builder: builder);
  }
  title ??= helpText;
  final now = DateTime.now();
  var picked = DateTime(now.year, now.month, now.day, initialTime.hour, initialTime.minute);
  final done = await showAstroSheet<bool>(
    context: context,
    title: title,
    showDone: false,
    builder: (ctx) => _WheelSheetBody(
      onDone: () => Navigator.of(ctx).pop(true),
      picker: CupertinoDatePicker(
        mode: CupertinoDatePickerMode.time,
        initialDateTime: picked,
        onDateTimeChanged: (d) => picked = d,
      ),
    ),
  );
  return done == true ? TimeOfDay(hour: picked.hour, minute: picked.minute) : null;
}

class _WheelSheetBody extends StatelessWidget {
  final Widget picker;
  final VoidCallback onDone;
  const _WheelSheetBody({required this.picker, required this.onDone});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Wheel text grows with system text size, so give it room.
        SizedBox(height: 216 * MediaQuery.textScalerOf(context).scale(1).clamp(1.0, 1.6), child: picker),
        const SizedBox(height: 12),
        SizedBox(
          height: 52,
          child: FilledButton(
            onPressed: onDone,
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.gold,
              foregroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AstroMetrics.buttonRadius)),
              textStyle: AppTypography.button,
            ),
            child: Text(l10n?.commonDone ?? 'Done'),
          ),
        ),
      ],
    );
  }
}
