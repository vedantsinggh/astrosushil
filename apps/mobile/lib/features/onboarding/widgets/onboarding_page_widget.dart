import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/theme/app_typography.dart';
import '../../../shared/widgets/astro_image.dart';
import '../models/onboarding_page_model.dart';

/// Single onboarding page: one illustration, one large headline, one short sentence.
///
/// Kept deliberately minimal with large, high-contrast text so it is easy to
/// read for all ages. The text area scrolls if the user has a large system
/// font size, so nothing is ever cut off.
class OnboardingPageWidget extends StatelessWidget {
  final OnboardingPageModel page;

  const OnboardingPageWidget({
    super.key,
    required this.page,
  });

  static const double _hPad = 24.0;
  static const double _titleGap = 14.0;
  static const double _imageGap = 24.0;
  static const double _minImageHeight = 110.0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final goldColor = theme.colorScheme.premiumAccent;
    final textScaler = MediaQuery.textScalerOf(context);

    final titleStyle = theme.textTheme.headlineMedium?.copyWith(
      fontFamily: AppTypography.headingFamily,
      fontFamilyFallback: AppTypography.headingFontFamilies,
      fontSize: 30,
      fontWeight: FontWeight.bold,
      letterSpacing: -0.4,
      height: 1.2,
      color: Colors.white,
    );
    final descStyle = theme.textTheme.bodyLarge?.copyWith(
      fontSize: 17,
      height: 1.5,
      color: AppColors.textInversePrimary,
    );
    final titleSpan = TextSpan(
      style: titleStyle,
      children: [
        TextSpan(text: '${page.titlePrefix} '),
        TextSpan(text: page.titleHighlight, style: TextStyle(color: goldColor)),
      ],
    );

    // The text always gets the space it needs; the illustration takes whatever
    // is left and is hidden when that is too small (tiny screens or very large
    // system font sizes). If the text alone is taller than the screen, it
    // scrolls instead of being cut off.
    return LayoutBuilder(
      builder: (context, constraints) {
        final textWidth = constraints.maxWidth - _hPad * 2;
        final textHeight = _measure(titleSpan, textWidth, textScaler) +
            _titleGap +
            _measure(TextSpan(text: page.description, style: descStyle), textWidth, textScaler);
        final imageHeight = constraints.maxHeight - textHeight - _imageGap - 16;
        final showImage = imageHeight >= _minImageHeight;

        return SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(_hPad, 8, _hPad, 8),
          child: Column(
            children: [
              if (showImage) ...[
                SizedBox(height: imageHeight, child: _buildIllustration()),
                const SizedBox(height: _imageGap),
              ],
              RichText(
                textAlign: TextAlign.center,
                textScaler: textScaler,
                text: titleSpan,
              ),
              const SizedBox(height: _titleGap),
              Text(
                page.description,
                textAlign: TextAlign.center,
                style: descStyle,
              ),
            ],
          ),
        );
      },
    );
  }

  static double _measure(TextSpan span, double maxWidth, TextScaler scaler) {
    final painter = TextPainter(
      text: span,
      textAlign: TextAlign.center,
      textDirection: TextDirection.ltr,
      textScaler: scaler,
    )..layout(maxWidth: maxWidth);
    final height = painter.height;
    painter.dispose();
    return height;
  }

  Widget _buildIllustration() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.tertiary,
        borderRadius: BorderRadius.circular(24.0),
        border: Border.all(color: AppColors.gold.withValues(alpha: 0.35), width: 1),
        boxShadow: const [
          BoxShadow(color: Color(0x66000000), blurRadius: 24, offset: Offset(0, 10)),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24.0),
        child: AstroImage(
          assetPath: page.imagePath,
          width: double.infinity,
          height: double.infinity,
          fit: BoxFit.cover,
          fallback: AstroImageFallback.celestial,
          semanticLabel: '${page.titlePrefix} ${page.titleHighlight}',
        ),
      ),
    );
  }
}
