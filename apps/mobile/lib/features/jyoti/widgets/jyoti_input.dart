import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';

/// Keyboard-safe text input bar for Jyoti AI Assistant.
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
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: AppColors.lightBackground,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: AppColors.secondary.withOpacity(0.18),
                    width: 1,
                  ),
                ),
                child: Row(
                  children: [
                    const SizedBox(width: 14),
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _handleSend(),
                        style: const TextStyle(
                          fontSize: 14.5,
                          color: AppColors.primary,
                        ),
                        decoration: const InputDecoration(
                          hintText: 'Ask Jyoti...',
                          hintStyle: TextStyle(
                            fontSize: 14,
                            color: AppColors.lightTextMuted,
                          ),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.symmetric(vertical: 10),
                        ),
                      ),
                    ),
                    // Voice mic icon button placeholder
                    IconButton(
                      icon: const Icon(
                        Icons.mic_none_rounded,
                        color: AppColors.secondary,
                        size: 22,
                      ),
                      onPressed: widget.onVoiceTap,
                      tooltip: 'Voice Input',
                      padding: const EdgeInsets.all(8),
                      constraints: const BoxConstraints(),
                    ),
                    const SizedBox(width: 4),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 8),
            // Send Button
            Material(
              color: _hasText ? AppColors.primary : AppColors.secondary.withOpacity(0.3),
              shape: const CircleBorder(),
              child: InkWell(
                onTap: _hasText ? _handleSend : null,
                customBorder: const CircleBorder(),
                child: Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  child: Icon(
                    Icons.arrow_upward_rounded,
                    color: _hasText ? AppColors.premiumAccent : Colors.white.withOpacity(0.7),
                    size: 22,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
