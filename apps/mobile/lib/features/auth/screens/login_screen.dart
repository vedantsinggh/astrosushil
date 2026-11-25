import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../home/screens/home_screen.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../../shared/widgets/astro_loader/astro_loader_button.dart';
import '../../../shared/widgets/error_banner.dart';
import '../providers/auth_provider.dart';
import '../widgets/auth_header_backdrop.dart';
import '../widgets/auth_text_field.dart';
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

  String _countryCode = '+91';
  bool _showEmailOtp = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _emailController.dispose();
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

  void _sendEmailOtp() async {
    if (_emailFormKey.currentState?.validate() ?? false) {
      FocusScope.of(context).unfocus();
      final email = _emailController.text.trim();

      final sent = await ref.read(authStateProvider.notifier).sendEmailOtp(email);
      if (sent && mounted) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => VerificationScreen(
              email: email,
              onVerificationSuccess: widget.onLoginSuccess,
            ),
          ),
        );
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
                            _showEmailOtp
                                ? 'Enter your email address to receive a secure OTP'
                                : 'Enter your phone number to receive a secure OTP',
                            style: AppTypography.rowSubtitle.copyWith(fontSize: 16),
                          ),
                          const SizedBox(height: 18),

                          // Phone / Email OTP tabs
                          Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: AppColors.cardSurface,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: AppColors.cardBorder),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: InkWell(
                                    key: const ValueKey('login-tab-phone'),
                                    borderRadius: BorderRadius.circular(10),
                                    onTap: () {
                                      if (!_showEmailOtp) return;
                                      ref.read(authStateProvider.notifier).clearError();
                                      setState(() => _showEmailOtp = false);
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(vertical: 12),
                                      decoration: BoxDecoration(
                                        color: !_showEmailOtp ? AppColors.primary : Colors.transparent,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(
                                            Icons.phone_outlined,
                                            size: 18,
                                            color: !_showEmailOtp ? Colors.white : AppColors.textSecondary,
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            'Phone OTP',
                                            style: TextStyle(
                                              fontSize: 15,
                                              fontWeight: FontWeight.w600,
                                              color: !_showEmailOtp ? Colors.white : AppColors.textSecondary,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                                Expanded(
                                  child: InkWell(
                                    key: const ValueKey('login-tab-email'),
                                    borderRadius: BorderRadius.circular(10),
                                    onTap: () {
                                      if (_showEmailOtp) return;
                                      ref.read(authStateProvider.notifier).clearError();
                                      setState(() => _showEmailOtp = true);
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(vertical: 12),
                                      decoration: BoxDecoration(
                                        color: _showEmailOtp ? AppColors.primary : Colors.transparent,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(
                                            Icons.email_outlined,
                                            size: 18,
                                            color: _showEmailOtp ? Colors.white : AppColors.textSecondary,
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            'Email OTP',
                                            style: TextStyle(
                                              fontSize: 15,
                                              fontWeight: FontWeight.w600,
                                              color: _showEmailOtp ? Colors.white : AppColors.textSecondary,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 20),

                          if (authState.errorMessage != null) ...[
                            ErrorBanner(
                              message: authState.errorMessage!,
                              onRetry: () => ref.read(authStateProvider.notifier).clearError(),
                            ),
                            const SizedBox(height: 18),
                          ],

                          if (!_showEmailOtp) ...[
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
                                  const SizedBox(height: 20),
                                  authState.isLoading
                                      ? const AstroLoaderButton(label: 'Sending OTP...', isDark: false)
                                      : AstroPrimaryButton(
                                          label: 'Send Email OTP',
                                          icon: Icons.mark_email_read_outlined,
                                          onPressed: _sendEmailOtp,
                                        ),
                                ],
                              ),
                            ),
                          ],

                          const SizedBox(height: 22),

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
