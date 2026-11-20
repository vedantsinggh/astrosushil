import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/localization/locale_provider.dart';
import '../../features/astrology/providers/astrology_provider.dart';
import '../../shared/assets/app_assets.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/astro_controls.dart';
import '../../shared/widgets/astro_lists.dart';
import '../../shared/widgets/astro_surfaces.dart';
import '../models/home_models.dart';

/// Main highlight card on the home screen: today's horoscope (Rashi Bhavishya)
/// for the active profile's Moon sign.
///
/// Shows only backend data from [preview]; loading, error, "not ready" and
/// "no birth profile" states are explicit. No placeholder horoscope text.
class HomeHoroscopeCard extends StatelessWidget {
  final AsyncValue<RashiBhavishyaPreview?> preview;
  final bool hasProfile;
  final VoidCallback onReadTap;
  final VoidCallback onCreateProfileTap;
  final VoidCallback onRetryTap;

  const HomeHoroscopeCard({
    super.key,
    required this.preview,
    required this.hasProfile,
    required this.onReadTap,
    required this.onCreateProfileTap,
    required this.onRetryTap,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    if (!hasProfile) {
      return _HighlightShell(
        onTap: onCreateProfileTap,
        child: _HighlightBody(
          leading: const _LeadingIcon(icon: Icons.person_add_alt_1_rounded),
          title: l10n.homeAddDetailsTitle,
          subtitle: l10n.homeAddDetailsSubtitle,
          actionLabel: l10n.createProfileButton,
          onAction: onCreateProfileTap,
        ),
      );
    }

    return preview.when(
      loading: () => _HighlightShell(
        child: _HighlightBody(
          eyebrow: l10n.homeTodayHoroscope,
          leading: const _LeadingIcon(icon: Icons.wb_sunny_outlined),
          title: l10n.homeLoading,
        ),
      ),
      error: (_, __) => _HighlightShell(
        onTap: onRetryTap,
        child: _HighlightBody(
          eyebrow: l10n.homeTodayHoroscope,
          leading: const _LeadingIcon(icon: Icons.error_outline_rounded),
          title: l10n.homeHoroscopeError,
          actionLabel: l10n.retry,
          onAction: onRetryTap,
        ),
      ),
      data: (value) {
        if (value == null) {
          return _HighlightShell(
            onTap: onReadTap,
            child: _HighlightBody(
              eyebrow: l10n.homeTodayHoroscope,
              leading: const _LeadingIcon(icon: Icons.wb_sunny_outlined),
              title: l10n.homeHoroscopeNotReady,
              actionLabel: l10n.homeRead,
              onAction: onReadTap,
            ),
          );
        }
        final rashiTitle = value.rashiName.contains('(')
            ? value.rashiName.split('(').last.replaceAll(')', '').trim()
            : value.rashiName;
        final asset = AppAssets.getRashiAsset(value.rashiName);
        return _HighlightShell(
          onTap: onReadTap,
          child: _HighlightBody(
            eyebrow: l10n.homeTodayHoroscope,
            leading: asset != null
                ? ClipOval(
                    child: Container(
                      width: 56,
                      height: 56,
                      color: Colors.white,
                      child: Image.asset(
                        asset,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const _LeadingIcon(icon: Icons.nightlight_round),
                      ),
                    ),
                  )
                : const _LeadingIcon(icon: Icons.nightlight_round),
            title: rashiTitle,
            subtitle: '${l10n.moonSign} · ${value.date}',
            body: value.predictionPreview ?? l10n.homeHoroscopeNotReady,
            actionLabel: l10n.homeRead,
            onAction: onReadTap,
          ),
        );
      },
    );
  }
}

class _HighlightShell extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;

  const _HighlightShell({required this.child, this.onTap});

  @override
  Widget build(BuildContext context) {
    return AstroGradientCard(
      onTap: onTap,
      padding: EdgeInsets.zero,
      child: Stack(
        children: [
          // Faint gold zodiac wheel bleeding off the right edge: texture only.
          Positioned(
            right: -70,
            top: -40,
            width: 210,
            height: 210,
            child: ExcludeSemantics(
              child: IgnorePointer(
                child: Opacity(
                  opacity: 0.22,
                  child: ShaderMask(
                    blendMode: BlendMode.dstIn,
                    shaderCallback: (rect) => const RadialGradient(
                      colors: [Colors.white, Colors.transparent],
                      stops: [0.55, 1.0],
                    ).createShader(rect),
                    child: Image.asset(
                      AppAssets.homeHero,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                    ),
                  ),
                ),
              ),
            ),
          ),
          Padding(padding: const EdgeInsets.fromLTRB(20, 20, 20, 20), child: child),
        ],
      ),
    );
  }
}

