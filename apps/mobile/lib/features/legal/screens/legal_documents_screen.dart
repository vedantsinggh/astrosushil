import 'package:flutter/material.dart';
import '../../../../shared/theme/app_colors.dart';
import '../../../../shared/screens/simple_screen_kit.dart';
import '../../../../shared/widgets/astro_badge.dart';
import '../../../../shared/widgets/subtle_celestial_background.dart';
import '../../../shared/widgets/astro_nav_bar.dart';

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
      body: SubtleCelestialBackground(
        child: CustomScrollView(
          slivers: [
            AstroSliverNavBar(title: isHindi ? 'विधिक नीतियां एवं शर्तें' : 'Policies & Terms'),
            SliverSafeArea(
              top: false,
              sliver: SliverToBoxAdapter(
                child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 680),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // 1. Document selector (wraps; no hidden sideways scrolling)
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _buildSelectorChip(
                          type: LegalDocumentType.privacy,
                          label: isHindi ? 'गोपनीयता नीति' : 'Privacy Policy',
                        ),
                        _buildSelectorChip(
                          type: LegalDocumentType.terms,
                          label: isHindi ? 'सेवा की शर्तें' : 'Terms of Service',
                        ),
                        _buildSelectorChip(
                          type: LegalDocumentType.refund,
                          label: isHindi ? 'रिफंड एवं वापसी' : 'Refund Policy',
                        ),
                        _buildSelectorChip(
                          type: LegalDocumentType.shipping,
                          label: isHindi ? 'शिपिंग नीति' : 'Shipping Policy',
                        ),
                        _buildSelectorChip(
                          type: LegalDocumentType.disclaimer,
                          label: isHindi ? 'अस्वीकरण' : 'Disclaimer',
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // 2. Active document content
                    _buildDocumentContent(context, isHindi),
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

  Widget _buildSelectorChip({
    required LegalDocumentType type,
    required String label,
  }) {
    return SimpleChoicePill(
      label: label,
      selected: _activeDocument == type,
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
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.cardSurface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              height: 1.3,
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
            ),
          ),
          if (badgeLabel != null) ...[
            const SizedBox(height: 8),
            AstroBadge(
              text: badgeLabel,
              style: AstroBadgeStyle.pastel,
            ),
          ],
          const SizedBox(height: 10),
          Text(
            body,
            style: const TextStyle(
              fontSize: 16,
              color: AppColors.lightTextSecondary,
              height: 1.55,
            ),
          ),
          if (bulletPoints != null && bulletPoints.isNotEmpty) ...[
            const SizedBox(height: 10),
            ...bulletPoints.map(
              (point) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(top: 8, right: 10),
                      child: Icon(
                        Icons.circle,
                        size: 7,
                        color: AppColors.goldDark,
                      ),
                    ),
                    Expanded(
                      child: Text(
                        point,
                        style: const TextStyle(
                          fontSize: 16,
                          color: AppColors.lightTextPrimary,
                          height: 1.5,
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
          title: isHindi ? '1. दायरा (वेबसाइट, iOS एवं Android)' : '1. Scope (Website, iOS & Android)',
          badgeLabel: 'STRICT PRIVACY',
          body: isHindi
              ? 'यह गोपनीयता नीति एस्ट्रो सुशील प्राइवेट लिमिटेड की वेबसाइट (astrosushil.com), iOS ऐप एवं Android ऐप पर लागू होती है और भारतीय डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम, 2023 (DPDP Act) के अनुरूप है।'
              : 'This Privacy Policy applies across the Astro Sushil Private Limited Website (astrosushil.com), iOS App, and Android App in compliance with the Digital Personal Data Protection Act, 2023 (India) and App Store / Play Store standards.',
          bulletPoints: isHindi
              ? [
                  'पहचान एवं संपर्क डेटा: पूरा नाम, ईमेल, मोबाइल नंबर (+91/E.164), लिंग एवं OTP लॉगिन विवरण।',
                  'जन्म एवं ज्योतिष विवरण: जन्म तिथि, समय, स्थान एवं भौगोलिक निर्देशांक (स्वयं एवं सहेजे गए प्रोफाइल)।',
                  'डिवाइस एवं ऐप डेटा: iOS/Android पुश नोटिफिकेशन टोकन (FCM/APNs), क्रैश लॉग एवं सुरक्षित स्थानीय कैश।',
                ]
              : [
                  'Account & Identity Data: Full name, email, phone number (E.164 for OTP auth), and gender.',
                  'Birth & Astrological Data: Date, time, place of birth, and coordinates for Vedic/BNN chart & report calculations.',
                  'iOS & Android Device Data: Push notification tokens (FCM/APNs), OS/app version, and crash diagnostics. We never use ad-tracking SDKs or sell your data.',
                ],
        ),
        _buildSectionCard(
          title: isHindi ? '2. डेटा उपयोग एवं सुरक्षा' : '2. Data Usage, Payments & Security',
          body: isHindi
              ? 'आपका डेटा केवल कुंडली गणना, रिपोर्ट निर्माण, परामर्श एवं लेन-देन सूचनाओं (SMS, WhatsApp, ईमेल, पुश) हेतु प्रयुक्त होता है। सभी डेटा TLS 1.3 द्वारा सुरक्षित है; पासवर्ड, OTP या कार्ड विवरण कभी लॉग नहीं किए जाते।'
              : 'Your data is used solely for chart calculations, personalized reports, consultations, GST invoicing, and transactional alerts (SMS, WhatsApp, Email, Push). All traffic uses TLS 1.3 encryption; card/UPI credentials are processed only by Razorpay and never stored on our servers.',
        ),
        _buildSectionCard(
          title: isHindi ? '3. उपयोगकर्ता अधिकार एवं अयोध्या न्यायालय क्षेत्राधिकार' : '3. Your Rights & Exclusive Ayodhya Jurisdiction',
          body: isHindi
              ? 'आप किसी भी समय प्रोफाइल हटाने या सहायता हेतु support@astrosushil.com पर संपर्क कर सकते हैं। किसी भी सेवा, रिपोर्ट, परामर्श अथवा डेटा विवाद का न्यायिक क्षेत्राधिकार केवल अयोध्या, उत्तर प्रदेश (भारत) के न्यायालय होंगे।'
              : 'You may update or request deletion of your account/profiles via App Settings or support@astrosushil.com. All disputes relating to consultations, reports, or data shall be governed by Indian law and subject to the exclusive jurisdiction of the courts in Ayodhya, Uttar Pradesh, India.',
        ),
      ],
    );
  }

  Widget _buildTermsOfService(BuildContext context, bool isHindi) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionCard(
          title: isHindi ? '1. सेवाओं का स्वरूप एवं प्रामाणिकता' : '1. Authenticity & Scope of Services',
          badgeLabel: 'LEGAL TERMS',
          body: isHindi
              ? 'वेबसाइट, iOS एवं Android पर प्रस्तुत सभी वैदिक ज्योतिष एवं गुप्त नाड़ी गणनाएं, रिपोर्ट्स और परामर्श आध्यात्मिक एवं व्यक्तिगत मार्गदर्शन हेतु हैं। यह चिकित्सा, विधिक या वित्तीय सलाह का विकल्प नहीं हैं।'
              : 'All Vedic astrology, Gupta Nadi (BNN) calculations, personalized PDF reports, courses, and consultations across our Website, iOS App, and Android App are for spiritual and personal reflection purposes, not a substitute for medical, legal, or financial advice.',
        ),
        _buildSectionCard(
          title: isHindi ? '2. कठोर नो-रिफंड एवं एडमिन-मात्र पुनर्निर्धारण नीति' : '2. Strict No-Refund & Admin-Only Reschedule Policy',
          badgeLabel: 'NO REFUND',
          body: isHindi
              ? 'सभी भुगतान 100% अंतिम एवं गैर-वापसी योग्य (Non-Refundable) हैं। ग्राहक स्वयं परामर्श का समय पुनर्निर्धारित (Reschedule) नहीं कर सकते; यह केवल अधिकृत एडमिन द्वारा प्रबंधन के विवेक पर किया जा सकता है।'
              : 'All purchases of consultations, reports, courses, digital items, and physical products are 100% final and non-refundable. Clients cannot reschedule consultations; rescheduling may only be performed by an authorized administrator.',
        ),
        _buildSectionCard(
          title: isHindi ? '3. बौद्धिक संपदा एवं अयोध्या न्यायालय क्षेत्राधिकार' : '3. Intellectual Property & Ayodhya Court Jurisdiction',
          badgeLabel: 'AYODHYA COURT',
          body: isHindi
              ? 'सभी कोर्स वीडियो, पीडीएफ रिपोर्ट्स एवं सामग्री एस्ट्रो सुशील की बौद्धिक संपदा हैं; अनधिकृत प्रसारण वर्जित है। परामर्श, रिपोर्ट, उत्पाद या किसी भी विषय से संबंधित प्रत्येक विवाद का निर्णय केवल अयोध्या (उत्तर प्रदेश, भारत) के सक्षम न्यायालयों द्वारा किया जाएगा।'
              : 'All courses, PDF reports, texts, and software are the exclusive copyright of Astro Sushil Private Limited. Every dispute or legal case regarding our consultations, reports, products, or anything related to Astro Sushil shall be judged exclusively by the competent courts in Ayodhya, Uttar Pradesh, India.',
        ),
      ],
    );
  }

  Widget _buildRefundPolicy(BuildContext context, bool isHindi) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionCard(
          title: isHindi ? '1. सख्त नो-रिफंड नीति (सभी सेवाएं एवं उत्पाद)' : '1. Strict No-Refund Policy (All Offerings)',
          badgeLabel: 'STRICT NO-REFUND',
          body: isHindi
              ? 'एस्ट्रो सुशील (वेबसाइट, iOS एवं Android) पर किया गया प्रत्येक भुगतान अंतिम है। किसी भी परिस्थिति में कोई रिफंड देय नहीं है।'
              : 'All payments made on Astro Sushil (Website, iOS, and Android) are 100% final and strictly non-refundable under any circumstances.',
          bulletPoints: isHindi
              ? [
                  '1-ऑन-1 परामर्श (ऑडियो, वीडियो, व्यक्तिगत एवं व्हाट्सएप संदेश परामर्श) गैर-वापसी योग्य हैं।',
                  'व्यक्तिगत पीडीएफ रिपोर्ट्स, कोर्स, डिजिटल डाउनलोड एवं अभिमंत्रित भौतिक सामग्री गैर-वापसी योग्य हैं।',
                  'सत्र रद्द करने अथवा अनुपस्थिति (No-Show) पर कोई रिफंड नहीं दिया जाएगा।',
                ]
              : [
                  '1-on-1 consultations (Audio, Video, In-Person, and WhatsApp Message) are strictly non-refundable.',
                  'Personalized PDF reports, courses, digital downloads, and consecrated physical items are non-refundable.',
                  'Client cancellations or appointment no-shows do not qualify for any refund.',
                ],
        ),
        _buildSectionCard(
          title: isHindi ? '2. परामर्श पुनर्निर्धारण एवं तकनीकी सहायता' : '2. Rescheduling & Technical Failures',
          badgeLabel: 'ADMIN ONLY',
          body: isHindi
              ? 'ग्राहक परामर्श का समय स्वयं नहीं बदल सकते; केवल एडमिन विशेष परिस्थितियों में समय बदल सकता है। यदि तकनीकी त्रुटि से पीडीएफ रिपोर्ट तैयार नहीं होती है, तो बिना अतिरिक्त शुल्क के रिपोर्ट पुनः तैयार की जाएगी।'
              : 'Clients cannot reschedule consultations from the app or website; only an authorized administrator may reschedule a booking. If a technical failure prevents PDF report generation, Astro Sushil will regenerate it at zero additional cost.',
        ),
        _buildSectionCard(
          title: isHindi ? '3. न्यायिक क्षेत्राधिकार — अयोध्या न्यायालय' : '3. Exclusive Jurisdiction — Ayodhya Court',
          badgeLabel: 'AYODHYA COURT',
          body: isHindi
              ? 'परामर्श, रिपोर्ट, भुगतान अथवा किसी भी विषय से संबंधित प्रत्येक विवाद का न्यायिक निर्णय केवल अयोध्या, उत्तर प्रदेश, भारत के सक्षम न्यायालयों द्वारा किया जाएगा।'
              : 'Every dispute or legal claim regarding consultations, reports, products, or payments shall be judged exclusively by the competent courts in Ayodhya, Uttar Pradesh, India.',
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
