import 'package:dio/dio.dart' show CancelToken;
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/core/localization/locale_provider.dart';
import 'package:astro_mobile/core/network/api_client.dart';
import 'package:astro_mobile/core/storage/local_cache_service.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/features/astrology/data/rashi_bhavishya_repository.dart';
import 'package:astro_mobile/features/astrology/providers/rashi_bhavishya_provider.dart';
import 'package:astro_mobile/features/astrology/screens/rashi_bhavishya_screen.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';

import '../helpers/rashi_bhavishya_sample.dart';

const String _hindiSummary = 'आज चंद्र का गोचर आपके लिए अनुकूल है।';

Map<String, dynamic> _english() {
  final json = rashiBhavishyaSampleJson();
  final data = json['data'] as Map<String, dynamic>;
  data['date'] = istToday();
  data['language'] = 'en';
  return json;
}

/// The same facts as a Hindi response (TEST DATA ONLY).
Map<String, dynamic> _hindi({bool narrativeInHindi = true}) {
  final json = _english();
  final data = json['data'] as Map<String, dynamic>;
  data['language'] = 'hi';
  (data['rashi'] as Map<String, dynamic>)['hindiName'] = 'मेष';
  if (narrativeInHindi) {
    final prediction = data['prediction'] as Map<String, dynamic>;
    prediction['language'] = 'hi';
    prediction['summary'] = _hindiSummary;
  }
  return json;
}

/// Answers `/rashi-bhavishya/today` from memory; nothing reaches a network.
class _FakeApiClient extends Fake implements ApiClient {
  final List<String?> languages = [];
  bool hindiNarrative = true;

  @override
  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    CancelToken? cancelToken,
    Duration? timeout,
  }) async {
    final language = queryParameters?['language'] as String?;
    languages.add(language);
    return language == 'hi' ? _hindi(narrativeInHindi: hindiNarrative) : _english();
  }
}

void main() {
  late InMemorySecureStorageService storage;
  late _FakeApiClient api;

  setUp(() {
    storage = InMemorySecureStorageService();
    api = _FakeApiClient();
  });

  Widget app({Locale locale = const Locale('en')}) {
    return ProviderScope(
      overrides: [
        secureStorageProvider.overrideWithValue(storage),
        userMoonRashiIndexProvider.overrideWith((ref) async => 1),
        rashiBhavishyaRepositoryProvider.overrideWithValue(
          RashiBhavishyaRepository(apiClient: api, cacheService: MemoryAndStorageLocalCacheService()),
        ),
      ],
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        locale: locale,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        home: const RashiBhavishyaScreen(),
      ),
    );
  }

  Future<void> settle(WidgetTester tester) async {
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(milliseconds: 300));
  }

  Finder languageOption(String label) =>
      find.descendant(of: find.byKey(const ValueKey('horoscope-language')), matching: find.text(label));

  Future<void> setSize(WidgetTester tester) async {
    tester.view.physicalSize = const Size(390 * 2, 1400 * 2);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);
  }

  testWidgets('the horoscope opens in English with an English / Hindi switch', (tester) async {
    await setSize(tester);
    await tester.pumpWidget(app());
    await settle(tester);

    expect(languageOption('English'), findsOneWidget);
    expect(languageOption('हिन्दी (Hindi)'), findsOneWidget);
    expect(api.languages, ['en']);
    expect(find.text("Today's outlook"), findsOneWidget);
    expect(find.text(_hindiSummary), findsNothing);
  });

  testWidgets('switching to Hindi loads the Hindi horoscope and remembers the choice', (tester) async {
    await setSize(tester);
    await tester.pumpWidget(app());
    await settle(tester);

    await tester.tap(languageOption('हिन्दी (Hindi)'));
    await settle(tester);

    expect(api.languages, ['en', 'hi']);
    expect(find.text(_hindiSummary), findsOneWidget);
    // A Hindi horoscope is shown with Hindi headings even in an English app.
    expect(find.text('आज का सार'), findsOneWidget);
    expect(await storage.read(key: StorageKeys.horoscopeLanguage), 'hi');
    // The app language is untouched.
    expect(await storage.read(key: StorageKeys.appLocale), isNull);

    // Back to English: the English copy comes from its own cache entry.
    await tester.tap(languageOption('English'));
    await settle(tester);
    expect(api.languages, ['en', 'hi']);
    expect(find.text(_hindiSummary), findsNothing);
    expect(find.text("Today's outlook"), findsOneWidget);
    expect(await storage.read(key: StorageKeys.horoscopeLanguage), 'en');
  });

  testWidgets('a remembered Hindi choice is used the next time the screen opens', (tester) async {
    await setSize(tester);
    await storage.write(key: StorageKeys.horoscopeLanguage, value: 'hi');
    await tester.pumpWidget(app());
    await settle(tester);

    expect(api.languages, ['hi']);
    expect(find.text(_hindiSummary), findsOneWidget);
  });

  testWidgets('a Hindi app does not switch the horoscope to Hindi by itself', (tester) async {
    await setSize(tester);
    await tester.pumpWidget(app(locale: const Locale('hi')));
    await settle(tester);

    expect(api.languages, ['en']);
    expect(languageOption('हिन्दी'), findsOneWidget);
    expect(find.text(_hindiSummary), findsNothing);
  });

  testWidgets('Hindi chosen but only an English narrative came back: the customer is told', (tester) async {
    await setSize(tester);
    api.hindiNarrative = false;
    await storage.write(key: StorageKeys.horoscopeLanguage, value: 'hi');
    await tester.pumpWidget(app());
    await settle(tester);

    expect(find.text('The detailed text is available only in English right now.'), findsOneWidget);
  });
}
