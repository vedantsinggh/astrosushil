// UI audit: astrology screens (QA only).
@Tags(['ui_audit'])
library;

import 'package:flutter_test/flutter_test.dart' show Tags;

import 'package:astro_mobile/features/astrology/models/vastu_model.dart';
import 'package:astro_mobile/features/astrology/screens/ashtakavarga_screen.dart';
import 'package:astro_mobile/features/astrology/screens/astrology_hub_screen.dart';
import 'package:astro_mobile/features/astrology/screens/bhava_bala_screen.dart';
import 'package:astro_mobile/features/astrology/screens/birth_chart_screen.dart';
import 'package:astro_mobile/features/astrology/screens/divisional_charts_screen.dart';
import 'package:astro_mobile/features/astrology/screens/gochara_screen.dart';
import 'package:astro_mobile/features/astrology/screens/houses_screen.dart';
import 'package:astro_mobile/features/astrology/screens/jaimini_screen.dart';
import 'package:astro_mobile/features/astrology/screens/kp_astrology_screen.dart';
import 'package:astro_mobile/features/astrology/screens/matchmaking_screen.dart';
import 'package:astro_mobile/features/astrology/screens/nakshatras_screen.dart';
import 'package:astro_mobile/features/astrology/screens/panchanga_screen.dart';
import 'package:astro_mobile/features/astrology/screens/planet_detail_screen.dart';
import 'package:astro_mobile/features/astrology/screens/planets_screen.dart';
import 'package:astro_mobile/features/astrology/screens/prashna_screen.dart';
import 'package:astro_mobile/features/astrology/screens/rashi_bhavishya_screen.dart';
import 'package:astro_mobile/features/astrology/screens/shadbala_screen.dart';
import 'package:astro_mobile/features/astrology/screens/special_points_screen.dart';
import 'package:astro_mobile/features/astrology/screens/varshaphala_screen.dart';
import 'package:astro_mobile/features/astrology/screens/vastu_detail_screen.dart';
import 'package:astro_mobile/features/astrology/screens/vastu_screen.dart';
import 'package:astro_mobile/features/astrology/screens/vimshottari_dasha_screen.dart';
import 'package:astro_mobile/features/astrology/screens/yogas_screen.dart';

import 'audit_fixtures.dart';
import 'audit_harness.dart';

void main() {
  final cat = VastuCategoryModel.fromJson({
    'id': 1,
    'slug': 'entrance',
    'name': 'Main Entrance',
    'sanskritName': 'Mukhya Dvara',
    'description': 'Guidance for the main entrance of your home.',
    'idealDirection': 'North-East',
    'element': 'Water',
    'iconName': 'door_front',
  });
  final cases = <AuditCase>[
    AuditCase('astrology_hub', () => const AstrologyHubScreen(), overrides: () => baseOverrides()),
    AuditCase('birth_chart_t0', () => BirthChartScreen(profile: kProfile), overrides: () => baseOverrides()),
    AuditCase('birth_chart_t1', () => BirthChartScreen(profile: kProfile, initialTabIndex: 1), overrides: () => baseOverrides(), matrix: kLiteMatrix),
    AuditCase('birth_chart_t2', () => BirthChartScreen(profile: kProfile, initialTabIndex: 2), overrides: () => baseOverrides(), matrix: kLiteMatrix),
    AuditCase('birth_chart_long', () => BirthChartScreen(profile: kLongProfile), overrides: () => baseOverrides(long: true), matrix: kLiteMatrix),
    AuditCase('birth_chart_noprofile', () => const BirthChartScreen(), overrides: () => baseOverrides(noProfile: true), matrix: kLiteMatrix),
    AuditCase('planets', () => PlanetsScreen(profile: kProfile), overrides: () => baseOverrides()),
    AuditCase('houses', () => HousesScreen(profile: kProfile), overrides: () => baseOverrides()),
    AuditCase('nakshatras', () => NakshatrasScreen(profile: kProfile), overrides: () => baseOverrides()),
    AuditCase('divisional_charts', () => const DivisionalChartsScreen(), overrides: () => baseOverrides()),
    AuditCase('vimshottari_dasha', () => const VimshottariDashaScreen(), overrides: () => baseOverrides()),
    AuditCase('ashtakavarga', () => const AshtakavargaScreen(), overrides: () => baseOverrides()),
    AuditCase('shadbala', () => const ShadbalaScreen(), overrides: () => baseOverrides()),
    AuditCase('bhava_bala', () => const BhavaBalaScreen(), overrides: () => baseOverrides()),
    AuditCase('yogas', () => const YogasScreen(), overrides: () => baseOverrides()),
    AuditCase('jaimini', () => const JaiminiScreen(), overrides: () => baseOverrides()),
    AuditCase('kp_astrology', () => const KPAstrologyScreen(), overrides: () => baseOverrides()),
    AuditCase('special_points', () => const SpecialPointsScreen(), overrides: () => baseOverrides()),
    AuditCase('gochara', () => const GocharaScreen(), overrides: () => baseOverrides()),
    AuditCase('varshaphala', () => const VarshaphalaScreen(), overrides: () => baseOverrides()),
    AuditCase('prashna', () => const PrashnaScreen(), overrides: () => baseOverrides()),
    AuditCase('matchmaking', () => const MatchmakingScreen(), overrides: () => baseOverrides()),
    AuditCase('panchanga', () => const PanchangaScreen(), overrides: () => baseOverrides()),
    AuditCase('rashi_bhavishya', () => const RashiBhavishyaScreen(), overrides: () => baseOverrides()),
    AuditCase('rashi_bhavishya_long', () => const RashiBhavishyaScreen(), overrides: () => baseOverrides(long: true), matrix: kLiteMatrix),
    AuditCase('vastu', () => const VastuScreen(), overrides: () => baseOverrides()),
    AuditCase('vastu_long', () => const VastuScreen(), overrides: () => baseOverrides(long: true), matrix: kLiteMatrix),
    AuditCase('vastu_detail', () => VastuDetailScreen(category: cat), overrides: () => baseOverrides()),
    AuditCase('planet_detail', () => const PlanetDetailScreen(
          planetName: 'Jupiter (R)', signName: 'Sagittarius', degree: '23° 45\' 12"', houseNumber: 10,
          isRetrograde: true, nakshatraName: 'Purva Ashadha'), overrides: () => baseOverrides()),
    AuditCase('dasha_noprofile', () => const VimshottariDashaScreen(), overrides: () => baseOverrides(noProfile: true), matrix: kLiteMatrix),
    AuditCase('shadbala_noprofile', () => const ShadbalaScreen(), overrides: () => baseOverrides(noProfile: true), matrix: kLiteMatrix),
    AuditCase('yogas_noprofile', () => const YogasScreen(), overrides: () => baseOverrides(noProfile: true), matrix: kLiteMatrix),
  ];
  registerAuditCases('B', cases);
}
