import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_exception.dart';
import '../../../shared/theme/app_colors.dart';
import '../models/user_model.dart';
import '../providers/auth_provider.dart';
import 'login_screen.dart';

/// "Complete your profile" step shown after Google sign-in when the backend
/// reports missing required details (`profileComplete == false`).
///
/// It asks only for what the backend lists in `missingProfileFields`:
/// - full name (saved with PATCH /auth/me)
/// - mobile number, verified with the existing OTP flow
///   (POST /auth/phone/send-otp, then POST /auth/link-phone)
///
/// Kept deliberately simple for users of all ages: large text, clear labels
/// and a single main button per step.
class CompleteProfileScreen extends ConsumerStatefulWidget {
  /// Called once the backend confirms the profile is complete. When null the
  /// screen pops with `true`.
  final void Function(BuildContext context)? onCompleted;

  const CompleteProfileScreen({super.key, this.onCompleted});

  @override
  ConsumerState<CompleteProfileScreen> createState() => _CompleteProfileScreenState();
}

class _CompleteProfileScreenState extends ConsumerState<CompleteProfileScreen> {
  static const Color _errorText = Color(0xFFB91C1C);

  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _codeController = TextEditingController();

  String _countryCode = '+91';
  bool _codeSent = false;
  bool _busy = false;
  String? _error;
  String? _pendingPhone;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  UserModel? get _user => ref.read(authStateProvider).user;

  String _canonicalPhone() {
    final raw = _phoneController.text.trim().replaceAll(RegExp(r'[\s\-()]'), '');
    if (raw.startsWith('+')) return raw;
    if (raw.startsWith('0')) return '$_countryCode${raw.substring(1)}';
    return '$_countryCode$raw';
  }

  String _maskedPhone(String phone) {
    if (phone.length <= 6) return phone;
    return '${phone.substring(0, 3)}••••••${phone.substring(phone.length - 2)}';
  }