class _LeadingIcon extends StatelessWidget {
  final IconData icon;

  const _LeadingIcon({required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: AppColors.gold.withValues(alpha: 0.14),
        border: Border.all(color: AppColors.gold.withValues(alpha: 0.5)),
      ),
      child: Icon(icon, size: 28, color: AppColors.gold),
    );
  }
}

class _HighlightBody extends StatelessWidget {
  final String? eyebrow;
  final Widget leading;
  final String title;
  final String? subtitle;
  final String? body;
  final String? actionLabel;
  final VoidCallback? onAction;

  const _HighlightBody({
    this.eyebrow,
    required this.leading,
    required this.title,
    this.subtitle,
    this.body,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (eyebrow != null) ...[
          Row(
            children: [
              const Icon(Icons.auto_awesome_rounded, size: 16, color: AppColors.gold),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  eyebrow!,
                  style: AppTypography.titleMedium.copyWith(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.2,
                    color: AppColors.gold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
        ],
        Row(
          children: [
            leading,
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTypography.headlineLarge.copyWith(
                      fontSize: 24,
                      color: Colors.white,
                      height: 1.2,
                      letterSpacing: -0.3,
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      subtitle!,
                      style: AppTypography.bodyLarge.copyWith(
                        fontSize: 15,
                        color: AppColors.textInverseSecondary,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
        if (body != null) ...[
          const SizedBox(height: 16),
          Text(
            body!,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: AppTypography.bodyLarge.copyWith(
              fontSize: 16,
              height: 1.45,
              color: Colors.white.withValues(alpha: 0.92),
            ),
          ),
        ],
        if (actionLabel != null && onAction != null) ...[
          const SizedBox(height: 18),
          AstroPrimaryButton(
            label: actionLabel!,
            icon: Icons.arrow_forward_rounded,
            onPressed: onAction,
            expand: false,
          ),
        ],
      ],
    );
  }
}

/// Slim "Today's Panchang" card: tithi, nakshatra and Rahu Kaal from the
/// backend Panchang for the active profile. Tapping opens the full Panchang.
class HomePanchangCard extends ConsumerWidget {
  final VoidCallback onTap;

  const HomePanchangCard({super.key, required this.onTap});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final panchangAsync = ref.watch(activeProfilePanchangProvider);
    final data = panchangAsync.valueOrNull;

    final Widget details;
    if (data != null) {
      final tithiName = '${data.tithi.isShukla ? "Shukla" : "Krishna"} ${data.tithi.name}';
      details = Wrap(
        spacing: 28,
        runSpacing: 12,
        children: [
          _PanchangFact(label: l10n.tithi, value: tithiName),
          _PanchangFact(label: l10n.nakshatra, value: data.nakshatra.name),
          if (data.rahuKala != null) _PanchangFact(label: l10n.rahuKaal, value: data.rahuKala!.formattedWindow),
        ],
      );
    } else {
      details = Text(
        panchangAsync.isLoading ? l10n.homeLoading : l10n.emptyStateMessage,
        style: AppTypography.bodyLarge.copyWith(fontSize: 16, color: AppColors.textSecondary),
      );
    }

    return Semantics(
      button: true,
      child: AstroSurfaceCard(
        onTap: onTap,
        padding: const EdgeInsets.fromLTRB(16, 14, 10, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const AstroIconSquare(icon: Icons.calendar_month_rounded, tint: AstroTint.amber),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    l10n.quickPanchang,
                    style: AppTypography.headlineMedium.copyWith(fontSize: 19, color: AppColors.primary),
                  ),
                ),
                const Icon(Icons.chevron_right_rounded, size: 24, color: AppColors.textMuted),
              ],
            ),
            const SizedBox(height: 14),
            Padding(
              padding: const EdgeInsets.only(right: 6),
              child: details,
            ),
          ],
        ),
      ),
    );
  }
}

class _PanchangFact extends StatelessWidget {
  final String label;
  final String value;

  const _PanchangFact({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: AppTypography.bodyLarge.copyWith(fontSize: 14, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: AppTypography.titleMedium.copyWith(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: AppColors.primary,
          ),
        ),
      ],
    );
  }
}
