import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_typography.dart';

/// Keyboard-safe text input bar for Jyoti AI Assistant.
///
/// A large, clearly labelled message box with a big "Send" button next to it,
/// laid out like a familiar messaging app.
class JyotiInput extends StatefulWidget {
  final Function(String text) onSend;
  final VoidCallback onVoiceTap;

  const JyotiInput({
    super.key,
    required this.onSend,
    required this.onVoiceTap,
  });

  @override
  State<JyotiInput> createState() => _JyotiInputState();
}

class _JyotiInputState extends State<JyotiInput> {
  final TextEditingController _controller = TextEditingController();
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(() {
      final hasText = _controller.text.trim().isNotEmpty;
      if (hasText != _hasText) {
        setState(() {
          _hasText = hasText;
        });
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleSend() {
    final text = _controller.text.trim();
    if (text.isNotEmpty) {
      widget.onSend(text);
      _controller.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    // Pill-shaped composer, as in native messaging apps on both platforms.
    const fieldRadius = BorderRadius.all(Radius.circular(27));

    final field = TextField(
      controller: _controller,
      minLines: 1,
      maxLines: 4,
      textInputAction: TextInputAction.send,
      textCapitalization: TextCapitalization.sentences,
      onSubmitted: (_) => _handleSend(),
      style: const TextStyle(
        fontSize: 17,
        height: 1.35,
        color: AppColors.primary,
      ),
      decoration: InputDecoration(
        hintText: 'Ask Jyoti...',
        hintStyle: const TextStyle(
          fontSize: 17,
          color: AppColors.lightTextSecondary,
        ),
        filled: true,
        fillColor: AppColors.cardSurface,
        isDense: true,
        contentPadding: const EdgeInsets.fromLTRB(20, 15, 4, 15),
        border: const OutlineInputBorder(
          borderRadius: fieldRadius,
          borderSide: BorderSide(color: AppColors.cardBorder),
        ),
        enabledBorder: const OutlineInputBorder(
          borderRadius: fieldRadius,
          borderSide: BorderSide(color: AppColors.cardBorder),
        ),
        focusedBorder: const OutlineInputBorder(
          borderRadius: fieldRadius,
          borderSide: BorderSide(color: AppColors.accent, width: 1.5),
        ),
        // Voice input (currently disabled; shows a short notice).
        suffixIcon: IconButton(
          icon: const Icon(
            Icons.mic_none_rounded,
            color: AppColors.secondary,
            size: 24,
          ),
          onPressed: widget.onVoiceTap,
          tooltip: 'Voice Input',
          constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
        ),
      ),
    );

    // Large labelled Send button (>= 52dp tall)
    final sendButton = MediaQuery.withClampedTextScaling(
      maxScaleFactor: 1.4,
      child: SizedBox(
        height: 54,
        child: ElevatedButton(
          onPressed: _hasText ? _handleSend : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.premiumAccent,
            foregroundColor: AppColors.primary,
            disabledBackgroundColor: AppColors.disabledSurface,
            disabledForegroundColor: AppColors.lightTextSecondary,
            elevation: 0,
            padding: const EdgeInsets.symmetric(horizontal: 18),
            shape: const StadiumBorder(),
            textStyle: AppTypography.labelLarge.copyWith(
              fontSize: 17,
              fontWeight: FontWeight.w700,
            ),
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.send_rounded, size: 22),
              SizedBox(width: 8),
              Text('Send'),
            ],
          ),
        ),
      ),
    );

    // On narrow screens or with very large text, stack the box above a
    // full-width Send button so the message box never gets squeezed.
    final media = MediaQuery.of(context);
    final effectiveWidth = media.size.width / media.textScaler.scale(1);
    final stacked = effectiveWidth < 260;

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.canvas,
        border: Border(
          top: BorderSide(color: AppColors.separator, width: 0.5),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
          child: stacked
              ? Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    field,
                    const SizedBox(height: 8),
                    sendButton,
                  ],
                )
              : Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(child: field),
                    const SizedBox(width: 10),
                    sendButton,
                  ],
                ),
        ),
      ),
    );
  }
}