  String _friendlyError(Object e) {
    if (e is ServerException && e.code == 'CONFLICT') {
      return 'This mobile number is already used by another account. Please use a different number.';
    }
    if (e is AuthenticationException) {
      return 'That code did not work. Please check it, or ask for a new code.';
    }
    if (e is RateLimitException) {
      return 'Please wait a minute before asking for another code.';
    }
    if (e is ValidationException) {
      return 'Please check the details you entered.';
    }
    if (e is NetworkException) {
      return 'You\'re offline. Check your connection and try again.';
    }
    return 'Something went wrong. Please try again.';
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
    } catch (e) {
      if (mounted) setState(() => _error = _friendlyError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _saveNameIfNeeded(UserModel user) async {
    if (!user.isMissingFullName) return;
    await ref.read(authRepositoryProvider).updateFullName(_nameController.text.trim());
  }

  /// Re-reads the account from the backend and continues only when the
  /// backend says the profile is complete.
  Future<void> _finishIfComplete() async {
    await ref.read(authStateProvider.notifier).checkSession();
    if (!mounted) return;
    final refreshed = ref.read(authStateProvider).user;
    if (refreshed != null && refreshed.profileComplete) {
      final onCompleted = widget.onCompleted;
      if (onCompleted != null) {
        onCompleted(context);
      } else {
        Navigator.of(context).pop(true);
      }
    } else if (refreshed == null) {
      _returnToLogin();
    } else {
      setState(() => _error = 'Some details are still missing. Please fill in every box.');
    }
  }

  void _onPrimaryPressed() {
    final user = _user;
    if (user == null) return;
    FocusScope.of(context).unfocus();

    if (_codeSent) {
      final code = _codeController.text.trim();
      if (code.length < 4) {
        setState(() => _error = 'Enter the code we sent to your phone.');
        return;
      }
      _run(() async {
        await ref.read(authRepositoryProvider).linkPhone(phoneNumber: _pendingPhone!, otp: code);
        await _finishIfComplete();
      });
      return;
    }

    if (!(_formKey.currentState?.validate() ?? false)) return;

    if (!user.isMissingPhoneNumber) {
      _run(() async {
        await _saveNameIfNeeded(user);
        await _finishIfComplete();
      });
      return;
    }

    final phone = _canonicalPhone();
    _run(() async {
      await _saveNameIfNeeded(user);
      await ref.read(authRepositoryProvider).sendPhoneOtp(phone);
      if (!mounted) return;
      setState(() {
        _pendingPhone = phone;
        _codeSent = true;
        _codeController.clear();
      });
    });
  }

  void _resendCode() {
    final phone = _pendingPhone;
    if (phone == null) return;
    _run(() async {
      await ref.read(authRepositoryProvider).sendPhoneOtp(phone);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('We sent you a new code.', style: TextStyle(fontSize: 16))),
        );
      }
    });
  }

  void _changeNumber() {
    setState(() {
      _codeSent = false;
      _pendingPhone = null;
      _codeController.clear();
      _error = null;
    });
  }

  Future<void> _signOut() async {
    await ref.read(authStateProvider.notifier).logout();
    if (mounted) _returnToLogin();
  }

  void _returnToLogin() {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  InputDecoration _fieldDecoration({String? hint}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(fontSize: 18, color: AppColors.lightTextMuted),
      filled: true,
      fillColor: AppColors.lightSurface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      errorStyle: const TextStyle(fontSize: 15, color: _errorText),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.lightBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.lightBorder, width: 1.5),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.primary, width: 2),
      ),
    );
  }

  Widget _label(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.primary),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authStateProvider).user;
    final needsName = user?.isMissingFullName ?? false;
    final needsPhone = user?.isMissingPhoneNumber ?? false;

    final String title = _codeSent ? 'Enter your code' : 'Just one more step';
    final String subtitle = _codeSent
        ? 'We sent a code by SMS to ${_maskedPhone(_pendingPhone ?? '')}.'
        : needsPhone
            ? 'Please add your mobile number. We will send you a code to confirm it.'
            : 'Please tell us your name to finish setting up your account.';
    final String buttonLabel = _codeSent
        ? 'Confirm'
        : needsPhone
            ? 'Send code'
            : 'Save and continue';

    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: AppColors.canvas,
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Semantics(
                    header: true,
                    child: Text(
                      title,
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                        height: 1.25,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 18, height: 1.5, color: AppColors.lightTextSecondary),
                  ),
                  const SizedBox(height: 28),

                  if (_error != null) ...[
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.errorBg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.errorBorder),
                      ),
                      child: Text(
                        _error!,
                        style: const TextStyle(fontSize: 16, height: 1.4, color: _errorText),
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],

                  if (!_codeSent) ...[
                    if (needsName) ...[
                      _label('Your full name'),
                      TextFormField(
                        key: const Key('complete_profile_name'),
                        controller: _nameController,
                        textCapitalization: TextCapitalization.words,
                        autofillHints: const [AutofillHints.name],
                        style: const TextStyle(fontSize: 20, color: AppColors.primary),
                        decoration: _fieldDecoration(hint: 'e.g. Rahul Sharma'),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) return 'Enter your full name.';
                          return null;
                        },
                      ),
                      const SizedBox(height: 24),
                    ],
                    if (needsPhone) ...[
                      _label('Mobile number'),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            height: 62,
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                            decoration: BoxDecoration(
                              color: AppColors.lightSurface,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: AppColors.lightBorder, width: 1.5),
                            ),
                            alignment: Alignment.center,
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _countryCode,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary,
                                ),
                                items: const [
                                  DropdownMenuItem(value: '+91', child: Text('+91')),
                                  DropdownMenuItem(value: '+1', child: Text('+1')),
                                  DropdownMenuItem(value: '+44', child: Text('+44')),
                                  DropdownMenuItem(value: '+971', child: Text('+971')),
                                  DropdownMenuItem(value: '+65', child: Text('+65')),
                                  DropdownMenuItem(value: '+61', child: Text('+61')),
                                ],
                                onChanged: (val) {
                                  if (val != null) setState(() => _countryCode = val);
                                },
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              key: const Key('complete_profile_phone'),
                              controller: _phoneController,
                              keyboardType: TextInputType.phone,
                              autofillHints: const [AutofillHints.telephoneNumber],
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly,
                                LengthLimitingTextInputFormatter(12),
                              ],
                              style: const TextStyle(fontSize: 20, color: AppColors.primary),
                              decoration: _fieldDecoration(hint: '9876543210'),
                              validator: (val) {
                                if (val == null || val.trim().isEmpty) return 'Enter your phone number.';
                                final digits = val.replaceAll(RegExp(r'\D'), '');
                                if (digits.length < 7 || digits.length > 12) {
                                  return 'Enter a valid phone number.';
                                }
                                return null;
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 28),
                    ],
                  ] else ...[
                    _label('Code from SMS'),
                    TextField(
                      key: const Key('complete_profile_code'),
                      controller: _codeController,
                      keyboardType: TextInputType.number,
                      autofillHints: const [AutofillHints.oneTimeCode],
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(8),
                      ],
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 26,
                        letterSpacing: 8,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                      decoration: _fieldDecoration(hint: '••••••'),
                    ),
                    const SizedBox(height: 28),
                  ],

                  ElevatedButton(
                    key: const Key('complete_profile_primary'),
                    onPressed: _busy ? null : _onPrimaryPressed,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.premiumAccent,
                      foregroundColor: AppColors.primary,
                      disabledBackgroundColor: AppColors.premiumAccent.withValues(alpha: 0.5),
                      minimumSize: const Size.fromHeight(58),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      textStyle: const TextStyle(fontSize: 19, fontWeight: FontWeight.bold),
                    ),
                    child: _busy
                        ? const SizedBox(
                            width: 26,
                            height: 26,
                            child: CircularProgressIndicator(strokeWidth: 3, color: AppColors.primary),
                          )
                        : Text(buttonLabel),
                  ),

                  if (_codeSent) ...[
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: _busy ? null : _resendCode,
                      style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
                      child: const Text('Send the code again', style: TextStyle(fontSize: 17)),
                    ),
                    TextButton(
                      onPressed: _busy ? null : _changeNumber,
                      style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
                      child: const Text('Change mobile number', style: TextStyle(fontSize: 17)),
                    ),
                  ],

                  const SizedBox(height: 24),
                  TextButton(
                    onPressed: _busy ? null : _signOut,
                    style: TextButton.styleFrom(
                      minimumSize: const Size(48, 48),
                      foregroundColor: AppColors.lightTextSecondary,
                    ),
                    child: const Text('Sign out', style: TextStyle(fontSize: 16)),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
