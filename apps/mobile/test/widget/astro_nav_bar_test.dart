// Shared adaptive design system: nav bar (sliver + plain), back button,
// action sheet and confirm dialog on iOS and Android.
import 'package:flutter/cupertino.dart';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';
import 'package:astro_mobile/shared/theme/app_theme_tokens.dart';
import 'package:astro_mobile/shared/theme/app_typography.dart';
import 'package:astro_mobile/shared/widgets/astro_nav_bar.dart';
import 'package:astro_mobile/shared/widgets/astro_page.dart';
import 'package:astro_mobile/shared/widgets/astro_sheets.dart';

final _ios = TargetPlatformVariant.only(TargetPlatform.iOS);
final _android = TargetPlatformVariant.only(TargetPlatform.android);
final _both = TargetPlatformVariant({TargetPlatform.iOS, TargetPlatform.android});

bool get _isIOS => debugDefaultTargetPlatformOverride == TargetPlatform.iOS;

/// Pumps [page] pushed over a base route so the back button shows.
Future<void> _pumpPushed(WidgetTester tester, Widget page, {double scale = 1.0, Size size = const Size(390, 844)}) async {
  tester.view.physicalSize = size * 2;
  tester.view.devicePixelRatio = 2;
  tester.platformDispatcher.textScaleFactorTestValue = scale;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  await tester.pumpWidget(MaterialApp(
    theme: AppTheme.lightTheme,
    scrollBehavior: const AstroScrollBehavior(),
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    supportedLocales: AppLocalizations.supportedLocales,
    home: Builder(
      builder: (context) => Scaffold(
        body: Center(
          child: TextButton(
            onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => page)),
            child: const Text('Base page'),
          ),
        ),
      ),
    ),
  ));
  await tester.tap(find.text('Base page'));
  await tester.pumpAndSettle();
}

Widget _listPage(String title) => AstroPage(
      title: title,
      slivers: [
        SliverList.builder(
          itemCount: 40,
          itemBuilder: (_, i) => SizedBox(height: 60, child: Text('Row $i')),
        ),
      ],
    );

Iterable<Text> _titleTexts(WidgetTester tester, String title) =>
    tester.widgetList<Text>(find.text(title, skipOffstage: false));

// Real fonts so the long-title test measures real glyphs (the default test
// font, Ahem, renders every glyph a full em wide). Same files as the UI
// audit harness; the test is skipped when they are not installed.
const _robotoPath = '/home/pilot/develop/flutter/bin/cache/artifacts/material_fonts/Roboto-Regular.ttf';
const _serifPath = '/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf';
final bool _realFonts = File(_robotoPath).existsSync() && File(_serifPath).existsSync();

Future<void> _loadFont(String family, String path) async {
  final loader = FontLoader(family)
    ..addFont(Future.value(ByteData.view(Uint8List.fromList(File(path).readAsBytesSync()).buffer)));
  await loader.load();
}

