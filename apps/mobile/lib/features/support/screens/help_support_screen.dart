import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../shared/screens/simple_screen_kit.dart';
import '../../../../shared/theme/app_colors.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/astro_button.dart';
import '../../../../shared/widgets/subtle_celestial_background.dart';
import '../models/faq_model.dart';
import '../../../shared/widgets/astro_nav_bar.dart';

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
          child: SingleChildScrollView(
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
                style: AppTypography.displayMedium.copyWith(fontSize: 22),
              ),
              const SizedBox(height: 6),
              Text(
                isHindi
                    ? 'हम आपके अनुभव को उत्कृष्ट बनाने हेतु निरंतर प्रयासरत हैं।'
                    : 'Tell us how we can improve your Astro Sushil experience.',
                style: const TextStyle(fontSize: 15, color: AppColors.lightTextSecondary),
              ),
              const SizedBox(height: 16),
              TextField(
                style: const TextStyle(fontSize: 17, color: AppColors.primary),
                controller: feedbackController,
                maxLines: 4,
                decoration: InputDecoration(
                  hintText: isHindi
                      ? 'अपना संदेश अथवा सुझाव यहाँ लिखें...'
                      : 'Type your message or suggestion here...',
                  hintStyle: const TextStyle(fontSize: 16, color: AppColors.textMuted),
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
      ),
    );
  }

  static const String _supportPhone = '+919621127233';
  static const String _supportEmail = 'connect@astrosushil.com';

  /// Opens an external contact channel (WhatsApp / phone / email). If the
  /// device cannot open it, the contact details are shown instead.
  Future<void> _launchContact(BuildContext context, Uri uri, bool isHindi) async {
    var launched = false;
    try {
      launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      launched = false;
    }
    if (!launched && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            isHindi
                ? 'सहायता: $_supportEmail | फ़ोन: +91 9621127233'
                : 'Support: $_supportEmail | Phone: +91 9621127233',
          ),
          backgroundColor: AppColors.primary,
          duration: const Duration(seconds: 4),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isHindi = Localizations.localeOf(context).languageCode == 'hi';

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      body: SubtleCelestialBackground(
        child: CustomScrollView(
          slivers: [
            AstroSliverNavBar(title: isHindi ? 'सहायता एवं FAQs' : 'Help & Support', subtitle: isHindi ? 'हम आपकी सहायता हेतु उपस्थित हैं' : 'We Are Here to Guide You'),
            SliverSafeArea(
              top: false,
              sliver: SliverToBoxAdapter(
                child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 640),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // 1. Contact us
                    _buildContactCard(context, isHindi),

                    const SizedBox(height: 28),

                    // 2. FAQs
                    Semantics(
                      header: true,
                      child: Text(
                        isHindi ? 'अक्सर पूछे जाने वाले प्रश्न' : 'Frequently Asked Questions',
                        style: AppTypography.displayMedium.copyWith(fontSize: 22),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _buildFaqChip(FaqCategory.all, isHindi ? 'सभी' : 'All'),
                        _buildFaqChip(FaqCategory.astrology, isHindi ? 'ज्योतिष' : 'Astrology'),
                        _buildFaqChip(FaqCategory.consultations, isHindi ? 'परामर्श' : 'Consultations'),
                        _buildFaqChip(FaqCategory.reports, isHindi ? 'रिपोर्ट्स' : 'Reports'),
                        _buildFaqChip(FaqCategory.shop, isHindi ? 'शॉप' : 'Shop'),
                        _buildFaqChip(FaqCategory.account, isHindi ? 'खाता' : 'Account'),
                      ],
                    ),
                    const SizedBox(height: 14),
                    ..._filteredFaqs.map((faq) => _buildFaqItem(faq, isHindi)),

                    const SizedBox(height: 24),

                    // 3. Feedback
                    SimpleGroupCard(
                      padding: const EdgeInsets.all(18),
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              isHindi ? 'कोई अन्य प्रश्न अथवा सुझाव?' : 'Have a Question or Suggestion?',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              isHindi
                                  ? 'हमारी टीम आपकी सहायता हेतु सदैव तत्पर है।'
                                  : 'Our support team is here to assist you.',
                              style: const TextStyle(fontSize: 15, color: AppColors.lightTextSecondary),
                            ),
                            const SizedBox(height: 14),
                            SimpleSecondaryButton(
                              label: isHindi ? 'सुझाव भेजें' : 'Send Feedback',
                              icon: Icons.rate_review_outlined,
                              onPressed: () => _showFeedbackModal(context, isHindi),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFaqChip(FaqCategory category, String label) {
    return SimpleChoicePill(
      label: label,
      selected: _selectedCategory == category,
      onTap: () {
        setState(() {
          _selectedCategory = category;
        });
      },
    );
  }

  Widget _buildContactCard(BuildContext context, bool isHindi) {
    return SimpleGroupCard(
      padding: const EdgeInsets.all(18),
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const SimpleIconBadge(icon: Icons.support_agent_rounded, color: AppColors.tintSageText),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isHindi ? 'आधिकारिक व्हाट्सएप सहायता' : 'Official WhatsApp Support',
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        '+91 9621127233',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                          color: AppColors.tintSageText,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.only(top: 1),
                  child: Icon(Icons.access_time_rounded, size: 18, color: AppColors.textSecondary),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    isHindi
                        ? 'सोमवार – शनिवार: प्रातः 10:00 से सायं 7:00 बजे (IST)'
                        : 'Monday – Saturday: 10:00 AM – 7:00 PM IST',
                    style: const TextStyle(fontSize: 14, height: 1.35, color: AppColors.textSecondary),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            SimplePrimaryButton(
              label: isHindi ? 'व्हाट्सएप पर संदेश भेजें' : 'WhatsApp us',
              icon: Icons.chat_rounded,
              onPressed: () => _launchContact(
                context,
                Uri.parse('https://wa.me/${_supportPhone.substring(1)}'),
                isHindi,
              ),
            ),
            const SizedBox(height: 10),
            SimpleSecondaryButton(
              label: isHindi ? 'कॉल करें' : 'Call us',
              icon: Icons.call_rounded,
              onPressed: () => _launchContact(context, Uri(scheme: 'tel', path: _supportPhone), isHindi),
            ),
            const SizedBox(height: 10),
            SimpleSecondaryButton(
              label: isHindi ? 'ईमेल करें' : 'Email us',
              icon: Icons.email_outlined,
              onPressed: () => _launchContact(context, Uri(scheme: 'mailto', path: _supportEmail), isHindi),
            ),
            const SizedBox(height: 4),
            TextButton.icon(
              icon: const Icon(Icons.copy_rounded, size: 20),
              label: Text(
                isHindi ? 'नंबर कॉपी करें' : 'Copy Number',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
              ),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.primary,
                minimumSize: const Size.fromHeight(48),
              ),
              onPressed: () => _copySupportNumber(context, isHindi),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildFaqItem(FaqItemModel faq, bool isHindi) {
    final isExpanded = _expandedIds.contains(faq.id);
    final question = isHindi ? faq.questionHi : faq.question;
    final answer = isHindi ? faq.answerHi : faq.answer;
    final radius = BorderRadius.circular(16);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppColors.cardSurface,
        borderRadius: radius,
        border: Border.all(
          color: isExpanded ? AppColors.premiumAccent : AppColors.cardBorder,
          width: isExpanded ? 1.5 : 1.0,
        ),
      ),
      child: Material(
        type: MaterialType.transparency,
        borderRadius: radius,
        child: Semantics(
          button: true,
          expanded: isExpanded,
          child: InkWell(
            borderRadius: radius,
            onTap: () => _toggleExpanded(faq.id),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 56),
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
                            style: const TextStyle(
                              fontSize: 16,
                              height: 1.35,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Icon(
                          isExpanded ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                          color: AppColors.primary,
                          size: 26,
                        ),
                      ],
                    ),
                    if (isExpanded) ...[
                      const SizedBox(height: 10),
                      Text(
                        answer,
                        style: const TextStyle(
                          fontSize: 16,
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
        ),
      ),
    );
  }
}
