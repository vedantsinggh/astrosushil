import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/localization/locale_provider.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/signup_screen.dart';
import '../../features/birth_profile/screens/birth_profile_list_screen.dart';
import '../../features/birth_profile/screens/create_birth_profile_screen.dart';
import '../../features/courses/screens/courses_hub_screen.dart';
import '../../features/onboarding/screens/onboarding_screen.dart';
import '../../features/settings/screens/app_settings_screen.dart';
import '../../features/reports/providers/career_report_provider.dart';
import '../../features/shop/screens/shop_catalog_screen.dart';
import '../../features/shop/screens/order_history_screen.dart';
import '../../features/shop/screens/digital_downloads_screen.dart';
import '../../features/shop/screens/shipping_addresses_screen.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/widgets/subtle_celestial_background.dart';
import '../../features/support/screens/help_support_screen.dart';
import '../../features/legal/screens/legal_documents_screen.dart';
import 'consult_screen.dart';
import 'reports_screen.dart';

/// Screen shell for Account / Profile tab in Bottom Navigation
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  void _showLanguageSelector(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final activeLocale = ref.read(localeProvider);

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
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
              const SizedBox(height: 16),
              Text(
                l10n.selectLanguage,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 16),
              _LanguageOptionTile(
                title: l10n.languageEnglish,
                subtitle: 'English',
                isSelected: activeLocale.languageCode == 'en',
                onTap: () {
                  ref.read(localeProvider.notifier).setLocale(SupportedLocales.english);
                  Navigator.of(ctx).pop();
                },
              ),
              const SizedBox(height: 8),
              _LanguageOptionTile(
                title: l10n.languageHindi,
                subtitle: 'देवनागरी (Devanagari)',
                isSelected: activeLocale.languageCode == 'hi',
                onTap: () {
                  ref.read(localeProvider.notifier).setLocale(SupportedLocales.hindi);
                  Navigator.of(ctx).pop();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showSignOutConfirmation(BuildContext context, WidgetRef ref, bool isGuest) {
    final l10n = context.l10n;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          isGuest ? l10n.exitGuestModeConfirmTitle : l10n.signOutConfirmTitle,
          style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.lightTextPrimary),
        ),
        content: Text(
          isGuest ? l10n.exitGuestModeConfirmMessage : l10n.signOutConfirmMessage,
          style: const TextStyle(fontSize: 14, color: AppColors.lightTextSecondary, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(l10n.cancel),
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
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            child: Text(isGuest ? l10n.signOut : l10n.signOut),
          ),
        ],
      ),
    );
  }

  void _showDeleteCacheConfirmation(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          l10n.deleteCacheTitle,
          style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.lightTextPrimary),
        ),
        content: Text(
          l10n.deleteCacheConfirm,
          style: const TextStyle(fontSize: 14, color: AppColors.lightTextSecondary, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(l10n.cancel),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              await ref.read(careerReportNotifierProvider.notifier).clearAllLocalReportCache();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(l10n.deleteCacheSubtitle)),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            child: Text(l10n.confirm),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final authState = ref.watch(authStateProvider);
    final isGuest = authState.isGuest;
    final user = authState.user;
    final currentLocale = ref.watch(localeProvider);
    final isHindi = currentLocale.languageCode == 'hi';

    final email = isGuest ? l10n.guestModeTitle : (user?.email ?? l10n.accountTitle);
    final initial = isGuest ? 'G' : (email.isNotEmpty ? email[0].toUpperCase() : 'U');

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AppBar(
        title: Text(
          l10n.accountTitle,
          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. User Header Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.cardSurfaceWarm,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.cardBorder),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.02),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: isGuest ? AppColors.tertiary : AppColors.primary,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppColors.premiumAccent,
                            width: 2,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            initial,
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: AppColors.premiumAccent,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              email,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppColors.lightTextPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: isGuest
                                    ? AppColors.premiumAccent.withValues(alpha: 0.2)
                                    : AppColors.primary.withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                isGuest ? 'GUEST USER' : 'AUTHENTICATED USER',
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                if (isGuest) ...[
                  const SizedBox(height: 14),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.star_rounded, color: AppColors.premiumAccent, size: 20),
                            const SizedBox(width: 8),
                            Text(
                              l10n.guestModeTitle,
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          l10n.guestModeSubtitle,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.85),
                            fontSize: 12,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton(
                                onPressed: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(builder: (_) => const SignupScreen()),
                                  );
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.premiumAccent,
                                  foregroundColor: AppColors.primary,
                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                                child: Text(l10n.createAccount, style: const TextStyle(fontWeight: FontWeight.bold)),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(builder: (_) => const LoginScreen()),
                                  );
                                },
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Colors.white,
                                  side: const BorderSide(color: Colors.white54),
                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                                child: Text(l10n.signIn, style: const TextStyle(fontWeight: FontWeight.bold)),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 22),

                // 2. My Purchases & Commerce Hub
                Text(
                  isHindi ? 'खरीदारी एवं सेवाएं (My Purchases)' : 'My Purchases & Orders',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 10),

                // Spiritual Shop
                _ProfileTile(
                  icon: Icons.storefront_rounded,
                  title: isHindi ? 'आध्यात्मिक शॉप' : 'Spiritual Shop',
                  subtitle: isHindi ? 'अभिमंत्रित जड़ी-बूटी, पवित्र कला एवं वॉलपेपर' : 'Consecrated herbs, sacred art & wallpapers',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const ShopCatalogScreen()),
                    );
                  },
                ),
                const SizedBox(height: 10),

                // My Orders
                _ProfileTile(
                  icon: Icons.receipt_long_outlined,
                  title: isHindi ? 'मेरे आर्डर्स एवं रसीदें' : 'My Orders & Purchases',
                  subtitle: isHindi ? 'सभी उत्पादों, रिपोर्ट एवं कोर्स का विवरण' : 'Track orders, shipping status & invoices',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const OrderHistoryScreen()),
                    );
                  },
                ),
                const SizedBox(height: 10),

                // My Digital Library
                _ProfileTile(
                  icon: Icons.download_for_offline_outlined,
                  title: isHindi ? 'मेरी डिजिटल लाइब्रेरी' : 'My Digital Library',
                  subtitle: isHindi ? 'खरीदे गए वॉलपेपर, कला एवं मंत्र डाउनलोड करें' : 'Purchased wallpapers, 4K art & secret mantras',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const DigitalDownloadsScreen()),
                    );
                  },
                ),
                const SizedBox(height: 10),

                // Saved Shipping Addresses
                _ProfileTile(
                  icon: Icons.location_on_outlined,
                  title: isHindi ? 'सुरक्षित डिलीवरी पते' : 'Delivery Addresses',
                  subtitle: isHindi ? 'भौतिक उत्पादों हेतु पते प्रबंधित करें' : 'Manage shipping addresses for physical items',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const ShippingAddressesScreen()),
                    );
                  },
                ),

                const SizedBox(height: 22),

                // 3. Learning & Consultations
                Text(
                  isHindi ? 'शिक्षा एवं परामर्श सेवाएं' : 'Learning & Consultations',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 10),

                // My Learning (Purchased Courses)
                _ProfileTile(
                  icon: Icons.play_lesson_outlined,
                  title: l10n.myLearningTab,
                  subtitle: isHindi ? 'नामांकित मास्टरक्लास एवं प्रगति' : 'Enrolled masterclasses & watched progress',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const CoursesHubScreen(initialTab: 1)),
                    );
                  },
                ),
                const SizedBox(height: 10),

                // All Courses & Masterclasses
                _ProfileTile(
                  icon: Icons.school_outlined,
                  title: l10n.coursesScreenTitle,
                  subtitle: isHindi ? 'प्रामाणिक गुप्त नाड़ी एवं वैदिक ज्योतिष सीखें' : 'Explore authentic Gupta Nadi & Vedic courses',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const CoursesHubScreen(initialTab: 0)),
                    );
                  },
                ),
                const SizedBox(height: 10),

                // My Consultations
                _ProfileTile(
                  icon: Icons.calendar_month_outlined,
                  title: isHindi ? 'मेरे ज्योतिष परामर्श' : 'My Consultations & Appointments',
                  subtitle: isHindi ? 'सुशील सर एवं विशेषज्ञ ज्योतिषियों से परामर्श' : 'Book and view consultation sessions',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const ConsultScreen()),
                    );
                  },
                ),
                const SizedBox(height: 10),

                // My Kundli Reports
                _ProfileTile(
                  icon: Icons.description_outlined,
                  title: isHindi ? 'मेरी जन्म कुंडलियां एवं रिपोर्ट्स' : 'My Kundli Reports & Analysis',
                  subtitle: isHindi ? 'विस्तृत पीडीएफ रिपोर्ट्स एवं भविष्यवाणियां' : 'Career, marriage & planetary reports',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const ReportsScreen()),
                    );
                  },
                ),

                const SizedBox(height: 22),

                // 4. Profiles & Astrology Section
                Text(
                  isHindi ? 'जन्म कुंडलियां एवं प्रोफाइल' : 'Saved Profiles & Astrology',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 10),

                // Saved Birth Profiles
                _ProfileTile(
                  icon: Icons.people_outline_rounded,
                  title: l10n.savedProfilesTitle,
                  subtitle: l10n.savedProfilesSubtitle,
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const BirthProfileListScreen()),
                    );
                  },
                ),
                const SizedBox(height: 10),

                // Add New Profile
                _ProfileTile(
                  icon: Icons.add_circle_outline_rounded,
                  title: l10n.addBirthProfile,
                  subtitle: l10n.createProfilePrompt,
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
                    );
                  },
                ),

                const SizedBox(height: 22),

                // 5. Preferences & Settings
                Text(
                  l10n.appSettingsTitle,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 10),

                // Language Tile
                _ProfileTile(
                  icon: Icons.translate_rounded,
                  title: l10n.languageSetting,
                  subtitle: currentLocale.languageCode == 'hi' ? l10n.languageHindi : l10n.languageEnglish,
                  trailingText: currentLocale.languageCode == 'hi' ? 'हिन्दी' : 'English',
                  onTap: () => _showLanguageSelector(context, ref),
                ),
                const SizedBox(height: 10),

                // Settings & Preferences Full Hub
                _ProfileTile(
                  icon: Icons.settings_outlined,
                  title: isHindi ? 'ऐप सेटिंग्स एवं नोटिफिकेशन' : 'App Settings & Notifications',
                  subtitle: isHindi ? 'भाषा, गोचर अलर्ट, सुरक्षा एवं डेटा प्रबंधन' : 'Notification alerts, device permissions & security',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const AppSettingsScreen()),
                    );
                  },
                ),

                const SizedBox(height: 22),

                // 6. Support & Policies
                Text(
                  l10n.helpSupportTitle,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 10),

                // WhatsApp Support & FAQs
                _ProfileTile(
                  icon: Icons.chat_bubble_outline_rounded,
                  title: l10n.helpSupportTitle,
                  subtitle: l10n.helpSupportSubtitle,
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const HelpSupportScreen(),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 10),

                // Shipping & Return Policies
                _ProfileTile(
                  icon: Icons.local_shipping_outlined,
                  title: isHindi ? 'शिपिंग एवं डिलीवरी नीति' : 'Shipping & Delivery Policy',
                  subtitle: isHindi ? '48-72 घंटे में डिस्पैच, ₹2,000+ पर मुफ्त डिलीवरी' : 'Pan-India delivery details & tracking terms',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const LegalDocumentsScreen(
                          initialDocument: LegalDocumentType.shipping,
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 10),

                _ProfileTile(
                  icon: Icons.assignment_return_outlined,
                  title: isHindi ? 'रिफंड एवं वापसी नीति' : 'Refund & Cancellation Policy',
                  subtitle: isHindi ? 'पारदर्शी एवं निष्पक्ष रिफंड नियम' : 'Terms for digital & physical returns',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const LegalDocumentsScreen(
                          initialDocument: LegalDocumentType.refund,
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 10),

                // Privacy Policy
                _ProfileTile(
                  icon: Icons.shield_outlined,
                  title: l10n.privacyPolicyTitle,
                  subtitle: l10n.privacyPolicySubtitle,
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const LegalDocumentsScreen(
                          initialDocument: LegalDocumentType.privacy,
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 10),

                // Clear Cache
                _ProfileTile(
                  icon: Icons.cleaning_services_outlined,
                  title: l10n.deleteCacheTitle,
                  subtitle: l10n.deleteCacheSubtitle,
                  onTap: () => _showDeleteCacheConfirmation(context, ref),
                ),

                const SizedBox(height: 24),

                // 7. Logout / Exit Guest Mode
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: OutlinedButton.icon(
                    onPressed: () => _showSignOutConfirmation(context, ref, isGuest),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.error,
                      side: const BorderSide(color: AppColors.error, width: 1.5),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    icon: Icon(isGuest ? Icons.exit_to_app_rounded : Icons.logout_rounded, size: 20),
                    label: Text(
                      isGuest ? l10n.signOut : l10n.signOut,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
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
}

class _ProfileTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String? trailingText;
  final VoidCallback onTap;

  const _ProfileTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.trailingText,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.cardSurfaceWarm,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          constraints: const BoxConstraints(minHeight: 56),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.cardBorder),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: AppColors.primary, size: 20),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: AppColors.lightTextPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.lightTextSecondary,
                        height: 1.2,
                      ),
                    ),
                  ],
                ),
              ),
              if (trailingText != null) ...[
                const SizedBox(width: 8),
                Text(
                  trailingText!,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ],
              const SizedBox(width: 6),
              const Icon(
                Icons.chevron_right_rounded,
                color: AppColors.lightTextMuted,
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LanguageOptionTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final bool isSelected;
  final VoidCallback onTap;

  const _LanguageOptionTile({
    required this.title,
    required this.subtitle,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isSelected ? AppColors.primary : AppColors.lightBorder,
          width: isSelected ? 1.5 : 1.0,
        ),
      ),
      leading: Icon(
        isSelected ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
        color: isSelected ? AppColors.primary : AppColors.lightTextMuted,
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 15,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          color: AppColors.lightTextPrimary,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary),
      ),
    );
  }
}
