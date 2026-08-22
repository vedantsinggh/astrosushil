import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';

/// Lightweight Markdown and newline renderer for Jyoti AI chat messages.
/// Supports **bold**, *italic*, bullet points, and clean paragraph breaks.
class JyotiMarkdownText extends StatelessWidget {
  final String text;
  final TextStyle? style;

  const JyotiMarkdownText({
    super.key,
    required this.text,
    this.style,
  });

  @override
  Widget build(BuildContext context) {
    final baseStyle = style ??
        const TextStyle(
          fontSize: 14.5,
          height: 1.45,
          color: AppColors.lightTextPrimary,
          fontWeight: FontWeight.w400,
        );

    // Sanitize any literal '\n' string representations into actual newline characters
    final sanitizedText = text.replaceAll(r'\n', '\n');

    final spans = _parseMarkdownSpans(sanitizedText, baseStyle);

    return SelectableText.rich(
      TextSpan(children: spans, style: baseStyle),
    );
  }

  List<InlineSpan> _parseMarkdownSpans(String content, TextStyle baseStyle) {
    final List<InlineSpan> spans = [];

    // Regex matching **bold** and *italic* tags
    final regex = RegExp(r'(\*\*(.*?)\*\*|\*(.*?)\*)', dotAll: true);
    int lastMatchEnd = 0;

    for (final match in regex.allMatches(content)) {
      if (match.start > lastMatchEnd) {
        spans.add(TextSpan(
          text: content.substring(lastMatchEnd, match.start),
          style: baseStyle,
        ));
      }

      final fullMatch = match.group(0)!;
      if (fullMatch.startsWith('**') && fullMatch.endsWith('**')) {
        final innerText = match.group(2) ?? '';
        spans.add(TextSpan(
          text: innerText,
          style: baseStyle.copyWith(fontWeight: FontWeight.bold),
        ));
      } else if (fullMatch.startsWith('*') && fullMatch.endsWith('*')) {
        final innerText = match.group(3) ?? '';
        spans.add(TextSpan(
          text: innerText,
          style: baseStyle.copyWith(fontStyle: FontStyle.italic),
        ));
      }

      lastMatchEnd = match.end;
    }

    if (lastMatchEnd < content.length) {
      spans.add(TextSpan(
        text: content.substring(lastMatchEnd),
        style: baseStyle,
      ));
    }

    return spans;
  }
}
