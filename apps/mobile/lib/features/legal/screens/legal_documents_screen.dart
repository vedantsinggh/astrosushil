import 'package:flutter/material.dart';
import '../../../../shared/theme/app_colors.dart';
import '../../../../shared/theme/app_typography.dart';
import '../../../../shared/widgets/astro_app_bar.dart';
import '../../../../shared/widgets/astro_badge.dart';
import '../../../../shared/widgets/astro_chip.dart';
import '../../../../shared/widgets/subtle_celestial_background.dart';

enum LegalDocumentType {
  privacy,
  terms,
  refund,
  shipping,
  disclaimer,
}

class LegalDocumentsScreen extends StatefulWidget {
  final LegalDocumentType initialDocument;

  const LegalDocumentsScreen({
    super.key,
    this.initialDocument = LegalDocumentType.privacy,
  });

  @override
  State<LegalDocumentsScreen> createState() => _LegalDocumentsScreenState();
}

class _LegalDocumentsScreenState extends State<LegalDocumentsScreen> {
  late LegalDocumentType _activeDocument;

  @override
  void initState() {
    super.initState();
    _activeDocument = widget.initialDocument;
  }

  @override
  Widget build(BuildContext context) {
    final isHindi = Localizations.localeOf(context).languageCode == 'hi';

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AstroAppBar(
        title: isHindi ? 'विधिक नीतियां एवं शर्तें' : 'Policies & Terms',
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Horizontal Document Selector Chips
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  child: Row(
                    children: [
                      _buildSelectorChip(
                        type: LegalDocumentType.privacy,
                        label: isHindi ? 'गोपनीयता नीति' : 'Privacy Policy',
                      ),
                      const SizedBox(width: 8),
                      _buildSelectorChip(
                        type: LegalDocumentType.terms,
                        label: isHindi ? 'सेवा की शर्तें' : 'Terms of Service',
                      ),
                      const SizedBox(width: 8),
                      _buildSelectorChip(
                        type: LegalDocumentType.refund,
                        label: isHindi ? 'रिफंड एवं वापसी' : 'Refund Policy',
                      ),
                      const SizedBox(width: 8),
                      _buildSelectorChip(
                        type: LegalDocumentType.shipping,
                        label: isHindi ? 'शिपिंग नीति' : 'Shipping Policy',
                      ),
                      const SizedBox(width: 8),
                      _buildSelectorChip(
                        type: LegalDocumentType.disclaimer,
                        label: isHindi ? 'अस्वीकरण' : 'Disclaimer',
                      ),
                    ],
                  ),
                ),
              ),

