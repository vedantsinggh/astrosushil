import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/errors/app_exception.dart';
import '../../../core/localization/content_language.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../../shared/widgets/astro_image.dart';
import '../../../shared/widgets/astro_loader/astro_loader.dart';
import '../../../shared/widgets/error_banner.dart';
import '../widgets/astrology_error_state.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../models/rashi_bhavishya_model.dart';
import '../providers/rashi_bhavishya_provider.dart';

/// Status colours with ≥4.5:1 contrast on their tinted backgrounds.
const Color _favourableText = Color(0xFF065F46);
const Color _demandingText = Color(0xFF92400E);

class _RashiMeta {
  final int index;
  final String sanskrit;
  final String english;
  final String hindi;
  final String symbol;
  const _RashiMeta(this.index, this.sanskrit, this.english, this.hindi, this.symbol);
}

const List<_RashiMeta> _rashis = [
  _RashiMeta(1, 'Mesha', 'Aries', 'मेष', '♈'),
  _RashiMeta(2, 'Vrishabha', 'Taurus', 'वृषभ', '♉'),
  _RashiMeta(3, 'Mithuna', 'Gemini', 'मिथुन', '♊'),
  _RashiMeta(4, 'Karka', 'Cancer', 'कर्क', '♋'),
  _RashiMeta(5, 'Simha', 'Leo', 'सिंह', '♌'),
  _RashiMeta(6, 'Kanya', 'Virgo', 'कन्या', '♍'),
  _RashiMeta(7, 'Tula', 'Libra', 'तुला', '♎'),
  _RashiMeta(8, 'Vrischika', 'Scorpio', 'वृश्चिक', '♏'),
  _RashiMeta(9, 'Dhanu', 'Sagittarius', 'धनु', '♐'),
  _RashiMeta(10, 'Makara', 'Capricorn', 'मकर', '♑'),
  _RashiMeta(11, 'Kumbha', 'Aquarius', 'कुंभ', '♒'),
  _RashiMeta(12, 'Meena', 'Pisces', 'मीन', '♓'),
];

const Map<String, String> _planetHindi = {
  'SUN': 'सूर्य',
  'MOON': 'चंद्र',
  'MARS': 'मंगल',
  'MERCURY': 'बुध',
  'JUPITER': 'गुरु',
  'VENUS': 'शुक्र',
  'SATURN': 'शनि',
  'RAHU': 'राहु',
  'KETU': 'केतु',
};

String _ordinal(int n) {
  if (n % 100 >= 11 && n % 100 <= 13) return '${n}th';
  switch (n % 10) {
    case 1:
      return '${n}st';
    case 2:
      return '${n}nd';
    case 3:
      return '${n}rd';
    default:
      return '${n}th';
  }
}

class RashiBhavishyaScreen extends ConsumerWidget {
  const RashiBhavishyaScreen({super.key});

  /// Formats the prediction date exactly as returned by the backend (yyyy-MM-dd).
  /// In a Hindi horoscope the month and weekday are written in Hindi.
  static String formatPredictionDate(String raw, {bool isHindi = false}) {
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return raw;
    if (isHindi) {
      return '${parsed.day} ${_hindiMonths[parsed.month - 1]} ${parsed.year}, ${_hindiWeekdays[parsed.weekday - 1]}';
    }
    return DateFormat('d MMMM yyyy, EEEE').format(parsed);
  }

  // Written out here because the date symbols of a language are loaded only
  // when the app itself runs in it, and a Hindi horoscope can be read in an
  // English app.
  static const List<String> _hindiMonths = [
    'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', //
    'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर',
  ];

  /// Monday first, as [DateTime.weekday].
  static const List<String> _hindiWeekdays = ['सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार', 'रविवार'];

  /// Local IST clock time (HH:mm) of a UTC ISO instant.
  static String istClock(String iso) {
    final t = DateTime.tryParse(iso);
    if (t == null) return '';
    return DateFormat('HH:mm').format(t.toUtc().add(const Duration(hours: 5, minutes: 30)));
  }

  static String _shortDate(String ymd, {bool isHindi = false}) {
    final d = DateTime.tryParse(ymd);
    if (d == null) return ymd;
    return isHindi ? '${d.day} ${_hindiMonths[d.month - 1]}' : DateFormat('d MMM').format(d);
  }

