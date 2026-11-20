import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../engine/inputs.dart';
import '../../state/providers.dart';
import '../../util/format.dart';
import '../widgets/common.dart';

class StrengthScreen extends ConsumerWidget {
  const StrengthScreen({super.key, required this.birth});
  final BirthInput birth;

  @override
  Widget build(BuildContext context, WidgetRef ref) => AsyncView(
        value: ref.watch(strengthProvider(birth)),
        builder: (s) {
          final sb = [...s.shadbala]..sort((a, b) => planetOrder.indexOf(a.planet).compareTo(planetOrder.indexOf(b.planet)));
          return PageBody(children: [
            SectionCard(
              title: 'Shadbala (shashtiamsas; totals also in rupas)',
              child: SimpleTable(
                columns: const ['Planet', 'Sthana', 'Dig', 'Kala', 'Cheshta', 'Naisargika', 'Drik', 'Total', 'Rupas', 'Required', 'Ratio', 'Rank'],
                numericColumns: {for (var i = 1; i <= 11; i++) i},
                rows: [
                  for (final r in sb)
                    [titleCase(r.planet), fixed(r.sthana), fixed(r.dig), fixed(r.kala), fixed(r.cheshta), fixed(r.naisargika), fixed(r.drik), fixed(r.total), fixed(r.rupas), fixed(r.required), fixed(r.ratio), '${r.rank}${r.isStrong ? '' : ' (weak)'}'],
                ],
              ),
            ),
            Wrap(spacing: 12, runSpacing: 12, children: [
              SizedBox(
                width: 520,
                child: SectionCard(
                  title: 'Bhava Bala',
                  child: SimpleTable(
                    columns: const ['House', 'Sign', 'Lord', 'Shashtiamsas', 'Rupas', 'Rank'],
                    numericColumns: const {3, 4, 5},
                    rows: [for (final h in s.bhavaBala) ['${h.house}', h.sign, titleCase(h.lord), fixed(h.total), fixed(h.rupas), '${h.rank}']],
                  ),
                ),
              ),
              SizedBox(
                width: 420,
                child: SectionCard(
                  title: 'Ishta / Kashta Phala (BPHS)',
                  child: SimpleTable(
                    columns: const ['Planet', 'Ishta', 'Kashta', 'Net'],
                    numericColumns: const {1, 2, 3},
                    rows: [for (final r in s.ishtaKashta) [titleCase(r.planet), fixed(r.ishta), fixed(r.kashta), fixed(r.net)]],
                  ),
                ),
              ),
              SizedBox(
                width: 520,
                child: SectionCard(
                  title: 'Vimshopaka Bala (out of 20)',
                  child: SimpleTable(
                    columns: const ['Planet', 'Shadvarga', 'Saptavarga', 'Dashavarga', 'Shodashavarga'],
                    numericColumns: const {1, 2, 3, 4},
                    rows: [for (final v in s.vimshopaka) [titleCase(v.planet), fixed(v.shad), fixed(v.sapta), fixed(v.dasha), fixed(v.shodasha)]],
                  ),
                ),
              ),
            ]),
          ]);
        },
      );
}
