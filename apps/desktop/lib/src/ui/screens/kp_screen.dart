import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../engine/engine_client.dart';
import '../../engine/inputs.dart';
import '../../engine/models.dart';
import '../../state/providers.dart';
import '../../util/format.dart';
import '../widgets/common.dart';

class KpScreen extends ConsumerWidget {
  const KpScreen({super.key, required this.birth});
  final BirthInput birth;

  List<List<String>> _rows(List<KpRow> rows) => [
        for (final r in rows) [titleCase(r.label), signDms(r.longitude), r.nakshatraName, abbr(r.signLord), abbr(r.starLord), abbr(r.subLord), abbr(r.subSubLord)],
      ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(kpProvider(birth));
    final error = value.error;
    // Placidus is undefined near the poles; the engine refuses rather than switching house
    // system. That is a property of the place, not a failure, so explain it plainly.
    if (!value.isLoading && error is EngineException && error.isPlacidusUndefined) {
      return PageBody(children: [PlacidusUndefinedNotice(latitude: birth.latitude, longitude: birth.longitude)]);
    }
    return AsyncView(
      value: value,
      onRetry: () => ref.invalidate(kpProvider(birth)),
      builder: (kp) {
        final rest = Map<String, Object?>.from(kp.raw)
          ..remove('cusps')
          ..remove('planets')
          ..remove('cuspSystem')
          ..remove('ayanamsaType')
          ..remove('ayanamsaValue');
        const cols = ['Point', 'Longitude', 'Nakshatra', 'Sign L', 'Star L', 'Sub L', 'Sub-sub L'];
        final ayanamsa = kp.ayanamsaType == null ? null : '${ayanamsaShort(kp.ayanamsaType!)}${kp.ayanamsaValue == null ? '' : ' ${dms(kp.ayanamsaValue!)}'}';
        return PageBody(children: [
          KeyValueGrid(key: const Key('kp-conventions'), columns: 2, keyWidth: 90, items: [
            ('Cusps', houseSystemLabel(kp.cuspSystem ?? CalcOptions.defaultKpCuspSystem)),
            if (ayanamsa != null) ('Ayanamsa', ayanamsa),
          ]),
          SectionCard(title: 'Cusps', subtitle: 'Placidus cusps; planets are placed between cusps', child: SimpleTable(columns: cols, rows: _rows(kp.cusps))),
          SectionCard(title: 'Planets', child: SimpleTable(columns: cols, rows: _rows(kp.planets))),
          SectionCard(title: 'Significators, ruling planets and other KP output', child: StructuredResultView(data: rest)),
        ]);
      },
    );
  }
}

/// Shown instead of the KP tables when Placidus cusps do not exist at the birth latitude.
class PlacidusUndefinedNotice extends StatelessWidget {
  const PlacidusUndefinedNotice({super.key, required this.latitude, required this.longitude});
  final double latitude;
  final double longitude;

  @override
  Widget build(BuildContext context) => EmptyState(
        key: const Key('kp-placidus-undefined'),
        icon: Icons.public_off_outlined,
        title: 'Placidus houses are not defined at this latitude',
        message: 'This chart is cast for ${latLon(latitude, longitude)}. Near and beyond the polar circles '
            '(about 66.5° north or south) some degrees of the zodiac never rise or set, so Placidus house cusps, '
            'which KP uses, cannot be calculated here. No other house system is substituted.\n\n'
            'Everything else for this chart (Rasi, vargas, dashas and the other sections) works as usual.',
      );
}
