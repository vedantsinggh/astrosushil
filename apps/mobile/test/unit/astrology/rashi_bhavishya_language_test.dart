import 'package:dio/dio.dart' show CancelToken;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/core/localization/locale_provider.dart';
import 'package:astro_mobile/core/network/api_client.dart';
import 'package:astro_mobile/core/storage/local_cache_service.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:astro_mobile/features/astrology/data/rashi_bhavishya_repository.dart';
import 'package:astro_mobile/features/astrology/models/rashi_bhavishya_model.dart';
import 'package:astro_mobile/features/astrology/providers/rashi_bhavishya_provider.dart';

import '../../helpers/rashi_bhavishya_sample.dart';

const String _hindiSummary = 'आज चंद्र का गोचर आपके लिए अनुकूल है।';

/// The captured English response, dated today (IST) so the repository accepts it.
Map<String, dynamic> _english() {
  final json = rashiBhavishyaSampleJson();
  final data = json['data'] as Map<String, dynamic>;
  data['date'] = istToday();
  data['language'] = 'en';
  return json;
}

/// The same facts as a Hindi response: `language: "hi"`, `hindiName` on signs
/// and a Hindi narrative (TEST DATA ONLY).
Map<String, dynamic> _hindi() {
  final json = _english();
  final data = json['data'] as Map<String, dynamic>;
  data['language'] = 'hi';
  (data['rashi'] as Map<String, dynamic>)['hindiName'] = 'मेष';
  final facts = data['facts'] as Map<String, dynamic>;
  final moon = facts['moon'] as Map<String, dynamic>;
  moon['name'] = 'चंद्र';
  (moon['sign'] as Map<String, dynamic>)['hindiName'] = 'कुंभ';
  final prediction = data['prediction'] as Map<String, dynamic>;
  prediction['language'] = 'hi';
  prediction['summary'] = _hindiSummary;
  return json;
}

/// Answers `/rashi-bhavishya/today` from memory; nothing reaches a network.
class _FakeApiClient extends Fake implements ApiClient {
  final List<Map<String, dynamic>> queries = [];
  bool offline = false;

  /// When set, every answer is this, whatever language was asked for.
  Map<String, dynamic>? fixedResponse;

  @override
  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    CancelToken? cancelToken,
    Duration? timeout,
  }) async {
    expect(path, '/rashi-bhavishya/today');
    queries.add(Map<String, dynamic>.from(queryParameters ?? const {}));
    if (offline) throw Exception('offline');
    if (fixedResponse != null) return fixedResponse!;
    return queryParameters?['language'] == 'hi' ? _hindi() : _english();
  }
}

