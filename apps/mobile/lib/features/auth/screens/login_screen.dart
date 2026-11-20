import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../home/screens/home_screen.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../../shared/widgets/astro_loader/astro_loader_button.dart';
import '../../../shared/widgets/error_banner.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../data/google_id_token_source.dart';
import '../providers/auth_provider.dart';
import '../widgets/auth_header_backdrop.dart';
import '../widgets/auth_text_field.dart';
import 'complete_profile_screen.dart';
import 'forgot_password_screen.dart';
import 'verification_screen.dart';

class LoginScreen extends ConsumerStatefulWidget {
  final VoidCallback? onLoginSuccess;

  const LoginScreen({
    super.key,
    this.onLoginSuccess,
  });

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneFormKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _emailFormKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  String _countryCode = '+91';
  bool _showEmailLogin = false;
  bool _obscurePassword = true;
  bool _isGoogleLoading = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  String _getCanonicalPhone() {
    final raw = _phoneController.text.trim().replaceAll(RegExp(r'[\s\-()]'), '');
    if (raw.startsWith('+')) return raw;
    if (raw.startsWith('0')) {
      return '$_countryCode${raw.substring(1)}';
    }
    return '$_countryCode$raw';
  }

  Future<bool> _checkAndPromptProfileSetup() async {
    final repo = ref.read(birthProfileRepositoryProvider);

    // Load this account's own profiles fresh from the server (the local list
    // cache is not per-account). If they cannot be loaded we cannot tell
    // whether guest data is already saved, so we do not prompt at all.
    List<BirthProfileModel>? accountProfiles;
    try {
      accountProfiles = await repo.getProfiles(forceRefresh: true);
    } catch (_) {
      accountProfiles = null;
    }

    // Only offer to save guest details that were really created in guest
    // mode on this device and are not already on the account.
    final guestProfile = accountProfiles == null ? null : await repo.getPendingGuestProfile(accountProfiles);
    if (guestProfile != null && mounted) {
      final shouldMigrate = await showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Save Guest Birth Details?'),
          content: Text(
            'We found birth details for "${guestProfile.name}" created during your guest session. Would you like to save this birth profile to your account?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Start Fresh'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.premiumAccent,
                foregroundColor: AppColors.primary,
              ),
              child: const Text('Save to Account'),
            ),
          ],
        ),
      );

      if (shouldMigrate == true) {
        final dto = CreateBirthProfileDto(
          name: guestProfile.name,
          dateOfBirth: guestProfile.dateOfBirth,
          timeOfBirth: guestProfile.timeOfBirth,
          latitude: guestProfile.latitude,
          longitude: guestProfile.longitude,
          timezone: guestProfile.timezone,
          placeName: guestProfile.placeName,
        );
        await ref.read(birthProfilesListNotifierProvider.notifier).migrateGuestProfile(dto);
        return false;
      } else {
        // User chose "Start Fresh" — clear guest data then take them straight
        // to CreateBirthProfileScreen so they can enter their own details.
        await repo.clearGuestProfile();
        if (mounted) {
          _openCreateBirthProfile();
        }
        return true;
      }
    }

    // Check if user has any existing birth profiles
    try {
      final profiles = accountProfiles;
      if (profiles != null && profiles.isEmpty && mounted) {
        final shouldCreate = await showDialog<bool>(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: const Row(
              children: [
                Icon(Icons.auto_awesome, color: AppColors.premiumAccent, size: 22),
                SizedBox(width: 8),
                Flexible(child: Text('Create Birth Profile')),
              ],
            ),
            content: const Text(
              'Welcome! Would you like to set up your birth profile now to unlock your personalized Vedic Kundli, Dasha cycles, and daily planetary insights?',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(false),
                child: const Text('Explore First'),
              ),
              ElevatedButton(
                onPressed: () => Navigator.of(ctx).pop(true),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.premiumAccent,
                  foregroundColor: AppColors.primary,
                ),
                child: const Text('Create Profile'),
              ),
            ],
          ),
        );

        if (shouldCreate == true && mounted) {
          _openCreateBirthProfile();
          return true;
        }
      }
    } catch (_) {
      // Ignore network errors and continue standard flow
    }
    return false;
  }

  /// Opens the first-profile form. When this login screen is the root route
  /// (opened from onboarding), the main shell is placed underneath so the
  /// form and the chart it opens are never a dead end.
  void _openCreateBirthProfile() {
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
      );
    } else {
      CreateBirthProfileScreen.openAboveHome(context, ref);
    }
  }

  void _onSuccessfulAuth() async {
    final navigatedToProfile = await _checkAndPromptProfileSetup();
    if (!mounted || navigatedToProfile) return;
    if (widget.onLoginSuccess != null) {
      widget.onLoginSuccess!();
    } else {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const HomeScreen()),
      );
    }
  }

  void _sendOtp() async {
    if (_phoneFormKey.currentState?.validate() ?? false) {
      FocusScope.of(context).unfocus();
      final canonicalPhone = _getCanonicalPhone();

      final sent = await ref.read(authStateProvider.notifier).sendPhoneOtp(canonicalPhone);
      if (sent && mounted) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => VerificationScreen(
              phoneNumber: canonicalPhone,
              onVerificationSuccess: widget.onLoginSuccess,
            ),
          ),
        );
      }
    }
  }

  Future<void> _handleGoogleSignIn() async {
    ref.read(authStateProvider.notifier).clearError();
    setState(() => _isGoogleLoading = true);
    try {
      // Obtain a genuine Google ID token from the native SDK; the backend
      // verifies it (signature, issuer, audience) before issuing a session.
      final idToken = await ref.read(googleIdTokenSourceProvider).getIdToken();
      if (idToken == null || !mounted) return; // User closed the Google picker.

      final success = await ref.read(authStateProvider.notifier).signInWithGoogle(idToken);
      if (!success || !mounted) return;

      // The backend decides whether required details are missing.
      final user = ref.read(authStateProvider).user;
      if (user != null && !user.profileComplete) {
        final completed = await Navigator.of(context).push<bool>(
          MaterialPageRoute(builder: (_) => const CompleteProfileScreen()),
        );
        if (completed != true || !mounted) return;
      }
      _onSuccessfulAuth();
    } on GoogleSignInFailure catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message, style: const TextStyle(fontSize: 16))),
      );
    } finally {
      if (mounted) setState(() => _isGoogleLoading = false);
    }
  }

  void _submitEmailLogin() async {
    if (_emailFormKey.currentState?.validate() ?? false) {
      FocusScope.of(context).unfocus();
      final email = _emailController.text.trim();
      final password = _passwordController.text;

      final result = await ref.read(authStateProvider.notifier).login(email, password);
      if (result != null && result.requiresEmailVerification && mounted) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => VerificationScreen(
              email: result.email,
              onVerificationSuccess: widget.onLoginSuccess,
            ),
          ),
        );
        return;
      }

      if (result != null && !result.requiresEmailVerification && mounted) {
        _onSuccessfulAuth();
      }
    }
  }

  void _continueAsGuest() async {
    await ref.read(authStateProvider.notifier).continueAsGuest();
    if (!mounted) return;
    if (widget.onLoginSuccess != null) {
      widget.onLoginSuccess!();
    } else {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => const HomeScreen(),
        ),
      );
    }
  }

  InputDecoration _phoneDecoration() {
    OutlineInputBorder border(Color c, [double w = 1]) => OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: c, width: w),
        );
    return InputDecoration(
      labelText: 'Phone Number',
      hintText: '9876543210',
      filled: true,
      fillColor: AppColors.cardSurface,
      prefixIcon: const Icon(Icons.phone_outlined, color: AppColors.accent),
      border: border(AppColors.cardBorder),
      enabledBorder: border(AppColors.cardBorder),
      focusedBorder: border(AppColors.accent, 2),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final media = MediaQuery.of(context);
    // Shorter brand header on short / landscape screens.
    final headerHeight = media.size.height < 640 ? 220.0 : 270.0;

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: SingleChildScrollView(
          child: Column(
            children: [
              // Brand hero
              AuthHeaderBackdrop(
                tagline: 'Your Journey. Written in the Stars.',
                height: headerHeight,
              ),

              // Form sheet, lifted over the hero
              Transform.translate(
                offset: const Offset(0, -28),
                child: Container(
                  width: double.infinity,
                  constraints: BoxConstraints(minHeight: media.size.height - headerHeight),
                  decoration: const BoxDecoration(
                    color: AppColors.canvas,
                    borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                  ),
                  padding: const EdgeInsets.fromLTRB(24, 30, 24, 8),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 480),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Semantics(
                            header: true,
                            child: Text(
                              'Welcome to Astro Sushil',
                              textScaler: MediaQuery.textScalerOf(context).clamp(maxScaleFactor: 1.6),
                              style: AppTypography.headlineLarge.copyWith(
                                fontSize: 26,
                                height: 1.2,
                                letterSpacing: -0.4,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          Align(
                            alignment: AlignmentDirectional.centerStart,
                            child: Container(
                              width: 28,
                              height: 3,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(2),
                                gradient: const LinearGradient(colors: [AppColors.gold, Color(0xFFE9C766)]),
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            _showEmailLogin
                                ? 'Sign in with your email and password'
                                : 'Enter your phone number to receive a secure OTP',
                            style: AppTypography.rowSubtitle.copyWith(fontSize: 16),
                          ),
                          const SizedBox(height: 24),

                          if (authState.errorMessage != null) ...[
                            ErrorBanner(
                              message: authState.errorMessage!,
                              onRetry: () => ref.read(authStateProvider.notifier).clearError(),
                            ),
                            const SizedBox(height: 18),
                          ],

                          if (!_showEmailLogin) ...[
                            Form(
                              key: _phoneFormKey,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  LayoutBuilder(
                                    builder: (context, constraints) {
                                      final country = Container(
                                        constraints: const BoxConstraints(minHeight: 56),
                                        padding: const EdgeInsets.only(left: 12, right: 4),
                                        decoration: BoxDecoration(
                                          color: AppColors.cardSurface,
                                          borderRadius: BorderRadius.circular(14),
                                          border: Border.all(color: AppColors.cardBorder),
                                        ),
                                        alignment: Alignment.center,
                                        child: DropdownButtonHideUnderline(
                                          child: DropdownButton<String>(
                                            value: _countryCode,
                                            borderRadius: BorderRadius.circular(14),
                                            icon: const Icon(Icons.expand_more_rounded, color: AppColors.accent),
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w600,
                                              color: AppColors.primary,
                                            ),
                                            items: const [
                                              DropdownMenuItem(value: '+91', child: Text('🇮🇳 +91')),
                                              DropdownMenuItem(value: '+1', child: Text('🇺🇸 +1')),
                                              DropdownMenuItem(value: '+44', child: Text('🇬🇧 +44')),
                                              DropdownMenuItem(value: '+971', child: Text('🇦🇪 +971')),
                                              DropdownMenuItem(value: '+65', child: Text('🇸🇬 +65')),
                                              DropdownMenuItem(value: '+61', child: Text('🇦🇺 +61')),
                                              DropdownMenuItem(value: '+1', child: Text('🇨🇦 +1')),
                                            ],
                                            onChanged: (val) {
                                              if (val != null) {
                                                setState(() => _countryCode = val);
                                              }
                                            },
                                          ),
                                        ),
                                      );
                                      final phone = TextFormField(
                                        controller: _phoneController,
                                        keyboardType: TextInputType.phone,
                                        autofillHints: const [AutofillHints.telephoneNumber],
                                        inputFormatters: [
                                          FilteringTextInputFormatter.digitsOnly,
                                          LengthLimitingTextInputFormatter(12),
                                        ],
                                        style: const TextStyle(
                                          fontSize: 17,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.primary,
                                        ),
                                        decoration: _phoneDecoration(),
                                        validator: (val) {
                                          if (val == null || val.trim().isEmpty) {
                                            return 'Enter your phone number.';
                                          }
                                          final digits = val.replaceAll(RegExp(r'\D'), '');
                                          if (digits.length < 7 || digits.length > 12) {
                                            return 'Enter a valid phone number.';
                                          }
                                          return null;
                                        },
                                      );
                                      // Stack the two fields when large text leaves no room side by side.
                                      final scale = MediaQuery.textScalerOf(context).scale(1);
                                      if (constraints.maxWidth / scale < 300) {
                                        return Column(
                                          crossAxisAlignment: CrossAxisAlignment.stretch,
                                          children: [
                                            Align(alignment: AlignmentDirectional.centerStart, child: country),
                                            const SizedBox(height: 12),
                                            phone,
                                          ],
                                        );
                                      }
                                      return Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [country, const SizedBox(width: 10), Expanded(child: phone)],
                                      );
                                    },
                                  ),
                                  const SizedBox(height: 20),
                                  authState.isLoading
                                      ? const AstroLoaderButton(label: 'Sending OTP...', isDark: false)
                                      : AstroPrimaryButton(
                                          label: 'Send OTP',
                                          icon: Icons.sms_outlined,
                                          onPressed: _sendOtp,
                                        ),
                                ],
                              ),
                            ),
                          ] else ...[
                            Form(
                              key: _emailFormKey,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  AuthTextField(
                                    controller: _emailController,
                                    labelText: 'Email Address',
                                    hintText: 'user@example.com',
                                    keyboardType: TextInputType.emailAddress,
                                    autofillHints: const [AutofillHints.email],
                                    prefixIcon: const Icon(Icons.email_outlined),
                                    validator: (val) {
                                      if (val == null || val.trim().isEmpty) {
                                        return 'Enter your email address.';
                                      }
                                      if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(val.trim())) {
                                        return 'Enter a valid email address.';
                                      }
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 16),
                                  AuthTextField(
                                    controller: _passwordController,
                                    labelText: 'Password',
                                    isPassword: _obscurePassword,
                                    autofillHints: const [AutofillHints.password],
                                    prefixIcon: const Icon(Icons.lock_outline),
                                    suffixIcon: IconButton(
                                      tooltip: _obscurePassword ? 'Show password' : 'Hide password',
                                      icon: Icon(
                                        _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                      ),
                                      onPressed: () {
                                        setState(() {
                                          _obscurePassword = !_obscurePassword;
                                        });
                                      },
                                    ),
                                    validator: (val) {
                                      if (val == null || val.isEmpty) {
                                        return 'Enter your password.';
                                      }
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 4),
                                  Align(
                                    alignment: Alignment.centerRight,
                                    child: TextButton(
                                      style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
                                      onPressed: () {
                                        ref.read(authStateProvider.notifier).clearError();
                                        Navigator.of(context).push(
                                          MaterialPageRoute(
                                            builder: (_) => const ForgotPasswordScreen(),
                                          ),
                                        );
                                      },
                                      child: const Text(
                                        'Forgot Password?',
                                        style: TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.accent,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  authState.isLoading
                                      ? const AstroLoaderButton(label: 'Signing in...', isDark: false)
                                      : AstroPrimaryButton(
                                          label: 'Login with Email',
                                          icon: Icons.login_rounded,
                                          onPressed: _submitEmailLogin,
                                        ),
                                ],
                              ),
                            ),
                          ],

                          const SizedBox(height: 26),

                          // "or" divider (sentence case, no shouting)
                          Row(
                            children: [
                              const Expanded(child: Divider(color: AppColors.separator, thickness: 0.6)),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 14.0),
                                child: Text(
                                  'or',
                                  style: AppTypography.rowSubtitle.copyWith(fontSize: 15),
                                ),
                              ),
                              const Expanded(child: Divider(color: AppColors.separator, thickness: 0.6)),
                            ],
                          ),
                          const SizedBox(height: 22),

                          // Continue with Google
                          OutlinedButton(
                            onPressed: _isGoogleLoading ? null : _handleGoogleSignIn,
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size.fromHeight(AstroMetrics.buttonHeight),
                              side: const BorderSide(color: AppColors.cardBorder),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(AstroMetrics.buttonRadius),
                              ),
                              backgroundColor: AppColors.cardSurface,
                            ),
                            child: _isGoogleLoading
                                ? const SizedBox(
                                    height: 22,
                                    width: 22,
                                    child: CircularProgressIndicator.adaptive(strokeWidth: 2),
                                  )
                                : const Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      SizedBox(
                                        width: 22,
                                        height: 22,
                                        child: Center(
                                          child: Text(
                                            'G',
                                            style: TextStyle(
                                              fontSize: 19,
                                              fontWeight: FontWeight.w900,
                                              color: Color(0xFF4285F4),
                                            ),
                                          ),
                                        ),
                                      ),
                                      SizedBox(width: 12),
                                      Flexible(
                                        child: Text(
                                          'Continue with Google',
                                          style: TextStyle(
                                            fontSize: 17,
                                            fontWeight: FontWeight.w700,
                                            color: AppColors.primary,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                          ),
                          const SizedBox(height: 10),

                          // Toggle between Phone OTP & Email Login
                          Center(
                            child: TextButton(
                              style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
                              onPressed: () {
                                ref.read(authStateProvider.notifier).clearError();
                                setState(() {
                                  _showEmailLogin = !_showEmailLogin;
                                });
                              },
                              child: Text(
                                _showEmailLogin ? '← Use Phone Number instead' : 'Sign in with Password',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.accent,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 18),

                          // Explore as guest
                          AstroGroupedSection(
                            children: [
                              AstroListRow(
                                icon: Icons.explore_outlined,
                                tint: AstroTint.sage,
                                title: 'Explore as Guest',
                                subtitle: 'Calculate Kundli, Panchang & Planetary positions instantly.',
                                onTap: _continueAsGuest,
                              ),
                            ],
                          ),
                          SizedBox(height: 20 + media.padding.bottom),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
