import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../shared/theme/app_colors.dart';
import '../../../shared/theme/app_theme_tokens.dart';
import '../../../shared/theme/app_typography.dart';

/// Blog posts are stored as HTML written in the website admin's editor. This shows the tags that
/// editor produces (paragraphs, headings, bold/italic, lists, links, images, quotes) as native
/// text. Scripts, styles and frames are dropped; any other tag shows its text. No web view.

enum HtmlBlockKind { paragraph, heading, bullet, quote, image }

class HtmlSpan {
  final String text;
  final bool bold;
  final bool italic;

  /// Only `https` links are kept.
  final String? href;

  const HtmlSpan(this.text, {this.bold = false, this.italic = false, this.href});
}

class HtmlBlock {
  final HtmlBlockKind kind;
  final List<HtmlSpan> spans;

  /// Heading level 1 to 4.
  final int level;

  /// Position in an ordered list (1-based); null in a bulleted list.
  final int? number;

  /// List nesting depth (0 = top level).
  final int depth;
  final String? imageUrl;

  const HtmlBlock(this.kind, {this.spans = const [], this.level = 0, this.number, this.depth = 0, this.imageUrl});
}

final RegExp _token = RegExp(r'<!--[\s\S]*?-->|<(/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>');
final RegExp _attr = RegExp(r'''([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))''');
const Set<String> _dropped = {'script', 'style', 'iframe', 'object', 'embed', 'noscript', 'svg', 'head', 'title'};
const Set<String> _blockTags = {'p', 'div', 'section', 'article', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'figure', 'figcaption'};

const Map<String, String> _named = {'amp': '&', 'lt': '<', 'gt': '>', 'quot': '"', 'apos': "'", 'nbsp': ' ', 'hellip': '…', 'mdash': '—', 'ndash': '–', 'rsquo': '’', 'lsquo': '‘', 'rdquo': '”', 'ldquo': '“'};

String decodeHtmlEntities(String input) {
  return input.replaceAllMapped(RegExp(r'&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);'), (m) {
    final body = m.group(1)!;
    if (body.startsWith('#x') || body.startsWith('#X')) {
      final code = int.tryParse(body.substring(2), radix: 16);
      return code == null ? m.group(0)! : String.fromCharCode(code);
    }
    if (body.startsWith('#')) {
      final code = int.tryParse(body.substring(1));
      return code == null ? m.group(0)! : String.fromCharCode(code);
    }
    return _named[body.toLowerCase()] ?? m.group(0)!;
  });
}

Map<String, String> _attributes(String raw) {
  final result = <String, String>{};
  for (final m in _attr.allMatches(raw)) {
    result[m.group(1)!.toLowerCase()] = decodeHtmlEntities(m.group(3) ?? m.group(4) ?? m.group(5) ?? '');
  }
  return result;
}

String? _https(String? url) {
  final value = url?.trim();
  if (value == null || !value.startsWith('https://')) return null;
  return Uri.tryParse(value) == null ? null : value;
}

class _ListLevel {
  final bool ordered;
  int count = 0;
  _ListLevel(this.ordered);
}

