import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../engine/engine_client.dart';
import '../../theme.dart';
import '../../util/format.dart';
import 'data_table.dart';

export 'data_table.dart';

/// Renders an AsyncValue smoothly:
/// - first load: a calm skeleton placeholder (fades into the content);
/// - recalculation (inputs changed): the previous result stays visible, dimmed slightly, with a
///   thin progress line, so the screen never flashes empty;
/// - error: a friendly [ErrorPanel] with "Try again".
class AsyncView<T> extends StatefulWidget {
  const AsyncView({super.key, required this.value, required this.builder, this.skeleton, this.onRetry});
  final AsyncValue<T> value;
  final Widget Function(T data) builder;
  final Widget? skeleton;
  final VoidCallback? onRetry;

  @override
  State<AsyncView<T>> createState() => _AsyncViewState<T>();
}

class _AsyncViewState<T> extends State<AsyncView<T>> {
  T? _last;
  bool _hasLast = false;

  @override
  Widget build(BuildContext context) {
    final v = widget.value;
    Widget child;
    Key key;
    if (v.hasValue && !v.isLoading) {
      _last = v.requireValue;
      _hasLast = true;
      child = widget.builder(v.requireValue);
      key = const ValueKey('data');
    } else if (v.hasError && !v.isLoading) {
      child = ErrorPanel(error: v.error!, onRetry: widget.onRetry);
      key = const ValueKey('error');
    } else if (_hasLast) {
      child = Stack(children: [
        Opacity(opacity: 0.55, child: IgnorePointer(child: widget.builder(_last as T))),
        const Positioned(left: 0, right: 0, top: 0, child: LinearProgressIndicator(minHeight: 2)),
      ]);
      key = const ValueKey('data');
    } else {
      child = widget.skeleton ?? const SkeletonBlock();
      key = const ValueKey('loading');
    }
    return AnimatedSwitcher(
      duration: Motion.medium,
      switchInCurve: Motion.curve,
      layoutBuilder: (current, previous) => Stack(alignment: Alignment.topLeft, children: [...previous, if (current != null) current]),
      child: KeyedSubtree(key: key, child: child),
    );
  }
}

/// Static skeleton placeholder (no looping animation, so it is calm and cheap).
class SkeletonBlock extends StatelessWidget {
  const SkeletonBlock({super.key, this.lines = 6, this.height});
  final int lines;
  final double? height;

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    final c = pal.border.withValues(alpha: 0.55);
    Widget bar(double f, [double h = 12]) => FractionallySizedBox(
          widthFactor: f,
          alignment: Alignment.centerLeft,
          child: Container(height: h, margin: const EdgeInsets.only(bottom: 10), decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(4))),
        );
    return Semantics(
      label: 'Calculating',
      child: Padding(
        padding: const EdgeInsets.all(Gap.lg),
        child: SizedBox(
          height: height,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            bar(0.28, 16),
            const SizedBox(height: 6),
            for (var i = 0; i < lines; i++) bar(const [0.92, 0.84, 0.88, 0.7, 0.9, 0.76][i % 6]),
          ]),
        ),
      ),
    );
  }
}

/// Skeleton shaped like a chart workspace (two chart squares and a side panel).
class ChartSkeleton extends StatelessWidget {
  const ChartSkeleton({super.key});
  @override
  Widget build(BuildContext context) {
    final c = context.palette.border.withValues(alpha: 0.5);
    Widget box(double w, double h) => Container(width: w, height: h, decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(10)));
    return Padding(
      padding: const EdgeInsets.all(Gap.xl),
      child: Wrap(spacing: Gap.lg, runSpacing: Gap.lg, children: [box(360, 360), box(360, 360), box(280, 360)]),
    );
  }
}

/// Plain-language error with an optional retry.
class ErrorPanel extends StatelessWidget {
  const ErrorPanel({super.key, required this.error, this.onRetry, this.title});
  final Object error;
  final VoidCallback? onRetry;
  final String? title;

  static (String, String) describe(Object error) {
    if (error is EngineException) {
      return switch (error.code) {
        'SIDECAR_EXITED' => ('The calculation engine restarted', 'It stopped unexpectedly and has been started again. Your charts are safe. Please try again.'),
        'SIDECAR_NOT_FOUND' => ('Calculation engine not found', error.message),
        'INVALID_PARAMS' => ('Please check the details', error.message),
        'PROTOCOL_MISMATCH' => ('Engine version mismatch', 'The calculation engine does not match this version of the app. Please reinstall Astro Sushil Desktop.'),
        _ => ('This could not be calculated', error.message),
      };
    }
    return ('Something went wrong', '$error');
  }

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    final (t, msg) = describe(error);
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 560),
        child: Padding(
          padding: const EdgeInsets.all(Gap.xl),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(Icons.error_outline_rounded, color: pal.error, size: 28),
            const SizedBox(width: Gap.md),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                Text(title ?? t, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: Gap.xs),
                SelectableText(msg, style: TextStyle(color: pal.textMuted)),
                if (onRetry != null) ...[
                  const SizedBox(height: Gap.md),
                  OutlinedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh_rounded, size: 18), label: const Text('Try again')),
                ],
              ]),
            ),
          ]),
        ),
      ),
    );
  }
}

