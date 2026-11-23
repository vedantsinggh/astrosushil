import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/content_language.dart';
// The storage the app language is kept in (auth has its own provider of the same name).
import '../../../core/localization/locale_provider.dart' show secureStorageProvider;
import '../../../core/network/network_state_manager.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../auth/providers/auth_provider.dart' hide secureStorageProvider;
import '../data/rashi_bhavishya_repository.dart';
import '../models/rashi_bhavishya_model.dart';
import 'astrology_provider.dart';

final rashiBhavishyaRepositoryProvider = Provider<RashiBhavishyaRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  final cacheService = ref.watch(localCacheServiceProvider);
  return RashiBhavishyaRepository(
    apiClient: apiClient,
    cacheService: cacheService,
  );
});

/// The Moon sign (1–12) of the active birth profile, from its backend-calculated chart.
/// Null when there is no profile/chart; the screen then asks the user to pick a sign.
final userMoonRashiIndexProvider = FutureProvider<int?>((ref) async {
  final chart = await ref.watch(activeProfileAstroChartProvider.future);
  if (chart == null) return null;
  for (final p in chart.planets) {
    if (p.displayName == 'Moon' && p.rashiIndex >= 1 && p.rashiIndex <= 12) return p.rashiIndex;
  }
  return null;
});

/// A sign the user picked on the screen. Null means "use my Moon sign"; there is no default sign.
final selectedRashiIndexProvider = StateProvider<int?>((ref) => null);

/// The language the customer reads the daily horoscope in (`en` or `hi`).
///
/// English until the customer picks Hindi on the horoscope screen; the pick is
/// stored on the device and used from then on. It is deliberately independent
/// of the app language (`localeProvider`): changing either never changes the
/// other.
class HoroscopeLanguageNotifier extends StateNotifier<String> {
  final SecureStorageService _storage;

  /// Completes once the stored choice (if any) has been read.
  late final Future<void> ready;

  HoroscopeLanguageNotifier(this._storage) : super(ContentLanguage.fallback) {
    ready = _loadPersisted();
  }

  Future<void> _loadPersisted() async {
    try {
      final saved = ContentLanguage.tryParse(await _storage.read(key: StorageKeys.horoscopeLanguage));
      // A choice made while the stored one was still loading wins.
      if (saved != null && mounted && !_chosen) state = saved;
    } catch (_) {}
  }

  bool _chosen = false;

  /// Switch the horoscope language and remember it.
  Future<void> setLanguage(String language) async {
    final code = ContentLanguage.tryParse(language);
    if (code == null) return;
    _chosen = true;
    state = code;
    try {
      await _storage.write(key: StorageKeys.horoscopeLanguage, value: code);
    } catch (_) {}
  }
}

final horoscopeLanguageProvider = StateNotifierProvider<HoroscopeLanguageNotifier, String>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return HoroscopeLanguageNotifier(storage);
});

/// Today's horoscope for a Moon sign, in the customer's horoscope language.
/// Switching the language loads (or reads from the per-language cache) the
/// other edition.
final todayRashiBhavishyaProvider = FutureProvider.family<RashiBhavishyaModel, int>((ref, rashiIndex) async {
  final repository = ref.watch(rashiBhavishyaRepositoryProvider);
  // Wait for the remembered choice so a Hindi reader is not first sent English.
  await ref.watch(horoscopeLanguageProvider.notifier).ready;
  final language = ref.watch(horoscopeLanguageProvider);
  return await repository.getTodayPrediction(rashiIndex: rashiIndex, language: language);
});