/// Parses blog HTML into blocks. Never throws.
List<HtmlBlock> parseSimpleHtml(String html) {
  final blocks = <HtmlBlock>[];
  final lists = <_ListLevel>[];
  var spans = <HtmlSpan>[];
  var kind = HtmlBlockKind.paragraph;
  var level = 0;
  int? number;
  var depth = 0;
  var bold = 0;
  var italic = 0;
  String? href;
  var skip = 0;
  // Tables: each row becomes one line, its non-empty cells joined by " · ".
  var tableDepth = 0;
  var cellStart = 0;

  void flush() {
    // Collapse whitespace across the block, keeping the line breaks made by <br>.
    final merged = <HtmlSpan>[];
    for (final s in spans) {
      final text = s.text.replaceAll(RegExp(r'[ \t\r\f\v]*\n[ \t\r\f\v]*'), '\n').replaceAll(RegExp(r'[ \t\r\f\v]+'), ' ');
      if (text.isEmpty) continue;
      merged.add(HtmlSpan(text, bold: s.bold, italic: s.italic, href: s.href));
    }
    if (merged.isNotEmpty) {
      merged[0] = HtmlSpan(merged[0].text.trimLeft(), bold: merged[0].bold, italic: merged[0].italic, href: merged[0].href);
      final last = merged.length - 1;
      merged[last] = HtmlSpan(merged[last].text.trimRight(), bold: merged[last].bold, italic: merged[last].italic, href: merged[last].href);
      merged.removeWhere((s) => s.text.isEmpty);
    }
    if (merged.isNotEmpty && merged.any((s) => s.text.trim().isNotEmpty)) {
      blocks.add(HtmlBlock(kind, spans: merged, level: level, number: number, depth: depth));
    }
    spans = <HtmlSpan>[];
    kind = HtmlBlockKind.paragraph;
    level = 0;
    number = null;
    depth = 0;
  }

  void addText(String raw) {
    if (skip > 0 || raw.isEmpty) return;
    spans.add(HtmlSpan(decodeHtmlEntities(raw), bold: bold > 0, italic: italic > 0, href: href));
  }

  var cursor = 0;
  for (final m in _token.allMatches(html)) {
    addText(html.substring(cursor, m.start));
    cursor = m.end;
    final name = m.group(2)?.toLowerCase();
    if (name == null) continue; // comment
    final closing = m.group(1) == '/';
    final selfClosing = (m.group(3) ?? '').trimRight().endsWith('/');

    if (_dropped.contains(name)) {
      if (!selfClosing) skip = closing ? (skip > 0 ? skip - 1 : 0) : skip + 1;
      continue;
    }
    if (skip > 0) continue;

    switch (name) {
      case 'br':
        spans.add(HtmlSpan('\n', bold: bold > 0, italic: italic > 0));
        continue;
      case 'strong':
      case 'b':
        bold = closing ? (bold > 0 ? bold - 1 : 0) : bold + 1;
        continue;
      case 'em':
      case 'i':
        italic = closing ? (italic > 0 ? italic - 1 : 0) : italic + 1;
        continue;
      case 'a':
        href = closing ? null : _https(_attributes(m.group(3) ?? '')['href']);
        continue;
      case 'img':
        flush();
        final src = _https(_attributes(m.group(3) ?? '')['src']);
        if (src != null) blocks.add(HtmlBlock(HtmlBlockKind.image, imageUrl: src));
        continue;
      case 'table':
        flush();
        tableDepth = closing ? (tableDepth > 0 ? tableDepth - 1 : 0) : tableDepth + 1;
        continue;
      case 'tr':
        flush();
        continue;
      case 'td':
      case 'th':
        if (tableDepth == 0) continue;
        if (closing) {
          final start = cellStart.clamp(0, spans.length);
          final cellText = spans.sublist(start).map((x) => x.text).join().trim();
          if (cellText.isEmpty) {
            spans.removeRange(start, spans.length);
          } else if (spans.sublist(0, start).map((x) => x.text).join().trim().isNotEmpty) {
            spans.insert(start, const HtmlSpan(' · '));
          }
        } else {
          cellStart = spans.length;
          if (name == 'th') bold += 1;
        }
        if (closing && name == 'th' && bold > 0) bold -= 1;
        continue;
      case 'ul':
      case 'ol':
        flush();
        if (closing) {
          if (lists.isNotEmpty) lists.removeLast();
        } else {
          lists.add(_ListLevel(name == 'ol'));
        }
        continue;
    }

    if (_blockTags.contains(name)) {
      if (tableDepth > 0) continue; // paragraphs inside a cell stay on the row's line
      flush();
      if (closing) continue;
      if (name.length == 2 && name.startsWith('h')) {
        final n = int.parse(name.substring(1));
        kind = HtmlBlockKind.heading;
        level = n > 4 ? 4 : n;
      } else if (name == 'li') {
        kind = HtmlBlockKind.bullet;
        depth = lists.isEmpty ? 0 : lists.length - 1;
        if (lists.isNotEmpty && lists.last.ordered) number = ++lists.last.count;
      } else if (name == 'blockquote') {
        kind = HtmlBlockKind.quote;
      }
    }
    // Any other tag: ignored, its text stays.
  }
  addText(html.substring(cursor));
  flush();
  return blocks;
}