  ExplanationContext _buildExplanationContext(_RashiMeta rashi, RashiBhavishyaModel data, bool isHindi) {
    return ExplanationContext(
      feature: 'rashi_bhavishya',
      screenTitle: '${rashi.english} Rashi Bhavishya',
      language: isHindi ? 'hi' : 'en',
      purpose: 'Explain today\'s gochara (planet transits counted from the ${rashi.english} Moon sign) and what favourable and demanding houses mean.',
      astrologyData: {
        'date': data.date,
        'moonSign': rashi.english,
        'summary': data.prediction.summary,
        'moon': '${data.facts.moon.sign.englishName}, ${_ordinal(data.facts.moon.house)} from the Moon sign (${data.facts.moon.classification})',
        'transits': [
          for (final p in data.facts.planets)
            '${p.name}: ${p.sign.englishName}, ${_ordinal(p.house)} house from the Moon sign, ${p.classification}${p.isRetrograde && !p.isNode ? ', retrograde' : ''}',
        ],
        'panchang': '${data.facts.panchang.varaEnglish}, ${data.facts.panchang.tithi}, ${data.facts.panchang.nakshatra}',
        'method': data.method.summary,
      },
      importantValues: {
        'favourablePlanets': data.facts.tally.favourable,
        'demandingPlanets': data.facts.tally.demanding,
      },
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isHindi = Localizations.localeOf(context).languageCode == 'hi';
    final selected = ref.watch(selectedRashiIndexProvider);
    final userMoonAsync = ref.watch(userMoonRashiIndexProvider);
    final userMoon = userMoonAsync.valueOrNull;
    final effectiveIndex = selected ?? userMoon;
    final waitingForMoon = selected == null && userMoonAsync.isLoading;

    return AstroPage(
      title: isHindi ? 'आज का राशि भविष्य' : 'Rashi Bhavishya',
      style: AstroNavBarStyle.hero,
      actions: [
        if (effectiveIndex != null)
          AstroNavAction(
            tooltip: isHindi ? 'फिर से लोड करें' : 'Reload',
            icon: Icons.refresh_rounded,
            onPressed: () => ref.invalidate(todayRashiBhavishyaProvider(effectiveIndex)),
          ),
      ],
      onRefresh: effectiveIndex == null
          ? null
          : () async => ref.invalidate(todayRashiBhavishyaProvider(effectiveIndex)),
      padding: const EdgeInsets.fromLTRB(AstroMetrics.gutter, 16, AstroMetrics.gutter, 32),
      // App body font with its Devanagari-capable fallbacks for every text on this screen.
      child: DefaultTextStyle.merge(
        style: const TextStyle(fontFamily: AppTypography.bodyFamily, fontFamilyFallback: AppTypography.bodyFontFamilies),
        child: waitingForMoon
            ? const AstroLoaderCard(message: AstroLoaderMessages.rashiBhavishya)
            : effectiveIndex == null
                ? _SignPicker(isHindi: isHindi, onPick: (i) => ref.read(selectedRashiIndexProvider.notifier).state = i)
                : _buildForSign(context, ref, effectiveIndex, userMoon, isHindi),
      ),
    );
  }

  Widget _buildForSign(BuildContext context, WidgetRef ref, int index, int? userMoon, bool isHindi) {
    final rashi = _rashis[index - 1];
    final predictionAsync = ref.watch(todayRashiBhavishyaProvider(index));
    // The customer's horoscope language: their own pick, else the app language.
    final language = ref.watch(horoscopeLanguageProvider);
    final l10n = context.l10n;
    final data = predictionAsync.valueOrNull;
    final genuine = (data != null && !data.isDevelopmentFixture) ? data : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _SignSelector(
          rashi: rashi,
          isUserMoon: userMoon == index,
          showResetToMine: userMoon != null && userMoon != index,
          isHindi: isHindi,
          onPrev: () => ref.read(selectedRashiIndexProvider.notifier).state = index == 1 ? 12 : index - 1,
          onNext: () => ref.read(selectedRashiIndexProvider.notifier).state = index == 12 ? 1 : index + 1,
          onReset: () => ref.read(selectedRashiIndexProvider.notifier).state = null,
        ),
        const SizedBox(height: 12),
        Semantics(
          container: true,
          label: l10n.horoscopeLanguageLabel,
          child: AstroSegmentedControl<String>(
            key: const ValueKey('horoscope-language'),
            segments: [
              for (final code in ContentLanguage.all)
                AstroSegment(value: code, label: ContentLanguage.displayName(l10n, code)),
            ],
            selected: language,
            onChanged: (code) => ref.read(horoscopeLanguageProvider.notifier).setLanguage(code),
          ),
        ),
        const SizedBox(height: 12),
        if (genuine != null) ...[
          SushilExplainerButton(
            contextBuilder: () => _buildExplanationContext(rashi, genuine, isHindi),
            poseAsset: AppAssets.sushilFriendly,
          ),
          const SizedBox(height: 14),
        ],
        predictionAsync.when(
          loading: () => const AstroLoaderCard(message: AstroLoaderMessages.rashiBhavishya),
          error: (err, _) => AstrologyErrorState(
            error: err,
            customMessage: isHindi
                ? 'आज का राशि भविष्य अभी तैयार नहीं हो सका। कृपया कुछ मिनट बाद पुनः प्रयास करें।'
                : (err is AppException ? err.message : 'Today\'s Rashi Bhavishya could not be loaded. Please try again later.'),
            onRetry: () => ref.invalidate(todayRashiBhavishyaProvider(index)),
          ),
          data: (d) => d.isDevelopmentFixture
              ? ErrorBanner(
                  message: isHindi
                      ? 'इस राशि का आज का प्रामाणिक भविष्यफल अभी उपलब्ध नहीं है।'
                      : 'A verified daily prediction for this rashi is not available yet.',
                )
              // A Hindi horoscope is shown with Hindi labels whatever the app language is.
              : _RashiContent(
                  model: d,
                  rashi: rashi,
                  isHindi: isHindi || d.isHindi,
                  hindiNarrativeMissing: language == ContentLanguage.hindi && d.prediction.language != ContentLanguage.hindi,
                ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }
}

class _SignSelector extends StatelessWidget {
  final _RashiMeta rashi;
  final bool isUserMoon;
  final bool showResetToMine;
  final bool isHindi;
  final VoidCallback onPrev;
  final VoidCallback onNext;
  final VoidCallback onReset;

  const _SignSelector({
    required this.rashi,
    required this.isUserMoon,
    required this.showResetToMine,
    required this.isHindi,
    required this.onPrev,
    required this.onNext,
    required this.onReset,
  });

  @override
  Widget build(BuildContext context) {
    final rashiAsset = AppAssets.getRashiAsset(rashi.english);
    Widget arrow({required String tooltip, required IconData icon, required VoidCallback onPressed}) => IconButton(
          tooltip: tooltip,
          constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
          style: IconButton.styleFrom(backgroundColor: Colors.white.withValues(alpha: 0.1)),
          icon: Icon(icon, color: Colors.white, size: 26),
          onPressed: onPressed,
        );
    return AstroGradientCard(
      padding: const EdgeInsets.fromLTRB(10, 18, 10, 16),
      child: Column(
        children: [
          Row(
            children: [
              arrow(tooltip: isHindi ? 'पिछली राशि' : 'Previous sign', icon: Icons.chevron_left_rounded, onPressed: onPrev),
              Expanded(
                child: Column(
                  children: [
                    Container(
                      width: 76,
                      height: 76,
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.gold.withValues(alpha: 0.7), width: 1.5),
                        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.25), blurRadius: 14, offset: const Offset(0, 6))],
                      ),
                      child: ClipOval(
                        child: rashiAsset != null
                            ? AstroImage(
                                assetPath: rashiAsset,
                                width: 76,
                                height: 76,
                                fit: BoxFit.cover,
                                fallback: AstroImageFallback.icon,
                                semanticLabel: '${rashi.english} zodiac sign',
                              )
                            : Center(child: Text(rashi.symbol, style: const TextStyle(fontSize: 32, color: AppColors.gold))),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      isHindi ? '${rashi.hindi} (${rashi.english})' : '${rashi.english} (${rashi.sanskrit})',
                      textAlign: TextAlign.center,
                      style: AppTypography.headlineLarge.copyWith(fontSize: 22, color: Colors.white, height: 1.2),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isUserMoon
                          ? (isHindi ? 'आपकी चंद्र राशि' : 'Your Moon sign')
                          : (isHindi ? 'चंद्र राशि' : 'Moon sign (janma rashi)'),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: isUserMoon ? FontWeight.w600 : FontWeight.w500,
                        color: isUserMoon ? AppColors.gold : AppColors.textInverseSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              arrow(tooltip: isHindi ? 'अगली राशि' : 'Next sign', icon: Icons.chevron_right_rounded, onPressed: onNext),
            ],
          ),
          if (showResetToMine) ...[
            const SizedBox(height: 14),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: AstroSecondaryButton(
                onPressed: onReset,
                variant: AstroSecondaryVariant.onDark,
                icon: Icons.person_pin_circle_rounded,
                label: isHindi ? 'मेरी चंद्र राशि दिखाएँ' : 'Show my Moon sign',
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Shown when no Moon sign is known yet: the user chooses one (there is no default sign).
class _SignPicker extends StatelessWidget {
  final bool isHindi;
  final ValueChanged<int> onPick;
  const _SignPicker({required this.isHindi, required this.onPick});

  @override
  Widget build(BuildContext context) {
    return AstroSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const AstroIconSquare(icon: Icons.nightlight_round, tint: AstroTint.violet, size: 40),
              const SizedBox(width: 12),
              Expanded(
                child: Semantics(
                  header: true,
                  child: Text(
                    isHindi ? 'अपनी चंद्र राशि चुनें' : 'Choose your Moon sign',
                    style: _kCardTitle.copyWith(fontSize: 20),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            isHindi
                ? 'राशि भविष्य चंद्र राशि से पढ़ा जाता है। जन्म विवरण जोड़ने पर आपकी राशि अपने आप चुनी जाएगी।'
                : 'Rashi Bhavishya is read from the Moon sign. Add your birth details and your sign is chosen automatically.',
            style: const TextStyle(fontSize: 15, color: AppColors.lightTextSecondary, height: 1.4),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final r in _rashis)
                AstroPill(
                  label: isHindi ? r.hindi : '${r.english} · ${r.sanskrit}',
                  selected: false,
                  onTap: () => onPick(r.index),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RashiContent extends StatelessWidget {
  final RashiBhavishyaModel model;
  final _RashiMeta rashi;
  final bool isHindi;

  /// Hindi was asked for but the narrative that came back is not in Hindi.
  final bool hindiNarrativeMissing;

  const _RashiContent({
    required this.model,
    required this.rashi,
    required this.isHindi,
    this.hindiNarrativeMissing = false,
  });

  String _planet(RashiPlanetTransit p) => isHindi ? (_planetHindi[p.planet] ?? p.name) : p.name;

  String _signName(RashiSignRef s) => isHindi ? (s.hindiName ?? _rashis[s.index - 1].hindi) : s.englishName;

  String _house(int h) => isHindi ? 'भाव $h' : '${_ordinal(h)} house';

  @override
  Widget build(BuildContext context) {
    final facts = model.facts;
    final sunrise = RashiBhavishyaScreen.istClock(facts.sunriseIso);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _DateBadge(
          date: RashiBhavishyaScreen.formatPredictionDate(model.date, isHindi: isHindi),
          note: isHindi
              ? 'सूर्योदय $sunrise IST (${facts.referenceLocation}) पर ग्रह स्थिति'
              : 'Planet positions at sunrise, $sunrise IST (${facts.referenceLocation})',
        ),
        const SizedBox(height: 14),
        AstroSurfaceCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _CardHeading(
                icon: Icons.wb_twilight_rounded,
                tint: AstroTint.amber,
                title: isHindi ? 'आज का सार' : 'Today\'s outlook',
              ),
              const SizedBox(height: 12),
              Text(
                model.prediction.summary,
                style: const TextStyle(fontSize: 16, color: AppColors.lightTextPrimary, height: 1.5),
              ),
              const SizedBox(height: 12),
              _MoonLine(moon: facts.moon, rashi: rashi, isHindi: isHindi, planetLabel: _planet, signLabel: _signName, houseLabel: _house),
            ],
          ),
        ),
        const SizedBox(height: 14),
        for (final s in model.prediction.sections) ...[
          _SectionCard(section: s, hideLead: s.lead.trim() == model.prediction.summary.trim()),
          const SizedBox(height: 12),
        ],
        if (hindiNarrativeMissing)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              context.l10n.horoscopeHindiNarrativeUnavailable,
              style: const TextStyle(fontSize: 14, color: AppColors.lightTextSecondary),
            ),
          ),
        _TransitTable(
          facts: facts,
          rashi: rashi,
          isHindi: isHindi,
          planetLabel: _planet,
          signLabel: _signName,
        ),
        const SizedBox(height: 12),
        _PanchangCard(panchang: facts.panchang, isHindi: isHindi),
        if (facts.events.where((e) => e.planet != 'MOON').isNotEmpty) ...[
          const SizedBox(height: 12),
          _EventsCard(events: facts.events.where((e) => e.planet != 'MOON').toList(), isHindi: isHindi),
        ],
        const SizedBox(height: 12),
        _MethodCard(method: model.method, tally: facts.tally, isHindi: isHindi),
      ],
    );
  }
}

class _DateBadge extends StatelessWidget {
  final String date;
  final String note;
  const _DateBadge({required this.date, required this.note});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: AstroTint.amber.background,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: AppColors.goldBorder),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.calendar_today_rounded, size: 16, color: AppColors.goldDark),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  date,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.primary),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 6),
        Text(note, textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, color: AppColors.lightTextSecondary)),
      ],
    );
  }
}

