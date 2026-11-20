// Phase 2 polish (shop / reports / courses / Jyoti / booking): key screens
// render on BOTH iOS and Android with the shared large-title page, without
// framework exceptions, and route confirmations / sheets through the
// adaptive helpers.
import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:astro_mobile/features/courses/screens/course_detail_screen.dart';
import 'package:astro_mobile/features/courses/screens/course_player_screen.dart';
import 'package:astro_mobile/features/courses/screens/courses_hub_screen.dart';
import 'package:astro_mobile/features/jyoti/screens/jyoti_chat_screen.dart';
import 'package:astro_mobile/features/reports/screens/report_detail_screen.dart';
import 'package:astro_mobile/features/shop/models/cart_item_model.dart';
import 'package:astro_mobile/features/shop/providers/cart_provider.dart';
import 'package:astro_mobile/features/shop/screens/cart_screen.dart';
import 'package:astro_mobile/features/shop/screens/order_history_screen.dart';
import 'package:astro_mobile/features/shop/screens/shop_catalog_screen.dart';
import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:astro_mobile/shared/widgets/astro_design_system.dart';

import '../ui_audit/audit_fixtures.dart';
import 'phase8_screens_capture_test.dart' as p8 show MockCaptureShopService;

final _platforms = TargetPlatformVariant.only(TargetPlatform.iOS)..values.add(TargetPlatform.android);

class _Cart extends CartNotifier {
  _Cart(super.ref, CartState s) {
    state = s;
  }
}

Override _cartOverride() {
  final products = p8.MockCaptureShopService().mockProducts;
  return cartProvider.overrideWith((ref) => _Cart(ref, CartState(items: [CartItemModel(product: products[1], quantity: 1)])));
}

Widget _app(Widget child, {List<Override> extra = const []}) {
  final platform = debugDefaultTargetPlatformOverride ?? TargetPlatform.android;
  return ProviderScope(
    overrides: baseOverrides(extra: extra),
    child: MaterialApp(
      theme: AppTheme.lightTheme.copyWith(platform: platform),
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      // Pushed over a blank route so the adaptive back button shows.
      onGenerateRoute: (_) => MaterialPageRoute<void>(builder: (_) => child),
      onGenerateInitialRoutes: (_) => [
        MaterialPageRoute<void>(builder: (_) => const Scaffold(body: SizedBox())),
        MaterialPageRoute<void>(builder: (_) => child),
      ],
    ),
  );
}

Future<void> _pump(WidgetTester tester, Widget child, {List<Override> extra = const []}) async {
  tester.view.physicalSize = const Size(390 * 3, 844 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(_app(child, extra: extra));
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 600));
}

bool get _isIOS => debugDefaultTargetPlatformOverride == TargetPlatform.iOS;

void main() {
  testWidgets('shop catalog: hero large-title page with category pills', (tester) async {
    await _pump(tester, const ShopCatalogScreen());
    expect(tester.takeException(), isNull);
    expect(find.byType(AstroSliverNavBar), findsOneWidget);
    expect(find.text('Spiritual Shop'), findsOneWidget);
    expect(find.byType(AstroPill), findsNWidgets(5));
    expect(find.byType(AstroSurfaceCard), findsWidgets);
    // Back control follows the platform.
    expect(find.byIcon(AstroIcons.back(tester.element(find.byType(ShopCatalogScreen)))), findsOneWidget);
  }, variant: _platforms);

  testWidgets('cart: "Clear" confirmation is the native dialog on each platform', (tester) async {
    await _pump(tester, const CartScreen(), extra: [_cartOverride()]);
    expect(tester.takeException(), isNull);
    // Digital-only cart: no address step, so Cart → Pay.
    expect(find.text('Step 1 of 2'), findsOneWidget);
    await tester.tap(find.text('Clear'));
    await tester.pumpAndSettle();
    expect(find.byType(CupertinoAlertDialog), _isIOS ? findsOneWidget : findsNothing);
    expect(find.byType(AlertDialog), _isIOS ? findsNothing : findsOneWidget);
    await tester.tap(find.text('Keep items'));
    await tester.pumpAndSettle();
    expect(find.byType(CartScreen), findsOneWidget);
  }, variant: _platforms);

  testWidgets('order history renders as a large-title page', (tester) async {
    await _pump(tester, const OrderHistoryScreen());
    expect(tester.takeException(), isNull);
    expect(find.byType(AstroSliverNavBar), findsOneWidget);
  }, variant: _platforms);

  testWidgets('courses hub: segmented Explore / My Learning switch', (tester) async {
    await _pump(tester, const CoursesHubScreen());
    expect(tester.takeException(), isNull);
    expect(find.byType(AstroSegmentedControl<int>), findsOneWidget);
    await tester.tap(find.text('My Learning'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  }, variant: _platforms);

  testWidgets('course detail: hero card, segmented sections and locked-lesson confirm', (tester) async {
    await _pump(tester, const CourseDetailScreen(idOrSlug: 'c-gupt-nadi'));
    expect(tester.takeException(), isNull);
    expect(find.byType(AstroGradientCard), findsOneWidget);
    // Locked lesson -> adaptive confirmation.
    await tester.ensureVisible(find.text('Basic Introduction - Gupt Nadi Astrology'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Basic Introduction - Gupt Nadi Astrology'));
    await tester.pumpAndSettle();
    expect(find.text('Premium Masterclass Lesson'), findsOneWidget);
    expect(find.byType(CupertinoAlertDialog), _isIOS ? findsOneWidget : findsNothing);
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('Course Overview'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Course Overview'));
    await tester.pumpAndSettle();
    expect(find.text('Instructor Profile'), findsOneWidget);
  }, variant: _platforms);

  testWidgets('course player uses the shared page', (tester) async {
    await _pump(tester, const CoursePlayerScreen(lessonId: 'l-1'));
    expect(tester.takeException(), isNull);
    expect(find.byType(AstroSliverNavBar), findsOneWidget);
  }, variant: _platforms);

  testWidgets('report detail: one hero card and native partner sheet rows', (tester) async {
    await _pump(
      tester,
      ReportDetailScreen(
        reportType: 'KUNDLI',
        title: 'Birth Chart & Kundli Report',
        tagline: 'Your cosmic blueprint',
        description: 'About',
        priceText: '₹299',
        pricePaise: 29900,
        icon: Icons.auto_awesome_rounded,
        accentColor: AppColors.accent,
        initialProfile: kProfile,
        includedSections: const ['A', 'B'],
      ),
    );
    expect(tester.takeException(), isNull);
    expect(find.byType(AstroGradientCard), findsOneWidget);
    expect(find.byKey(const Key('report_purchase_button')), findsOneWidget);
  }, variant: _platforms);

  testWidgets('Jyoti: "More" opens the platform action sheet', (tester) async {
    await _pump(tester, const JyotiChatScreen());
    expect(tester.takeException(), isNull);
    await tester.tap(find.byTooltip('More options'));
    await tester.pumpAndSettle();
    expect(find.byType(CupertinoActionSheet), _isIOS ? findsOneWidget : findsNothing);
    expect(find.text('Clear Conversation'), findsOneWidget);
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(find.text('Clear Conversation'), findsNothing);
  }, variant: _platforms);
}