/// Shows parsed blog HTML. Links open in the browser.
class SimpleHtml extends StatefulWidget {
  final String html;

  const SimpleHtml(this.html, {super.key});

  @override
  State<SimpleHtml> createState() => _SimpleHtmlState();
}

class _SimpleHtmlState extends State<SimpleHtml> {
  late List<HtmlBlock> _blocks;
  final List<TapGestureRecognizer> _recognizers = [];

  @override
  void initState() {
    super.initState();
    _blocks = parseSimpleHtml(widget.html);
  }

  @override
  void didUpdateWidget(covariant SimpleHtml oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.html != widget.html) _blocks = parseSimpleHtml(widget.html);
  }

  @override
  void dispose() {
    for (final r in _recognizers) {
      r.dispose();
    }
    super.dispose();
  }

  TextSpan _span(HtmlSpan s, TextStyle base) {
    var style = base;
    if (s.bold) style = style.copyWith(fontWeight: FontWeight.w700);
    if (s.italic) style = style.copyWith(fontStyle: FontStyle.italic);
    if (s.href == null) return TextSpan(text: s.text, style: style);
    final recognizer = TapGestureRecognizer()
      ..onTap = () => launchUrl(Uri.parse(s.href!), mode: LaunchMode.externalApplication);
    _recognizers.add(recognizer);
    return TextSpan(
      text: s.text,
      style: style.copyWith(color: AppColors.primary, decoration: TextDecoration.underline),
      recognizer: recognizer,
    );
  }

  @override
  Widget build(BuildContext context) {
    for (final r in _recognizers) {
      r.dispose();
    }
    _recognizers.clear();
    final body = AppTypography.bodyLarge.copyWith(color: AppColors.textPrimary, height: 1.55);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final block in _blocks)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.md),
            child: _block(block, body),
          ),
      ],
    );
  }

  Widget _block(HtmlBlock block, TextStyle body) {
    switch (block.kind) {
      case HtmlBlockKind.image:
        return ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Image.network(
            block.imageUrl!,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => const SizedBox.shrink(),
          ),
        );
      case HtmlBlockKind.heading:
        final style = (block.level <= 2 ? AppTypography.titleLarge : AppTypography.titleMedium).copyWith(color: AppColors.textPrimary);
        return Padding(
          padding: const EdgeInsets.only(top: AppSpacing.sm),
          child: Text.rich(TextSpan(children: [for (final s in block.spans) _span(s, style)])),
        );
      case HtmlBlockKind.bullet:
        return Padding(
          padding: EdgeInsets.only(left: 4.0 + block.depth * 18),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(width: 22, child: Text(block.number != null ? '${block.number}.' : '•', style: body)),
              Expanded(child: Text.rich(TextSpan(children: [for (final s in block.spans) _span(s, body)]))),
            ],
          ),
        );
      case HtmlBlockKind.quote:
        return Container(
          padding: const EdgeInsets.only(left: AppSpacing.md),
          decoration: const BoxDecoration(border: Border(left: BorderSide(color: AppColors.gold, width: 3))),
          child: Text.rich(TextSpan(children: [for (final s in block.spans) _span(s, body.copyWith(fontStyle: FontStyle.italic))])),
        );
      case HtmlBlockKind.paragraph:
        return Text.rich(TextSpan(children: [for (final s in block.spans) _span(s, body)]));
    }
  }
}
