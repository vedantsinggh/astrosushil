import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../home/screens/home_screen.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/astro_loader/astro_loader_button.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../../birth_profile/models/birth_profile_model.dart';
import '../../birth_profile/providers/birth_profile_provider.dart';
import '../../birth_profile/screens/create_birth_profile_screen.dart';
import '../providers/auth_provider.dart';

class VerificationScreen extends ConsumerStatefulWidget {
  final String? phoneNumber;
  final String? email;
  final VoidCallback? onVerificationSuccess;

  const VerificationScreen({
    super.key,
    this.phoneNumber,
    this.email,
    this.onVerificationSuccess,
  }) : assert(phoneNumber != null || email != null, 'Either phoneNumber or email must be provided');

  @override
  ConsumerState<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends ConsumerState<VerificationScreen> {
  final List<TextEditingController> _controllers = List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());
  bool _isLoading = false;
  int _resendCountdown = 60;
  Timer? _timer;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _startCountdown();
  }

  void _startCountdown() {
    setState(() {
      _resendCountdown = 60;
    });
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_resendCountdown > 0) {
        if (mounted) {
          setState(() {
            _resendCountdown--;
          });
        }
      } else {
        timer.cancel();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (var c in _controllers) {
      c.dispose();
    }
    for (var f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  String get _otpCode => _controllers.map((c) => c.text).join();

  String _maskTarget() {
    if (widget.phoneNumber != null) {
      final p = widget.phoneNumber!;
      if (p.length <= 6) return p;
      final start = p.substring(0, 3);
      final end = p.substring(p.length - 2);
      return '$start••••••$end';
    }
    final email = widget.email ?? '';
    if (!email.contains('@')) return email;
    final parts = email.split('@');
    final name = parts[0];
    final domain = parts[1];
    if (name.length <= 2) {
      return '${name[0]}***@$domain';
    }
    return '${name[0]}***${name[name.length - 1]}@$domain';
  }

  Future<bool> _checkAndPromptProfileSetup() async {
    final repo = ref.read(birthProfileRepositoryProvider);
    final guestProfile = await repo.getGuestProfile();
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
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
            (route) => false,
          );
        }
        return true;
      }
    }

    // Check if the newly authenticated user has any existing birth profiles
    try {
      final profiles = await repo.getProfiles();
      if (profiles.isEmpty && mounted) {
        final shouldCreate = await showDialog<bool>(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: const Row(
              children: [
                Icon(Icons.auto_awesome, color: AppColors.premiumAccent, size: 22),
                SizedBox(width: 8),
                Text('Create Birth Profile'),
              ],
            ),
            content: const Text(
              'Welcome! Would you like to create your birth profile now to unlock personalized Kundli, Dasha timings, and daily astrological forecasts?',
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
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (_) => const CreateBirthProfileScreen()),
            (route) => false,
          );
          return true;
        }
      }
    } catch (_) {
      // Ignore network errors and continue standard flow
    }
    return false;
  }

  Future<void> _verifyCode() async {
    final code = _otpCode;
    if (code.length < 6) {
      setState(() {
        _errorMessage = 'Please enter the full 6-digit verification code.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    bool success = false;
    if (widget.phoneNumber != null) {
      success = await ref.read(authStateProvider.notifier).verifyPhoneOtp(
            widget.phoneNumber!,
            code,
          );
    } else if (widget.email != null) {
      success = await ref.read(authStateProvider.notifier).verifyEmail(
            widget.email!,
            code,
          );
    }

    if (!mounted) return;

    setState(() {
      _isLoading = false;
    });

    if (success) {
      final navigatedToProfile = await _checkAndPromptProfileSetup();
      if (!mounted || navigatedToProfile) return;

      if (widget.onVerificationSuccess != null) {
        widget.onVerificationSuccess!();
      } else {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const HomeScreen()),
          (route) => false,
        );
      }
    } else {
      final authError = ref.read(authStateProvider).errorMessage;
      setState(() {
        _errorMessage = authError ?? 'Verification failed. Please check the code and try again.';
      });
    }
  }

  Future<void> _handleResendCode() async {
    if (_resendCountdown > 0) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    bool resendSuccess = false;
    String? msg;

    if (widget.phoneNumber != null) {
      resendSuccess = await ref.read(authStateProvider.notifier).sendPhoneOtp(widget.phoneNumber!);
      msg = resendSuccess ? 'New verification code sent.' : null;
    } else if (widget.email != null) {
      msg = await ref.read(authStateProvider.notifier).resendVerification(widget.email!);
      resendSuccess = msg != null;
    }

    if (!mounted) return;

    setState(() {
      _isLoading = false;
    });

    if (resendSuccess && msg != null) {
      _startCountdown();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(msg),
          backgroundColor: AppColors.primary,
        ),
      );
    } else {
      final authError = ref.read(authStateProvider).errorMessage;
      setState(() {
        _errorMessage = authError ?? 'Failed to resend verification code. Please wait a moment.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isPhone = widget.phoneNumber != null;
    final masked = _maskTarget();

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AstroAppBar(
        title: isPhone ? 'Phone Verification' : 'Email Verification',
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 20),
                Text(
                  isPhone ? 'Verify Your Phone' : 'Verify Your Email',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'We sent a 6-digit verification code to\n$masked',
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.lightTextSecondary,
                    height: 1.4,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),

                if (_errorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    margin: const EdgeInsets.only(bottom: 24),
                    decoration: BoxDecoration(
                      color: AppColors.error.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.error.withOpacity(0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline, color: AppColors.error, size: 20),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: const TextStyle(
                              fontSize: 13,
                              color: AppColors.error,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // 6 Pin boxes
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: List.generate(6, (index) {
                    return SizedBox(
                      width: 46,
                      height: 56,
                      child: TextFormField(
                        controller: _controllers[index],
                        focusNode: _focusNodes[index],
                        keyboardType: TextInputType.number,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                        inputFormatters: [
                          LengthLimitingTextInputFormatter(1),
                          FilteringTextInputFormatter.digitsOnly,
                        ],
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: AppColors.lightSurface,
                          contentPadding: EdgeInsets.zero,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: AppColors.lightBorder),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: AppColors.primary, width: 2),
                          ),
                        ),
                        onChanged: (val) {
                          if (val.isNotEmpty && index < 5) {
                            _focusNodes[index + 1].requestFocus();
                          } else if (val.isEmpty && index > 0) {
                            _focusNodes[index - 1].requestFocus();
                          }
                          if (_otpCode.length == 6) {
                            FocusScope.of(context).unfocus();
                            _verifyCode();
                          }
                        },
                      ),
                    );
                  }),
                ),

                const SizedBox(height: 32),

                // Resend action
                Center(
                  child: TextButton(
                    onPressed: _resendCountdown == 0 && !_isLoading ? _handleResendCode : null,
                    child: Text(
                      _resendCountdown > 0
                          ? 'Resend Code in 00:${_resendCountdown.toString().padLeft(2, '0')}'
                          : 'Resend Verification Code',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: _resendCountdown > 0 ? AppColors.lightTextMuted : AppColors.primary,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                _isLoading
                    ? const AstroLoaderButton(label: 'Verifying...', isDark: false)
                    : ElevatedButton(
                        onPressed: _verifyCode,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: const Text(
                          'Verify & Continue',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
