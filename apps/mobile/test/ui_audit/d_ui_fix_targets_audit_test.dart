// UI audit: surfaces that the screen-level cases do not open on their own
// (Sushil Sir explainer sheet, explainer buttons, home hero profile card in
// isolation so it stays on-screen at 2.0x text). QA only.
@Tags(['ui_audit'])
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart' show Tags;

import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/sushil_explainer/data/sushil_explainer_repository.dart';
import 'package:astro_mobile/features/sushil_explainer/models/explanation_context.dart';
import 'package:astro_mobile/features/sushil_explainer/models/sushil_explanation_model.dart';
import 'package:astro_mobile/features/sushil_explainer/providers/sushil_explainer_provider.dart';
import 'package:astro_mobile/features/sushil_explainer/widgets/sushil_explainer_button.dart';
import 'package:astro_mobile/features/sushil_explainer/widgets/sushil_explainer_sheet.dart';
import 'package:astro_mobile/home/widgets/hero_astrology_card.dart';

import 'audit_fixtures.dart';
import 'audit_harness.dart';

class _FakeExplainerRepository implements SushilExplainerRepository {
  @override
  Future<SushilExplanationModel> explainScreen(ExplanationContext context) async {
    return SushilExplanationModel(
      headline: 'Your Saturn Mahadasha in simple words',
      message: 'This period rewards patience and disciplined effort. Work steadily and avoid shortcuts.',
      keyPoints: const [
        'Saturn sits in your 10th house, which highlights career duties.',
        'Steady routines bring the best results in this period.',
      ],
      disclaimer: 'AI Sushil Sir interpretation of deterministic chart data.',
      feature: context.feature,
      screenTitle: context.screenTitle,
      cachedAt: DateTime(2026, 11, 18),
    );
  }
}

const _ctx = ExplanationContext(
  feature: 'vimshottari_dasha',
  screenTitle: 'Vimshottari Dasha',
  astrologyData: {'mahadasha': 'Saturn'},
);

void main() {
  final cases = <AuditCase>[
    AuditCase(
      'explainer_sheet',
      () => const Scaffold(
        backgroundColor: Colors.black54,
        body: Align(
          alignment: Alignment.bottomCenter,
          child: SushilExplainerSheet(explanationContext: _ctx),
        ),
      ),
      overrides: () => baseOverrides(extra: [
        sushilExplainerRepositoryProvider.overrideWithValue(_FakeExplainerRepository()),
      ]),
    ),
    AuditCase(
      'explainer_buttons',
      () => const Scaffold(
        body: SafeArea(
          child: Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SushilExplainerButton(contextData: _ctx),
                SizedBox(height: 16),
                SushilExplainerButton(contextData: _ctx, label: 'Explain syllabus', isCompact: true),
              ],
            ),
          ),
        ),
      ),
      overrides: () => baseOverrides(),
    ),
  ];
  Widget hero(String name, BirthProfileModel profile) => Scaffold(
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: HeroAstrologyCard(
            onViewChartTap: () {},
            onChangeProfileTap: () {},
            activeProfile: profile,
            userName: name,
          ),
        ),
      );
  cases.addAll([
    AuditCase('home_hero_card', () => hero('Rahul', kProfile), overrides: () => baseOverrides()),
    AuditCase('home_hero_card_long', () => hero(kLongName, kLongProfile), overrides: () => baseOverrides(long: true)),
  ]);
  registerAuditCases('D', cases);
}
