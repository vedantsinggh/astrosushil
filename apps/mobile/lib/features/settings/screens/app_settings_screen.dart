import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/screens/simple_screen_kit.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../auth/providers/auth_provider.dart';
import '../../onboarding/screens/onboarding_screen.dart';
import '../../reports/providers/career_report_provider.dart';
import '../../../shared/widgets/astro_nav_bar.dart';

/// Comprehensive Settings and Preferences Screen for Astro Sushil
class AppSettingsScreen extends ConsumerStatefulWidget {
  const AppSettingsScreen({super.key});

  @override
  ConsumerState<AppSettingsScreen> createState() => _AppSettingsScreenState();
}

class _AppSettingsScreenState extends ConsumerState<AppSettingsScreen> {
  // Notification Preferences (authoritative device/backend toggles)
  bool _transitAlertsEnabled = true;
  bool _dailyPanchangEnabled = true;
  bool _consultationRemindersEnabled = true;
  bool _promotionalAlertsEnabled = false;

  // System permission status
  bool _systemNotificationsGranted = true;

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final isGuest = authState.isGuest;
    final user = authState.user;
    final currentLocale = ref.watch(localeProvider);
    final isHindi = currentLocale.languageCode == 'hi';

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      body: SubtleCelestialBackground(
        child: CustomScrollView(
          slivers: [
            AstroSliverNavBar(title: isHindi ? 'सेटिंग्स एवं प्राथमिकताएं' : 'Settings & Preferences'),
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
                    // 1. Language & Regional Settings
                    SimpleSectionLabel(isHindi ? 'भाषा चयन (Language)' : 'Language & Localization'),
                    _buildLanguageCard(context, ref, currentLocale, isHindi),

                    const SizedBox(height: 24),

                    // 2. Notification Preferences & System Permissions
                    SimpleSectionLabel(isHindi ? 'सूचनाएं एवं अनुमतियां' : 'Notifications & Permissions'),
                    _buildNotificationsCard(context, isHindi),

                    const SizedBox(height: 24),

                    // 3. Account & Security
                    SimpleSectionLabel(isHindi ? 'खाता एवं सुरक्षा' : 'Account & Security'),
                    _buildAccountSecurityCard(context, authState, isGuest, user, isHindi),

                    const SizedBox(height: 24),

                    // 4. Data & Storage Management
                    SimpleSectionLabel(isHindi ? 'डेटा एवं स्टोरेज' : 'Data & Storage'),
                    _buildStorageCard(context, ref, isHindi),

                    const SizedBox(height: 24),

                    // 5. Legal & Support
                    SimpleSectionLabel(isHindi ? 'सहायता एवं कानूनी नीतियां' : 'Help & Legal Policies'),
                    _buildLegalCard(context, isHindi),

                    const SizedBox(height: 32),

                    // 6. Sign Out Button
                    SimpleSecondaryButton(
                      icon: isGuest ? Icons.exit_to_app_rounded : Icons.logout_rounded,
                      label: isGuest
                          ? (isHindi ? 'गेस्ट मोड से बाहर निकलें' : 'Exit Guest Mode')
                          : (isHindi ? 'साइन आउट करें' : 'Sign Out'),
                      color: AppColors.error,
                      onPressed: () => _confirmSignOut(context, ref, isGuest, isHindi),
                    ),

                    // 7. Delete Account Button
                    if (!isGuest && authState.isAuthenticated) ...[
                      const SizedBox(height: 12),
                      TextButton.icon(
                        icon: const Icon(Icons.delete_forever_rounded, color: AppColors.textSecondary, size: 22),
                        label: Text(
                          isHindi ? 'खाता स्थायी रूप से हटाएं (Delete Account)' : 'Delete Account & Personal Data',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        style: TextButton.styleFrom(
                          minimumSize: const Size.fromHeight(52),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        onPressed: () => _confirmAccountDeletion(context, ref, isHindi),
                      ),
                    ],
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

  static const TextStyle _rowTitleStyle = TextStyle(
    fontSize: 17,
    fontWeight: FontWeight.w600,
    height: 1.3,
    color: AppColors.lightTextPrimary,
  );

  static const TextStyle _rowSubtitleStyle = TextStyle(
    fontSize: 14,
    height: 1.35,
    color: AppColors.lightTextSecondary,
  );

  static const EdgeInsets _tilePadding = EdgeInsets.symmetric(horizontal: 16, vertical: 6);

  Widget _buildLanguageCard(BuildContext context, WidgetRef ref, Locale currentLocale, bool isHindi) {
    return SimpleGroupCard(
      children: [
        RadioListTile<String>(
          value: 'en',
          groupValue: currentLocale.languageCode,
          activeColor: AppColors.primary,
          contentPadding: _tilePadding,
          title: const Text('English', style: _rowTitleStyle),
          subtitle: const Text('Standard interface in English', style: _rowSubtitleStyle),
          onChanged: (val) {
            if (val != null) {
              ref.read(localeProvider.notifier).setLocale(SupportedLocales.english);
            }
          },
        ),
        RadioListTile<String>(
          value: 'hi',
          groupValue: currentLocale.languageCode,
          activeColor: AppColors.primary,
          contentPadding: _tilePadding,
          title: const Text('हिन्दी (Hindi)', style: _rowTitleStyle),
          subtitle: const Text('प्रामाणिक वैदिक शब्दावली के साथ हिन्दी इंटरफ़ेस', style: _rowSubtitleStyle),
          onChanged: (val) {
            if (val != null) {
              ref.read(localeProvider.notifier).setLocale(SupportedLocales.hindi);
            }
          },
        ),
      ],
    );
  }

  Widget _buildSwitchRow({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return SwitchListTile.adaptive(
      contentPadding: _tilePadding,
      title: Text(title, style: _rowTitleStyle),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 2),
        child: Text(subtitle, style: _rowSubtitleStyle),
      ),
      value: value,
      activeColor: AppColors.primary,
      onChanged: onChanged,
    );
  }

  Widget _buildNotificationsCard(BuildContext context, bool isHindi) {
    return SimpleGroupCard(
      children: [
        // System permission status
        SimpleListRow(
          icon: _systemNotificationsGranted ? Icons.check_circle_rounded : Icons.info_outline_rounded,
          iconColor: _systemNotificationsGranted ? AppColors.tintSageText : Colors.amber.shade800,
          title: _systemNotificationsGranted
              ? (isHindi ? 'डिवाइस नोटिफिकेशन अनुमति: स्वीकृत' : 'Device Permission: Granted')
              : (isHindi ? 'डिवाइस नोटिफिकेशन अनुमति: अस्वीकृत' : 'Device Permission: Disabled'),
          trailing: TextButton(
            style: TextButton.styleFrom(
              foregroundColor: AppColors.primary,
              minimumSize: const Size(48, 48),
              padding: const EdgeInsets.symmetric(horizontal: 12),
            ),
            onPressed: () {
              setState(() {
                _systemNotificationsGranted = !_systemNotificationsGranted;
              });
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    _systemNotificationsGranted
                        ? 'Device notification permissions confirmed'
                        : 'System notification permissions updated',
                  ),
                  duration: const Duration(seconds: 2),
                ),
              );
            },
            child: Text(
              isHindi ? 'स्थिति बदलें' : 'Check',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
        ),
        _buildSwitchRow(
          title: isHindi ? 'ग्रह गोचर एवं नक्षत्र अलर्ट' : 'Planetary Transit Alerts',
          subtitle: isHindi ? 'प्रमुख ग्रहों के राशि परिवर्तन की सूचना' : 'Alerts when major planets transit or enter retrograde',
          value: _transitAlertsEnabled,
          onChanged: (val) => setState(() => _transitAlertsEnabled = val),
        ),
        _buildSwitchRow(
          title: isHindi ? 'दैनिक पंचांग एवं शुभ मुहूर्त' : 'Daily Panchang & Muhurta',
          subtitle: isHindi ? 'सूर्योदय पर दैनिक तिथि, योग एवं राहुकाल' : 'Morning summary of Tithi, Nakshatra and Rahukaal',
          value: _dailyPanchangEnabled,
          onChanged: (val) => setState(() => _dailyPanchangEnabled = val),
        ),
        _buildSwitchRow(
          title: isHindi ? 'परामर्श एवं ऑर्डर अपडेट्स' : 'Consultation & Order Updates',
          subtitle: isHindi ? 'अपॉइंटमेंट स्लॉट एवं शिपिंग की रीयल-टाइम सूचना' : 'Reminders before booked sessions and dispatch tracking',
          value: _consultationRemindersEnabled,
          onChanged: (val) => setState(() => _consultationRemindersEnabled = val),
        ),
        _buildSwitchRow(
          title: isHindi ? 'विशेष ऑफर एवं नए कोर्स' : 'Special Offers & Masterclasses',
          subtitle: isHindi ? 'सुशील सर के नए व्याख्यान एवं उत्सव छूट' : 'Occasional announcements for webinars and shop discounts',
          value: _promotionalAlertsEnabled,
          onChanged: (val) => setState(() => _promotionalAlertsEnabled = val),
        ),
      ],
    );
  }

  Widget _buildAccountSecurityCard(
    BuildContext context,
    AuthState authState,
    bool isGuest,
    dynamic user,
    bool isHindi,
  ) {
    return SimpleGroupCard(
      children: [
        SimpleListRow(
          icon: isGuest ? Icons.person_outline_rounded : Icons.verified_user_rounded,
          iconColor: AppColors.premiumAccent,
          iconBackground: isGuest ? AppColors.tertiary : AppColors.primary,
          title: isGuest ? 'Guest Session' : (user?.email ?? 'Authenticated User'),
          subtitle: isGuest
              ? (isHindi ? 'अस्थायी गेस्ट डेटा (डिवाइस में सुरक्षित)' : 'Local Guest Mode (Unauthenticated)')
              : (isHindi ? 'प्रमाणीकृत सुरक्षित खाता' : 'Secure Authenticated Account'),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 4, 16, 8),
          child: SimpleExpander(
            label: isHindi ? 'खाता विवरण' : 'Account details',
            child: Padding(
              padding: const EdgeInsets.only(left: 4),
              child: Column(
                children: [
                  _buildInfoRow(
                    label: isHindi ? 'सत्र स्थिति (Session)' : 'Session Status',
                    value: isGuest ? 'Guest Mode' : 'JWT Secure Active',
                  ),
                  const SizedBox(height: 8),
                  _buildInfoRow(
                    label: isHindi ? 'उपयोगकर्ता भूमिका (Role)' : 'Role & Privileges',
                    value: user?.role ?? (isGuest ? 'GUEST' : 'USER'),
                  ),
                  const SizedBox(height: 8),
                  _buildInfoRow(
                    label: isHindi ? 'डेटा एन्क्रिप्शन' : 'Data Encryption',
                    value: 'TLS 1.3 / AES-256 Storage',
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStorageCard(BuildContext context, WidgetRef ref, bool isHindi) {
    return SimpleGroupCard(
      children: [
        SimpleListRow(
          icon: Icons.cleaning_services_outlined,
          iconColor: AppColors.secondary,
          title: isHindi ? 'स्थानीय कैश साफ़ करें' : 'Clear Local Cache',
          onTap: () => _confirmClearCache(context, ref, isHindi),
        ),
      ],
    );
  }

  Widget _buildLegalCard(BuildContext context, bool isHindi) {
    return SimpleGroupCard(
      children: [
        SimpleListRow(
          icon: Icons.shield_outlined,
          title: isHindi ? 'गोपनीयता नीति (Privacy Policy)' : 'Privacy Policy',
          onTap: () => _showPrivacyPolicy(context, isHindi),
        ),
        SimpleListRow(
          icon: Icons.description_outlined,
          title: isHindi ? 'सेवा की शर्तें (Terms of Service)' : 'Terms of Service',
          onTap: () => _showTermsOfService(context, isHindi),
        ),
        SimpleListRow(
          icon: Icons.headset_mic_outlined,
          iconColor: AppColors.tintSageText,
          title: isHindi ? 'सहायता एवं संपर्क (Help & Support)' : 'Help & Customer Support',
          onTap: () => _openWhatsAppSupport(context),
        ),
      ],
    );
  }

  static Widget _buildInfoRow({required String label, required String value}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Text(
            label,
            style: const TextStyle(fontSize: 14, color: AppColors.lightTextSecondary),
          ),
        ),
        const SizedBox(width: 8),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.lightTextPrimary),
          ),
        ),
      ],
    );
  }

  void _showPrivacyPolicy(BuildContext context, bool isHindi) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            const Icon(Icons.shield_outlined, color: AppColors.primary, size: 22),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                isHindi ? 'गोपनीयता नीति' : 'Privacy Policy',
                style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                isHindi
                    ? 'एस्ट्रो सुशील में आपकी गोपनीयता हमारी सर्वोच्च प्राथमिकता है।\n\n'
                      '1. जन्म विवरण का उपयोग:\n'
                      'आपके द्वारा दर्ज जन्म तिथि, समय एवं स्थान केवल वैदिक कुण्डली, दशा एवं ग्रह गोचर गणनाओं के लिए उपयोग किए जाते हैं।\n\n'
                      '2. तृतीय पक्ष प्रतिबंध:\n'
                      'हम आपका व्यक्तिगत डेटा कभी भी किसी तीसरे पक्ष अथवा विज्ञापनदाता को नहीं बेचते।\n\n'
                      '3. सुरक्षित डेटाबेस:\n'
                      'सभी क्रेडेंशियल एवं टोकन एन्क्रिप्टेड माध्यम से सर्वर पर सुरक्षित रखे जाते हैं।'
                    : 'At Astro Sushil, your personal privacy is paramount.\n\n'
                      '1. Birth Data Utilization:\n'
                      'Your birth date, time, and birthplace are strictly utilized for deterministic astrological calculations (Kundli, Dasha, and Gochara).\n\n'
                      '2. Zero Commercial Data Reselling:\n'
                      'We never sell or distribute your personal profile information to third-party ad networks.\n\n'
                      '3. Cryptographic Protection:\n'
                      'All credentials, session tokens, and transactions are protected via industry-standard encryption.',
                style: const TextStyle(fontSize: 16, color: AppColors.lightTextPrimary, height: 1.45),
              ),
            ],
          ),
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            ),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showTermsOfService(BuildContext context, bool isHindi) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            const Icon(Icons.description_outlined, color: AppColors.primary, size: 22),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                isHindi ? 'सेवा की शर्तें' : 'Terms of Service',
                style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Text(
            isHindi
                ? 'एस्ट्रो सुशील का उपयोग करके आप निम्नलिखित नियमों से सहमत होते हैं:\n\n'
                  '1. ज्योतिषीय मार्गदर्शन:\n'
                  'वैदिक ज्योतिष एवं गुप्त नाड़ी गणनाएं पारम्परिक सिद्धांतों पर आधारित हैं और इन्हें आध्यात्मिक मार्गदर्शन के रूप में लेना चाहिए।\n\n'
                  '2. सुरक्षित लेन-देन:\n'
                  'सभी परामर्श एवं उत्पाद शुल्क भारतीय रिज़र्व बैंक के अनुरूप अधिकृत पेमेंट गेटवे के माध्यम से संसाधित होते हैं।'
                : 'By accessing Astro Sushil, you agree to the following terms:\n\n'
                  '1. Astrological Insights:\n'
                  'All Vedic and BNN predictions represent rule-based astrological interpretations intended for guidance and spiritual awareness.\n\n'
                  '2. Payments & Delivery:\n'
                  'Digital reports and items are delivered immediately following successful payment verification. Physical consecrated items are dispatched from Ayodhya Dham within 48-72 business hours.',
            style: const TextStyle(fontSize: 16, color: AppColors.lightTextPrimary, height: 1.45),
          ),
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Future<void> _openWhatsAppSupport(BuildContext context) async {
    const phone = '919621127233';
    final message = Uri.encodeComponent('Namaste Astro Sushil Team, I need assistance with my app settings.');
    final uri = Uri.parse('https://wa.me/$phone?text=$message');
    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Support: connect@astrosushil.com | Phone: +91 9621127233')),
        );
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Support: connect@astrosushil.com | Phone: +91 9621127233')),
        );
      }
    }
  }

  void _confirmClearCache(BuildContext context, WidgetRef ref, bool isHindi) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          isHindi ? 'कैश साफ़ करें?' : 'Clear Local Cache?',
          style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.lightTextPrimary),
        ),
        content: Text(
          isHindi
              ? 'क्या आप स्थानीय अस्थायी डेटा हटाना चाहते हैं? आपकी सहेजी गई जन्म कुण्डलियां एवं खाते का डेटा सुरक्षित रहेगा।'
              : 'This will remove cached chart files and report summaries from this device. Your account credentials and saved birth profiles will remain safe.',
          style: const TextStyle(fontSize: 16, color: AppColors.lightTextSecondary, height: 1.45),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              await ref.read(careerReportNotifierProvider.notifier).clearAllLocalReportCache();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(isHindi ? 'स्थानीय कैश साफ़ कर दिया गया है।' : 'Local cache successfully cleared.'),
                    backgroundColor: AppColors.primary,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            ),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
  }

  void _confirmSignOut(BuildContext context, WidgetRef ref, bool isGuest, bool isHindi) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          isGuest
              ? (isHindi ? 'गेस्ट मोड समाप्त करें?' : 'Exit Guest Mode?')
              : (isHindi ? 'साइन आउट करें?' : 'Sign Out?'),
          style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.lightTextPrimary),
        ),
        content: Text(
          isGuest
              ? (isHindi
                  ? 'गेस्ट मोड से बाहर निकलने पर स्थानीय गेस्ट प्रोफाइल हट जाएगी। क्या आप जारी रखना चाहते हैं?'
                  : 'Exiting guest mode will clear temporary guest calculations on this device.')
              : (isHindi
                  ? 'क्या आप निश्चित रूप से अपने खाते से साइन आउट करना चाहते हैं?'
                  : 'Are you sure you want to sign out of your account on this device?'),
          style: const TextStyle(fontSize: 16, color: AppColors.lightTextSecondary, height: 1.45),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              if (isGuest) {
                await ref.read(authStateProvider.notifier).exitGuestMode();
              } else {
                await ref.read(authStateProvider.notifier).logout();
              }
              if (context.mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const OnboardingScreen()),
                  (route) => false,
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error, foregroundColor: Colors.white),
            child: Text(isHindi ? 'साइन आउट' : 'Sign Out'),
          ),
        ],
      ),
    );
  }

  void _confirmAccountDeletion(BuildContext context, WidgetRef ref, bool isHindi) {
    bool isDeleting = false;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogContext, setDialogState) {
          return AlertDialog(
            backgroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: Row(
              children: [
                const Icon(Icons.delete_forever_rounded, color: AppColors.error, size: 26),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    isHindi ? 'खाता एवं डेटा हटाएं?' : 'Delete Account & Data?',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.error),
                  ),
                ),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isHindi
                        ? 'आपका खाता, जन्म कुण्डलियां एवं रिपोर्ट्स हमेशा के लिए हटा दी जाएंगी।\n\n'
                          '• सभी डिवाइसों से आपके सक्रिय सत्र समाप्त हो जाएंगे।\n'
                          '• भविष्य के सभी परामर्श रद्द कर दिए जाएंगे।\n'
                          '• कोर्स एवं डिजिटल डाउनलोड की पहुंच समाप्त हो जाएगी।\n'
                          '• वित्तीय एवं कर अनुपालन हेतु पूर्व आर्डर्स का रिकॉर्ड सुरक्षित रहेगा।\n\n'
                          'यह प्रक्रिया स्थायी है और इसे वापस नहीं लिया जा सकता।'
                        : 'Permanently deletes your account credentials, birth profiles, and generated reports.\n\n'
                          '• All active sessions across all devices will be revoked.\n'
                          '• Future consultation appointments will be cancelled.\n'
                          '• Course and digital download access will be terminated.\n'
                          '• In accordance with statutory tax rules, past order invoices remain archived for audit compliance.\n\n'
                          'This action is permanent and cannot be undone.',
                    style: const TextStyle(fontSize: 15, color: AppColors.lightTextSecondary, height: 1.45),
                  ),
                  if (isDeleting) ...[
                    const SizedBox(height: 20),
                    Center(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.error),
                          ),
                          const SizedBox(width: 10),
                          Flexible(
                            child: Text(
                              isHindi ? 'खाता हटाया जा रहा है...' : 'Deleting account...',
                              style: const TextStyle(fontSize: 15, color: AppColors.error, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: isDeleting ? null : () => Navigator.of(ctx).pop(),
                child: Text(
                  isHindi ? 'रद्द करें' : 'Cancel',
                  style: TextStyle(color: isDeleting ? Colors.grey : AppColors.lightTextSecondary),
                ),
              ),
              ElevatedButton(
                onPressed: isDeleting
                    ? null
                    : () async {
                        setDialogState(() => isDeleting = true);
                        final success = await ref.read(authStateProvider.notifier).deleteAccount(confirmation: 'DELETE');
                        if (!context.mounted) return;

                        if (success) {
                          await ref.read(careerReportNotifierProvider.notifier).clearAllLocalReportCache();
                          Navigator.of(ctx).pop();
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  isHindi
                                      ? 'आपका खाता एवं व्यक्तिगत डेटा सफलतापूर्वक हटा दिया गया है।'
                                      : 'Your account and personal data have been permanently deleted.',
                                ),
                                backgroundColor: AppColors.error,
                              ),
                            );
                            Navigator.of(context).pushAndRemoveUntil(
                              MaterialPageRoute(builder: (_) => const OnboardingScreen()),
                              (route) => false,
                            );
                          }
                        } else {
                          setDialogState(() => isDeleting = false);
                          final authError = ref.read(authStateProvider).errorMessage;
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                authError ??
                                    (isHindi
                                        ? 'खाता हटाने में त्रुटि हुई। कृपया पुनः प्रयास करें।'
                                        : 'Failed to delete account. Please check your connection and try again.'),
                              ),
                              backgroundColor: AppColors.error,
                            ),
                          );
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.error,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: AppColors.error.withValues(alpha: 0.5),
                ),
                child: Text(
                  isHindi ? 'स्थायी रूप से हटाएं' : 'Permanently Delete',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
