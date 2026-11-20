import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../charts/chart_data.dart';
import '../../charts/chart_view.dart';
import '../../data/city_index.dart';
import '../../engine/inputs.dart';
import '../../state/providers.dart';
import '../../util/format.dart';
import '../widgets/common.dart';
import '../widgets/moment_bar.dart';

/// Structured view of one engine method's full output.
class EngineResultSection extends ConsumerWidget {
  const EngineResultSection({super.key, required this.title, required this.method, required this.params});
  final String title;
  final String method;
  final Map<String, Object?> params;

  @override
  Widget build(BuildContext context, WidgetRef ref) => SectionCard(
        title: title,
        child: AsyncView(value: ref.watch(rawProvider(rawKey(method, params))), builder: (j) => StructuredResultView(data: j)),
      );
}

class YogasScreen extends StatelessWidget {
  const YogasScreen({super.key, required this.birth});
  final BirthInput birth;
  @override
  Widget build(BuildContext context) => PageBody(children: [
        EngineResultSection(title: 'Yogas detected by the engine (with evidence)', method: 'yogas.compute', params: {'birth': birth.toJson()}),
      ]);
}

class JaiminiScreen extends StatelessWidget {
  const JaiminiScreen({super.key, required this.birth});
  final BirthInput birth;
  @override
  Widget build(BuildContext context) => PageBody(children: [
        EngineResultSection(title: 'Jaimini: Chara Karakas, Arudha Padas, Rashi Drishti, Argala, Karakamsha', method: 'jaimini.compute', params: {'birth': birth.toJson()}),
        EngineResultSection(title: 'Special lagnas and derived charts (Chandra, Surya, Karakamsha, Bhava Chalit…)', method: 'chartVariants.compute', params: {'birth': birth.toJson()}),
      ]);
}

class SpecialScreen extends ConsumerWidget {
  const SpecialScreen({super.key, required this.birth});
  final BirthInput birth;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final style = ref.watch(chartStyleProvider);
    return PageBody(children: [
      SectionCard(
        title: 'Sudarshana Chakra (Lagna, Chandra and Surya lagnas)',
        child: AsyncView(
          value: ref.watch(sudarshanaProvider(birth)),
          builder: (rings) => Wrap(spacing: 12, runSpacing: 12, children: [
            for (final r in rings) ChartView(data: ChartData.fromSigns('${titleCase(r.ring)} lagna', r.referenceRashi, r.occupantsBySign), style: style, size: 280),
          ]),
        ),
      ),
      EngineResultSection(title: 'Avakhada Chakra, Ghat Chakra and Tara Chakra', method: 'avakhada.compute', params: {'birth': birth.toJson()}),
      EngineResultSection(title: 'Upagrahas, special lagnas, sensitive points and planetary details', method: 'specialPoints.compute', params: {'birth': birth.toJson()}),
    ]);
  }
}

class VarshaphalaScreen extends StatefulWidget {
  const VarshaphalaScreen({super.key, required this.birth});
  final BirthInput birth;
  @override
  State<VarshaphalaScreen> createState() => _VarshaphalaScreenState();
}

class _VarshaphalaScreenState extends State<VarshaphalaScreen> {
  int year = DateTime.now().year;
  @override
  Widget build(BuildContext context) => PageBody(children: [
        ControlBar(children: [
          Stepper2(label: 'Year', value: '$year', prevTooltip: 'Previous year', nextTooltip: 'Next year', onPrev: () => setState(() => year--), onNext: () => setState(() => year++)),
          const Text('Annual chart cast at the birth place (engine default).', style: TextStyle(fontSize: 12.5)),
        ]),
        EngineResultSection(
          title: 'Varshaphala (Tajika): solar return, Varsha Lagna, Muntha, Panchadhikari, Varshesha, Harsha Bala, Tajika yogas, Sahams, Mudda dasha',
          method: 'varshaphala.compute',
          params: {'birth': widget.birth.toJson(), 'targetYear': year},
        ),
      ]);
}

class PrashnaScreen extends StatefulWidget {
  const PrashnaScreen({super.key, required this.initial});
  final BirthInput initial;
  @override
  State<PrashnaScreen> createState() => _PrashnaScreenState();
}