/// Friendly empty state: icon, title, explanation and actions.
class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, required this.message, this.actions = const []});
  final IconData icon;
  final String title;
  final String message;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 460),
        child: Padding(
          padding: const EdgeInsets.all(Gap.xxl),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(color: pal.accent.withValues(alpha: 0.14), shape: BoxShape.circle),
              child: Icon(icon, size: 30, color: pal.accentText),
            ),
            const SizedBox(height: Gap.lg),
            Text(title, style: Theme.of(context).textTheme.titleMedium, textAlign: TextAlign.center),
            const SizedBox(height: Gap.sm),
            Text(message, style: TextStyle(color: pal.textMuted), textAlign: TextAlign.center),
            if (actions.isNotEmpty) ...[
              const SizedBox(height: Gap.lg),
              Wrap(spacing: Gap.sm, runSpacing: Gap.sm, alignment: WrapAlignment.center, children: actions),
            ],
          ]),
        ),
      ),
    );
  }
}

class SectionCard extends StatelessWidget {
  const SectionCard({super.key, required this.title, required this.child, this.trailing, this.subtitle, this.padding = const EdgeInsets.fromLTRB(16, 14, 16, 16)});
  final String title;
  final String? subtitle;
  final Widget child;
  final Widget? trailing;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    return Card(
      child: Padding(
        padding: padding,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
            Container(width: 3, height: 16, decoration: BoxDecoration(color: pal.accent, borderRadius: BorderRadius.circular(2))),
            const SizedBox(width: Gap.sm),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, style: Theme.of(context).textTheme.titleSmall),
                if (subtitle != null) Text(subtitle!, style: Theme.of(context).textTheme.bodySmall),
              ]),
            ),
            if (trailing != null) trailing!,
          ]),
          const SizedBox(height: Gap.md),
          child,
        ]),
      ),
    );
  }
}

class KeyValueGrid extends StatelessWidget {
  const KeyValueGrid({super.key, required this.items, this.columns = 2, this.keyWidth = 140});
  final List<(String, String)> items;
  final int columns;
  final double keyWidth;

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    return LayoutBuilder(builder: (context, c) {
      final w = (c.maxWidth / columns).floorToDouble() - 1;
      return Wrap(children: [
        for (final (k, v) in items)
          SizedBox(
            width: w.isFinite ? w : 280,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                SizedBox(width: keyWidth, child: Text(k, style: TextStyle(color: pal.textMuted, fontSize: 13))),
                Expanded(child: SelectableText(v, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: pal.text, fontFeatures: tabularFigures))),
              ]),
            ),
          ),
      ]);
    });
  }
}

/// Generic, faithful renderer for structured engine output (maps, lists, scalars).
/// Lists of flat objects become tables; nested objects become expandable sections.
class StructuredResultView extends StatelessWidget {
  const StructuredResultView({super.key, required this.data, this.hiddenKeys = const {'calculationVersion', 'calculationTimestampIso'}});
  final Object? data;
  final Set<String> hiddenKeys;

  static bool _isScalar(Object? v) => v == null || v is num || v is String || v is bool;
  static String _fmt(Object? v) {
    if (v == null) return '—';
    if (v is double) return v.toStringAsFixed(v.abs() >= 100 ? 2 : 4);
    if (v is bool) return v ? 'Yes' : 'No';
    if (v is List && v.every(_isScalar)) return v.map(_fmt).join(', ');
    return '$v';
  }

  static String _label(String key) {
    final spaced = key.replaceAllMapped(RegExp(r'([a-z0-9])([A-Z])'), (m) => '${m[1]} ${m[2]}');
    return titleCase(spaced.replaceAll('_', ' '));
  }

