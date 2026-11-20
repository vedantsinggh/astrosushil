import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/features/splash/screens/splash_screen.dart';
import 'package:astro_mobile/features/onboarding/screens/onboarding_screen.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/shared/assets/app_assets.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';
import 'package:astro_mobile/shared/widgets/astro_image.dart';
import '../helpers/test_artifact_directory.dart';

/// Auth notifier stuck in the initial loading state (session validation
/// still in progress) so the splash never navigates during the test.
class _LoadingAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  _LoadingAuthNotifier() : super(AuthState.initial());

  void resolve(AuthState next) => state = next;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

bool _fontsLoaded = false;

/// Loads real glyphs (when available on the host) so screenshots show real
/// text instead of the test font's boxes. Missing files are skipped.
Future<void> _loadFonts() async {
  if (_fontsLoaded) return;
  _fontsLoaded = true;
  const mf = '/home/pilot/develop/flutter/bin/cache/artifacts/material_fonts';
  const noto = '/usr/share/fonts/truetype/noto';
  Future<void> load(String family, List<String> paths) async {
    final loader = FontLoader(family);
    var any = false;
    for (final p in paths) {
      final f = File(p);
      if (!f.existsSync()) continue;
      any = true;
      loader.addFont(Future.value(ByteData.view(Uint8List.fromList(f.readAsBytesSync()).buffer)));
    }
    if (any) await loader.load();
  }

  final serif = ['$noto/NotoSerif-Regular.ttf', '$noto/NotoSerif-Bold.ttf'];
  final roboto = ['$mf/Roboto-Regular.ttf', '$mf/Roboto-Medium.ttf', '$mf/Roboto-Bold.ttf'];
  await load('Philosopher', serif);
  await load('Georgia', serif);
  await load('Outfit', roboto);
  await load('Roboto', roboto);
  await load('MaterialIcons', ['$mf/MaterialIcons-Regular.otf']);
}

Directory _shotDir() {
  final env = Platform.environment['SPLASH_SCREENSHOT_DIR'];
  if (env != null && env.isNotEmpty) {
    return Directory(env)..createSync(recursive: true);
  }
  return createTestArtifactDirectory('mobile-splash-capture');
}

Widget _app({
  required GlobalKey boundaryKey,
  double textScale = 1.0,
  bool disableAnimations = false,
  _LoadingAuthNotifier? auth,
}) {
  return ProviderScope(
    overrides: [
      secureStorageProvider.overrideWithValue(InMemorySecureStorageService()),
      authStateProvider.overrideWith((ref) => auth ?? _LoadingAuthNotifier()),
    ],
    child: MaterialApp(
      theme: AppTheme.lightTheme,
      debugShowCheckedModeBanner: false,
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(
          textScaler: TextScaler.linear(textScale),
          disableAnimations: disableAnimations,
          padding: MediaQuery.of(context).padding,
        ),
        child: child!,
      ),
      home: RepaintBoundary(key: boundaryKey, child: const SplashScreen()),
    ),
  );
}

