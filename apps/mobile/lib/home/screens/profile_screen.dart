import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/localization/locale_provider.dart';
import '../../features/auth/models/user_model.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/signup_screen.dart';
import '../../features/birth_profile/models/birth_profile_model.dart';
import '../../features/birth_profile/providers/birth_profile_provider.dart';
import '../../features/birth_profile/screens/birth_profile_list_screen.dart';
import '../../features/birth_profile/screens/create_birth_profile_screen.dart';
import '../../features/legal/screens/legal_documents_screen.dart';
import '../../features/notifications/screens/notifications_screen.dart';
import '../../features/onboarding/screens/onboarding_screen.dart';
import '../../features/settings/screens/app_settings_screen.dart';
import '../../features/shop/screens/order_history_screen.dart';
import '../../features/shop/screens/shipping_addresses_screen.dart';
import '../../features/support/screens/help_support_screen.dart';
import '../../shared/screens/simple_screen_kit.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_theme_tokens.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/astro_nav_bar.dart';
import '../../shared/widgets/astro_sheets.dart';
import '../providers/home_provider.dart';

const int _kHomeTabIndex = 0;

/// Soft per-row icon colours (iOS Settings style tinted squares).
/// Material icons are used on purpose: cupertino_icons is not a dependency,
/// so CupertinoIcons glyphs would render as empty boxes.
class _RowColors {
  static const profiles = Color(0xFF5B5BD6);
  static const orders = Color(0xFFE08A1E);
  static const addresses = Color(0xFF2F9E62);
  static const notifications = Color(0xFFE5484D);
  static const language = Color(0xFF3A7BEA);
  static const settings = Color(0xFF7A8496);
  static const help = Color(0xFF14A08C);
  static const legal = Color(0xFF5E6B80);
}

