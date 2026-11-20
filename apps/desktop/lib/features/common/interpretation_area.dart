import 'package:flutter/material.dart';

import '../../src/theme.dart';

/// Optional, empty "Notes / interpretation" area (ADR-016 §7). The app ships no interpretation
/// text; the astrologer may type their own notes here. Nothing is generated or pre-filled.
class InterpretationArea extends StatefulWidget {
  const InterpretationArea({super.key, this.initialText = '', this.onChanged});
  final String initialText;
  final ValueChanged<String>? onChanged;

  @override
  State<InterpretationArea> createState() => _InterpretationAreaState();
}

class _InterpretationAreaState extends State<InterpretationArea> {
  late final TextEditingController _c = TextEditingController(text: widget.initialText);
  bool _open = false;

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      TextButton.icon(
        onPressed: () => setState(() => _open = !_open),
        icon: Icon(_open ? Icons.expand_less : Icons.edit_note_outlined, size: 18),
        label: const Text('Notes / interpretation'),
      ),
      if (_open)
        TextField(
          controller: _c,
          minLines: 3,
          maxLines: 8,
          onChanged: widget.onChanged,
          decoration: InputDecoration(
            hintText: 'Your own notes. The app provides calculations only; no interpretation text is included.',
            hintStyle: TextStyle(color: pal.textMuted, fontSize: 12.5),
            border: const OutlineInputBorder(),
          ),
        ),
    ]);
  }
}
