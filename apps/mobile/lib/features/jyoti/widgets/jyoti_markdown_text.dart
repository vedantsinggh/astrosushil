import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';

/// Lightweight Markdown and newline renderer for Jyoti AI chat messages.
/// Supports **bold**, *italic*, bullet points (-/*), headers (#/##), and clean paragraph breaks.
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

    final spans = _parseMarkdown(sanitizedText, baseStyle);

    return SelectableText.rich(
      TextSpan(children: spans, style: baseStyle),
    );
  }

  List<InlineSpan> _parseMarkdown(String content, TextStyle baseStyle) {
    final List<InlineSpan> spans = [];
    final lines = content.split('\n');

    for (int i = 0; i < lines.length; i++) {
      final line = lines[i];

      // Handle Markdown Headers
      if (line.startsWith('# ')) {
        spans.addAll(_parseLineFormatting(
          line.substring(2),
          baseStyle.copyWith(fontSize: 17, fontWeight: FontWeight.bold, color: AppColors.primary),
        ));
      } else if (line.startsWith('## ')) {
        spans.addAll(_parseLineFormatting(
          line.substring(3),
          baseStyle.copyWith(fontSize: 15.5, fontWeight: FontWeight.bold, color: AppColors.primary),
        ));
      } else if (line.startsWith('### ')) {
        spans.addAll(_parseLineFormatting(
          line.substring(4),
          baseStyle.copyWith(fontSize: 14.5, fontWeight: FontWeight.bold, color: AppColors.secondary),
        ));
      }
      // Handle Bullet Points
      else if (line.trimLeft().startsWith('- ') || line.trimLeft().startsWith('* ')) {
        final bulletText = line.trimLeft().substring(2);
        spans.add(TextSpan(
          text: '  •  ',
          style: baseStyle.copyWith(fontWeight: FontWeight.bold, color: AppColors.primary),
        ));
        spans.addAll(_parseLineFormatting(bulletText, baseStyle));
      }
      // Standard Line
      else {
        spans.addAll(_parseLineFormatting(line, baseStyle));
      }

      // Add newline if not the last line
      if (i < lines.length - 1) {
        spans.add(const TextSpan(text: '\n'));
      }
    }

    return spans;
  }

  List<InlineSpan> _parseLineFormatting(String lineContent, TextStyle baseStyle) {
    final List<InlineSpan> spans = [];
    final regex = RegExp(r'(\*\*(.*?)\*\*|\*(.*?)\*)', dotAll: true);
    int lastMatchEnd = 0;

    for (final match in regex.allMatches(lineContent)) {
      if (match.start > lastMatchEnd) {
        spans.add(TextSpan(
          text: lineContent.substring(lastMatchEnd, match.start),
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

    if (lastMatchEnd < lineContent.length) {
      spans.add(TextSpan(
        text: lineContent.substring(lastMatchEnd),
        style: baseStyle,
      ));
    }

    return spans;
  }
}