              // 2. Active Document Content View
              Expanded(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                  child: _buildDocumentContent(context, isHindi),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSelectorChip({
    required LegalDocumentType type,
    required String label,
  }) {
    return AstroChip(
      label: label,
      isSelected: _activeDocument == type,
      onTap: () {
        setState(() {
          _activeDocument = type;
        });
      },
    );
  }

  Widget _buildDocumentContent(BuildContext context, bool isHindi) {
    switch (_activeDocument) {
      case LegalDocumentType.privacy:
        return _buildPrivacyPolicy(context, isHindi);
      case LegalDocumentType.terms:
        return _buildTermsOfService(context, isHindi);
      case LegalDocumentType.refund:
        return _buildRefundPolicy(context, isHindi);
      case LegalDocumentType.shipping:
        return _buildShippingPolicy(context, isHindi);
      case LegalDocumentType.disclaimer:
        return _buildAstrologyDisclaimer(context, isHindi);
    }
  }

  Widget _buildSectionCard({
    required String title,
    required String body,
    List<String>? bulletPoints,
    String? badgeLabel,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: AppTypography.titleSmall.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ),
              if (badgeLabel != null)
                AstroBadge(
                  text: badgeLabel,
                  style: AstroBadgeStyle.pastel,
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            body,
            style: AppTypography.bodySmall.copyWith(
              color: AppColors.lightTextSecondary,
              height: 1.5,
            ),
          ),
          if (bulletPoints != null && bulletPoints.isNotEmpty) ...[
            const SizedBox(height: 10),
            ...bulletPoints.map(
              (point) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(top: 5, right: 8),
                      child: Icon(
                        Icons.circle,
                        size: 6,
                        color: AppColors.premiumAccent,
                      ),
                    ),
                    Expanded(
                      child: Text(
                        point,
                        style: AppTypography.bodySmall.copyWith(
                          color: AppColors.lightTextPrimary,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPrivacyPolicy(BuildContext context, bool isHindi) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionCard(
          title: isHindi ? '1. जन्म विवरण एवं डेटा सुरक्षा' : '1. Birth Data Privacy & Encryption',
          badgeLabel: 'STRICT PRIVACY',
          body: isHindi
              ? 'आपकी जन्म तिथि, समय एवं भौगोलिक निर्देशांक (Latitude/Longitude) केवल प्रामाणिक वैदिक कुंडली गणनाओं हेतु प्रयुक्त होते हैं।'
              : 'Your birth date, time, and geographical coordinates are used exclusively for calculating accurate Vedic birth charts, dashas, and planetary transits.',
          bulletPoints: isHindi
              ? [
                  'सभी डेटा का संचरण आधुनिक TLS 1.3 एन्क्रिप्शन द्वारा सुरक्षित है।',
                  'जन्म प्रोफाइल विवरण किसी भी विज्ञापनदाता अथवा तीसरे पक्ष को विक्रय नहीं किए जाते।',
                  'आप किसी भी समय अपने प्रोफाइल को संपादित अथवा स्थायी रूप से हटा सकते हैं।',
                ]
              : [
                  'All data transmission is encrypted via TLS 1.3 protocol.',
                  'Birth profiles are never sold, rented, or shared with commercial advertising brokers.',
                  'You retain complete control to update, export, or permanently delete saved profiles.',
                ],
        ),
        _buildSectionCard(
          title: isHindi ? '2. खाता साख एवं सत्र प्रबंधन' : '2. Credentials & Session Security',
          body: isHindi
              ? 'एस्ट्रो सुशील सुरक्षित पासवर्ड हैशिंग (Argon2id/bcrypt) एवं अल्पकालिक टोकन का उपयोग करता है। सिस्टम लॉग्स में पासवर्ड अथवा भुगतान विवरण कभी दर्ज नहीं किए जाते।'
              : 'Astro Sushil uses industry-standard hashing and short-lived JWT tokens. Internal logging systems never record plain passwords, OTPs, or payment card information.',
        ),
        _buildSectionCard(
          title: isHindi ? '3. स्थानीय कैश एवं डेटा नियंत्रण' : '3. Local Device Cache & Storage',
          body: isHindi
              ? 'ऑफ़लाइन उपलब्धता हेतु कुंडलियां एवं पंचांग डेटा आपके डिवाइस पर सुरक्षित रूप से कैश किए जाते हैं। आप सेटिंग्स मेनू से कभी भी कैश हटा सकते हैं।'
              : 'Astrology charts and panchang metrics are locally cached on your device for fast offline display. You can clear this cache at any time via App Settings.',
        ),
      ],
    );
  }

  Widget _buildTermsOfService(BuildContext context, bool isHindi) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionCard(
          title: isHindi ? '1. सेवाओं की प्रामाणिकता' : '1. Authenticity of Offerings',
          badgeLabel: 'VERIFIED',
          body: isHindi
              ? 'एस्ट्रो सुशील मंच पर प्रस्तुत सभी ज्योतिषीय गणनाएं, गुप्त नाड़ी पद्धतियां एवं मास्टरक्लास सुशील सर के आधिकारिक अनुसंधान एवं पारंपरिक सूत्रों पर आधारित हैं।'
              : 'All astrological calculations, Gupta Nadi methodologies, and educational courses are based on authoritative traditional scriptures and Sushil Sir\'s verified research.',
        ),
        _buildSectionCard(
          title: isHindi ? '2. बौद्धिक संपदा एवं सामग्री' : '2. Intellectual Property Rights',
          body: isHindi
              ? 'मंच पर उपलब्ध कोर्स वीडियो, पीडीएफ रिपोर्ट्स, वैदिक सामग्री एवं सॉफ्टवेयर कोड एस्ट्रो सुशील की बौद्धिक संपदा हैं। अनधिकृत रिकॉर्डिंग अथवा पुनर्विक्रय प्रतिबंधित है।'
              : 'All course videos, proprietary report dossiers, texts, and source algorithms are protected by copyright. Unauthorized distribution, screen recording, or reselling is strictly prohibited.',
        ),
        _buildSectionCard(
          title: isHindi ? '3. उपयोगकर्ता आचरण' : '3. Account Responsibilities',
          body: isHindi
              ? 'उपयोगकर्ता अपने खाते की सुरक्षा बनाए रखने एवं परामर्श के दौरान सम्मानजनक संवाद हेतु उत्तरदायी हैं।'
              : 'Users are responsible for safeguarding their login credentials and engaging respectfully during live astrological consultations.',
        ),
      ],
    );
  }

