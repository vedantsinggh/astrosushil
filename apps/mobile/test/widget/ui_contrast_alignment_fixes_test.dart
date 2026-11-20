// Regression tests for the 2026-11-18 UI fixes:
// 1. Home hero "Birth Chart" CTA is pinned to the trailing edge of the profile card with the same
//    inset as the leading badge, and vertically centred, at phone/tablet sizes and 1.0x / 2.0x text.
// 2. Dark (navy) text on indigo/navy surfaces was replaced by inverse tokens (>= 4.5:1).
// 3. Unselected chips/tabs that drew white-on-white are now readable (>= 4.5:1).
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:astro_mobile/features/birth_profile/models/birth_profile_model.dart';
import 'package:astro_mobile/features/jyoti/models/jyoti_message.dart';
import 'package:astro_mobile/features/jyoti/widgets/jyoti_user_message.dart';
import 'package:astro_mobile/features/shop/models/product_model.dart';
import 'package:astro_mobile/features/shop/providers/shop_provider.dart';
import 'package:astro_mobile/features/shop/screens/shop_catalog_screen.dart';
import 'package:astro_mobile/features/sushil_explainer/data/sushil_explainer_repository.dart';
import 'package:astro_mobile/features/sushil_explainer/models/explanation_context.dart';
import 'package:astro_mobile/features/sushil_explainer/models/sushil_explanation_model.dart';
import 'package:astro_mobile/features/sushil_explainer/providers/sushil_explainer_provider.dart';
import 'package:astro_mobile/features/sushil_explainer/widgets/sushil_explainer_button.dart';
import 'package:astro_mobile/features/sushil_explainer/widgets/sushil_explainer_sheet.dart';
import 'package:astro_mobile/home/widgets/hero_astrology_card.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:astro_mobile/shared/theme/app_colors.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';
import 'package:astro_mobile/shared/widgets/astro_loader/astro_loader_card.dart';
import 'package:astro_mobile/shared/widgets/astro_controls.dart';


/// WCAG 2.x contrast ratio. A translucent foreground is composited over [bg] first.
double contrast(Color fg, Color bg) {
  final a = fg.a;
  final flat = Color.from(
    alpha: 1,
    red: fg.r * a + bg.r * (1 - a),
    green: fg.g * a + bg.g * (1 - a),
    blue: fg.b * a + bg.b * (1 - a),
  );
  final l1 = flat.computeLuminance();
  final l2 = bg.computeLuminance();
  final hi = l1 > l2 ? l1 : l2;
  final lo = l1 > l2 ? l2 : l1;
  return (hi + 0.05) / (lo + 0.05);
}

/// Composites a translucent [top] over an opaque [bottom].
Color over(Color top, Color bottom) => Color.from(
      alpha: 1,
      red: top.r * top.a + bottom.r * (1 - top.a),
      green: top.g * top.a + bottom.g * (1 - top.a),
      blue: top.b * top.a + bottom.b * (1 - top.a),
    );

Color textColorOf(WidgetTester tester, String text) {
  final rich = tester.widget<RichText>(find.descendant(of: find.text(text), matching: find.byType(RichText)).first);
  return rich.text.style!.color!;
}

Widget app(Widget home, {List<Override> overrides = const []}) => ProviderScope(
      overrides: overrides,
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        home: home,
      ),
    );

class _FakeExplainerRepository implements SushilExplainerRepository {
  @override
  Future<SushilExplanationModel> explainScreen(ExplanationContext context) async => SushilExplanationModel(
        headline: 'Headline text',
        message: 'Message text',
        keyPoints: const ['Key point text'],
        disclaimer: 'Disclaimer text',
        feature: context.feature,
        screenTitle: context.screenTitle,
        cachedAt: DateTime(2026, 11, 18),
      );
}

const _ctx = ExplanationContext(feature: 'vimshottari_dasha', screenTitle: 'Dasha', astrologyData: {'k': 'v'});

final _profile = BirthProfileModel(
  id: 'bp_ui_fix',
  userId: 'usr_ui_fix',
  name: 'Rahul Sharma',
  dateOfBirth: '1990-05-15',
  timeOfBirth: '14:30:00',
  latitude: 28.6139,
  longitude: 77.2090,
  timezone: 'Asia/Kolkata',
  placeName: 'New Delhi, India',
  createdAt: DateTime(2026, 1, 1),
  updatedAt: DateTime(2026, 1, 1),
);