class _StatusChip extends StatelessWidget {
  final bool favourable;
  final bool isHindi;
  const _StatusChip({required this.favourable, required this.isHindi});

  @override
  Widget build(BuildContext context) {
    final text = favourable ? (isHindi ? 'अनुकूल' : 'Favourable') : (isHindi ? 'सावधानी' : 'Demanding');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: favourable ? AppColors.successBg : AppColors.warningBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: favourable ? AppColors.successBorder : AppColors.warningBorder),
      ),
      child: Text(
        text,
        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: favourable ? _favourableText : _demandingText),
      ),
    );
  }
}

class _MoonLine extends StatelessWidget {
  final RashiPlanetTransit moon;
  final _RashiMeta rashi;
  final bool isHindi;
  final String Function(RashiPlanetTransit) planetLabel;
  final String Function(RashiSignRef) signLabel;
  final String Function(int) houseLabel;

  const _MoonLine({
    required this.moon,
    required this.rashi,
    required this.isHindi,
    required this.planetLabel,
    required this.signLabel,
    required this.houseLabel,
  });

  @override
  Widget build(BuildContext context) {
    final change = moon.changesTo;
    final from = isHindi ? rashi.hindi : rashi.english;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.canvasSecondary,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.nightlight_round, size: 18, color: AppColors.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  isHindi
                      ? 'चंद्र ${signLabel(moon.sign)} में · $from से ${houseLabel(moon.house)}'
                      : 'Moon in ${moon.sign.englishName} · ${houseLabel(moon.house)} from $from',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.primary),
                ),
              ),
              const SizedBox(width: 8),
              _StatusChip(favourable: moon.isFavourable, isHindi: isHindi),
            ],
          ),
          if (moon.houseTheme.isNotEmpty && !isHindi) ...[
            const SizedBox(height: 4),
            Padding(
              padding: const EdgeInsets.only(left: 26),
              child: Text(
                'This house is about ${moon.houseTheme}.',
                style: const TextStyle(fontSize: 14, color: AppColors.lightTextSecondary, height: 1.35),
              ),
            ),
          ],
          if (change != null) ...[
            const SizedBox(height: 6),
            Padding(
              padding: const EdgeInsets.only(left: 26),
              child: Text(
                isHindi
                    ? '${change.timeIst} IST (${RashiBhavishyaScreen._shortDate(change.dateIst, isHindi: true)}) से चंद्र ${signLabel(change.sign)} में — ${houseLabel(change.house)}, ${change.classification == 'favourable' ? 'अनुकूल' : 'सावधानी'}'
                    : 'From ${change.timeIst} IST (${RashiBhavishyaScreen._shortDate(change.dateIst)}): Moon in ${change.sign.englishName}, ${houseLabel(change.house)} — ${change.classification}',
                style: const TextStyle(fontSize: 14, color: AppColors.lightTextSecondary, height: 1.35),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final RashiNarrativeSection section;
  final bool hideLead;
  const _SectionCard({required this.section, required this.hideLead});

  @override
  Widget build(BuildContext context) {
    return AstroSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(header: true, child: Text(section.title, style: _kCardTitle)),
          if (!hideLead && section.lead.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(section.lead, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.lightTextPrimary, height: 1.4)),
          ],
          for (final p in section.paragraphs) ...[
            const SizedBox(height: 8),
            Text(p, style: const TextStyle(fontSize: 16, color: AppColors.lightTextSecondary, height: 1.5)),
          ],
          if (section.bullets.isNotEmpty) ...[
            const SizedBox(height: 8),
            for (final b in section.bullets)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(top: 6, right: 8),
                      child: Icon(Icons.circle, size: 6, color: AppColors.primary),
                    ),
                    Expanded(child: Text(b, style: const TextStyle(fontSize: 16, color: AppColors.lightTextSecondary, height: 1.45))),
                  ],
                ),
              ),
          ],
          if (section.takeaway != null) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AstroTint.amber.background,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.goldBorder),
              ),
              child: Text(
                section.takeaway!,
                style: const TextStyle(fontSize: 15, fontStyle: FontStyle.italic, color: AppColors.lightTextPrimary, height: 1.4),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _TransitTable extends StatelessWidget {
  final RashiFactsModel facts;
  final _RashiMeta rashi;
  final bool isHindi;
  final String Function(RashiPlanetTransit) planetLabel;
  final String Function(RashiSignRef) signLabel;

  const _TransitTable({
    required this.facts,
    required this.rashi,
    required this.isHindi,
    required this.planetLabel,
    required this.signLabel,
  });

  @override
  Widget build(BuildContext context) {
    final t = facts.tally;
    return AstroSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _CardHeading(
            icon: Icons.public_rounded,
            tint: AstroTint.sky,
            title: isHindi ? 'चंद्र राशि से ग्रह गोचर' : 'Planets from your Moon sign',
          ),
          const SizedBox(height: 8),
          Text(
            isHindi
                ? '${t.total} में से ${t.favourable} ग्रह अनुकूल भावों में, ${t.demanding} सावधानी वाले भावों में (साधारण गिनती, कोई अंक नहीं)।'
                : '${t.favourable} of ${t.total} planets are in favourable houses and ${t.demanding} in demanding ones — a plain count, not a score.',
            style: const TextStyle(fontSize: 14, color: AppColors.lightTextSecondary, height: 1.35),
          ),
          const SizedBox(height: 8),
          for (final p in facts.planets)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.separator, width: 0.5))),
              child: Row(
                children: [
                  SizedBox(
                    width: 82,
                    child: Text(
                      planetLabel(p) + (p.isRetrograde && !p.isNode ? ' (R)' : ''),
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.primary),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      isHindi ? '${signLabel(p.sign)} · भाव ${p.house}' : '${p.sign.englishName} · ${_ordinal(p.house)}',
                      style: const TextStyle(fontSize: 15, color: AppColors.lightTextPrimary),
                    ),
                  ),
                  _StatusChip(favourable: p.isFavourable, isHindi: isHindi),
                ],
              ),
            ),
          const SizedBox(height: 4),
          Text(
            isHindi
                ? '(R) = वक्री। राहु-केतु सदा उल्टी चाल चलते हैं।'
                : '(R) = retrograde. Rahu and Ketu always move backwards.',
            style: const TextStyle(fontSize: 14, color: AppColors.lightTextSecondary),
          ),
        ],
      ),
    );
  }
}

