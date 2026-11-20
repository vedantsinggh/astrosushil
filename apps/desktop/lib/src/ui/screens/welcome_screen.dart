import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;

import '../../state/providers.dart';
import '../../theme.dart';
import '../../util/format.dart';
import '../app_actions.dart';
import '../commands.dart';
import '../widgets/brand.dart';
import '../widgets/common.dart';

/// First screen: quick start, recent charts and a one-time getting-started hint.
class WelcomeScreen extends ConsumerWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pal = context.palette;
    final actions = AppActions(context, ref);
    final recent = ref.watch(recentProvider);
    final status = ref.watch(engineStatusProvider);
    final hintDismissed = ref.watch(prefsProvider.select((p) => p.hintDismissed));
    final theme = Theme.of(context).textTheme;

    return Scrollbar(
      child: ListView(padding: const EdgeInsets.fromLTRB(40, 32, 40, 40), children: [
        Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 1040),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              // Hero
              Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [DesktopColors.primary, Color(0xFF2A2468)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(children: [
                  const BrandMark(size: 72),
                  const SizedBox(width: 24),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Namaste. Welcome to Astro Sushil Desktop', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 6),
                      const Text(
                        'Create a new chart or open a saved one. Everything is calculated on this computer; no internet is needed.',
                        style: TextStyle(color: Color(0xFFD5D3EE), fontSize: 14.5),
                      ),
                      const SizedBox(height: 18),
                      Wrap(spacing: 12, runSpacing: 10, children: [
                        FilledButton.icon(
                          key: const Key('new-chart'),
                          style: FilledButton.styleFrom(backgroundColor: DesktopColors.gold, foregroundColor: DesktopColors.midnight, minimumSize: const Size(0, 46), padding: const EdgeInsets.symmetric(horizontal: 22)),
                          onPressed: actions.newChart,
                          icon: const Icon(Icons.add_rounded),
                          label: const Text('New chart', style: TextStyle(fontSize: 15)),
                        ),
                        OutlinedButton.icon(
                          key: const Key('open-chart'),
                          style: OutlinedButton.styleFrom(foregroundColor: Colors.white, side: const BorderSide(color: Color(0x66FFFFFF)), minimumSize: const Size(0, 46)),
                          onPressed: actions.openChart,
                          icon: const Icon(Icons.folder_open_outlined),
                          label: const Text('Open chart…', style: TextStyle(fontSize: 15)),
                        ),
                        TextButton.icon(
                          style: TextButton.styleFrom(foregroundColor: const Color(0xFFE6E4F7), minimumSize: const Size(0, 46)),
                          onPressed: () => actions.run(Cmd.library),
                          icon: const Icon(Icons.folder_copy_outlined),
                          label: const Text('Chart database'),
                        ),
                      ]),
                    ]),
                  ),
                ]),
              ),
              const SizedBox(height: Gap.lg),
              _EngineLine(status: status),
              AnimatedSize(
                duration: Motion.medium,
                curve: Motion.curve,
                child: hintDismissed ? const SizedBox(width: double.infinity) : const Padding(padding: EdgeInsets.only(top: Gap.lg), child: _Hint()),
              ),
              const SizedBox(height: Gap.xl),
              Row(children: [
                Text('Recent charts', style: theme.titleMedium),
                const Spacer(),
                TextButton(onPressed: () => actions.run(Cmd.library), child: const Text('Search all saved charts →')),
              ]),
              const SizedBox(height: Gap.sm),
              recent.when(
                data: (list) => list.isEmpty
                    ? Card(
                        child: EmptyState(
                          icon: Icons.history_rounded,
                          title: 'No recent charts yet',
                          message: 'Charts you create, save or open will appear here for quick access.',
                          actions: [FilledButton.tonal(onPressed: actions.newChart, child: const Text('Create your first chart'))],
                        ),
                      )
                    : Wrap(spacing: Gap.md, runSpacing: Gap.md, children: [for (final path in list) _RecentCard(path: path)]),
                loading: () => const SkeletonBlock(lines: 3),
                error: (e, _) => ErrorPanel(error: e),
              ),
              const SizedBox(height: Gap.xl),
              Text('Tip: press F1 at any time to see all keyboard shortcuts.', style: TextStyle(color: pal.textMuted, fontSize: 12.5)),
            ]),
          ),
        ),
      ]),
    );
  }
}

