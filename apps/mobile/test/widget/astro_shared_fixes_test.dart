// Shared adaptive design system: platform touch-target sizes, trailing
// button icons, compact AstroPage, sheets, on-dark pill, NavAction.text
// outside a bar, AstroScroll.reveal, pinned segmented slot and the Sushil
// explainer button variants. Every test runs on iOS and Android.
import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:astro_mobile/features/sushil_explainer/models/explanation_context.dart';
import 'package:astro_mobile/features/sushil_explainer/widgets/sushil_explainer_button.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:astro_mobile/shared/widgets/astro_design_system.dart';

final _both = TargetPlatformVariant({TargetPlatform.iOS, TargetPlatform.android});

bool get _isIOS => debugDefaultTargetPlatformOverride == TargetPlatform.iOS;
double get _minTarget => _isIOS ? 44 : 48;

Future<void> _pump(
  WidgetTester tester,
  Widget home, {
  double scale = 1.0,
  Size size = const Size(390, 844),
}) async {
  tester.view.physicalSize = size * 2;
  tester.view.devicePixelRatio = 2;
  tester.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  await tester.pumpWidget(ProviderScope(
    child: MaterialApp(
      theme: AppTheme.lightTheme,
      scrollBehavior: const AstroScrollBehavior(),
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      home: home,
    ),
  ));
  await tester.pump();
}

Widget _body(Widget child) => Scaffold(body: SafeArea(child: Padding(padding: const EdgeInsets.all(16), child: child)));

enum _Tab { a, b, c }