void main() {
  group('Rashi Bhavishya model language', () {
    test('an English response is English and has no Hindi names', () {
      final model = RashiBhavishyaModel.fromJson(_english());
      expect(model.language, 'en');
      expect(model.isHindi, isFalse);
      expect(model.rashi.hindiName, isNull);
      expect(model.facts.moon.sign.hindiName, isNull);
    });

    test('a response without a language field is read as its narrative language', () {
      final json = _english();
      (json['data'] as Map<String, dynamic>).remove('language');
      expect(RashiBhavishyaModel.fromJson(json).language, 'en');
    });

    test('a Hindi response keeps its language and Hindi names through the cache format', () {
      final model = RashiBhavishyaModel.fromJson(_hindi());
      expect(model.language, 'hi');
      expect(model.isHindi, isTrue);
      expect(model.rashi.hindiName, 'मेष');
      expect(model.facts.moon.sign.hindiName, 'कुंभ');
      expect(model.facts.moon.name, 'चंद्र');
      expect(model.prediction.summary, _hindiSummary);

      final restored = RashiBhavishyaModel.fromJson(model.toJson());
      expect(restored.language, 'hi');
      expect(restored.rashi.hindiName, 'मेष');
      expect(restored.facts.moon.sign.hindiName, 'कुंभ');
      expect(restored.prediction.summary, _hindiSummary);
    });
  });

  group('Rashi Bhavishya repository language', () {
    late _FakeApiClient api;
    late MemoryAndStorageLocalCacheService cache;
    late RashiBhavishyaRepository repository;

    setUp(() {
      api = _FakeApiClient();
      cache = MemoryAndStorageLocalCacheService();
      repository = RashiBhavishyaRepository(apiClient: api, cacheService: cache);
    });

    test('the cache key names the language', () {
      final en = RashiBhavishyaRepository.cacheKey(language: 'en', date: '2026-11-24', rashiIndex: 1);
      final hi = RashiBhavishyaRepository.cacheKey(language: 'hi', date: '2026-11-24', rashiIndex: 1);
      expect(en, 'rashi_bhavishya_v2_en_2026-11-24_1');
      expect(hi, 'rashi_bhavishya_v2_hi_2026-11-24_1');
    });

    test('English is asked for by default', () async {
      final model = await repository.getTodayPrediction(rashiIndex: 1);
      expect(api.queries.single, {'rashiIndex': 1, 'date': istToday(), 'language': 'en'});
      expect(model.language, 'en');
    });

    test('Hindi is asked for with language=hi', () async {
      final model = await repository.getTodayPrediction(rashiIndex: 1, language: 'hi');
      expect(api.queries.single['language'], 'hi');
      expect(model.prediction.summary, _hindiSummary);
    });

    test('an unknown language is asked for as English', () async {
      await repository.getTodayPrediction(rashiIndex: 1, language: 'fr');
      expect(api.queries.single['language'], 'en');
    });

    test('a cached English horoscope is never returned for Hindi, nor the reverse', () async {
      final english = await repository.getTodayPrediction(rashiIndex: 1);
      final hindi = await repository.getTodayPrediction(rashiIndex: 1, language: 'hi');
      expect(api.queries.map((q) => q['language']), ['en', 'hi']);
      expect(english.prediction.summary, isNot(_hindiSummary));
      expect(hindi.prediction.summary, _hindiSummary);

      // Both are now cached, each under its own key: no further requests.
      final englishAgain = await repository.getTodayPrediction(rashiIndex: 1);
      final hindiAgain = await repository.getTodayPrediction(rashiIndex: 1, language: 'hi');
      expect(api.queries, hasLength(2));
      expect(englishAgain.language, 'en');
      expect(englishAgain.prediction.summary, english.prediction.summary);
      expect(hindiAgain.language, 'hi');
      expect(hindiAgain.prediction.summary, _hindiSummary);
    });

    test('offline, only the same-language copy is used', () async {
      await repository.getTodayPrediction(rashiIndex: 1); // English cached
      api.offline = true;

      final english = await repository.getTodayPrediction(rashiIndex: 1, forceRefresh: true);
      expect(english.language, 'en');
      // No Hindi copy on the device: an error, never the English text.
      await expectLater(repository.getTodayPrediction(rashiIndex: 1, language: 'hi'), throwsException);
    });

    test('an answer in another language than asked for is not stored under that language', () async {
      api.fixedResponse = _english();
      final model = await repository.getTodayPrediction(rashiIndex: 1, language: 'hi');
      expect(model.language, 'en');

      // Not cached as Hindi: the next Hindi request goes to the server again.
      await repository.getTodayPrediction(rashiIndex: 1, language: 'hi');
      expect(api.queries, hasLength(2));
    });
  });

  group('Horoscope language choice', () {
    test('English until the customer chooses', () async {
      final notifier = HoroscopeLanguageNotifier(InMemorySecureStorageService());
      await notifier.ready;
      expect(notifier.state, 'en');
    });

    test('the choice is remembered', () async {
      final storage = InMemorySecureStorageService();
      final notifier = HoroscopeLanguageNotifier(storage);
      await notifier.ready;
      await notifier.setLanguage('hi');
      expect(notifier.state, 'hi');
      expect(await storage.read(key: StorageKeys.horoscopeLanguage), 'hi');

      final next = HoroscopeLanguageNotifier(storage);
      await next.ready;
      expect(next.state, 'hi');
    });

    test('an unknown language is ignored', () async {
      final storage = InMemorySecureStorageService();
      final notifier = HoroscopeLanguageNotifier(storage);
      await notifier.ready;
      await notifier.setLanguage('fr');
      expect(notifier.state, 'en');
      expect(await storage.read(key: StorageKeys.horoscopeLanguage), isNull);
    });

    test('it is independent of the app language', () async {
      final storage = InMemorySecureStorageService();
      await storage.write(key: StorageKeys.appLocale, value: 'hi');
      final container = ProviderContainer(overrides: [secureStorageProvider.overrideWithValue(storage)]);
      addTearDown(container.dispose);

      await container.read(horoscopeLanguageProvider.notifier).ready;
      // A Hindi app does not by itself make the horoscope Hindi ...
      expect(container.read(horoscopeLanguageProvider), 'en');

      // ... and a Hindi horoscope does not change the app language.
      await container.read(horoscopeLanguageProvider.notifier).setLanguage('hi');
      expect(await storage.read(key: StorageKeys.appLocale), 'hi');
      await container.read(localeProvider.notifier).setLocale(SupportedLocales.english);
      expect(container.read(horoscopeLanguageProvider), 'hi');
      expect(await storage.read(key: StorageKeys.horoscopeLanguage), 'hi');
    });

    test("today's horoscope is loaded in the remembered language and reloads on a switch", () async {
      final storage = InMemorySecureStorageService();
      await storage.write(key: StorageKeys.horoscopeLanguage, value: 'hi');
      final api = _FakeApiClient();
      final container = ProviderContainer(overrides: [
        secureStorageProvider.overrideWithValue(storage),
        rashiBhavishyaRepositoryProvider.overrideWithValue(
          RashiBhavishyaRepository(apiClient: api, cacheService: MemoryAndStorageLocalCacheService()),
        ),
      ]);
      addTearDown(container.dispose);

      final first = await container.read(todayRashiBhavishyaProvider(1).future);
      expect(first.language, 'hi');
      // The stored choice was read first: English was never requested.
      expect(api.queries.map((q) => q['language']), ['hi']);

      await container.read(horoscopeLanguageProvider.notifier).setLanguage('en');
      final second = await container.read(todayRashiBhavishyaProvider(1).future);
      expect(second.language, 'en');
      expect(api.queries.map((q) => q['language']), ['hi', 'en']);
    });
  });
}