void main() {
  testWidgets('SplashScreen renders custom app logo, gold app name, and decorative divider', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          secureStorageProvider.overrideWithValue(InMemorySecureStorageService()),
        ],
        child: const MaterialApp(
          home: SplashScreen(),
        ),
      ),
    );

    // Verify title and logo elements
    expect(find.text('ASTRO SUSHIL'), findsOneWidget);
    expect(find.byType(Image), findsWidgets);
    expect(find.byIcon(Icons.auto_awesome), findsWidgets);

    // Advance timer past 2.5s duration
    await tester.pump(const Duration(milliseconds: 2600));
  });

  testWidgets('shows a minimal progress hint only while waiting on session validation', (tester) async {
    final auth = _LoadingAuthNotifier();
    await tester.pumpWidget(_app(boundaryKey: GlobalKey(), auth: auth));
    await tester.pump(const Duration(milliseconds: 1600));
    expect(find.byType(LinearProgressIndicator), findsNothing);

    // Minimum splash time elapsed but auth still loading -> hint appears,
    // and the splash stays put (no navigation).
    await tester.pump(const Duration(milliseconds: 1000));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byType(LinearProgressIndicator), findsOneWidget);
    expect(find.byType(SplashScreen), findsOneWidget);

    // Once validation resolves (unauthenticated), the original routing runs:
    // the splash is replaced by onboarding.
    auth.resolve(AuthState.unauthenticated());
    await tester.pump(const Duration(milliseconds: 200));
    await tester.pump(const Duration(milliseconds: 600));
    expect(find.byType(SplashScreen), findsNothing);
    expect(find.byType(OnboardingScreen), findsOneWidget);
  });

  testWidgets('reduced motion renders the final state immediately', (tester) async {
    await tester.pumpWidget(_app(boundaryKey: GlobalKey(), disableAnimations: true));
    await tester.pump();
    final opacity = tester.widget<Opacity>(
      find.ancestor(of: find.text('ASTRO SUSHIL'), matching: find.byType(Opacity)).first,
    );
    expect(opacity.opacity, 1.0);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  group('Splash responsive capture', () {
    const viewports = <String, Size>{
      'xs320x568': Size(320, 568),
      'p390x844': Size(390, 844),
      'land568x320': Size(568, 320),
      'land844x390': Size(844, 390),
      'tab1024x1366': Size(1024, 1366),
      'tab1366x1024': Size(1366, 1024),
    };
    const scales = [1.0, 1.5, 2.0];

    for (final entry in viewports.entries) {
      for (final scale in scales) {
        testWidgets('${entry.key} @${scale}x text', (tester) async {
          await _loadFonts();
          final key = GlobalKey();
          tester.view.physicalSize = entry.value * 2;
          tester.view.devicePixelRatio = 2.0;
          // Simulate a notch / home indicator.
          tester.view.padding = const FakeViewPadding(top: 94, bottom: 68);
          addTearDown(() {
            tester.view.resetPhysicalSize();
            tester.view.resetDevicePixelRatio();
            tester.view.resetPadding();
          });

          await tester.pumpWidget(_app(boundaryKey: key, textScale: scale));
          await tester.runAsync(() async {
            await precacheImage(const AssetImage(AppAssets.logoAs), tester.element(find.byType(SplashScreen)));
          });
          await tester.pump(const Duration(milliseconds: 1600));

          expect(tester.takeException(), isNull);
          expect(find.text('ASTRO SUSHIL'), findsOneWidget);

          // Logo medallion is fully on-screen and horizontally centred.
          final logo = tester.getRect(find.byType(AstroImage));
          expect(logo.left, greaterThanOrEqualTo(0));
          expect(logo.right, lessThanOrEqualTo(entry.value.width));
          expect(logo.top, greaterThanOrEqualTo(0));
          expect(logo.bottom, lessThanOrEqualTo(entry.value.height));
          expect((logo.center.dx - entry.value.width / 2).abs(), lessThan(1.0));
          // Vertically centred like the native launch screen.
          expect((logo.center.dy - entry.value.height / 2).abs(), lessThan(1.0));

          final word = tester.getRect(find.text('ASTRO SUSHIL'));
          expect(word.bottom, lessThanOrEqualTo(entry.value.height));

          if (scale == 1.0 || scale == 2.0) {
            await tester.runAsync(() async {
              final boundary = key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
              final ui.Image image = await boundary.toImage(pixelRatio: 1.0);
              final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
              if (bytes != null) {
                final file = File('${_shotDir().path}/splash_${entry.key}_ts${scale.toStringAsFixed(1)}.png');
                await file.writeAsBytes(bytes.buffer.asUint8List());
              }
            });
          }

          await tester.pumpWidget(const SizedBox.shrink());
        });
      }
    }
  });
}
