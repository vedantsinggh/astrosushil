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
        color: AppColors.cardSurfaceWarm,
        border: const Border(
          top: BorderSide(color: AppColors.cardBorder, width: 1),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: AppColors.canvas,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: AppColors.cardBorder,
                    width: 1,
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    const SizedBox(width: 14),
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        minLines: 1,
                        maxLines: 4,
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
                          contentPadding: EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                    // Voice mic icon button (>= 48x48dp target)
                    IconButton(
                      icon: const Icon(
                        Icons.mic_none_rounded,
                        color: AppColors.secondary,
                        size: 22,
                      ),
                      onPressed: widget.onVoiceTap,
                      tooltip: 'Voice Input',
                      padding: const EdgeInsets.all(12),
                      constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
                    ),
                    const SizedBox(width: 2),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 8),
            // Send Button (>= 48x48dp target)
            Material(
              color: _hasText ? AppColors.primary : AppColors.secondary.withValues(alpha: 0.25),
              shape: const CircleBorder(),
              child: InkWell(
                onTap: _hasText ? _handleSend : null,
                customBorder: const CircleBorder(),
                child: Container(
                  width: 48,
                  height: 48,
                  alignment: Alignment.center,
                  child: Icon(
                    Icons.arrow_upward_rounded,
                    color: _hasText ? AppColors.premiumAccent : Colors.white.withValues(alpha: 0.6),
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
