import 'package:flutter/material.dart';
import '../../core/localization/locale_provider.dart';
import '../../features/astrology/models/astro_chart_model.dart';
import '../../features/birth_profile/models/birth_profile_model.dart';
import '../../shared/assets/app_assets.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_theme_tokens.dart';
import '../../shared/theme/app_typography.dart';

/// Personalized Astrology Hero Card for Home Screen inspired by the reference mockup.
/// Features a warm cosmic sunrise/Vedic atmosphere, personalized greeting,
/// floating active birth profile selector with "View Chart" CTA, and verified real highlights
/// (Ascendant, Moon sign, running Mahadasha).
class HeroAstrologyCard extends StatelessWidget {
  final VoidCallback onViewChartTap;
  final bool hasBirthProfile;
  final BirthProfileModel? activeProfile;
  final VoidCallback? onChangeProfileTap;
  final AstroChartModel? chart;
  final String? activeMahadasha;
  final bool isLoadingData;
  final String? userName;

  const HeroAstrologyCard({
    super.key,
    required this.onViewChartTap,
    this.hasBirthProfile = true,
    this.activeProfile,
    this.onChangeProfileTap,
    this.chart,
    this.activeMahadasha,
    this.isLoadingData = false,
    this.userName,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;

    final displayName = userName != null && userName!.isNotEmpty
        ? (userName!.contains('@') ? userName!.split('@').first : userName!)
        : (activeProfile?.name ?? '');

    final greetingText = displayName.isNotEmpty
        ? '${l10n.welcomeGuest}, $displayName 🙏'
        : '${l10n.welcomeGuest} 🙏';

    // Extract real chart highlights if available
    final ascendantSign = chart?.ascendant?.rashiName;
    final moonPlanet = chart?.planets.firstWhere(
      (p) => p.displayName == 'Moon',
      orElse: () => const PlanetModel(
        planet: '',
        longitude: 0,
        latitude: 0,
        speedLongitude: 0,
        isRetrograde: false,
        rashiIndex: 0,
        rashiName: '',
        degreeInRashi: 0,
        nakshatraIndex: 0,
        nakshatraName: '',
        pada: 0,
        nakshatraLord: '',
      ),
    );
    final moonSign = (moonPlanet != null && moonPlanet.rashiName.isNotEmpty)
        ? moonPlanet.rashiName
        : null;

    final profileDisplayName = activeProfile?.name ??
        (hasBirthProfile ? (displayName.isNotEmpty ? displayName : 'My Birth Profile') : null);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: AppGradients.heroCosmic,
        border: Border.all(
          color: AppColors.gold.withValues(alpha: 0.35),
          width: 1.2,
        ),
        boxShadow: AppShadows.heroGlow,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          children: [
            // 1. Subtle warm cosmic sunset / celestial background graphic
            Positioned(
              right: -30,
              top: -30,
              width: 220,
              height: 220,
              child: Opacity(
                opacity: 0.10,
                child: Image.asset(
                  AppAssets.kundliDecorativeOrbit,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
              ),
            ),

            // 2. Custom Painted Vedic Kundli Geometric Accents on the right
            Positioned(
              right: 0,
              top: 0,
              bottom: 0,
              width: 140,
              child: CustomPaint(
                painter: _HeroVedicWatermarkPainter(),
              ),
            ),

            // 3. Main Hero Content
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 18.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Greeting & Sushil Sir AI Mentor Badge
                  Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.gold.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: AppColors.gold.withValues(alpha: 0.45),
                            width: 0.8,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.auto_awesome,
                              size: 12,
                              color: AppColors.gold,
                            ),
                            const SizedBox(width: 5),
                            Text(
                              hasBirthProfile ? l10n.toolBirthChart : l10n.createProfileButton,
                              style: AppTypography.labelSmall.copyWith(
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.6,
                                color: AppColors.gold,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Sushil Sir AI Mentor avatar badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.20),
                            width: 0.8,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 18,
                              height: 18,
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                              ),
                              child: ClipOval(
                                child: Image.asset(
                                  AppAssets.sushilAvatar,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => const Icon(
                                    Icons.person,
                                    size: 14,
                                    color: AppColors.gold,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 5),
                            Text(
                              'AI Mentor',
                              style: AppTypography.caption.copyWith(
                                color: Colors.white.withValues(alpha: 0.9),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 12),

                  // Greeting Heading: "Namaste 🙏 How can we guide you today?"
                  Text(
                    greetingText,
                    style: AppTypography.titleLarge.copyWith(
                      color: AppColors.gold,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    l10n.howCanWeGuideYou,
                    style: AppTypography.headlineLarge.copyWith(
                      color: Colors.white,
                      fontSize: 21,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.3,
                      height: 1.2,
                    ),
                  ),

                  const SizedBox(height: 6),

                  Text(
                    hasBirthProfile
                        ? l10n.toolBirthChartDesc
                        : l10n.createProfilePrompt,
                    style: AppTypography.bodySmall.copyWith(
                      color: Colors.white.withValues(alpha: 0.85),
                      height: 1.35,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),

                  const SizedBox(height: 16),

                  // 4. FLOATING ACTIVE PROFILE SELECTOR CARD (Warm ivory, crisp border, 48dp target)
                  Material(
                    color: AppColors.cardSurfaceWarm,
                    borderRadius: BorderRadius.circular(16),
                    elevation: 3,
                    shadowColor: AppColors.primary.withValues(alpha: 0.15),
                    child: InkWell(
                      onTap: onChangeProfileTap ?? onViewChartTap,
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: AppColors.cardBorder,
                            width: 1.0,
                          ),
                        ),
                        child: Row(
                          children: [
                            // Circular Vedic icon badge
                            Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: AppColors.tintVioletBg,
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: AppColors.tintVioletBorder,
                                  width: 1,
                                ),
                              ),
                              child: const Icon(
                                Icons.auto_awesome_rounded,
                                color: AppColors.tintVioletText,
                                size: 15,
                              ),
                            ),
                            const SizedBox(width: 8),
                            // Profile name and switcher indicator
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    l10n.myBirthProfile.toUpperCase(),
                                    style: AppTypography.caption.copyWith(
                                      fontSize: 9.0,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 0.5,
                                      color: AppColors.secondary,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 1),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          hasBirthProfile && profileDisplayName != null
                                              ? profileDisplayName
                                              : l10n.noProfileSelected,
                                          style: AppTypography.titleSmall.copyWith(
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.primary,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      if (onChangeProfileTap != null) ...[
                                        const SizedBox(width: 2),
                                        const Icon(
                                          Icons.keyboard_arrow_down_rounded,
                                          size: 16,
                                          color: AppColors.primary,
                                        ),
                                      ],
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 6),
                            // View Chart or Create Profile CTA Button (>= 48dp touch bounds)
                            Flexible(
                              child: ConstrainedBox(
                                constraints: const BoxConstraints(minHeight: AppTouchTargets.minTouchTarget),
                                child: ElevatedButton(
                                  onPressed: onViewChartTap,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    foregroundColor: Colors.white,
                                    elevation: 0,
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                  ),
                                  child: FittedBox(
                                    fit: BoxFit.scaleDown,
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          hasBirthProfile ? l10n.toolBirthChart : l10n.createProfileButton,
                                          style: AppTypography.labelSmall.copyWith(
                                            fontWeight: FontWeight.bold,
                                            color: Colors.white,
                                          ),
                                          maxLines: 1,
                                        ),
                                        const SizedBox(width: 3),
                                        const Icon(
                                          Icons.arrow_forward_rounded,
                                          size: 12,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // 5. DETERMINISTIC REAL DATA HIGHLIGHTS STRIP
                  if (hasBirthProfile && (ascendantSign != null || moonSign != null || activeMahadasha != null)) ...[
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        if (ascendantSign != null)
                          _HighlightBadge(
                            label: l10n.lagnaAscendant,
                            value: ascendantSign,
                            icon: Icons.shield_outlined,
                          ),
                        if (moonSign != null)
                          _HighlightBadge(
                            label: l10n.moonSign,
                            value: moonSign,
                            icon: Icons.nightlight_round,
                          ),
                        if (activeMahadasha != null)
                          _HighlightBadge(
                            label: l10n.currentDasha,
                            value: activeMahadasha!,
                            icon: Icons.timeline_rounded,
                          ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HighlightBadge extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _HighlightBadge({
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.22),
          width: 0.8,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: AppColors.gold),
          const SizedBox(width: 5),
          Text(
            '$label: ',
            style: AppTypography.caption.copyWith(
              fontWeight: FontWeight.w500,
              color: Colors.white.withValues(alpha: 0.85),
            ),
          ),
          Text(
            value,
            style: AppTypography.caption.copyWith(
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroVedicWatermarkPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final borderPaint = Paint()
      ..color = AppColors.premiumAccent.withValues(alpha: 0.12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final rect = Rect.fromLTWH(size.width * 0.15, size.height * 0.1, size.width * 0.8, size.height * 0.8);
    canvas.drawRect(rect, borderPaint);

    // Diagonals
    canvas.drawLine(rect.topLeft, rect.bottomRight, borderPaint);
    canvas.drawLine(rect.topRight, rect.bottomLeft, borderPaint);

    // Diamond
    final path = Path()
      ..moveTo(rect.centerLeft.dx, rect.centerLeft.dy)
      ..lineTo(rect.topCenter.dx, rect.topCenter.dy)
      ..lineTo(rect.centerRight.dx, rect.centerRight.dy)
      ..lineTo(rect.bottomCenter.dx, rect.bottomCenter.dy)
      ..close();
    canvas.drawPath(path, borderPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