class _PrashnaScreenState extends State<PrashnaScreen> {
  late BirthInput moment = widget.initial;
  final number = TextEditingController();
  String system = 'PARASHARI_1_108';
  int? n;

  @override
  void dispose() {
    number.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PageBody(children: [
        MomentBar(value: moment, onChanged: (m) => setState(() => moment = m), label: 'Question moment'),
        Wrap(spacing: 12, crossAxisAlignment: WrapCrossAlignment.center, children: [
          SizedBox(width: 160, child: TextField(controller: number, decoration: const InputDecoration(labelText: 'Number (optional)'), onSubmitted: (v) => setState(() => n = int.tryParse(v)))),
          DropdownButton<String>(
            value: system,
            items: const [
              DropdownMenuItem(value: 'PARASHARI_1_108', child: Text('Parashari 1–108')),
              DropdownMenuItem(value: 'KP_1_249', child: Text('KP 1–249')),
            ],
            onChanged: (v) => setState(() => system = v!),
          ),
          FilledButton.tonal(onPressed: () => setState(() => n = int.tryParse(number.text)), child: const Text('Apply')),
        ]),
        EngineResultSection(
          title: 'Prashna chart',
          method: 'prashna.compute',
          params: {'moment': moment.toJson(), if (n != null) 'questionNumber': n, if (n != null) 'questionNumberSystem': system},
        ),
      ]);
}

class EclipsesScreen extends ConsumerStatefulWidget {
  const EclipsesScreen({super.key, required this.utcOffsetMinutes, required this.timezone});
  final int utcOffsetMinutes;
  final String timezone;
  @override
  ConsumerState<EclipsesScreen> createState() => _EclipsesScreenState();
}

class _EclipsesScreenState extends ConsumerState<EclipsesScreen> {
  int year = DateTime.now().year;
  @override
  Widget build(BuildContext context) => PageBody(children: [
        ControlBar(children: [
          Stepper2(label: 'Year', value: '$year', prevTooltip: 'Previous year', nextTooltip: 'Next year', onPrev: () => setState(() => year--), onNext: () => setState(() => year++)),
        ]),
        SectionCard(
          title: 'Solar and lunar eclipses (global peak)',
          child: AsyncView(
            value: ref.watch(eclipsesProvider(year)),
            builder: (list) => list.isEmpty
                ? EmptyState(icon: Icons.brightness_3_outlined, title: 'No eclipses in $year', message: 'Use the arrows to look at another year.')
                : SimpleTable(
              title: 'Eclipses $year',
              columns: ['Type', 'Kind', 'Peak (UTC)', 'Peak (${offsetLabel(widget.utcOffsetMinutes)})', 'Sidereal sign', 'Nakshatra #', 'Obscuration', 'Peak location'],
              rows: [
                for (final e in list)
                  [
                    titleCase(e.body),
                    titleCase(e.kind),
                    localDateTime(e.peak, 0),
                    localDateTime(e.peak, widget.utcOffsetMinutes),
                    signNames[e.rashiIndex - 1],
                    '${e.nakshatraIndex}',
                    e.obscuration == null ? '' : '${(e.obscuration! * 100).toStringAsFixed(1)}%',
                    e.peakLatitude == null ? '' : latLon(e.peakLatitude!, e.peakLongitude!),
                  ],
              ],
            ),
          ),
        ),
        Text('Eclipse geometry: astronomy-engine (MIT). Local column uses the chart zone offset (${widget.timezone}) at birth.', style: Theme.of(context).textTheme.bodySmall),
      ]);
}

class AboutScreen extends ConsumerWidget {
  const AboutScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) => PageBody(children: [
        const SectionCard(
          title: 'Astro Sushil Desktop',
          child: Text(
            'Offline Vedic astrology workstation. Every calculation is performed by the Astro Sushil astrology engine '
            '(packages/astrology-engine) running locally in the bundled engine sidecar; the desktop UI only displays results.\n\n'
            'Ephemeris: astronomy-engine (MIT). ${CityIndex.attribution}. PDF: pdf / printing packages (Apache-2.0).',
          ),
        ),
        SectionCard(
          title: 'Engine configuration and conventions',
          child: AsyncView(value: ref.watch(engineInfoProvider), builder: (j) => StructuredResultView(data: j)),
        ),
      ]);
}