void main() {
  // ---------------------------------------------------------------------------
  // 1. Segmented control heights
  // ---------------------------------------------------------------------------
  testWidgets('segments are >= 44pt on iOS and >= 48dp on Android', (tester) async {
    var value = _Tab.a;
    await _pump(
      tester,
      _body(StatefulBuilder(
        builder: (context, setState) => AstroSegmentedControl<_Tab>(
          segments: const [
            AstroSegment(value: _Tab.a, label: 'Day'),
            AstroSegment(value: _Tab.b, label: 'Week'),
            AstroSegment(value: _Tab.c, label: 'Month'),
          ],
          selected: value,
          onChanged: (v) => setState(() => value = v),
        ),
      )),
    );
    // One sliding control (no pill fallback) with platform-height segments.
    expect(find.byType(AstroPill), findsNothing);
    final h = tester.getSize(find.ancestor(of: find.text('Week'), matching: find.byType(GestureDetector)).first).height;
    expect(h, greaterThanOrEqualTo(_minTarget));
    if (_isIOS) expect(h, lessThan(48), reason: 'iOS keeps the compact 44pt segment');
    await tester.tap(find.text('Month'));
    await tester.pumpAndSettle();
    expect(value, _Tab.c);
  }, variant: _both);

  testWidgets('segmented control scales labels on one row before wrapping, then wraps to pills', (tester) async {
    Widget control(double width) => Center(
          child: SizedBox(
            width: width,
            child: AstroSegmentedControl<_Tab>(
              segments: const [
                AstroSegment(value: _Tab.a, label: 'Overview'),
                AstroSegment(value: _Tab.b, label: 'Strengths'),
                AstroSegment(value: _Tab.c, label: 'Remedies'),
              ],
              selected: _Tab.a,
              onChanged: (_) {},
            ),
          ),
        );
    // Slightly too narrow (test font: 'Strengths' needs ~159pt per segment,
    // ~481pt in all): stays on one row with the labels scaled down.
    await _pump(tester, Scaffold(body: control(400)));
    expect(tester.takeException(), isNull);
    expect(find.byType(AstroPill), findsNothing);
    expect(find.descendant(of: find.byType(AstroSegmentedControl<_Tab>), matching: find.byType(FittedBox)), findsNWidgets(3));
    // Far too narrow: wrapping pills, nothing clipped.
    await _pump(tester, Scaffold(body: control(150)));
    expect(tester.takeException(), isNull);
    expect(find.byType(AstroPill), findsNWidgets(3));
  }, variant: _both);

  // ---------------------------------------------------------------------------
  // 13. Pinned segmented slot at 320pt / 2.0x: every option hit-testable
  // ---------------------------------------------------------------------------
  testWidgets('AstroSegmentedNavBottom in AstroPage.navBottom: all options tappable at 320pt and 2.0x',
      (tester) async {
    var tab = _Tab.a;
    const labels = ['My saved reports', 'Get a new report', 'Shared with me'];
    await _pump(
      tester,
      StatefulBuilder(
        builder: (context, setState) => AstroPage(
          title: 'Reports',
          navBottom: AstroSegmentedNavBottom<_Tab>(
            segments: [
              for (var i = 0; i < 3; i++) AstroSegment(value: _Tab.values[i], label: labels[i]),
            ],
            selected: tab,
            onChanged: (v) => setState(() => tab = v),
          ),
          child: Column(children: [for (var i = 0; i < 30; i++) SizedBox(height: 60, child: Text('Row $i'))]),
        ),
      ),
      scale: 2.0,
      size: const Size(320, 568),
    );
    expect(tester.takeException(), isNull);
    // At this width / size the control falls back to wrapped pills.
    expect(find.byType(AstroPill), findsNWidgets(3));
    for (var i = 0; i < 3; i++) {
      expect(find.text(labels[i]).hitTestable(), findsOneWidget, reason: '"${labels[i]}" must be hit-testable');
      // And the whole pill lies inside the pinned header, above the content.
      final pill = tester.getRect(find.ancestor(of: find.text(labels[i]), matching: find.byType(AstroPill)));
      final header = tester.getRect(find.byType(AstroSegmentedNavBottom<_Tab>));
      expect(pill.bottom, lessThanOrEqualTo(header.bottom + 0.5));
    }
    await tester.tap(find.text(labels[2]));
    await tester.pumpAndSettle();
    expect(tab, _Tab.c);

    // Still tappable once the large title has collapsed.
    await tester.drag(find.text('Row 3'), const Offset(0, -500));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    for (final l in labels) {
      expect(find.text(l).hitTestable(), findsOneWidget);
    }
    await tester.tap(find.text(labels[1]));
    await tester.pumpAndSettle();
    expect(tab, _Tab.b);
  }, variant: _both);

  // ---------------------------------------------------------------------------
  // 2. Expander header height
  // ---------------------------------------------------------------------------
  testWidgets('AstroExpander header is 44pt on iOS, 48dp on Android', (tester) async {
    await _pump(tester, _body(const AstroExpander(label: 'Learn more', child: Text('Body'))));
    final h = tester.getSize(find.byType(InkWell).first).height;
    expect(h, greaterThanOrEqualTo(_minTarget));
    if (_isIOS) expect(h, lessThan(48));
    await tester.tap(find.text('Learn more'));
    await tester.pumpAndSettle();
    expect(find.text('Body'), findsOneWidget);
  }, variant: _both);

  // ---------------------------------------------------------------------------
  // 5. Trailing button icons
  // ---------------------------------------------------------------------------
  testWidgets('primary / secondary buttons: icon leading by default, trailing on opt-in', (tester) async {
    await _pump(
      tester,
      _body(const Column(children: [
        AstroPrimaryButton(label: 'Share', icon: Icons.share_rounded, onPressed: null),
        AstroPrimaryButton(
          label: 'Continue',
          icon: Icons.arrow_forward_rounded,
          iconPosition: AstroIconPosition.trailing,
          onPressed: null,
        ),
        AstroSecondaryButton(
          label: 'Read',
          icon: Icons.chevron_right_rounded,
          iconPosition: AstroIconPosition.trailing,
          onPressed: null,
        ),
      ])),
    );
    expect(tester.getCenter(find.byIcon(Icons.share_rounded)).dx, lessThan(tester.getCenter(find.text('Share')).dx));
    expect(tester.getCenter(find.byIcon(Icons.arrow_forward_rounded)).dx,
        greaterThan(tester.getCenter(find.text('Continue')).dx));
    expect(tester.getCenter(find.byIcon(Icons.chevron_right_rounded)).dx,
        greaterThan(tester.getCenter(find.text('Read')).dx));
  }, variant: _both);

  // ---------------------------------------------------------------------------
  // 6. Compact AstroPage
  // ---------------------------------------------------------------------------
  testWidgets('AstroPage(largeTitle: false) shows only the compact bar', (tester) async {
    await _pump(
      tester,
      const AstroPage(title: 'Rudraksha Mala', largeTitle: false, child: SizedBox(height: 300, child: Text('Artwork'))),
    );
    final titles = tester.widgetList<Text>(find.text('Rudraksha Mala')).toList();
    expect(titles, hasLength(1));
    expect(titles.single.style!.fontSize, AppTypography.navTitle.fontSize);
    // Content starts right under the compact bar.
    expect(tester.getTopLeft(find.text('Artwork')).dy, lessThan(AstroMetrics.navBarHeight + 60));
    expect(find.byType(CustomScrollView), findsOneWidget);
  }, variant: _both);

  // ---------------------------------------------------------------------------
  // 7. Sheets: cancel key, Android drag handle
  // ---------------------------------------------------------------------------
  testWidgets('showAstroActionSheet: stable cancel key on both platforms; drag handle on Android', (tester) async {
    String? picked = 'unset';
    await _pump(
      tester,
      Builder(
        builder: (context) => Scaffold(
          body: Center(
            child: TextButton(
              onPressed: () async {
                picked = await showAstroActionSheet<String>(
                  context: context,
                  title: 'Language',
                  actions: const [
                    AstroSheetAction(label: 'English', value: 'en'),
                    AstroSheetAction(label: 'Hindi', value: 'hi'),
                  ],
                );
              },
              child: const Text('Open'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('astroActionSheetCancel')), findsOneWidget);
    expect(find.byKey(kAstroActionSheetCancelKey), findsOneWidget);
    expect(find.byType(CupertinoActionSheet), _isIOS ? findsOneWidget : findsNothing);
    if (!_isIOS) {
      final sheet = tester.widget<BottomSheet>(find.byType(BottomSheet));
      expect(sheet.showDragHandle, isTrue);
      expect(tester.getSize(find.byKey(kAstroActionSheetCancelKey)).height, greaterThanOrEqualTo(48));
    }
    await tester.tap(find.byKey(kAstroActionSheetCancelKey));
    await tester.pumpAndSettle();
    expect(picked, isNull);
  }, variant: _both);

  testWidgets('showAstroSheet: Material drag handle on Android, grabber on iOS, keyed Done', (tester) async {
    await _pump(
      tester,
      Builder(
        builder: (context) => Scaffold(
          body: Center(
            child: TextButton(
              onPressed: () => showAstroSheet<void>(context: context, title: 'Filters', builder: (_) => const Text('Body')),
              child: const Text('Open'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    final sheet = tester.widget<BottomSheet>(find.byType(BottomSheet));
    expect(sheet.showDragHandle, _isIOS ? isFalse : isTrue);
    expect(find.byType(AstroSheetGrabber), _isIOS ? findsOneWidget : findsNothing);
    await tester.tap(find.byKey(kAstroSheetDoneKey));
    await tester.pumpAndSettle();
    expect(find.text('Body'), findsNothing);
  }, variant: _both);

  // ---------------------------------------------------------------------------
  // 8. Pill on dark
  // ---------------------------------------------------------------------------
  testWidgets('AstroPill onDark: translucent white unselected, gold selected', (tester) async {
    await _pump(
      tester,
      _body(ColoredBox(
        color: AppColors.primary,
        child: Row(children: [
          AstroPill(label: 'All', selected: true, onDark: true, onTap: () {}),
          AstroPill(label: 'Video', selected: false, onDark: true, onTap: () {}),
        ]),
      )),
    );
    Material materialOf(String label) =>
        tester.widget<Material>(find.ancestor(of: find.text(label), matching: find.byType(Material)).first);
    expect(materialOf('All').color, AppColors.gold);
    expect(materialOf('Video').color!.a, lessThan(0.5));
    expect(tester.widget<Text>(find.text('All')).style!.color, AppColors.primary);
    expect(tester.widget<Text>(find.text('Video')).style!.color, Colors.white);
    expect(tester.getSize(find.byType(AstroPill).first).height, greaterThanOrEqualTo(48));
  }, variant: _both);

  // ---------------------------------------------------------------------------
  // 9. NavAction.text outside a bar at 2.0x
  // ---------------------------------------------------------------------------
  testWidgets('AstroNavAction.text is safe outside a nav bar at 2.0x on 320pt', (tester) async {
    await _pump(
      tester,
      _body(Column(children: [
        Row(children: [
          const Expanded(child: Text('Saved addresses', maxLines: 1, overflow: TextOverflow.ellipsis)),
          AstroNavAction.text(label: 'Edit all addresses', onPressed: () {}),
        ]),
        Row(children: [AstroNavAction.text(label: 'Done', emphasized: true, onPressed: () {})]),
      ])),
      scale: 2.0,
      size: const Size(320, 568),
    );
    expect(tester.takeException(), isNull);
    final edit = tester.getRect(find.byType(AstroNavAction).first);
    final done = tester.getRect(find.byType(AstroNavAction).last);
    expect(done.right, lessThanOrEqualTo(320));
    expect(edit.width, lessThanOrEqualTo(320 * 0.45 + 16 + 1));
    expect(done.height, greaterThanOrEqualTo(_minTarget));
  }, variant: _both);

  // ---------------------------------------------------------------------------
  // 10. AstroScroll.reveal keeps targets clear of the pinned bar
  // ---------------------------------------------------------------------------
  testWidgets('AstroScroll.reveal places the target just below the pinned bar', (tester) async {
    final target = GlobalKey();
    await _pump(
      tester,
      AstroPage(
        title: 'Report',
        subtitle: 'Rahul Sharma',
        child: Column(children: [
          for (var i = 0; i < 20; i++) SizedBox(height: 80, child: Text('Row $i')),
          SizedBox(key: target, height: 40, child: const Text('Target section')),
          for (var i = 0; i < 20; i++) SizedBox(height: 80, child: Text('Tail $i')),
        ]),
      ),
    );
    unawaited(AstroScroll.reveal(target.currentContext!, duration: const Duration(milliseconds: 200)));
    await tester.pumpAndSettle();
    final barBottom = MediaQuery.paddingOf(target.currentContext!).top + AstroMetrics.navBarHeight;
    final top = tester.getTopLeft(find.byKey(target)).dy;
    expect(top, greaterThanOrEqualTo(barBottom), reason: 'target must not sit under the pinned bar');
    expect(top, lessThan(barBottom + 24));
    expect(find.text('Target section').hitTestable(), findsOneWidget);

    // From further down (scrolled past it) it also lands below the bar.
    await tester.drag(find.byType(CustomScrollView), const Offset(0, -1500));
    await tester.pumpAndSettle();
    unawaited(AstroScroll.reveal(target.currentContext!, alignment: 0, gap: 12));
    await tester.pumpAndSettle();
    expect(tester.getTopLeft(find.byKey(target)).dy, closeTo(barBottom + 12, 1));

    // Bottom alignment puts its bottom edge at the viewport bottom.
    unawaited(AstroScroll.reveal(target.currentContext!, alignment: 1, gap: 0));
    await tester.pumpAndSettle();
    expect(tester.getBottomLeft(find.byKey(target)).dy, closeTo(844, 1));
  }, variant: _both);

  // ---------------------------------------------------------------------------
  // 11. Sushil explainer button: light variant, avatar slot, margin
  // ---------------------------------------------------------------------------
  testWidgets('SushilExplainerButton: default dark, opt-in light, avatar slot never empty, margin', (tester) async {
    const ctx = ExplanationContext(feature: 'birth_chart', screenTitle: 'Birth Chart', astrologyData: {'a': 1});
    // Start cold so the avatar is still decoding on the first frame.
    PaintingBinding.instance.imageCache
      ..clear()
      ..clearLiveImages();
    await _pump(
      tester,
      _body(const Column(children: [
        SushilExplainerButton(key: ValueKey('dark'), contextData: ctx),
        SushilExplainerButton(
          key: ValueKey('light'),
          contextData: ctx,
          variant: SushilExplainerVariant.light,
          margin: EdgeInsets.only(bottom: 16),
        ),
        SizedBox(key: ValueKey('after'), height: 10),
      ])),
      size: const Size(320, 568),
    );
    expect(tester.takeException(), isNull);
    Material materialIn(String key) =>
        tester.widget<Material>(find.descendant(of: find.byKey(ValueKey(key)), matching: find.byType(Material)).first);
    expect(materialIn('dark').color, AppColors.tertiary);
    expect(materialIn('light').color, AppColors.cardSurface);
    final lightTitle = tester.widgetList<Text>(
      find.descendant(of: find.byKey(const ValueKey('light')), matching: find.text('Let Sushil Sir explain')),
    );
    expect(lightTitle.single.style!.color, AppColors.textPrimary);

    // Before the asset decodes the 40pt slot shows a placeholder, not a gap.
    final avatars = find.descendant(of: find.byKey(const ValueKey('dark')), matching: find.byType(Image));
    expect(avatars, findsOneWidget);
    expect(tester.getSize(avatars), const Size(40, 40));
    expect(
      find.descendant(of: find.byKey(const ValueKey('dark')), matching: find.byIcon(Icons.person_rounded)),
      findsOneWidget,
    );

    // Margin: 16pt between the light button and what follows.
    final lightBottom = tester.getRect(find.descendant(of: find.byKey(const ValueKey('light')), matching: find.byType(Material)).first).bottom;
    expect(tester.getTopLeft(find.byKey(const ValueKey('after'))).dy - lightBottom, closeTo(16, 0.5));
  }, variant: _both);
}
