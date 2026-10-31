import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../shared/assets/app_assets.dart';
import '../../../../shared/theme/app_colors.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/astro_app_bar.dart';
import '../../../../shared/widgets/astro_button.dart';
import '../../../../shared/widgets/astro_card.dart';
import '../../../../shared/widgets/astro_chip.dart';
import '../../../../shared/widgets/astro_image.dart';
import '../../../../shared/widgets/subtle_celestial_background.dart';
import '../models/faq_model.dart';

class HelpSupportScreen extends StatefulWidget {
  const HelpSupportScreen({super.key});

  @override
  State<HelpSupportScreen> createState() => _HelpSupportScreenState();
}

class _HelpSupportScreenState extends State<HelpSupportScreen> {
  FaqCategory _selectedCategory = FaqCategory.all;
  final Set<String> _expandedIds = {};
  final List<FaqItemModel> _allFaqs = FaqItemModel.getDefaultFaqs();

  List<FaqItemModel> get _filteredFaqs {
    if (_selectedCategory == FaqCategory.all) return _allFaqs;
    return _allFaqs.where((f) => f.category == _selectedCategory).toList();
  }

  void _toggleExpanded(String id) {
    setState(() {
      if (_expandedIds.contains(id)) {
        _expandedIds.remove(id);
      } else {
        _expandedIds.add(id);
      }
    });
  }

