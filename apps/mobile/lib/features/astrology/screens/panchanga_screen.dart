import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../../shared/assets/app_assets.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../models/panchang_model.dart';
import '../providers/astrology_provider.dart';
import '../widgets/active_birth_profile_selector.dart';
import '../widgets/astrology_empty_state.dart';
import '../widgets/astrology_error_state.dart';
import '../widgets/astrology_loading_state.dart';
import '../widgets/astrology_section_card.dart';
import '../widgets/expandable_astrology_card.dart';
import '../widgets/planet_chip.dart';
import '../../../core/localization/locale_provider.dart';
import '../widgets/astrology_explanation_card.dart';

/// Screen presenting Vedic Panchanga (The 5 Cosmic Limbs of Time)
/// Built deterministically using Fastify backend /astrology/panchang
class PanchangaScreen extends ConsumerWidget {
  const PanchangaScreen({super.key});

  ExplanationContext _buildExplanationContext(
    PanchangModel panchang,
    BirthProfileModel profile,
  ) {
    return ExplanationContext(
      feature: 'panchanga',
      screenTitle: 'Vedic Panchanga',
      purpose: 'Explain the five daily astronomical limbs (Tithi, Vara, Nakshatra, Yoga, Karana) and their energy for today.',
      astrologyData: {
        'tithi': {
          'name': panchang.tithi.name,
          'paksha': panchang.tithi.paksha,
          'index': panchang.tithi.index,
          'completionPercentage': panchang.tithi.completionPercentage,
        },
        'vara': {
          'name': panchang.vara.name,
          'lord': panchang.vara.lord,
        },
        'nakshatra': {
          'name': panchang.nakshatra.name,
          'pada': panchang.nakshatra.pada,
          'lord': panchang.nakshatra.lord,
        },
        'yoga': {
          'name': panchang.yoga.name,
        },
        'karana': {
          'name': panchang.karana.name,
        },
        'solarTimings': {
          'sunrise': panchang.sunriseSunset?.formattedSunrise,
          'sunset': panchang.sunriseSunset?.formattedSunset,
          'rahuKalam': panchang.rahuKala?.formattedWindow,
        },
        'hinduMonth': panchang.hinduCalendar?.amantaMasa,
      },
      importantValues: {
        'tithi': panchang.tithi.name,
        'vara': panchang.vara.name,
        'nakshatra': panchang.nakshatra.name,
        'yoga': panchang.yoga.name,
        'karana': panchang.karana.name,
      },
      userProfileContext: {
        'name': profile.name,
      },
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeProfile = ref.watch(selectedBirthProfileProvider);

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AstroAppBar(
        title: 'Vedic Panchanga (पञ्चाङ्ग)',
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline_rounded, color: AppColors.primary),
            tooltip: 'About Panchanga',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                    'Panchanga computes 5 astronomical dimensions: Tithi, Vara, Nakshatra, Yoga, and Karana.',
                  ),
                  duration: Duration(seconds: 4),
                ),
              );
            },
          ),
        ],
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: Column(
            children: [
              // Top Profile Bar
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: ActiveBirthProfileSelector(
                  isDark: false,
                  onProfileChanged: (_) {},
                ),
              ),

              // Main Content
              Expanded(
                child: activeProfile == null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: AstrologyEmptyState(
                            title: 'No Active Birth Profile',
                            message: 'Select or create a birth profile to calculate your local Vedic Panchanga.',
                            actionLabel: 'Add Birth Profile',
                            onAction: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => const CreateBirthProfileScreen(),
                                ),
                              );
                            },
                          ),
                        ),
                      )
                    : _buildPanchangBody(context, ref, activeProfile),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPanchangBody(BuildContext context, WidgetRef ref, BirthProfileModel profile) {
    final panchangAsync = ref.watch(panchangForProfileProvider(profile));

    return panchangAsync.when(
      loading: () => const AstrologyLoadingState(
        message: 'Calculating 5 cosmic limbs of Panchanga...',
      ),
      error: (error, stack) => Center(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: AstrologyErrorState(
            error: error,
            customMessage: 'Failed to calculate Panchanga. Tap to retry.',
            onRetry: () => ref.refresh(panchangForProfileProvider(profile)),
          ),
        ),
      ),
      data: (panchang) => RefreshIndicator(
        onRefresh: () async => ref.refresh(panchangForProfileProvider(profile)),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Educational Explanation Card
              AstrologyExplanationCard(
                title: context.l10n.explainPanchangaTitle,
                whatIsText: context.l10n.explainPanchangaWhatIs,
                howToReadText: context.l10n.explainPanchangaHowToRead,
              ),
              const SizedBox(height: 12),

              // 1. CONTEXT HEADER: Date, Location & Timezone
              _buildContextBanner(panchang, profile),

              const SizedBox(height: 12),

              // Sushil Sir Explainer Button
              SushilExplainerButton(
                contextBuilder: () => _buildExplanationContext(panchang, profile),
                poseAsset: AppAssets.sushilGuiding,
              ),

              const SizedBox(height: 14),

              // 2. HERO: 5 COSMIC LIMBS (PANCHA-ANGA)
              _buildFiveLimbsCard(panchang),

              const SizedBox(height: 14),

              // 3. ASTRONOMICAL SOLAR TIMINGS & RAHU KALA
              _buildSunAndRahuCard(panchang),

              const SizedBox(height: 14),

              // 4. HINDU CALENDAR MASA & SOLAR RASHI
              if (panchang.hinduCalendar != null) ...[
                _buildHinduCalendarCard(panchang.hinduCalendar!),
                const SizedBox(height: 14),
              ],

              // 5. PROGRESSIVE DISCLOSURE: TRANSITIONS
              if (panchang.transitions.isNotEmpty) ...[
                _buildTransitionsCard(panchang.transitions),
                const SizedBox(height: 14),
              ],

              // 6. CLASSICAL SIGNIFICANCE INFO
              const ExpandableAstrologyCard(
                title: 'Significance of Panchanga',
                subtitle: 'Vedic guidelines for auspicious timing (Muhurta)',
                icon: Icons.menu_book_rounded,
                initiallyExpanded: false,
                expandedChild: Text(
                  'The five limbs of Panchanga harmonize human action with astronomical energies:\n\n'
                  '• Tithi (Lunar Day): Governs emotional vitality and relationship harmony.\n'
                  '• Vara (Solar Weekday): Determines natural vigor and dominant elemental quality.\n'
                  '• Nakshatra (Lunar Mansion): Guides mind, subconscious inclinations, and karmic flow.\n'
                  '• Yoga (Soli-Lunar Angle): Shapes physiological well-being and life longevity.\n'
                  '• Karana (Half-Tithi): Directs enterprise, practical productivity, and execution success.',
                  style: TextStyle(fontSize: 13, height: 1.5, color: AppColors.primary),
                ),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContextBanner(PanchangModel panchang, BirthProfileModel profile) {
    String formattedDate = profile.dateOfBirth;
    try {
      final dt = DateTime.parse(profile.dateOfBirth);
      formattedDate = DateFormat('EEEE, MMMM d, yyyy').format(dt);
    } catch (_) {}

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.lightSurface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.lightBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.wb_twilight_rounded, color: AppColors.secondary, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  formattedDate,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.secondary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  'EPHEMERIS',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: AppColors.secondary,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 12,
            runSpacing: 4,
            children: [
              if (profile.placeName.isNotEmpty)
                _buildInfoTag(Icons.location_on_outlined, profile.placeName),
              _buildInfoTag(
                Icons.access_time_rounded,
                '${profile.timeOfBirth.isNotEmpty ? profile.timeOfBirth : "12:00"} (${profile.timezone.isNotEmpty ? profile.timezone : "UTC"})',
              ),
              _buildInfoTag(
                Icons.my_location_rounded,
                '${profile.latitude.toStringAsFixed(2)}°N, ${profile.longitude.toStringAsFixed(2)}°E',
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoTag(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: AppColors.lightTextMuted),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 11.5,
              color: AppColors.lightTextMuted,
              fontWeight: FontWeight.w500,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildFiveLimbsCard(PanchangModel panchang) {
    return AstrologySectionCard(
      title: 'The Five Limbs (पञ्चाङ्ग)',
      subtitle: 'Astronomical coordinates at reference moment',
      icon: Icons.auto_awesome_rounded,
      badgeText: '5 LIMBS',
      badgeColor: AppColors.secondary,
      child: Column(
        children: [
          // 1. TITHI
          _buildLimbTile(
            limbNumber: '1',
            limbTitle: 'TITHI (Lunar Day)',
            mainValue: panchang.tithi.name,
            subValue: '${panchang.tithi.formattedPaksha} • ${(panchang.tithi.completionPercentage).toStringAsFixed(1)}% complete',
            badgeText: panchang.tithi.isShukla ? 'SHUKLA' : 'KRISHNA',
            badgeColor: panchang.tithi.isShukla ? AppColors.premiumAccent : AppColors.primary,
            trailingWidget: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.lightBackground,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: AppColors.lightBorder),
              ),
              child: Text(
                'Tithi #${panchang.tithi.index}',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
              ),
            ),
          ),
          const Divider(height: 18, color: AppColors.lightBorder),

          // 2. VARA
          _buildLimbTile(
            limbNumber: '2',
            limbTitle: 'VARA (Solar Weekday)',
            mainValue: panchang.vara.name,
            subValue: '${panchang.vara.englishDayName} • Ruler: ${panchang.vara.lord}',
            trailingWidget: PlanetChip(
              planetName: panchang.vara.lord,
              isCompact: true,
            ),
          ),
          const Divider(height: 18, color: AppColors.lightBorder),

          // 3. NAKSHATRA
          _buildLimbTile(
            limbNumber: '3',
            limbTitle: 'NAKSHATRA (Lunar Mansion)',
            mainValue: panchang.nakshatra.name,
            subValue: 'Pada ${panchang.nakshatra.pada} of 4 • Lord: ${panchang.nakshatra.lord}',
            trailingWidget: PlanetChip(
              planetName: panchang.nakshatra.lord,
              isCompact: true,
            ),
          ),
          const Divider(height: 18, color: AppColors.lightBorder),

          // 4. YOGA
          _buildLimbTile(
            limbNumber: '4',
            limbTitle: 'NITYA YOGA (Soli-Lunar Angle)',
            mainValue: panchang.yoga.name,
            subValue: 'Yoga #${panchang.yoga.index} of 27 • ${(panchang.yoga.completionPercentage).toStringAsFixed(1)}% complete',
          ),
          const Divider(height: 18, color: AppColors.lightBorder),

          // 5. KARANA
          _buildLimbTile(
            limbNumber: '5',
            limbTitle: 'KARANA (Half-Tithi)',
            mainValue: panchang.karana.name,
            subValue: 'Karana #${panchang.karana.index} of 60 • ${panchang.karana.type} division',
            badgeText: panchang.karana.type,
            badgeColor: panchang.karana.type == 'FIXED' ? Colors.orange : AppColors.secondary,
          ),
        ],
      ),
    );
  }

  Widget _buildLimbTile({
    required String limbNumber,
    required String limbTitle,
    required String mainValue,
    required String subValue,
    String? badgeText,
    Color? badgeColor,
    Widget? trailingWidget,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 28,
          height: 28,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            limbNumber,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      limbTitle,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppColors.lightTextMuted,
                        letterSpacing: 0.3,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (badgeText != null) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: (badgeColor ?? AppColors.secondary).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        badgeText,
                        style: TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.bold,
                          color: badgeColor ?? AppColors.secondary,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 3),
              Text(
                mainValue,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subValue,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ),
        if (trailingWidget != null) ...[
          const SizedBox(width: 8),
          trailingWidget,
        ],
      ],
    );
  }

  Widget _buildSunAndRahuCard(PanchangModel panchang) {
    return AstrologySectionCard(
      title: 'Solar & Inauspicious Timings',
      subtitle: 'Exact Sunrise, Sunset, and Rahu Kala',
      icon: Icons.wb_sunny_rounded,
      child: Column(
        children: [
          if (panchang.sunriseSunset != null) ...[
            Row(
              children: [
                Expanded(
                  child: _buildTimeMetric(
                    title: 'SUNRISE',
                    time: panchang.sunriseSunset!.formattedSunrise,
                    icon: Icons.wb_sunny_outlined,
                    color: Colors.amber.shade700,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildTimeMetric(
                    title: 'SUNSET',
                    time: panchang.sunriseSunset!.formattedSunset,
                    icon: Icons.nights_stay_outlined,
                    color: Colors.deepPurple.shade400,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.lightBackground,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.lightBorder),
              ),
              child: Row(
                children: [
                  const Icon(Icons.timer_outlined, size: 16, color: AppColors.primary),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text('Daylight Duration', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                  ),
                  Text(
                    panchang.sunriseSunset!.formattedDayLength,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                ],
              ),
            ),
          ],
          if (panchang.rahuKala != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.error.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.warning_amber_rounded, color: AppColors.error, size: 18),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'RAHU KALA (राहुकाल)',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.error,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          panchang.rahuKala!.formattedWindow,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(height: 1),
                        const Text(
                          'Inauspicious 1/8th daytime window; avoid initiating ventures.',
                          style: TextStyle(fontSize: 11, color: AppColors.lightTextMuted),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTimeMetric({
    required String title,
    required String time,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.bold,
                    color: color,
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  time,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHinduCalendarCard(HinduCalendarModel calendar) {
    return AstrologySectionCard(
      title: 'Hindu Calendar (मास व संक्रान्ति)',
      subtitle: 'Traditional Vedic lunar months and solar transit',
      icon: Icons.calendar_month_rounded,
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _buildCalendarTile(
                  label: 'AMANTA MASA',
                  value: calendar.amantaMasa,
                  subtitle: 'South / West Tradition',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildCalendarTile(
                  label: 'PURNIMANTA MASA',
                  value: calendar.purnimantaMasa,
                  subtitle: 'North Tradition',
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _buildCalendarTile(
                  label: 'SOLAR RASHI',
                  value: '${calendar.solarRashi} (${calendar.solarRashiIndex}/12)',
                  subtitle: 'Sun Tropical/Sidereal Sign',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildCalendarTile(
                  label: 'LUNAR MONTH STATUS',
                  value: calendar.isAdhika ? 'Adhika (Intercalary)' : 'Nija (Regular)',
                  subtitle: calendar.isAdhika ? 'Extra leap month' : 'Standard month',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCalendarTile({
    required String label,
    required String value,
    required String subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.lightBackground,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.lightBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: AppColors.lightTextMuted,
              letterSpacing: 0.3,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
            ),
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 1),
          Text(
            subtitle,
            style: const TextStyle(
              fontSize: 10.5,
              color: AppColors.lightTextMuted,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildTransitionsCard(List<PanchangTransitionModel> transitions) {
    return ExpandableAstrologyCard(
      title: 'Panchanga Transitions (${transitions.length})',
      subtitle: 'Chronological changes throughout the day',
      icon: Icons.timeline_rounded,
      initiallyExpanded: false,
      expandedChild: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: transitions.length,
        separatorBuilder: (_, __) => const Divider(height: 12, color: AppColors.lightBorder),
        itemBuilder: (ctx, i) {
          final t = transitions[i];
          return Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  t.formattedTime,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      t.name,
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                      ),
                    ),
                    if (t.fromName != null && t.toName != null)
                      Text(
                        '${t.fromName} → ${t.toName}',
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.lightTextMuted,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
