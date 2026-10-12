import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/assets/app_assets.dart';
import '../../../shared/theme/app_colors.dart';
import '../../jyoti/screens/jyoti_chat_screen.dart';
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
  late String _currentMode;
  SushilExplanationModel? _explanation;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _currentMode = widget.explanationContext.mode;
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

  Future<void> _loadExplanation({String? mode, bool forceRefresh = false}) async {
    final effectiveMode = mode ?? _currentMode;
    setState(() {
      _currentMode = effectiveMode;
      _isLoading = true;
      _errorMessage = null;
    });
    if (!_pulseController.isAnimating) {
      _pulseController.repeat(reverse: true);
    }

    final isHindi = (widget.explanationContext.language == 'hi') ||
        (ref.read(localeProvider).languageCode == 'hi');

    try {
      final ctx = widget.explanationContext.copyWith(
        mode: effectiveMode,
        language: isHindi ? 'hi' : 'en',
      );
      final result = await ref
          .read(sushilExplainerProvider.notifier)
          .fetchExplanation(ctx, forceRefresh: forceRefresh);

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
          _errorMessage = isHindi
              ? 'सुशील सर अभी इसका विश्लेषण नहीं कर सके। कृपया पुनः प्रयास करें।'
              : "Sushil Sir couldn't explain this right now. Please try again.";
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
    final maxHeight = mediaQuery.size.height * 0.88;
    final isHindi = (widget.explanationContext.language == 'hi') ||
        (ref.watch(localeProvider).languageCode == 'hi');

    return Container(
      constraints: BoxConstraints(maxHeight: maxHeight),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border.all(
          color: AppColors.surfaceElevated.withValues(alpha: 0.8),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.5),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 1. Drag handle & Header
          _buildHeader(context, isHindi),

          const Divider(height: 1, color: AppColors.border),

          // 2. Scrollable Body Content
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: _isLoading
                  ? _buildLoadingState(isHindi)
                  : _errorMessage != null
                      ? _buildErrorState(isHindi)
                      : _buildLoadedState(context, _explanation!, isHindi),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context, bool isHindi) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 12, 12),
      child: Column(
        children: [
          // Center subtle pill
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.textMuted.withValues(alpha: 0.4),
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
                      color: AppColors.premiumAccent.withValues(alpha: 0.2),
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
                        Text(
                          isHindi ? 'सुशील सर (AI मार्गदर्शक)' : 'AI Sushil Sir',
                          style: const TextStyle(
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
                          child: Text(
                            isHindi ? 'AI मार्गदर्शक' : 'AI MENTOR',
                            style: const TextStyle(
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
                      isHindi
                          ? '${widget.explanationContext.screenTitle} का विश्लेषण'
                          : 'Explaining ${widget.explanationContext.screenTitle}',
                      style: TextStyle(
                        color: AppColors.textSecondary.withValues(alpha: 0.9),
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

  Widget _buildLoadingState(bool isHindi) {
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
                color: AppColors.premiumAccent.withValues(alpha: 0.5),
                width: 2,
              ),
              boxShadow: [
                BoxShadow(
                  color: AppColors.premiumAccent.withValues(alpha: 0.2),
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
        Text(
          isHindi
              ? 'सुशील सर इस खंड का अध्ययन कर रहे हैं...'
              : 'Sushil Sir is studying this section...',
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          isHindi
              ? 'जटिल वैदिक सूत्रों और आंकड़ों का सरल और व्यावहारिक भाषा में विश्लेषण तैयार हो रहा है।'
              : 'Translating complex astrological metrics into clear, practical insights.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: AppColors.textSecondary.withValues(alpha: 0.9),
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
            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.premiumAccent),
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildErrorState(bool isHindi) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(height: 16),
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.error.withValues(alpha: 0.5), width: 1.5),
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
        Text(
          isHindi ? 'विश्लेषण उपलब्ध नहीं है' : 'Explanation Unavailable',
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          _errorMessage ??
              (isHindi
                  ? 'सुशील सर अभी इस खंड का विश्लेषण नहीं कर सके। कृपया पुनः प्रयास करें।'
                  : "Sushil Sir couldn't explain this section right now. Please try again."),
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
          label: Text(isHindi ? 'पुनः प्रयास करें' : 'Try Again'),
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

  Widget _buildModeSelector(bool isHindi) {
    final modes = [
      {'id': 'standard', 'en': 'Standard', 'hi': 'सामान्य'},
      {'id': 'simple', 'en': 'Explain simply', 'hi': 'सरल शब्दों में'},
      {'id': 'detailed', 'en': 'In more detail', 'hi': 'विस्तार से'},
      {'id': 'practical', 'en': 'Why this matters', 'hi': 'महत्व क्या है?'},
      {'id': 'next_steps', 'en': 'What next?', 'hi': 'आगे क्या देखें?'},
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: modes.map((m) {
          final isSelected = _currentMode == m['id'];
          final title = isHindi ? m['hi']! : m['en']!;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(
                title,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: isSelected ? AppColors.primary : AppColors.textPrimary,
                ),
              ),
              selected: isSelected,
              selectedColor: AppColors.premiumAccent,
              backgroundColor: AppColors.surfaceElevated,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(
                  color: isSelected
                      ? AppColors.premiumAccent
                      : AppColors.border.withValues(alpha: 0.4),
                ),
              ),
              onSelected: _isLoading
                  ? null
                  : (selected) {
                      if (selected && _currentMode != m['id']) {
                        _loadExplanation(mode: m['id']);
                      }
                    },
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildJyotiHandoff(BuildContext context, bool isHindi) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: AppColors.secondary.withValues(alpha: 0.4),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.chat_bubble_outline_rounded,
                color: AppColors.secondary,
                size: 20,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  isHindi ? 'विशेष प्रश्न पूछना चाहते हैं?' : 'Have specific questions?',
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            isHindi
                ? 'ज्योति AI के साथ बातचीत करें और अपने व्यक्तिगत प्रश्न पूछें।'
                : 'Discuss this screen with Jyoti AI and ask free-form follow-up questions.',
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 12,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.centerRight,
            child: OutlinedButton.icon(
              onPressed: () {
                Navigator.of(context).pop();
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => JyotiChatScreen(
                      initialPrompt: isHindi
                          ? 'मुझे ${widget.explanationContext.screenTitle} के बारे में और विस्तार से बताएं।'
                          : 'Can you help me understand ${widget.explanationContext.screenTitle} in more detail?',
                      initialScreen: widget.explanationContext.feature,
                    ),
                  ),
                );
              },
              icon: const Icon(Icons.arrow_forward_rounded, size: 14),
              label: Text(
                isHindi ? 'ज्योति AI से पूछें' : 'Ask Jyoti AI',
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.premiumAccent,
                side: const BorderSide(color: AppColors.premiumAccent),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadedState(
      BuildContext context, SushilExplanationModel explanation, bool isHindi) {
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
            child: Text(isHindi ? 'बंद करें' : 'Close'),
          ),
          const SizedBox(height: 16),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Mode Selector Chips
        _buildModeSelector(isHindi),

        const SizedBox(height: 16),

        // Headline Card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                AppColors.surfaceElevated.withValues(alpha: 0.9),
                AppColors.tertiary.withValues(alpha: 0.95),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: AppColors.premiumAccent.withValues(alpha: 0.4),
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
            color: AppColors.surface.withValues(alpha: 0.6),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: AppColors.border.withValues(alpha: 0.5),
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
                isHindi ? 'मुख्य बिंदु' : 'KEY TAKEAWAYS',
                style: TextStyle(
                  color: AppColors.premiumAccent.withValues(alpha: 0.95),
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
                  color: AppColors.surfaceElevated.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: AppColors.border.withValues(alpha: 0.4),
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
              color: AppColors.textMuted.withValues(alpha: 0.7),
              fontSize: 11,
              fontStyle: FontStyle.italic,
            ),
          ),
        ),

        const SizedBox(height: 18),

        // Jyoti Handoff Transition
        _buildJyotiHandoff(context, isHindi),

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
            child: Text(
              isHindi ? 'समझ गया' : 'Got It',
              style: const TextStyle(
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