/// Account tab, styled like a native iOS settings page:
/// - large "Account" title that collapses into a compact bar on scroll
/// - profile card: name, phone / email and the active birth profile
///   ("Change"); guests get a "Sign in / Create account" card instead
/// - short inset-grouped sections with tinted icon squares and chevrons
/// - a red "Sign out" row (or "Exit guest mode" for guests)
///
/// Reports and bookings are not listed here: they have their own bottom
/// tabs. Downloads live under My orders (order detail) and courses under
/// Home → Courses → My Learning.
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _signingOut = false;

  bool get _isHindi => Localizations.maybeLocaleOf(context)?.languageCode == 'hi';

  void _push(Widget screen) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));
  }

  // ---------------------------------------------------------------------------
  // Action sheets
  // ---------------------------------------------------------------------------

  Future<void> _showLanguageSelector() async {
    final l10n = context.l10n;
    final isHindiNow = ref.read(localeProvider).languageCode == 'hi';

    final picked = await showAstroActionSheet<Locale>(
      context: context,
      title: l10n.selectLanguage,
      actions: [
        AstroSheetAction(
          key: const ValueKey('account-lang-en'),
          label: l10n.languageEnglish,
          value: SupportedLocales.english,
          selected: !isHindiNow,
        ),
        AstroSheetAction(
          key: const ValueKey('account-lang-hi'),
          label: l10n.languageHindi,
          value: SupportedLocales.hindi,
          selected: isHindiNow,
        ),
      ],
    );
    if (picked != null && mounted) {
      ref.read(localeProvider.notifier).setLocale(picked);
    }
  }

  Future<void> _showProfileSwitcher() async {
    final l10n = context.l10n;
    final profiles = ref.read(birthProfilesListNotifierProvider).profiles;
    final activeProfile = ref.read(selectedBirthProfileProvider);
    const addValue = '__add_profile__';

    final picked = await showAstroActionSheet<String>(
      context: context,
      title: l10n.switchProfile,
      actions: [
        for (final p in profiles)
          AstroSheetAction(
            key: ValueKey('account-switch-${p.id}'),
            label: p.name,
            value: p.id,
            selected: p.id == activeProfile?.id,
          ),
        AstroSheetAction(
          key: const ValueKey('account-switch-add'),
          label: l10n.addBirthProfile,
          value: addValue,
          icon: Icons.add_rounded,
        ),
      ],
    );
    if (picked == null || !mounted) return;
    if (picked == addValue) {
      _push(const CreateBirthProfileScreen());
    } else {
      ref.read(selectedBirthProfileIdProvider.notifier).state = picked;
    }
  }

  Future<void> _confirmSignOut(bool isGuest) async {
    final l10n = context.l10n;
    final isHindi = _isHindi;

    final confirmed = await showAstroActionSheet<bool>(
      context: context,
      title: isGuest ? l10n.exitGuestModeConfirmTitle : l10n.signOutConfirmTitle,
      message: isGuest
          // Exiting guest mode also deletes the guest's birth details on
          // this device (see AuthNotifier.exitGuestMode), so say so.
          ? (isHindi
              ? 'इस डिवाइस पर सहेजी गई गेस्ट जन्म जानकारी हट जाएगी।'
              : 'The guest birth details saved on this device will be removed.')
          : l10n.signOutConfirmMessage,
      cancelLabel: l10n.cancel,
      actions: [
        AstroSheetAction(
          key: const ValueKey('account-signout-confirm'),
          label: isGuest ? (isHindi ? 'गेस्ट मोड छोड़ें' : 'Exit guest mode') : l10n.signOut,
          value: true,
          isDestructive: true,
        ),
      ],
    );

    if (confirmed != true || !mounted) return;

    setState(() => _signingOut = true);
    final auth = ref.read(authStateProvider.notifier);
    if (isGuest) {
      await auth.exitGuestMode();
    } else {
      await auth.logout();
    }
    if (!mounted) return;
    // The next person to sign in should start on Home, not on this tab.
    ref.read(homeTabControllerProvider.notifier).state = _kHomeTabIndex;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const OnboardingScreen()),
      (route) => false,
    );
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  /// Shared adaptive large-title nav bar. As a tab root there is no back
  /// button; when pushed as its own page the adaptive back button shows.
  Widget _buildNavBar(String title) {
    final isPushed = ModalRoute.of(context)?.canPop ?? false;
    return AstroSliverNavBar(title: title, showBack: isPushed);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final authState = ref.watch(authStateProvider);
    final isSignedIn = authState.isAuthenticated && authState.user != null;
    final isGuest = authState.isGuest;
    // Follow the locale the app is actually rendered in (MaterialApp.locale
    // is driven by localeProvider), so labels always match l10n strings.
    final isHindi = Localizations.maybeLocaleOf(context)?.languageCode == 'hi';
    final profilesState = ref.watch(birthProfilesListNotifierProvider);
    final activeProfile = ref.watch(selectedBirthProfileProvider);

    String t(String en, String hi) => isHindi ? hi : en;

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: CustomScrollView(
        slivers: [
          _buildNavBar(l10n.navAccount),
          SliverSafeArea(
            top: false,
            sliver: SliverPadding(
              // Same top gap / bottom clearance as the other tab roots.
              padding: EdgeInsets.fromLTRB(
                AstroMetrics.gutter,
                8,
                AstroMetrics.gutter,
                32 + MediaQuery.paddingOf(context).bottom,
              ),
              sliver: SliverToBoxAdapter(
                child: Center(
                  // Comfortable reading width on tablets and in landscape.
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: AstroMetrics.maxContentWidth),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // 1. Who is signed in (or a clear way to sign in).
                        if (isSignedIn)
                          _ProfileCard(
                            user: authState.user!,
                            activeProfile: activeProfile,
                            profilesState: profilesState,
                            onChangeProfile: _showProfileSwitcher,
                            onAddProfile: () => _push(const CreateBirthProfileScreen()),
                            onRetryProfiles: () =>
                                ref.read(birthProfilesListNotifierProvider.notifier).fetchProfiles(),
                          )
                        else
                          _SignInCard(
                            isGuest: isGuest,
                            onSignIn: () => _push(const LoginScreen()),
                            onCreateAccount: () => _push(const SignupScreen()),
                          ),
                        const SizedBox(height: 28),

                        // 2. Profiles and purchases. Orders and addresses
                        //    need an account; guests see the card above.
                        _InsetSection(
                          children: [
                            _SettingsRow(
                              key: const ValueKey('account-row-birth-profiles'),
                              icon: Icons.people_alt_rounded,
                              color: _RowColors.profiles,
                              title: t('Birth profiles', 'जन्म प्रोफाइल'),
                              value: isSignedIn ? null : activeProfile?.name,
                              onTap: () => _push(const BirthProfileListScreen()),
                            ),
                            if (isSignedIn) ...[
                              _SettingsRow(
                                key: const ValueKey('account-row-orders'),
                                icon: Icons.shopping_bag_rounded,
                                color: _RowColors.orders,
                                title: t('My orders', 'मेरे ऑर्डर'),
                                onTap: () => _push(const OrderHistoryScreen()),
                              ),
                              _SettingsRow(
                                key: const ValueKey('account-row-addresses'),
                                icon: Icons.location_on_rounded,
                                color: _RowColors.addresses,
                                title: t('Delivery addresses', 'डिलीवरी पते'),
                                onTap: () => _push(const ShippingAddressesScreen()),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 28),

                        // 3. App preferences.
                        _InsetSection(
                          children: [
                            _SettingsRow(
                              key: const ValueKey('account-row-notifications'),
                              icon: Icons.notifications_rounded,
                              color: _RowColors.notifications,
                              title: t('Notifications', 'सूचनाएं'),
                              onTap: () => _push(const NotificationsScreen()),
                            ),
                            _SettingsRow(
                              key: const ValueKey('account-row-language'),
                              icon: Icons.language_rounded,
                              color: _RowColors.language,
                              title: l10n.languageSetting,
                              value: isHindi ? 'हिन्दी' : 'English',
                              onTap: _showLanguageSelector,
                            ),
                            _SettingsRow(
                              key: const ValueKey('account-row-settings'),
                              icon: Icons.settings_rounded,
                              color: _RowColors.settings,
                              title: t('Settings', 'सेटिंग्स'),
                              onTap: () => _push(const AppSettingsScreen()),
                            ),
                          ],
                        ),
                        const SizedBox(height: 28),

                        // 4. Help. Policies stay here because neither the
                        //    Help nor the Settings screen links to them.
                        _InsetSection(
                          children: [
                            _SettingsRow(
                              key: const ValueKey('account-row-help'),
                              icon: Icons.support_agent_rounded,
                              color: _RowColors.help,
                              title: t('Help & Support', 'सहायता'),
                              onTap: () => _push(const HelpSupportScreen()),
                            ),
                            _SettingsRow(
                              key: const ValueKey('account-row-legal'),
                              icon: Icons.description_rounded,
                              color: _RowColors.legal,
                              title: t('Policies & terms', 'नियम एवं नीतियां'),
                              onTap: () => _push(const LegalDocumentsScreen()),
                            ),
                          ],
                        ),

                        // 5. Sign out / leave guest mode (iOS red text row).
                        if (isSignedIn || isGuest) ...[
                          const SizedBox(height: 28),
                          _InsetSection(
                            children: [
                              _SignOutRow(
                                key: const ValueKey('account-signout'),
                                label: isGuest ? t('Exit guest mode', 'गेस्ट मोड छोड़ें') : l10n.signOut,
                                busy: _signingOut,
                                onTap: _signingOut ? null : () => _confirmSignOut(isGuest),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// Profile card (signed in)
// -----------------------------------------------------------------------------

const _kCardShadow = [
  BoxShadow(color: Color(0x0F121440), blurRadius: 24, offset: Offset(0, 8)),
  BoxShadow(color: Color(0x08121440), blurRadius: 4, offset: Offset(0, 1)),
];

class _ProfileCard extends StatelessWidget {
  final UserModel user;
  final BirthProfileModel? activeProfile;
  final BirthProfilesState profilesState;
  final VoidCallback onChangeProfile;
  final VoidCallback onAddProfile;
  final VoidCallback onRetryProfiles;

  const _ProfileCard({
    required this.user,
    required this.activeProfile,
    required this.profilesState,
    required this.onChangeProfile,
    required this.onAddProfile,
    required this.onRetryProfiles,
  });

  static String _initials(String name) {
    final parts = name.split(RegExp(r'[\s._@-]+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    final first = parts.first[0];
    final second = parts.length > 1 ? parts[1][0] : '';
    return (first + second).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final isHindi = Localizations.maybeLocaleOf(context)?.languageCode == 'hi';
    String t(String en, String hi) => isHindi ? hi : en;

    final fullName = user.fullName?.trim() ?? '';
    final email = user.email.trim();
    final phone = user.phoneNumber?.trim() ?? '';
    final displayName = fullName.isNotEmpty
        ? fullName
        : (email.contains('@') ? email.split('@').first : (phone.isNotEmpty ? phone : email));
    final contactLines = <String>[
      if (phone.isNotEmpty && phone != displayName) phone,
      if (email.isNotEmpty && email != displayName) email,
    ];

    final profile = activeProfile;
    final Widget profileSection;
    if (profile != null) {
      profileSection = _ProfileLine(
        icon: Icons.account_circle_rounded,
        label: t('Birth profile', 'जन्म प्रोफाइल'),
        value: profile.name,
        action: _PillButton(
          key: const ValueKey('account-change-profile'),
          label: l10n.homeChangeProfile,
          onPressed: onChangeProfile,
        ),
      );
    } else if (profilesState.isLoading) {
      profileSection = Row(
        children: [
          const SizedBox(width: 20, height: 20, child: CircularProgressIndicator.adaptive(strokeWidth: 2.5)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              t('Loading birth profile…', 'जन्म प्रोफाइल लोड हो रही है…'),
              style: const TextStyle(fontSize: 16, color: AppColors.textSecondary),
            ),
          ),
        ],
      );
    } else if (profilesState.errorMessage != null) {
      profileSection = _ProfileLine(
        icon: Icons.error_rounded,
        label: t('Birth profile', 'जन्म प्रोफाइल'),
        value: t("Couldn't load", 'लोड नहीं हो सकी'),
        action: _PillButton(
          key: const ValueKey('account-profiles-retry'),
          label: l10n.retry,
          onPressed: onRetryProfiles,
        ),
      );
    } else {
      profileSection = _ProfileLine(
        icon: Icons.person_add_alt_1_rounded,
        label: t('Birth profile', 'जन्म प्रोफाइल'),
        value: t('None yet', 'अभी कोई नहीं'),
        action: _PillButton(
          key: const ValueKey('account-add-profile'),
          label: t('Add', 'जोड़ें'),
          onPressed: onAddProfile,
        ),
      );
    }

    return Container(
      key: const ValueKey('account-header'),
      decoration: BoxDecoration(
        color: AppColors.cardSurface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: _kCardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 20, 18, 18),
            child: Row(
              children: [
                _GradientAvatar(initials: _initials(displayName)),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      MediaQuery.withClampedTextScaling(
                        maxScaleFactor: 1.6,
                        child: Text(
                          displayName,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.displayMedium.copyWith(
                            fontSize: 22,
                            height: 1.2,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      for (final line in contactLines) ...[
                        const SizedBox(height: 3),
                        Text(
                          line,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 15, color: AppColors.textSecondary),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, thickness: 0.5, indent: 18, endIndent: 18, color: AppColors.cardBorder),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 12, 14, 12),
            child: profileSection,
          ),
        ],
      ),
    );
  }
}

/// Icon + small grey label + value, with an action that drops below the
/// value on narrow screens or at large text sizes.
class _ProfileLine extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Widget action;

  const _ProfileLine({required this.icon, required this.label, required this.value, required this.action});

  @override
  Widget build(BuildContext context) {
    final textBlock = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 14, color: AppColors.textSecondary)),
        Text(
          value,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
        ),
      ],
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        final scale = MediaQuery.textScalerOf(context).scale(1);
        final stacked = constraints.maxWidth / scale < 250;
        final main = Row(
          children: [
            Icon(icon, size: 28, color: AppColors.secondary),
            const SizedBox(width: 12),
            Expanded(child: textBlock),
            if (!stacked) ...[const SizedBox(width: 8), action],
          ],
        );
        if (!stacked) return main;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            main,
            const SizedBox(height: 8),
            Padding(padding: const EdgeInsets.only(left: 40), child: action),
          ],
        );
      },
    );
  }
}

class _GradientAvatar extends StatelessWidget {
  final String initials;
  final IconData? icon;

  const _GradientAvatar({this.initials = '', this.icon});

  @override
  Widget build(BuildContext context) {
    final Widget content = icon != null
        ? Icon(icon, size: 30, color: Colors.white)
        : MediaQuery.withNoTextScaling(
            child: Text(
              initials,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
                color: Colors.white,
              ),
            ),
          );
    return ExcludeSemantics(
      child: SizedBox(
        width: 64,
        height: 64,
        child: DecoratedBox(
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppColors.primary, Color(0xFF3F3D8F)],
            ),
            boxShadow: [BoxShadow(color: Color(0x33121440), blurRadius: 12, offset: Offset(0, 4))],
          ),
          child: Center(child: content),
        ),
      ),
    );
  }
}

/// Soft tinted pill used for "Change" / "Add" / "Try again" in the card.
class _PillButton extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;

  const _PillButton({super.key, required this.label, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 140),
      child: TextButton(
        onPressed: onPressed,
        style: TextButton.styleFrom(
          foregroundColor: AppColors.secondary,
          backgroundColor: AppColors.secondary.withValues(alpha: 0.10),
          minimumSize: const Size(72, 48),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          shape: const StadiumBorder(),
        ),
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            label,
            maxLines: 1,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
        ),
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// Guest / signed-out card
// -----------------------------------------------------------------------------

class _SignInCard extends StatelessWidget {
  final bool isGuest;
  final VoidCallback onSignIn;
  final VoidCallback onCreateAccount;

  const _SignInCard({
    required this.isGuest,
    required this.onSignIn,
    required this.onCreateAccount,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final isHindi = Localizations.maybeLocaleOf(context)?.languageCode == 'hi';

    return Container(
      key: const ValueKey('account-signin-card'),
      padding: const EdgeInsets.fromLTRB(18, 20, 18, 18),
      decoration: BoxDecoration(
        color: AppColors.cardSurface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: _kCardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const _GradientAvatar(icon: Icons.person_rounded),
              const SizedBox(width: 16),
              Expanded(
                child: Semantics(
                  header: true,
                  child: MediaQuery.withClampedTextScaling(
                    maxScaleFactor: 1.6,
                    child: Text(
                      isHindi ? 'साइन इन / नया खाता बनाएं' : 'Sign in / Create account',
                      style: AppTypography.displayMedium.copyWith(
                        fontSize: 22,
                        height: 1.2,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            isGuest
                ? (isHindi
                    ? 'आप गेस्ट के रूप में हैं। अपने ऑर्डर देखने और प्रोफाइल सहेजने के लिए साइन इन करें।'
                    : 'You are using the app as a guest. Sign in to see your orders and keep your profiles safe.')
                : (isHindi
                    ? 'अपने ऑर्डर देखने और प्रोफाइल सहेजने के लिए साइन इन करें।'
                    : 'Sign in to see your orders and keep your profiles safe.'),
            style: const TextStyle(fontSize: 16, height: 1.4, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 18),
          SimplePrimaryButton(
            key: const ValueKey('account-signin'),
            label: l10n.signIn,
            onPressed: onSignIn,
          ),
          const SizedBox(height: 10),
          SimpleSecondaryButton(
            key: const ValueKey('account-create'),
            label: l10n.createAccount,
            onPressed: onCreateAccount,
          ),
        ],
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// Inset-grouped section and rows (iOS Settings look)
// -----------------------------------------------------------------------------

class _InsetSection extends StatelessWidget {
  final List<Widget> children;

  const _InsetSection({required this.children});

  // Divider starts after the icon square, like iOS.
  static const double _dividerIndent = 16 + 30 + 14;

  @override
  Widget build(BuildContext context) {
    final items = <Widget>[];
    for (var i = 0; i < children.length; i++) {
      if (i > 0) {
        items.add(const Divider(height: 0.5, thickness: 0.5, indent: _dividerIndent, color: AppColors.cardBorder));
      }
      items.add(children[i]);
    }

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [BoxShadow(color: Color(0x0A121440), blurRadius: 16, offset: Offset(0, 4))],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Material(
          color: AppColors.cardSurface,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: items,
          ),
        ),
      ),
    );
  }
}

class _SettingsRow extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String? value;
  final VoidCallback onTap;

  const _SettingsRow({
    super.key,
    required this.icon,
    required this.color,
    required this.title,
    required this.onTap,
    this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      child: InkWell(
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 54),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 12, 10),
            child: Row(
              children: [
                Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(8)),
                  child: Icon(icon, size: 18, color: Colors.white),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(fontSize: 17, height: 1.3, color: AppColors.textPrimary),
                      ),
                      // Values sit under the title (not beside it) so long
                      // titles and large text never squeeze each other.
                      if (value != null)
                        Text(
                          value!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 15, color: AppColors.textSecondary),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(Icons.chevron_right_rounded, size: 24, color: AppColors.textMuted),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SignOutRow extends StatelessWidget {
  final String label;
  final bool busy;
  final VoidCallback? onTap;

  const _SignOutRow({super.key, required this.label, required this.busy, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      child: InkWell(
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 54),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Center(
              child: busy
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator.adaptive(strokeWidth: 2.5))
                  : Text(
                      label,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w600,
                        color: AppColors.tintRoseText,
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