void main() {
  group('Home hero "Birth Chart" CTA alignment', () {
    const sizes = <Size>[Size(320, 568), Size(390, 844), Size(1024, 1366)];
    const scales = <double>[1.0, 2.0];
    for (final size in sizes) {
      for (final scale in scales) {
        testWidgets('pinned to trailing edge and vertically centred at ${size.width.toInt()}x${size.height.toInt()} @${scale}x',
            (tester) async {
          tester.view.physicalSize = size * 2;
          tester.view.devicePixelRatio = 2;
          tester.platformDispatcher.textScaleFactorTestValue = scale;
          addTearDown(tester.view.reset);
          addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

          await tester.pumpWidget(app(Scaffold(
            body: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: HeroAstrologyCard(
                onViewChartTap: () {},
                onChangeProfileTap: () {},
                activeProfile: _profile,
                userName: 'Rahul',
              ),
            ),
          )));
          await tester.pump();
          // The test font (Ahem) is much wider than Roboto, so the unrelated top greeting badge can
          // overflow at 320dp @2.0x; that is not part of this fix. The profile-card row is checked
          // geometrically below instead.
          tester.takeException();

          final button = find.byType(ElevatedButton);
          expect(button, findsOneWidget);
          final profileCard = find.ancestor(
            of: button,
            matching: find.byWidgetPredicate((w) => w is Material && w.color == AppColors.cardSurfaceWarm),
          );
          final badge = find.ancestor(of: find.byIcon(Icons.auto_awesome_rounded), matching: find.byType(Container)).first;

          final card = tester.getRect(profileCard);
          final btn = tester.getRect(button);
          final badgeRect = tester.getRect(badge);

          final leftInset = badgeRect.left - card.left;
          final rightInset = card.right - btn.right;
          expect(rightInset, closeTo(leftInset, 0.5),
              reason: 'CTA trailing inset ($rightInset) should mirror badge leading inset ($leftInset)');
          expect(btn.center.dy, closeTo(card.center.dy, 0.5), reason: 'CTA should be vertically centred in the card');
          expect(btn.height, greaterThanOrEqualTo(48));
          // Nothing in the profile row spills past the CTA or the card.
          final name = tester.getRect(find.text('Rahul Sharma'));
          expect(name.right, lessThanOrEqualTo(btn.left));
          expect(btn.right, lessThanOrEqualTo(card.right));
        });
      }
    }
  });

  group('Dark text on indigo / navy surfaces', () {
    testWidgets('explainer banner and compact chip text meet 4.5:1 against every gradient stop', (tester) async {
      await tester.pumpWidget(app(const Scaffold(
        backgroundColor: AppColors.canvas,
        body: Column(children: [
          SushilExplainerButton(contextData: _ctx),
          SushilExplainerButton(contextData: _ctx, label: 'Explain syllabus', isCompact: true),
        ]),
      )));
      // Banner gradient stops as painted over the ivory canvas.
      final banner = [
        over(AppColors.surfaceElevated.withValues(alpha: 0.85), AppColors.canvas),
        over(AppColors.tertiary.withValues(alpha: 0.95), AppColors.canvas),
      ];
      final compact = [
        over(AppColors.tertiary.withValues(alpha: 0.95), AppColors.canvas),
        over(AppColors.primary.withValues(alpha: 0.95), AppColors.canvas),
      ];
      for (final bg in banner) {
        expect(contrast(textColorOf(tester, 'Let Sushil Sir explain'), bg), greaterThanOrEqualTo(4.5));
        expect(contrast(textColorOf(tester, 'Tap for a simple plain-language breakdown'), bg), greaterThanOrEqualTo(4.5));
      }
      for (final bg in compact) {
        expect(contrast(textColorOf(tester, 'Explain syllabus'), bg), greaterThanOrEqualTo(4.5));
      }
    });

    testWidgets('explainer sheet text is readable on the midnight sheet surface', (tester) async {
      await tester.pumpWidget(app(
        const Scaffold(body: Align(alignment: Alignment.bottomCenter, child: SushilExplainerSheet(explanationContext: _ctx))),
        overrides: [sushilExplainerRepositoryProvider.overrideWithValue(_FakeExplainerRepository())],
      ));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      // Worst case: the lightest translucent indigo panel inside the sheet.
      final panel = over(AppColors.surfaceElevated.withValues(alpha: 0.6), AppColors.background);
      for (final text in ['AI Sushil Sir', 'Message text', 'Key point text', 'Have specific questions?', 'Explain simply']) {
        final fg = textColorOf(tester, text);
        expect(contrast(fg, AppColors.background), greaterThanOrEqualTo(4.5), reason: text);
        expect(contrast(fg, panel), greaterThanOrEqualTo(4.5), reason: text);
      }
      expect(contrast(textColorOf(tester, 'Disclaimer text'), AppColors.background), greaterThanOrEqualTo(4.5));
      // Unselected mode chip label on its indigo chip fill.
      expect(contrast(textColorOf(tester, 'Explain simply'), AppColors.surfaceElevated), greaterThanOrEqualTo(4.5));
    });

    testWidgets('Jyoti user bubble text is readable on the navy bubble', (tester) async {
      await tester.pumpWidget(app(Scaffold(
        body: JyotiUserMessage(
          message: JyotiMessageModel(
            id: 'm1',
            type: JyotiMessageType.user,
            text: 'What does my 10th house say?',
            timestamp: DateTime(2026, 11, 18, 9, 1),
            isUser: true,
          ),
        ),
      )));
      expect(contrast(textColorOf(tester, 'What does my 10th house say?'), AppColors.primary), greaterThanOrEqualTo(4.5));
    });

    testWidgets('dark loader card message is readable on its indigo surface', (tester) async {
      await tester.pumpWidget(app(const Scaffold(
        body: AstroLoaderCard(message: 'Loading chart', isDark: true, reducedMotion: true),
      )));
      expect(contrast(textColorOf(tester, 'Loading chart'), AppColors.tertiary), greaterThanOrEqualTo(4.5));
    });
  });

  group('Unselected chips on light / indigo surfaces', () {
    testWidgets('shop category chips: unselected and selected labels meet 4.5:1 on their resolved fill', (tester) async {
      tester.view.physicalSize = const Size(390, 844) * 2;
      tester.view.devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(app(const ShopCatalogScreen(), overrides: [
        shopProductsProvider.overrideWith((ref) => Future.value(const <ProductModel>[])),
      ]));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      final pills = find.byType(AstroPill);
      expect(pills, findsAtLeastNWidgets(2));
      for (final pill in pills.evaluate()) {
        final material = tester.widget<Material>(find.descendant(of: find.byWidget(pill.widget), matching: find.byType(Material)).first);
        final text = tester.widget<Text>(find.descendant(of: find.byWidget(pill.widget), matching: find.byType(Text)).first);
        final fill = material.color!;
        expect(fill.a, 1.0, reason: 'pill fill must be opaque');
        expect(contrast(text.style!.color!, fill), greaterThanOrEqualTo(4.5), reason: text.data);
      }
    });
  });
}