void main() {
  setUpAll(() async {
    if (!_realFonts) return;
    await _loadFont('Outfit', _robotoPath);
    await _loadFont('Roboto', _robotoPath);
    await _loadFont('Philosopher', _serifPath);
  });

  testWidgets('large title collapses into the compact title on scroll', (tester) async {
    await _pumpPushed(tester, _listPage('Settings'));

    // At rest: only the large serif title is built.
    final atRest = _titleTexts(tester, 'Settings').toList();
    expect(atRest, hasLength(1));
    expect(atRest.single.style!.fontSize, AppTypography.largeTitle.fontSize);
    expect(atRest.single.style!.fontFamily, AppTypography.headingFamily);
    final restTop = tester.getTopLeft(find.text('Row 0')).dy;

    await tester.drag(find.text('Row 3'), const Offset(0, -400));
    await tester.pumpAndSettle();

    // Collapsed: the compact (18pt, single line) title is visible.
    final compact = _titleTexts(tester, 'Settings').where((t) => t.style?.fontSize == AppTypography.navTitle.fontSize);
    expect(compact, hasLength(1));
    expect(compact.single.maxLines, 1);
    final opacity = tester.widget<Opacity>(
      find.ancestor(of: find.byWidget(compact.single), matching: find.byType(Opacity)).first,
    );
    expect(opacity.opacity, 1.0);
    expect(restTop, greaterThan(100), reason: 'content starts below the large title');
  }, variant: _both);

  testWidgets('iOS back: chevron + "Back" label, pops the route', (tester) async {
    await _pumpPushed(tester, _listPage('Orders'));
    expect(find.text('Back'), findsOneWidget);
    expect(find.byIcon(Icons.arrow_back_ios_new_rounded), findsOneWidget);
    expect(find.bySemanticsLabel('Back'), findsOneWidget);
    expect(tester.getSize(find.byType(AstroBackButton)).height, greaterThanOrEqualTo(44));

    await tester.tap(find.byType(AstroBackButton));
    await tester.pumpAndSettle();
    expect(find.text('Base page'), findsOneWidget);
    expect(find.text('Orders'), findsNothing);
  }, variant: _ios);

  testWidgets('Android back: arrow icon with tooltip, no text, 48dp, pops', (tester) async {
    await _pumpPushed(tester, _listPage('Orders'));
    expect(find.text('Back'), findsNothing);
    expect(find.byIcon(Icons.arrow_back_rounded), findsOneWidget);
    expect(find.byTooltip('Back'), findsOneWidget);
    final size = tester.getSize(find.byType(IconButton).first);
    expect(size.width, greaterThanOrEqualTo(48));
    expect(size.height, greaterThanOrEqualTo(48));

    await tester.tap(find.byTooltip('Back'));
    await tester.pumpAndSettle();
    expect(find.text('Base page'), findsOneWidget);
  }, variant: _android);

  testWidgets('no back button on a root route', (tester) async {
    await tester.pumpWidget(MaterialApp(theme: AppTheme.lightTheme, home: _listPage('Account')));
    expect(find.byType(AstroBackButton), findsNothing);
  }, variant: _both);

  testWidgets('long title at 2.0x on 320pt wraps in the large title without overflow', (tester) async {
    const longTitle = 'Vimshottari Mahadasha and Antardasha Timeline (विंशोत्तरी दशा)';
    await _pumpPushed(tester, _listPage(longTitle), scale: 2.0, size: const Size(320, 568));
    expect(tester.takeException(), isNull);

    final large = find.text(longTitle);
    expect(large, findsOneWidget);
    final paragraph = tester.renderObject<RenderParagraph>(large);
    expect(paragraph.didExceedMaxLines, isFalse, reason: 'large title must wrap, not ellipsize');
    expect(paragraph.size.width, lessThanOrEqualTo(320));

    // Collapse: compact title is one line with an ellipsis, still no overflow.
    await tester.drag(find.text('Row 2'), const Offset(0, -600));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    final compact = _titleTexts(tester, longTitle).where((t) => t.maxLines == 1);
    expect(compact, hasLength(1));
    expect(compact.single.overflow, TextOverflow.ellipsis);
  }, variant: _both, skip: !_realFonts);

  for (final scale in [1.0, 1.3, 2.0]) {
    testWidgets('320pt, ${scale}x: 2-line title + 2-line subtitle fit the measured large-title height',
        (tester) async {
      const title = 'Vimshottari Dasha Timeline';
      const subtitle = 'Rahul Sharma · 12 March 1990, 10:42 AM · New Delhi, India — Lahiri ayanamsa';
      await _pumpPushed(
        tester,
        AstroPage(
          title: title,
          subtitle: subtitle,
          slivers: [
            SliverList.builder(itemCount: 30, itemBuilder: (_, i) => SizedBox(height: 60, child: Text('Row $i'))),
          ],
        ),
        scale: scale,
        size: const Size(320, 568),
      );
      expect(tester.takeException(), isNull);

      final titleBox = tester.getRect(find.text(title));
      final subBox = tester.getRect(find.text(subtitle));
      // Wraps (2+ lines) at every scale here.
      final titleLine = tester.renderObject<RenderParagraph>(find.text(title)).getFullHeightForCaret(const TextPosition(offset: 0));
      expect(titleBox.height, greaterThan(titleLine * 1.5), reason: 'title wraps');
      // Nothing slides under the bar row, and the subtitle stays inside the
      // header (above the first content row).
      const barBottom = AstroMetrics.navBarHeight;
      expect(titleBox.top, greaterThanOrEqualTo(barBottom - 0.5));
      expect(subBox.top, greaterThanOrEqualTo(titleBox.bottom));
      expect(subBox.bottom, lessThanOrEqualTo(tester.getTopLeft(find.text('Row 0')).dy));
      expect(tester.renderObject<RenderParagraph>(find.text(title)).didExceedMaxLines, isFalse);
      // The block's natural height matches the measured extent: the title
      // sits within a couple of px of the bar row (no hidden overflow).
      expect(titleBox.top - barBottom, lessThan(4));
    }, variant: _both, skip: !_realFonts);
  }

  testWidgets('tablet: large title, back button and actions inset to the 680pt content column', (tester) async {
    await _pumpPushed(
      tester,
      AstroPage(
        title: 'Settings',
        subtitle: 'Account and app',
        actions: [AstroNavAction(icon: Icons.ios_share_rounded, tooltip: 'Share', onPressed: () {})],
        child: const SizedBox(height: 40, width: double.infinity, child: Text('Content')),
      ),
      size: const Size(1024, 1366),
    );
    const contentLeft = (1024 - AstroMetrics.maxContentWidth) / 2; // 172
    expect(tester.getTopLeft(find.text('Content')).dx, closeTo(contentLeft, 1));
    // Large title and subtitle: same 2pt optical offset as on phones.
    expect(tester.getTopLeft(find.text('Settings')).dx, closeTo(contentLeft + 2, 1));
    expect(tester.getTopLeft(find.text('Account and app')).dx, closeTo(contentLeft + 2, 1));
    // Back button / trailing action sit just outside the column edge, as on
    // phones (where they sit inside the 16pt gutter).
    final back = tester.getRect(find.byType(_isIOS ? AstroBackButton : IconButton).first);
    expect(back.left, greaterThan(contentLeft - AstroMetrics.gutter - 1));
    expect(back.left, lessThan(contentLeft));
    final share = tester.getRect(find.byTooltip('Share'));
    expect(share.right, lessThan(1024 - contentLeft + AstroMetrics.gutter + 1));
    expect(share.right, greaterThan(1024 - contentLeft));

    // Phones are unchanged: title at the 18pt gutter.
    await tester.pumpWidget(const SizedBox());
    await _pumpPushed(tester, _listPage('Phone'), size: const Size(390, 844));
    expect(tester.getTopLeft(find.text('Phone')).dx, closeTo(AstroMetrics.gutter + 2, 1));
  }, variant: _both);

  testWidgets('plain AstroNavBar: centred title on iOS, start-aligned on Android', (tester) async {
    await _pumpPushed(
      tester,
      Scaffold(
        appBar: AstroNavBar(
          title: 'Cart',
          actions: [AstroNavAction(icon: Icons.delete_outline_rounded, tooltip: 'Clear cart', onPressed: () {})],
        ),
        body: const SizedBox(),
      ),
    );
    final titleCenter = tester.getCenter(find.text('Cart')).dx;
    if (_isIOS) {
      expect(titleCenter, closeTo(195, 2));
    } else {
      expect(titleCenter, lessThan(150));
    }
    expect(find.byTooltip('Clear cart'), findsOneWidget);
  }, variant: _both);

  testWidgets('showAstroActionSheet: Cupertino sheet on iOS, Material sheet on Android', (tester) async {
    String? picked;
    await _pumpPushed(
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
                    AstroSheetAction(key: ValueKey('en'), label: 'English', value: 'en', selected: true),
                    AstroSheetAction(key: ValueKey('hi'), label: 'Hindi', value: 'hi'),
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

    expect(find.byType(CupertinoActionSheet), _isIOS ? findsOneWidget : findsNothing);
    expect(find.text('Cancel'), findsOneWidget);
    expect(find.byIcon(Icons.check_rounded), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('hi')));
    await tester.pumpAndSettle();
    expect(picked, 'hi');
  }, variant: _both);

  testWidgets('showAstroConfirm: CupertinoAlertDialog on iOS, AlertDialog on Android', (tester) async {
    bool? result;
    await _pumpPushed(
      tester,
      Builder(
        builder: (context) => Scaffold(
          body: Center(
            child: TextButton(
              onPressed: () async {
                result = await showAstroConfirm(
                  context: context,
                  title: 'Sign out?',
                  confirmLabel: 'Sign out',
                  destructive: true,
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
    expect(find.byType(CupertinoAlertDialog), _isIOS ? findsOneWidget : findsNothing);
    expect(find.byType(AlertDialog), _isIOS ? findsNothing : findsOneWidget);

    await tester.tap(find.text('Sign out'));
    await tester.pumpAndSettle();
    expect(result, isTrue);
  }, variant: _both);
}
