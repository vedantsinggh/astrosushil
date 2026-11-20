import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/chakras/chakras_screen.dart';
import '../../features/chart_notes/chart_notes_panel.dart';
import '../../features/chart_wheel/chart_wheel.dart';
import '../../features/combustion_periods/combustion_periods_screen.dart';
import '../../features/dasha_pravesh/dasha_pravesh_screen.dart';
import '../../features/dashas_extended/dashas_extended_screen.dart';
import '../../features/ephemeris_tables/ephemeris_tools_screen.dart';
import '../../features/horoscope_pdf/horoscope_pdf_screen.dart';
import '../../features/lal_kitab/lal_kitab_screen.dart';
import '../../features/muhurta_extras/muhurta_extras_screen.dart';
import '../../features/panchang_month/panchang_month_screen.dart';
import '../../features/rectification/rectification_screen.dart';
import '../../features/relationships/relationships_screen.dart';
import '../../features/sade_sati/sade_sati_screen.dart';
import '../../features/strength_graph/strength_graph_screen.dart';
import '../../features/tajika/tajika_screen.dart';
import '../../features/transit_tables/transit_tables_screen.dart';
import '../../features/vargas_extra/vargas_extra_screen.dart';
import '../data/chart_file.dart';
import '../engine/inputs.dart';
import '../state/providers.dart';
import 'screens/ashtakavarga_screen.dart';
import 'screens/bhava_chalit_screen.dart';
import 'screens/chart_screen.dart';
import 'screens/dasha_screen.dart';
import 'screens/generic_screens.dart';
import 'screens/kp_screen.dart';
import 'screens/matchmaking_screen.dart';
import 'screens/panchang_screen.dart';
import 'screens/strength_screen.dart';
import 'screens/transit_screen.dart';
import 'screens/transit_timeline_screen.dart';
import 'screens/vargas_screen.dart';
import 'sections.dart';
import 'widgets/common.dart';

/// The single place that maps a [Section] to its screen.
///
/// To add a screen: add a value to [Section] (sections.dart: label, icon, sidebar group,
/// one-line description) and a case here. The sidebar, the Chart menu, Alt+number shortcuts,
/// breadcrumbs and the Preferences "Open charts at" list pick it up automatically.
Widget buildSectionBody(WidgetRef ref, Section s, ChartFile doc) {
  final b = doc.birth;
  Widget withNow(Widget Function(BirthInput now) f) => AsyncView(value: ref.watch(nowAtPlaceProvider(b)), builder: f);
  return switch (s) {
    Section.chart => ChartScreen(birth: b),
    Section.vargas => VargasScreen(birth: b),
    Section.bhavaChalit => BhavaChalitScreen(birth: b),
    Section.dashas => DashaScreen(birth: b),
    Section.panchang => withNow((now) => PanchangScreen(initial: now)),
    Section.ashtakavarga => AshtakavargaScreen(birth: b),
    Section.strength => StrengthScreen(birth: b),
    Section.transits => withNow((now) => TransitScreen(birth: b, initialMoment: now)),
    Section.timeline => TransitTimelineScreen(birth: b),
    Section.matching => MatchmakingScreen(document: doc),
    Section.kp => KpScreen(birth: b),
    Section.jaimini => JaiminiScreen(birth: b),
    Section.yogas => YogasScreen(birth: b),
    Section.varshaphala => VarshaphalaScreen(birth: b),
    Section.special => SpecialScreen(birth: b),
    Section.prashna => withNow((now) => PrashnaScreen(initial: now)),
    Section.eclipses => AsyncView(
        value: ref.watch(chartResultProvider(b)),
        builder: (c) => EclipsesScreen(utcOffsetMinutes: c.utcOffsetMinutes, timezone: b.timezone),
      ),
    Section.wheel => ChartWheelScreen(birth: b),
    Section.vargasExtra => VargasExtraScreen(birth: b),
    Section.relationships => RelationshipsScreen(birth: b),
    Section.notes => PageBody(children: [
        ChartNotesPanel(
          notes: doc.notes,
          onChanged: (v) {
            final active = ref.read(tabsProvider).active?.doc;
            if (active == null || active.notes == v) return;
            ref.read(tabsProvider.notifier).updateActive(active.copyWith(notes: v), dirty: true);
          },
        ),
      ]),
    Section.dashasExtra => DashasExtendedScreen(birth: b),
    Section.dashaPravesh => DashaPraveshScreen(birth: b),
    Section.transitTables => TransitTablesScreen(place: b, showTimeline: false),
    Section.sadeSati => SadeSatiScreen(birth: b),
    Section.combustion => CombustionPeriodsScreen(timezone: b.timezone),
    Section.tajika => TajikaScreen(birth: b, chartStyle: ref.watch(chartStyleProvider)),
    Section.strengthGraphs => StrengthGraphScreen(birth: b),
    Section.chakras => ChakrasScreen(birth: b),
    Section.lalKitab => LalKitabScreen(birth: b),
    Section.ephemeris => withNow((now) => EphemerisToolsScreen(initial: now)),
    Section.lagnaRising => withNow((now) => EphemerisToolsScreen(initial: now, initialTab: 2)),
    Section.muhurtaWindows => withNow((now) => MuhurtaExtrasScreen(initial: now)),
    Section.panchangMonth => PanchangMonthScreen(location: b.location),
    Section.rectification => RectificationScreen(birth: b),
    Section.horoscopePdf => HoroscopePdfScreen(birth: b, initialStyle: ref.watch(chartStyleProvider)),
    Section.about => const AboutScreen(),
  };
}