class _EngineLine extends StatelessWidget {
  const _EngineLine({required this.status});
  final EngineStatus status;
  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    return switch (status.phase) {
      EngineRunState.ready => Row(children: [Icon(Icons.check_circle_rounded, color: pal.success, size: 18), const SizedBox(width: 8), const Text('Calculation engine ready')]),
      EngineRunState.starting || EngineRunState.restarting => const Row(children: [
          SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
          SizedBox(width: 10),
          Text('Starting calculation engine…'),
        ]),
      EngineRunState.failed => Row(children: [
          Icon(Icons.error_outline_rounded, color: pal.error, size: 18),
          const SizedBox(width: 8),
          Expanded(child: Text(status.message ?? 'The calculation engine could not start.', style: TextStyle(color: pal.error))),
        ]),
    };
  }
}

class _Hint extends ConsumerWidget {
  const _Hint();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pal = context.palette;
    Widget step(String n, String title, String body) => Expanded(
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            CircleAvatar(radius: 13, backgroundColor: pal.accent.withValues(alpha: 0.2), child: Text(n, style: TextStyle(color: pal.accentText, fontWeight: FontWeight.w700, fontSize: 13))),
            const SizedBox(width: 10),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(body, style: TextStyle(color: pal.textMuted, fontSize: 13)),
              ]),
            ),
          ]),
        );
    return Container(
      key: const Key('first-run-hint'),
      padding: const EdgeInsets.fromLTRB(20, 16, 8, 16),
      decoration: BoxDecoration(color: pal.card, border: Border.all(color: pal.accent.withValues(alpha: 0.5)), borderRadius: BorderRadius.circular(12)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(Icons.lightbulb_outline_rounded, color: pal.accentText),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Getting started', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 10),
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              step('1', 'Create a chart', 'Click New chart, type the date, time and town of birth.'),
              const SizedBox(width: 16),
              step('2', 'Explore sections', 'Use the left sidebar: Chart, Dashas, Transits and more.'),
              const SizedBox(width: 16),
              step('3', 'Save and reopen', 'Save with Ctrl+S. Several charts can be open as tabs.'),
            ]),
          ]),
        ),
        TextButton(
          key: const Key('dismiss-hint'),
          onPressed: () => ref.read(prefsProvider.notifier).update((p) => p.copyWith(hintDismissed: true)),
          child: const Text('Got it'),
        ),
      ]),
    );
  }
}

class _RecentCard extends ConsumerWidget {
  const _RecentCard({required this.path});
  final String path;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pal = context.palette;
    final summary = ref.watch(chartFileSummaryProvider(path)).valueOrNull;
    final name = summary?.displayName ?? p.basenameWithoutExtension(path);
    final b = summary?.birth;
    return SizedBox(
      width: 330,
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          key: Key('recent-$path'),
          onTap: () => AppActions(context, ref).openPath(path),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(children: [
              CircleAvatar(radius: 20, backgroundColor: pal.accent.withValues(alpha: 0.16), child: Icon(Icons.brightness_7_outlined, color: pal.accentText, size: 20)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5), maxLines: 1, overflow: TextOverflow.ellipsis),
                  Text(
                    b == null ? path : '${civilDate(b.date)} · ${b.time.substring(0, 5)} · ${b.placeName ?? ''}',
                    style: TextStyle(color: pal.textMuted, fontSize: 12.5, fontFeatures: tabularFigures),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ]),
              ),
              Icon(Icons.chevron_right_rounded, color: pal.textMuted),
            ]),
          ),
        ),
      ),
    );
  }
}