  void _copySupportNumber(BuildContext context, bool isHindi) {
    Clipboard.setData(const ClipboardData(text: '+919621127233'));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          isHindi
              ? 'आधिकारिक सहायता नंबर (+91 9621127233) क्लिपबोर्ड पर कॉपी किया गया'
              : 'Support phone (+91 9621127233) copied to clipboard',
        ),
        backgroundColor: AppColors.primary,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _showFeedbackModal(BuildContext context, bool isHindi) {
    final feedbackController = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom,
        ),
        child: Container(
          padding: const EdgeInsets.all(22),
          decoration: const BoxDecoration(
            color: AppColors.cardSurfaceWarm,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            border: Border(top: BorderSide(color: AppColors.cardBorder, width: 1.5)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.lightBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                isHindi ? 'अपनी प्रतिक्रिया अथवा प्रश्न साझा करें' : 'Share Feedback or Query',
                style: AppTypography.titleLarge.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                isHindi
                    ? 'हम आपके अनुभव को उत्कृष्ट बनाने हेतु निरंतर प्रयासरत हैं।'
                    : 'Tell us how we can improve your Astro Sushil experience.',
                style: AppTypography.bodySmall.copyWith(
                  color: AppColors.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: feedbackController,
                maxLines: 4,
                decoration: InputDecoration(
                  hintText: isHindi
                      ? 'अपना संदेश अथवा सुझाव यहाँ लिखें...'
                      : 'Type your message or suggestion here...',
                  hintStyle: AppTypography.bodyMedium.copyWith(color: AppColors.lightTextMuted),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.cardBorder),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.premiumAccent, width: 1.5),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              AstroButton(
                label: isHindi ? 'प्रतिक्रिया भेजें' : 'Submit Feedback',
                variant: AstroButtonVariant.primary,
                fullWidth: true,
                onPressed: () {
                  Navigator.of(ctx).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        isHindi
                            ? 'आपकी प्रतिक्रिया प्राप्त हो गई है। धन्यवाद!'
                            : 'Thank you! Your feedback has been received.',
                      ),
                      backgroundColor: AppColors.success,
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isHindi = Localizations.localeOf(context).languageCode == 'hi';

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AstroAppBar(
        title: isHindi ? 'सहायता एवं FAQs' : 'Help & Support',
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Cosmic Support Hero Card
                _buildSupportHeroCard(context, isHindi),

                const SizedBox(height: 14),

                // 2. Official WhatsApp Support Card
                _buildWhatsAppCard(context, isHindi),

                const SizedBox(height: 20),

                // 3. Section Header: FAQs
                Text(
                  isHindi ? 'अक्सर पूछे जाने वाले प्रश्न' : 'Frequently Asked Questions',
                  style: AppTypography.titleMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 10),

                // 4. FAQ Category Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  child: Row(
                    children: [
                      _buildFaqChip(FaqCategory.all, isHindi ? 'सभी' : 'All'),
                      const SizedBox(width: 8),
                      _buildFaqChip(FaqCategory.astrology, isHindi ? 'ज्योतिष' : 'Astrology'),
                      const SizedBox(width: 8),
                      _buildFaqChip(FaqCategory.consultations, isHindi ? 'परामर्श' : 'Consultations'),
                      const SizedBox(width: 8),
                      _buildFaqChip(FaqCategory.reports, isHindi ? 'रिपोर्ट्स' : 'Reports'),
                      const SizedBox(width: 8),
                      _buildFaqChip(FaqCategory.shop, isHindi ? 'शॉप' : 'Shop'),
                      const SizedBox(width: 8),
                      _buildFaqChip(FaqCategory.account, isHindi ? 'खाता' : 'Account'),
                    ],
                  ),
                ),

                const SizedBox(height: 14),

                // 5. FAQ Accordion Items
                ..._filteredFaqs.map((faq) => _buildFaqItem(faq, isHindi)),

                const SizedBox(height: 20),

                // 6. Send Feedback CTA Card
                AstroCard(
                  child: Padding(
                    padding: const EdgeInsets.all(4.0),
                    child: Column(
                      children: [
                        const Icon(
                          Icons.rate_review_outlined,
                          size: 32,
                          color: AppColors.premiumAccent,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          isHindi ? 'कोई अन्य प्रश्न अथवा सुझाव?' : 'Have a Question or Suggestion?',
                          style: AppTypography.titleSmall.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          isHindi
                              ? 'हमारी टीम आपकी सहायता हेतु सदैव तत्पर है।'
                              : 'Our support team is here to assist you.',
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(height: 14),
                        AstroButton(
                          label: isHindi ? 'सुझाव भेजें' : 'Send Feedback',
                          variant: AstroButtonVariant.outlined,
                          onPressed: () => _showFeedbackModal(context, isHindi),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFaqChip(FaqCategory category, String label) {
    return AstroChip(
      label: label,
      isSelected: _selectedCategory == category,
      onTap: () {
        setState(() {
          _selectedCategory = category;
        });
      },
    );
  }

  Widget _buildSupportHeroCard(BuildContext context, bool isHindi) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.15),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.premiumAccent, width: 2),
            ),
            child: const ClipOval(
              child: AstroImage(
                assetPath: AppAssets.sushilFriendly,
                fit: BoxFit.cover,
                fallback: AstroImageFallback.icon,
                semanticLabel: 'Astro Sushil Support',
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isHindi ? 'हम आपकी सहायता हेतु उपस्थित हैं' : 'We Are Here to Guide You',
                  style: AppTypography.titleMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  isHindi
                      ? 'प्रामाणिक वैदिक ज्योतिष एवं ऐप सेवाओं से संबंधित प्रश्नों के उत्तर।'
                      : 'Authentic guidance for your astrology charts, reports & orders.',
                  style: AppTypography.caption.copyWith(
                    color: Colors.white.withValues(alpha: 0.85),
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWhatsAppCard(BuildContext context, bool isHindi) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
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
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.chat_bubble_rounded,
                  color: AppColors.success,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isHindi ? 'आधिकारिक व्हाट्सएप सहायता' : 'Official WhatsApp Support',
                      style: AppTypography.titleSmall.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '+91 9621127233',
                      style: AppTypography.bodySmall.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AppColors.success,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.copy_rounded, color: AppColors.primary, size: 20),
                tooltip: isHindi ? 'नंबर कॉपी करें' : 'Copy Number',
                onPressed: () => _copySupportNumber(context, isHindi),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.canvasSecondary,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                const Icon(Icons.access_time_rounded, size: 14, color: AppColors.lightTextMuted),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    isHindi
                        ? 'सोमवार – शनिवार: प्रातः 10:00 से सायं 7:00 बजे (IST)'
                        : 'Monday – Saturday: 10:00 AM – 7:00 PM IST',
                    style: AppTypography.caption.copyWith(color: AppColors.lightTextSecondary),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFaqItem(FaqItemModel faq, bool isHindi) {
    final isExpanded = _expandedIds.contains(faq.id);
    final question = isHindi ? faq.questionHi : faq.question;
    final answer = isHindi ? faq.answerHi : faq.answer;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isExpanded ? AppColors.premiumAccent : AppColors.cardBorder,
          width: isExpanded ? 1.5 : 1.0,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _toggleExpanded(faq.id),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        question,
                        style: AppTypography.titleSmall.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Icon(
                      isExpanded
                          ? Icons.keyboard_arrow_up_rounded
                          : Icons.keyboard_arrow_down_rounded,
                      color: AppColors.primary,
                      size: 22,
                    ),
                  ],
                ),
                if (isExpanded) ...[
                  const SizedBox(height: 10),
                  const Divider(color: AppColors.cardBorder),
                  const SizedBox(height: 6),
                  Text(
                    answer,
                    style: AppTypography.bodySmall.copyWith(
                      color: AppColors.lightTextPrimary,
                      height: 1.5,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
