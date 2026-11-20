import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/assets/app_assets.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_theme_tokens.dart';
import '../models/explanation_context.dart';
import 'sushil_explainer_sheet.dart';

/// Look of [SushilExplainerButton].
enum SushilExplainerVariant {
  /// Navy block with white text (the default).
  dark,

  /// White card with a gold hairline and navy text. Use next to a dark /
  /// gradient hero card so the screen doesn't get two dark blocks in a row.
  light,
}

/// Reusable entry-point button for the universal "Let Sushil Sir explain" contextual AI explainer.
class SushilExplainerButton extends ConsumerWidget {
  final ExplanationContext? contextData;
  final ExplanationContext Function()? contextBuilder;
  final String label;
  final bool isCompact;
  final VoidCallback? onBeforeOpen;
  final String? poseAsset;

  /// Dark (default) or light / tinted look.
  final SushilExplainerVariant variant;

  /// Space after the button. Defaults to none (most screens add their own
  /// gap); pass e.g. `const EdgeInsets.only(bottom: 16)` when it is the
  /// last item in a section.
  final EdgeInsetsGeometry margin;

  const SushilExplainerButton({
    super.key,
    this.contextData,
    this.contextBuilder,
    this.label = 'Let Sushil Sir explain',
    this.isCompact = false,
    this.onBeforeOpen,
    this.poseAsset,
    this.variant = SushilExplainerVariant.dark,
    this.margin = EdgeInsets.zero,
  }) : assert(contextData != null || contextBuilder != null, 'Either contextData or contextBuilder must be provided');

  void _handleTap(BuildContext context, WidgetRef ref) {
    onBeforeOpen?.call();
    final baseCtx = contextData ?? contextBuilder!();
    final locale = ref.read(localeProvider);
    final ctx = baseCtx.copyWith(
      language: baseCtx.language == 'en' && locale.languageCode == 'hi' ? 'hi' : baseCtx.language,
    );
    SushilExplainerSheet.show(
      context,
      explanationContext: ctx,
      initialPoseAsset: poseAsset,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final button = _buildButton(context, ref);
    if (margin == EdgeInsets.zero) return button;
    return Padding(padding: margin, child: button);
  }

  Widget _buildButton(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final isHindi = locale.languageCode == 'hi';
    final effectiveLabel = label == 'Let Sushil Sir explain' && isHindi ? 'सुशील सर से समझें' : label;
    final light = variant == SushilExplainerVariant.light;
    final titleColor = light ? AppColors.textPrimary : AppColors.textInversePrimary;
    final subtitleColor = light ? AppColors.textSecondary : AppColors.textInverseSecondary;

    if (isCompact) {
      return InkWell(
        onTap: () => _handleTap(context, ref),
        borderRadius: BorderRadius.circular(20),
        child: Container(
          constraints: const BoxConstraints(minHeight: 48),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            gradient: light ? null : AppGradients.heroNavy,
            color: light ? AppColors.cardSurface : null,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: AppColors.premiumAccent.withValues(alpha: 0.6),
              width: 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _ExplainerAvatar(size: 22, ring: light),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  effectiveLabel,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: titleColor,
                    fontSize: 15,
                    height: 1.25,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: AppColors.premiumAccent,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  'AI',
                  style: TextStyle(
                    color: AppColors.primary,
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Semantics(
      button: true,
      child: Material(
        color: light ? AppColors.cardSurface : AppColors.tertiary,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(
            color: AppColors.premiumAccent.withValues(alpha: 0.55),
            width: 1,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => _handleTap(context, ref),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 56),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Sushil Avatar (fixed slot; placeholder until decoded)
                  _ExplainerAvatar(size: 40, ring: light),
                  const SizedBox(width: 12),
                  // Text Label & Subtitle
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Flexible(
                              child: Text(
                                effectiveLabel,
                                style: TextStyle(
                                  color: titleColor,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: AppColors.premiumAccent,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                'AI',
                                style: TextStyle(
                                  color: AppColors.primary,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          isHindi
                              ? 'सरल भाषा में विश्लेषण के लिए टैप करें'
                              : 'Tap for a simple plain-language breakdown',
                          style: TextStyle(
                            color: subtitleColor,
                            fontSize: 14,
                            height: 1.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    Icons.chevron_right_rounded,
                    size: 26,
                    color: light ? AppColors.goldDark : AppColors.premiumAccent,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Sushil Sir's avatar in a fixed circular slot. Shows a
/// monogram placeholder until the image has decoded (and if it fails), so
/// the slot is never blank.
class _ExplainerAvatar extends StatelessWidget {
  final double size;

  /// Gold ring (light variant, so the avatar reads on white).
  final bool ring;
  const _ExplainerAvatar({required this.size, this.ring = false});

  @override
  Widget build(BuildContext context) {
    final placeholder = DecoratedBox(
      decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.secondary),
      child: Center(
        child: Icon(Icons.person_rounded, size: size * 0.6, color: Colors.white),
      ),
    );
    return Container(
      width: size,
      height: size,
      decoration: ring
          ? BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.premiumAccent, width: size >= 32 ? 1.5 : 1),
            )
          : null,
      child: ClipOval(
        child: Image.asset(
          AppAssets.sushilAvatar,
          width: size,
          height: size,
          fit: BoxFit.cover,
          excludeFromSemantics: true,
          frameBuilder: (context, child, frame, wasSynchronouslyLoaded) {
            if (wasSynchronouslyLoaded || frame != null) return child;
            return placeholder;
          },
          errorBuilder: (_, __, ___) => placeholder,
        ),
      ),
    );
  }
}
