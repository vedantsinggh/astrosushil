import 'package:flutter/material.dart';

import '../../src/theme.dart';

/// Banner shown on every calculation that follows a provisional convention (ADR-016): the
/// method is a standard published default, cited, and awaits the client's review.
class ProvisionalBanner extends StatelessWidget {
  const ProvisionalBanner({super.key, required this.source, this.label = 'Provisional – pending client review'});
  final String source;
  final String label;

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: Gap.md, vertical: Gap.sm),
      decoration: BoxDecoration(
        color: pal.warning.withValues(alpha: 0.10),
        border: Border.all(color: pal.warning.withValues(alpha: 0.45)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(Icons.pending_actions_outlined, size: 18, color: pal.warning),
        const SizedBox(width: Gap.sm),
        Expanded(
          child: Text.rich(TextSpan(children: [
            TextSpan(text: '$label. ', style: TextStyle(fontWeight: FontWeight.w700, color: pal.text)),
            TextSpan(text: 'Source: $source', style: TextStyle(color: pal.textMuted)),
          ]), style: const TextStyle(fontSize: 12.5)),
        ),
      ]),
    );
  }
}
