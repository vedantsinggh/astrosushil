import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/assets/app_assets.dart';
import '../../../shared/theme/app_colors.dart';
import '../models/explanation_context.dart';
import 'sushil_explainer_sheet.dart';

/// Reusable entry-point button for the universal "Let Sushil Sir explain" contextual AI explainer.
class SushilExplainerButton extends ConsumerWidget {
  final ExplanationContext? contextData;
  final ExplanationContext Function()? contextBuilder;
  final String label;
  final bool isCompact;
  final VoidCallback? onBeforeOpen;
  final String? poseAsset;

  const SushilExplainerButton({
    super.key,
    this.contextData,
    this.contextBuilder,
    this.label = 'Let Sushil Sir explain',
    this.isCompact = false,
    this.onBeforeOpen,
    this.poseAsset,
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
    final locale = ref.watch(localeProvider);
    final isHindi = locale.languageCode == 'hi';
    final effectiveLabel = label == 'Let Sushil Sir explain' && isHindi ? 'सुशील सर से समझें' : label;

    if (isCompact) {
      return InkWell(
        onTap: () => _handleTap(context, ref),
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                AppColors.tertiary.withValues(alpha: 0.95),
                AppColors.primary.withValues(alpha: 0.95),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: AppColors.premiumAccent.withValues(alpha: 0.6),
              width: 1.2,
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.premiumAccent.withValues(alpha: 0.15),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.asset(
                  AppAssets.sushilAvatar,
                  width: 22,
                  height: 22,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const CircleAvatar(
                    radius: 11,
                    backgroundColor: AppColors.secondary,
                    child: Icon(Icons.person, size: 14, color: Colors.white),
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Text(
                effectiveLabel,
                style: const TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.2,
                ),
              ),
              const SizedBox(width: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                decoration: BoxDecoration(
                  color: AppColors.premiumAccent,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  'AI',
                  style: TextStyle(
                    color: AppColors.primary,
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return InkWell(
      onTap: () => _handleTap(context, ref),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              AppColors.surfaceElevated.withValues(alpha: 0.85),
              AppColors.tertiary.withValues(alpha: 0.95),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppColors.premiumAccent.withValues(alpha: 0.7),
            width: 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: AppColors.premiumAccent.withValues(alpha: 0.12),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Sushil Avatar Badge
            Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.premiumAccent,
                  width: 1.5,
                ),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.asset(
                  AppAssets.sushilAvatar,
                  width: 28,
                  height: 28,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const CircleAvatar(
                    radius: 14,
                    backgroundColor: AppColors.secondary,
                    child: Icon(Icons.person, size: 18, color: Colors.white),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
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
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.1,
                          ),
                          overflow: TextOverflow.ellipsis,
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
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 1),
                  Text(
                    isHindi
                        ? 'सरल भाषा में विश्लेषण के लिए टैप करें'
                        : 'Tap for a simple plain-language breakdown',
                    style: TextStyle(
                      color: AppColors.textSecondary.withValues(alpha: 0.9),
                      fontSize: 11,
                      fontWeight: FontWeight.w400,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Icon(
              Icons.auto_awesome,
              size: 16,
              color: AppColors.premiumAccent.withValues(alpha: 0.9),
            ),
          ],
        ),
      ),
    );
  }
}
