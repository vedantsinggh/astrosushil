import 'dart:async';

import 'package:flutter/material.dart';

import '../../src/theme.dart';
import '../../src/ui/widgets/common.dart';

/// Number of whitespace-separated words in [text].
int wordCount(String text) => text.trim().isEmpty ? 0 : text.trim().split(RegExp(r'\s+')).length;

/// Free-text notes for the open chart. Edits are reported through [onChanged] after a short
/// pause ([debounce]) and again when the panel is disposed with unsent edits; the owner stores
/// them in the chart file (`ChartFile.notes`).
class ChartNotesPanel extends StatefulWidget {
  const ChartNotesPanel({super.key, required this.notes, required this.onChanged, this.debounce = const Duration(milliseconds: 600)});
  final String notes;
  final ValueChanged<String> onChanged;
  final Duration debounce;

  @override
  State<ChartNotesPanel> createState() => _ChartNotesPanelState();
}

class _ChartNotesPanelState extends State<ChartNotesPanel> {
  late final _controller = TextEditingController(text: widget.notes);
  Timer? _timer;
  String _lastSent = '';

  @override
  void initState() {
    super.initState();
    _lastSent = widget.notes;
    _controller.addListener(_onText);
  }

  @override
  void didUpdateWidget(ChartNotesPanel old) {
    super.didUpdateWidget(old);
    // A different chart (or an external edit) replaced the notes: show them unless the user has
    // unsent typing that already matches.
    if (widget.notes != old.notes && widget.notes != _controller.text) {
      _timer?.cancel();
      _lastSent = widget.notes;
      _controller.value = TextEditingValue(text: widget.notes, selection: TextSelection.collapsed(offset: widget.notes.length));
    }
  }

  void _onText() {
    setState(() {}); // word count
    if (_controller.text == _lastSent) {
      _timer?.cancel();
      _timer = null;
      return;
    }
    _timer?.cancel();
    _timer = Timer(widget.debounce, _flush);
  }

  void _flush() {
    _timer?.cancel();
    _timer = null;
    if (mounted) setState(() {});
    final text = _controller.text;
    if (text == _lastSent) return;
    _lastSent = text;
    widget.onChanged(text);
  }

  @override
  void dispose() {
    if (_controller.text != _lastSent) {
      // Deliver after the frame: the owner may update state that is being torn down right now.
      final text = _controller.text, cb = widget.onChanged;
      _lastSent = text;
      scheduleMicrotask(() => cb(text));
    }
    _timer?.cancel();
    _controller.removeListener(_onText);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    final words = wordCount(_controller.text);
    final pending = _timer != null;
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
      child: SectionCard(
        title: 'Chart notes',
        subtitle: 'Saved in the chart file',
        trailing: Text(
          '$words ${words == 1 ? 'word' : 'words'} · ${_controller.text.characters.length} characters',
          key: const ValueKey('notes-count'),
          style: TextStyle(fontSize: 12, color: pal.textMuted, fontFeatures: tabularFigures),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 320),
            child: TextField(
              key: const ValueKey('chart-notes-editor'),
              controller: _controller,
              keyboardType: TextInputType.multiline,
              maxLines: 24,
              minLines: 14,
              textAlignVertical: TextAlignVertical.top,
              style: TextStyle(fontSize: 14, height: 1.45, color: pal.text),
              decoration: const InputDecoration(
                hintText: 'Notes about this chart: consultation remarks, rectification, follow-ups…',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
            ),
          ),
          const SizedBox(height: Gap.sm),
          Row(children: [
            Icon(pending ? Icons.edit_note_outlined : Icons.save_outlined, size: 16, color: pal.textMuted),
            const SizedBox(width: Gap.xs),
            Expanded(
              child: Text(
                pending ? 'Editing…' : 'Notes are saved in the chart file when the chart is saved.',
                key: const ValueKey('notes-status'),
                style: TextStyle(fontSize: 12, color: pal.textMuted),
              ),
            ),
          ]),
        ]),
      ),
    );
  }
}