class _PanchangCard extends StatelessWidget {
  final RashiPanchangModel panchang;
  final bool isHindi;
  const _PanchangCard({required this.panchang, required this.isHindi});

  @override
  Widget build(BuildContext context) {
    Widget row(String label, String value) => Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(width: 92, child: Text(label, style: const TextStyle(fontSize: 15, color: AppColors.lightTextSecondary))),
              Expanded(child: Text(value, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.lightTextPrimary))),
            ],
          ),
        );
    return AstroSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _CardHeading(
            icon: Icons.calendar_month_rounded,
            tint: AstroTint.coral,
            title: isHindi ? 'आज का पंचांग (सूर्योदय)' : 'Panchang at sunrise',
          ),
          const SizedBox(height: 6),
          row(isHindi ? 'वार' : 'Vara', '${panchang.varaName} (${panchang.varaEnglish})'),
          row(isHindi ? 'तिथि' : 'Tithi', panchang.tithi),
          row(isHindi ? 'नक्षत्र' : 'Nakshatra', panchang.nakshatraPada > 0
                  ? '${panchang.nakshatra} (${isHindi ? 'चरण' : 'pada'} ${panchang.nakshatraPada})'
                  : panchang.nakshatra),
          row(isHindi ? 'योग' : 'Yoga', panchang.yoga),
        ],
      ),
    );
  }
}