  Widget _title(BuildContext context, String text) => Text(text, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontSize: 13.5));

  Widget _node(BuildContext context, String? key, Object? v, int depth) {
    if (v is Map<String, Object?>) {
      final scalars = v.entries.where((e) => !hiddenKeys.contains(e.key) && (_isScalar(e.value) || (e.value is List && (e.value as List).every(_isScalar)))).toList();
      final complex = v.entries.where((e) => !hiddenKeys.contains(e.key) && !scalars.contains(e)).toList();
      final body = Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (scalars.isNotEmpty) KeyValueGrid(items: [for (final e in scalars) (_label(e.key), _fmt(e.value))]),
        for (final e in complex) _node(context, e.key, e.value, depth + 1),
      ]);
      if (key == null) return body;
      return ExpansionTile(
        initiallyExpanded: depth <= 1,
        tilePadding: EdgeInsets.only(left: 4.0 * depth, right: 4),
        dense: true,
        title: _title(context, _label(key)),
        children: [Padding(padding: EdgeInsets.only(left: 8.0 + 4 * depth, bottom: 8), child: body)],
      );
    }
    if (v is List) {
      final maps = v.whereType<Map<String, Object?>>().toList();
      if (maps.length == v.length && maps.isNotEmpty) {
        final cols = <String>[];
        for (final m in maps) {
          for (final e in m.entries) {
            if (!hiddenKeys.contains(e.key) && !cols.contains(e.key) && (_isScalar(e.value) || (e.value is List && (e.value as List).every(_isScalar)))) cols.add(e.key);
          }
        }
        final table = SimpleTable(title: key == null ? null : _label(key), columns: cols.map(_label).toList(), rows: [for (final m in maps) [for (final c in cols) _fmt(m[c])]]);
        return key == null
            ? table
            : ExpansionTile(
                initiallyExpanded: depth <= 1,
                dense: true,
                tilePadding: const EdgeInsets.only(right: 4),
                title: _title(context, '${_label(key)} (${maps.length})'),
                children: [Padding(padding: const EdgeInsets.only(bottom: 8), child: table)],
              );
      }
      return KeyValueGrid(items: [(key == null ? '' : _label(key), _fmt(v))]);
    }
    return KeyValueGrid(items: [(key == null ? '' : _label(key), _fmt(v))]);
  }

  @override
  Widget build(BuildContext context) => _node(context, null, data, 0);
}

/// Scrollable page body with standard padding and spacing.
class PageBody extends StatelessWidget {
  const PageBody({super.key, required this.children, this.padding = const EdgeInsets.fromLTRB(24, 16, 24, 32)});
  final List<Widget> children;
  final EdgeInsets padding;
  @override
  Widget build(BuildContext context) => Scrollbar(
        child: ListView(
          padding: padding,
          children: [for (final c in children) Padding(padding: const EdgeInsets.only(bottom: Gap.lg), child: c)],
        ),
      );
}

/// Toolbar row for section controls (selectors, steppers) with consistent spacing.
class ControlBar extends StatelessWidget {
  const ControlBar({super.key, required this.children});
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => Wrap(spacing: Gap.md, runSpacing: Gap.sm, crossAxisAlignment: WrapCrossAlignment.center, children: children);
}

/// "‹ 2026 ›" stepper with labelled buttons.
class Stepper2 extends StatelessWidget {
  const Stepper2({super.key, required this.label, required this.value, required this.onPrev, required this.onNext, this.prevTooltip = 'Previous', this.nextTooltip = 'Next'});
  final String label;
  final String value;
  final VoidCallback onPrev;
  final VoidCallback onNext;
  final String prevTooltip;
  final String nextTooltip;

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    return Container(
      decoration: BoxDecoration(border: Border.all(color: pal.border), borderRadius: BorderRadius.circular(8), color: pal.card),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Padding(padding: const EdgeInsets.only(left: 12, right: 4), child: Text(label, style: TextStyle(color: pal.textMuted, fontSize: 13))),
        IconButton(tooltip: prevTooltip, onPressed: onPrev, icon: const Icon(Icons.chevron_left_rounded), visualDensity: VisualDensity.compact),
        Text(value, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: pal.heading, fontFeatures: tabularFigures)),
        IconButton(tooltip: nextTooltip, onPressed: onNext, icon: const Icon(Icons.chevron_right_rounded), visualDensity: VisualDensity.compact),
      ]),
    );
  }
}

/// Small explanatory note in muted text.
class Note extends StatelessWidget {
  const Note(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(Icons.info_outline_rounded, size: 15, color: context.palette.textMuted),
        const SizedBox(width: 6),
        Expanded(child: Text(text, style: Theme.of(context).textTheme.bodySmall)),
      ]);
}

/// Shows a ConsumerWidget-friendly "no chart open" message.
class NoChartOpen extends StatelessWidget {
  const NoChartOpen({super.key});
  @override
  Widget build(BuildContext context) => const EmptyState(icon: Icons.grid_view_rounded, title: 'No chart open', message: 'Open or create a chart to see this view.');
}

typedef RefWidgetBuilder = Widget Function(BuildContext context, WidgetRef ref);
