import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/assets/app_assets.dart';
import '../../../shared/theme/app_colors.dart';
import '../models/explanation_context.dart';
import '../models/sushil_explanation_model.dart';
import '../providers/sushil_explainer_provider.dart';

/// Modal contextual bottom sheet presenting AI Sushil Sir's plain-language interpretation.
class SushilExplainerSheet extends ConsumerStatefulWidget {
  final ExplanationContext explanationContext;
  final String? initialPoseAsset;

  const SushilExplainerSheet({
    super.key,
    required this.explanationContext,
    this.initialPoseAsset,
  });

  static Future<void> show(
    BuildContext context, {
    required ExplanationContext explanationContext,
    String? initialPoseAsset,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => SushilExplainerSheet(
        explanationContext: explanationContext,
        initialPoseAsset: initialPoseAsset,
      ),
    );
  }

  @override
  ConsumerState<SushilExplainerSheet> createState() => _SushilExplainerSheetState();
}

class _SushilExplainerSheetState extends ConsumerState<SushilExplainerSheet>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  SushilExplanationModel? _explanation;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    Future.microtask(() {
      if (mounted) {
        _loadExplanation();
      }
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _loadExplanation({bool forceRefresh = false}) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    if (!_pulseController.isAnimating) {
      _pulseController.repeat(reverse: true);
    }

    try {
      final result = await ref
          .read(sushilExplainerProvider.notifier)
          .fetchExplanation(widget.explanationContext, forceRefresh: forceRefresh);

      if (mounted) {
        _pulseController.stop();
        setState(() {
          _explanation = result;
          _isLoading = false;
          if (result.isError) {
            _errorMessage = result.message;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        _pulseController.stop();
        setState(() {
          _isLoading = false;
          _errorMessage = "Sushil Sir couldn't explain this right now. Please try again.";
        });
      }
    }
  }

  String _resolveAvatarAsset() {
    if (_isLoading) {
      return AppAssets.sushilThinking;
    }
    if (_errorMessage != null) {
      return AppAssets.sushilAvatarNeutral;
    }
    if (widget.explanationContext.feature == 'birth_chart' ||
        widget.explanationContext.feature == 'divisional_charts') {
      return AppAssets.sushilExplainingChart;
    }
    return AppAssets.sushilExplaining;
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final maxHeight = mediaQuery.size.height * 0.85;

    return Container(
      constraints: BoxConstraints(maxHeight: maxHeight),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border.all(
          color: AppColors.surfaceElevated.withOpacity(0.8),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.5),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 1. Drag handle & Header
          _buildHeader(context),

          const Divider(height: 1, color: AppColors.border),

          // 2. Scrollable Body Content
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: _isLoading
                  ? _buildLoadingState()
                  : _errorMessage != null
                      ? _buildErrorState()
                      : _buildLoadedState(_explanation!),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 12, 12),
      child: Column(
        children: [
          // Center subtle pill
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.textMuted.withOpacity(0.4),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              // Avatar Image
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: AppColors.premiumAccent,
                    width: 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.premiumAccent.withOpacity(0.2),
                      blurRadius: 8,
                    ),
                  ],
                ),
                child: ClipOval(
                  child: Image.asset(
                    _resolveAvatarAsset(),
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const CircleAvatar(
                      backgroundColor: AppColors.secondary,
                      child: Icon(Icons.person, color: Colors.white, size: 22),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Title & AI Badge
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Text(
                          'AI Sushil Sir',
                          style: TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.2,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.premiumAccent,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'AI MENTOR',
                            style: TextStyle(
                              color: AppColors.primary,
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Explaining ${widget.explanationContext.screenTitle}',
                      style: TextStyle(
                        color: AppColors.textSecondary.withOpacity(0.9),
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              // Close Button
              IconButton(
                icon: const Icon(Icons.close, color: AppColors.textSecondary, size: 20),
                onPressed: () => Navigator.of(context).pop(),
                splashRadius: 20,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingState() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(height: 20),
        ScaleTransition(
          scale: _pulseAnimation,
          child: Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: AppColors.premiumAccent.withOpacity(0.5),
                width: 2,
              ),
              boxShadow: [
                BoxShadow(
                  color: AppColors.premiumAccent.withOpacity(0.2),
                  blurRadius: 20,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: ClipOval(
              child: Image.asset(
                AppAssets.sushilThinking,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const CircleAvatar(
                  backgroundColor: AppColors.surfaceElevated,
                  child: Icon(Icons.psychology, size: 40, color: AppColors.premiumAccent),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 24),
        const Text(
          'Sushil Sir is studying this chart...',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Translating complex Vedic astrological metrics into clear, practical insights.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: AppColors.textSecondary.withOpacity(0.9),
            fontSize: 13,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 24),
        // Linear Progress bar
        SizedBox(
          width: 160,
          child: LinearProgressIndicator(
            backgroundColor: AppColors.surfaceElevated,
            valueColor: AlwaysStoppedAnimation<Color>(AppColors.premiumAccent),
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildErrorState() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(height: 16),
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.error.withOpacity(0.5), width: 1.5),
          ),
          child: ClipOval(
            child: Image.asset(
              AppAssets.sushilAvatarNeutral,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => const CircleAvatar(
                backgroundColor: AppColors.surfaceElevated,
                child: Icon(Icons.error_outline, size: 36, color: AppColors.error),
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'Explanation Unavailable',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          _errorMessage ?? "Sushil Sir couldn't explain this section right now. Please try again.",
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: AppColors.textSecondary,
            fontSize: 13,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 24),
        ElevatedButton.icon(
          onPressed: () => _loadExplanation(forceRefresh: true),
          icon: const Icon(Icons.refresh, size: 18),
          label: const Text('Try Again'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.premiumAccent,
            foregroundColor: AppColors.primary,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            textStyle: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildLoadedState(SushilExplanationModel explanation) {
    if (explanation.isEmptyData) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 16),
          const Icon(Icons.info_outline, size: 48, color: AppColors.premiumAccent),
          const SizedBox(height: 16),
          Text(
            explanation.headline,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            explanation.message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 13,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.surfaceElevated,
              foregroundColor: AppColors.textPrimary,
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Close'),
          ),
          const SizedBox(height: 16),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Headline Card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                AppColors.surfaceElevated.withOpacity(0.9),
                AppColors.tertiary.withOpacity(0.95),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: AppColors.premiumAccent.withOpacity(0.4),
              width: 1,
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.lightbulb_outline,
                color: AppColors.premiumAccent,
                size: 22,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  explanation.headline,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    height: 1.3,
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Core Explanation Message
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.surface.withOpacity(0.6),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: AppColors.border.withOpacity(0.5),
              width: 1,
            ),
          ),
          child: Text(
            explanation.message,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 14,
              height: 1.55,
              letterSpacing: 0.1,
            ),
          ),
        ),

        const SizedBox(height: 18),

        // Key Takeaways Section
        if (explanation.keyPoints.isNotEmpty) ...[
          Row(
            children: [
              const Icon(
                Icons.stars_rounded,
                color: AppColors.premiumAccent,
                size: 18,
              ),
              const SizedBox(width: 6),
              Text(
                'KEY TAKEAWAYS',
                style: TextStyle(
                  color: AppColors.premiumAccent.withOpacity(0.95),
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.8,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ...explanation.keyPoints.map(
            (point) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors.surfaceElevated.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: AppColors.border.withOpacity(0.4),
                    width: 1,
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      margin: const EdgeInsets.only(top: 4),
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(
                        color: AppColors.premiumAccent,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        point,
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 13,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],

        const SizedBox(height: 12),

        // Disclaimer
        Center(
          child: Text(
            explanation.disclaimer,
            style: TextStyle(
              color: AppColors.textMuted.withOpacity(0.7),
              fontSize: 11,
              fontStyle: FontStyle.italic,
            ),
          ),
        ),

        const SizedBox(height: 18),

        // "Got It" Confirmation Button
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () => Navigator.of(context).pop(),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.premiumAccent,
              foregroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              elevation: 0,
            ),
            child: const Text(
              'Got It',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.3,
              ),
            ),
          ),
        ),

        const SizedBox(height: 12),
      ],
    );
  }
}