  Widget _buildRefundPolicy(BuildContext context, bool isHindi) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionCard(
          title: isHindi ? '1. व्यक्तिगत पीडीएफ रिपोर्ट्स' : '1. Personalized PDF Reports',
          badgeLabel: 'FINAL ON GENERATION',
          body: isHindi
              ? 'चूंकि व्यक्तिगत रिपोर्ट्स का निर्माण भुगतान के तुरंत पश्चात ऑन-डिमांड सर्वर द्वारा किया जाता है, इसलिए एक बार तैयार होने पर पीडीएफ रिपोर्ट्स गैर-वापसी योग्य हैं।'
              : 'Because personalized reports are compiled immediately on-demand by backend ephemeris workers, delivered PDF dossiers are non-refundable once generated.',
          bulletPoints: isHindi
              ? [
                  'यदि तकनीकी खराबी के कारण रिपोर्ट तैयार नहीं होती, तो निःशुल्क पुनः उत्पादन किया जाएगा।',
                  'आप हमेशा "मेरी रिपोर्ट्स" से अपने पीडीएफ को निःशुल्क पुनः डाउनलोड कर सकते हैं।',
                ]
              : [
                  'If technical processing fails, report generation will automatically retry at zero cost.',
                  'Completed PDF reports remain permanently re-downloadable from "My Reports".',
                ],
        ),
        _buildSectionCard(
          title: isHindi ? '2. 1-ऑन-1 लाइव परामर्श' : '2. 1-on-1 Consultations',
          badgeLabel: '24H ADVANCE NOTICE',
          body: isHindi
              ? 'परामर्श सत्र प्रारंभ होने से 24 घंटे पूर्व तक रद्द करने पर पूर्ण रिफंड अथवा निःशुल्क समय परिवर्तन की सुविधा उपलब्ध है।'
              : 'Appointments may be cancelled or rescheduled up to 24 hours prior to the scheduled slot for a full refund or free slot change.',
          bulletPoints: isHindi
              ? [
                  'सत्र से 24 घंटे के भीतर रद्दीकरण अथवा अनुपस्थिति (No-Show) पर रिफंड देय नहीं होगा।',
                  'स्वीकृत रिफंड 5–7 कार्यदिवसों में मूल भुगतान माध्यम में वापस भेजा जाता है।',
                ]
              : [
                  'Cancellations within 24 hours or appointment no-shows are non-refundable.',
                  'Approved refunds are credited to the original payment source within 5–7 banking days.',
                ],
        ),
        _buildSectionCard(
          title: isHindi ? '3. अभिमंत्रित भौतिक सामग्री' : '3. Consecrated Physical Items',
          body: isHindi
              ? 'अयोध्या रवि पुष्य जड़ी-बूटी जैसी सामग्री डिलीवरी के 7 दिनों के भीतर मूल सील बंद अवस्था में वापस की जा सकती है।'
              : 'Consecrated physical items (e.g. Ayodhya Ravi Pushya Sacred Herb) may be returned within 7 days of delivery if the sacred tamper-evident seal is intact.',
        ),
      ],
    );
  }

  Widget _buildShippingPolicy(BuildContext context, bool isHindi) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionCard(
          title: isHindi ? '1. प्रेषण एवं डिलीवरी समय' : '1. Dispatch & Delivery Timelines',
          badgeLabel: 'PAN-INDIA',
          body: isHindi
              ? 'सभी अभिमंत्रित आध्यात्मिक उत्पाद वैदिक मुहूर्त के अनुरूप तैयार कर 48 से 72 घंटों में प्रेषित किए जाते हैं।'
              : 'Consecrated spiritual items are prepared according to auspicious Vedic Muhurta and dispatched within 48 to 72 hours.',
          bulletPoints: isHindi
              ? [
                  'मेट्रो शहर: 3–5 कार्यदिवस डिलीवरी समय।',
                  'अन्य शहर एवं ग्रामीण क्षेत्र: 5–7 कार्यदिवस।',
                  'ब्लू डार्ट अथवा भारतीय डाक स्पीड पोस्ट द्वारा सुरक्षित प्रेषण।',
                ]
              : [
                  'Metro Cities: 3–5 business days delivery.',
                  'Rest of India: 5–7 business days delivery.',
                  'Shipped securely via Blue Dart, DTDC, or India Post Speed Post with SMS tracking.',
                ],
        ),
        _buildSectionCard(
          title: isHindi ? '2. शिपिंग शुल्क' : '2. Shipping Charges',
          badgeLabel: 'FREE >= ₹2,000',
          body: isHindi
              ? '₹2,000 अथवा अधिक के आर्डर्स पर पूरे भारत में निःशुल्क शिपिंग उपलब्ध है। ₹2,000 से कम के आर्डर्स पर ₹99 का निश्चित शुल्क लागू होता है।'
              : 'Free pan-India shipping applies to all physical orders of ₹2,000 or above. A flat ₹99 fee applies to orders below ₹2,000.',
        ),
      ],
    );
  }

  Widget _buildAstrologyDisclaimer(BuildContext context, bool isHindi) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionCard(
          title: isHindi ? '1. ज्योतिषीय मार्गदर्शन का स्वरूप' : '1. Nature of Astrological Guidance',
          badgeLabel: 'VEDIC GUIDANCE',
          body: isHindi
              ? 'एस्ट्रो सुशील द्वारा प्रस्तुत कुंडली विश्लेषण, गोचर एवं ज्योति एआई सहायक वैदिक ज्योतिष सिद्धांतों पर आधारित व्यक्तिगत मार्गदर्शन प्रदान करते हैं।'
              : 'Kundli interpretations, Gochara transit assessments, and AI assistant insights are provided for spiritual, philosophical, and personal self-reflection purposes.',
          bulletPoints: isHindi
              ? [
                  'यह विश्लेषण पेशेवर चिकित्सा, विधिक अथवा वित्तीय सलाह का विकल्प नहीं है।',
                  'गंभीर जीवन निर्णयों हेतु स्वतंत्र विशेषज्ञ परामर्श आवश्यक है।',
                  'कर्म एवं व्यक्तिगत प्रयास सदैव भाग्य के साथ निर्णायक भूमिका निभाते हैं।',
                ]
              : [
                  'Astrological guidance is not a substitute for professional medical, legal, or financial advice.',
                  'Major life, medical, or financial decisions should always be cross-checked with certified specialists.',
                  'Vedic philosophy emphasizes conscious karma and diligent personal effort alongside astrological destiny.',
                ],
        ),
      ],
    );
  }
}
