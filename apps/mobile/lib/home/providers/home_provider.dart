import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/astrology/providers/astrology_provider.dart';
import '../../features/astrology/providers/rashi_bhavishya_provider.dart';
import '../models/home_models.dart';

/// Today's Rashi Bhavishya preview for the home screen, built only from
/// genuine backend data:
/// - the Moon rashi comes from the active profile's backend-calculated chart;
/// - the prediction comes from `/rashi-bhavishya/today` for that rashi.
///
/// Resolves to `null` when there is no active profile/chart (the card then
/// asks the user to add a birth profile). Errors propagate so the card can
/// show an explicit error instead of invented text.
final homeRashiPreviewProvider = FutureProvider<RashiBhavishyaPreview?>((ref) async {
  final chart = await ref.watch(activeProfileAstroChartProvider.future);
  if (chart == null) return null;

  final moonMatches = chart.planets.where((p) => p.displayName == 'Moon');
  if (moonMatches.isEmpty) return null;
  final moon = moonMatches.first;
  if (moon.rashiIndex < 1 || moon.rashiIndex > 12) return null;

  final prediction = await ref.watch(todayRashiBhavishyaProvider(moon.rashiIndex).future);
  final isGenuine = !prediction.isDevelopmentFixture && prediction.prediction.summary.trim().isNotEmpty;

  return RashiBhavishyaPreview(
    rashiName: moon.rashiName,
    date: prediction.date,
    predictionPreview: isGenuine ? prediction.prediction.summary : null,
    luckyColor: isGenuine ? prediction.prediction.luckyColor : null,
    luckyNumber: isGenuine ? prediction.prediction.luckyNumber : null,
  );
});

/// Provider for current home tab index (Bottom Navigation)
final homeTabControllerProvider = StateProvider<int>((ref) => 0);