class _EventsCard extends StatelessWidget {
  final List<RashiSkyEvent> events;
  final bool isHindi;
  const _EventsCard({required this.events, required this.isHindi});

  String _describe(RashiSkyEvent e) {
    if (e.type == 'SIGN_INGRESS' && e.fromSign != null && e.toSign != null) {
      return isHindi
          ? '${_planetHindi[e.planet] ?? e.planetName}: ${_rashis[e.fromSign!.index - 1].hindi} से ${_rashis[e.toSign!.index - 1].hindi} में'
          : '${e.planetName} moves from ${e.fromSign!.englishName} into ${e.toSign!.englishName}';
    }
    final where = e.sign?.englishName ?? '';
    if (e.type == 'RETROGRADE_STATION') return isHindi ? '${_planetHindi[e.planet] ?? e.planetName} वक्री' : '${e.planetName} turns retrograde in $where';
    return isHindi ? '${_planetHindi[e.planet] ?? e.planetName} मार्गी' : '${e.planetName} turns direct in $where';
  }

  @override
  Widget build(BuildContext context) {
    return AstroSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _CardHeading(
            icon: Icons.swap_horiz_rounded,
            tint: AstroTint.indigo,
            title: isHindi ? 'आज और इस सप्ताह' : 'Today and this week',
          ),
          const SizedBox(height: 4),
          for (final e in events)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(top: 2, right: 8),
                    child: Icon(Icons.swap_horiz_rounded, size: 16, color: AppColors.primary),
                  ),
                  Expanded(
                    child: Text(
                      '${_describe(e)} · ${RashiBhavishyaScreen._shortDate(e.dateIst)}, ${e.timeIst} IST',
                      style: const TextStyle(fontSize: 15, color: AppColors.lightTextPrimary, height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _MethodCard extends StatelessWidget {
  final RashiMethodModel method;
  final RashiTallyModel tally;
  final bool isHindi;
  const _MethodCard({required this.method, required this.tally, required this.isHindi});

  @override
  Widget build(BuildContext context) {
    return AstroSurfaceCard(
      color: AppColors.cardSurfaceWarm,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _CardHeading(
            icon: Icons.verified_outlined,
            tint: AstroTint.slate,
            title: isHindi ? 'यह कैसे तैयार होता है' : 'How this is prepared',
          ),
          const SizedBox(height: 10),
          Text(method.summary, style: const TextStyle(fontSize: 14, color: AppColors.lightTextSecondary, height: 1.45)),
          if (method.sources.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              '${isHindi ? 'आधार' : 'Sources'}: ${method.sources.join('; ')}',
              style: const TextStyle(fontSize: 14, color: AppColors.lightTextSecondary, height: 1.45),
            ),
          ],
          const SizedBox(height: 6),
          Text(
            isHindi
                ? 'ऊपर का विवरण एक AI मॉडल ने केवल इन गणना किए गए तथ्यों से लिखा है और इसे उन्हीं तथ्यों से स्वतः जाँचा गया है। यह हर उस व्यक्ति के लिए समान है जिसकी यह चंद्र राशि है।'
                : 'The text above is written by an AI model only from these calculated facts and is checked automatically against them. It is the same for everyone with this Moon sign; it is not a personal birth-chart reading.',
            style: const TextStyle(fontSize: 14, color: AppColors.lightTextSecondary, height: 1.45),
          ),
        ],
      ),
    );
  }
}

/// Serif card title used across this screen.
const TextStyle _kCardTitle = TextStyle(
  fontFamily: AppTypography.headingFamily,
  fontFamilyFallback: AppTypography.headingFontFamilies,
  fontSize: 18,
  fontWeight: FontWeight.w700,
  color: AppColors.textPrimary,
  height: 1.25,
);

/// Tinted icon square + serif title, the heading of each content card.
class _CardHeading extends StatelessWidget {
  final IconData icon;
  final AstroTint tint;
  final String title;
  const _CardHeading({required this.icon, required this.tint, required this.title});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        AstroIconSquare(icon: icon, tint: tint),
        const SizedBox(width: 12),
        Expanded(child: Semantics(header: true, child: Text(title, style: _kCardTitle))),
      ],
    );
  }
}
