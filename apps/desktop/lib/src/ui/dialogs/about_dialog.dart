import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/city_index.dart';
import '../../state/providers.dart';
import '../../theme.dart';
import '../widgets/brand.dart';
import '../widgets/common.dart';

const appVersion = '0.1.0';

Future<void> showAstroAboutDialog(BuildContext context) => showDialog<void>(context: context, builder: (_) => const AstroAboutDialog());

class AstroAboutDialog extends ConsumerWidget {
  const AstroAboutDialog({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pal = context.palette;
    final info = ref.watch(engineInfoProvider);
    final muted = TextStyle(color: pal.textMuted, fontSize: 13);
    return AlertDialog(
      content: SizedBox(
        width: 560,
        child: SingleChildScrollView(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Row(children: [
              const BrandMark(size: 52),
              const SizedBox(width: 14),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Astro Sushil Desktop', style: Theme.of(context).textTheme.titleLarge),
                Text('Version $appVersion · engine ${info.valueOrNull?['engineVersion'] ?? '…'} · protocol ${info.valueOrNull?['protocolVersion'] ?? '…'}', style: muted),
              ]),
            ]),
            const SizedBox(height: Gap.lg),
            const Text(
              'An offline Vedic astrology workstation. Every calculation is performed by the Astro Sushil '
              'astrology engine running on this computer; the app only displays its results. No internet '
              'connection is needed and no chart data leaves your computer.',
            ),
            const SizedBox(height: Gap.lg),
            Text('CREDITS AND LICENCES', style: Theme.of(context).textTheme.labelSmall),
            const SizedBox(height: Gap.sm),
            const _Credit(title: 'Place data', body: '${CityIndex.attribution}.\nGeoNames data is licensed under the Creative Commons Attribution 4.0 licence (CC BY 4.0). https://www.geonames.org'),
            const _Credit(title: 'Ephemeris', body: 'astronomy-engine by Don Cross (MIT licence), used by the Astro Sushil engine.'),
            const _Credit(title: 'PDF and printing', body: 'pdf and printing packages (Apache-2.0).'),
            const _Credit(title: 'Framework', body: 'Flutter (BSD-3-Clause), Riverpod (MIT), Node.js (MIT) for the engine runtime.'),
            const SizedBox(height: Gap.sm),
            ExpansionTile(
              tilePadding: EdgeInsets.zero,
              title: const Text('Engine configuration and conventions', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
              children: [AsyncView(value: info, builder: (j) => StructuredResultView(data: j))],
            ),
          ]),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => showLicensePage(context: context, applicationName: 'Astro Sushil Desktop', applicationVersion: appVersion),
          child: const Text('All licences…'),
        ),
        FilledButton(autofocus: true, onPressed: () => Navigator.pop(context), child: const Text('Close')),
      ],
    );
  }
}

class _Credit extends StatelessWidget {
  const _Credit({required this.title, required this.body});
  final String title;
  final String body;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(width: 130, child: Text(title, style: TextStyle(color: context.palette.textMuted, fontSize: 13))),
          Expanded(child: SelectableText(body, style: const TextStyle(fontSize: 13))),
        ]),
      );
}
