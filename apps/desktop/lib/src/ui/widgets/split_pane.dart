import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../theme.dart';

/// Two panes side by side with a draggable divider. Falls back to a vertical stack when the
/// space is narrower than [minWidthForSplit]. The divider is keyboard-accessible (arrow keys).
class SplitPane extends StatefulWidget {
  const SplitPane({
    super.key,
    required this.left,
    required this.right,
    required this.fraction,
    required this.onChanged,
    this.minLeft = 320,
    this.minRight = 300,
    this.minWidthForSplit = 760,
  });

  final Widget left;
  final Widget right;
  final double fraction;
  final ValueChanged<double> onChanged;
  final double minLeft;
  final double minRight;
  final double minWidthForSplit;

  @override
  State<SplitPane> createState() => _SplitPaneState();
}

class _SplitPaneState extends State<SplitPane> {
  late double _f = widget.fraction;
  bool _hover = false;
  bool _drag = false;
  final _focus = FocusNode(debugLabel: 'split divider');

  @override
  void didUpdateWidget(SplitPane old) {
    super.didUpdateWidget(old);
    if (!_drag && old.fraction != widget.fraction) _f = widget.fraction;
  }

  @override
  void dispose() {
    _focus.dispose();
    super.dispose();
  }

  double _clamp(double f, double w) {
    final lo = widget.minLeft / w;
    final hi = 1 - widget.minRight / w;
    return lo >= hi ? 0.5 : f.clamp(lo, hi);
  }

  @override
  Widget build(BuildContext context) {
    final pal = context.palette;
    return LayoutBuilder(builder: (context, c) {
      final w = c.maxWidth;
      if (w < widget.minWidthForSplit) {
        return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [Expanded(child: widget.left), Divider(color: pal.border), Expanded(child: widget.right)]);
      }
      const handle = 9.0;
      final f = _clamp(_f, w);
      final leftW = (w - handle) * f;
      final active = _hover || _drag || _focus.hasFocus;
      return Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        SizedBox(width: leftW, child: widget.left),
        Focus(
          focusNode: _focus,
          onFocusChange: (_) => setState(() {}),
          onKeyEvent: (node, e) {
            if (e is! KeyDownEvent && e is! KeyRepeatEvent) return KeyEventResult.ignored;
            final step = e.logicalKey == LogicalKeyboardKey.arrowLeft ? -0.03 : (e.logicalKey == LogicalKeyboardKey.arrowRight ? 0.03 : 0.0);
            if (step == 0) return KeyEventResult.ignored;
            setState(() => _f = _clamp(_f + step, w));
            widget.onChanged(_f);
            return KeyEventResult.handled;
          },
          child: Semantics(
            label: 'Resize panes',
            slider: true,
            child: MouseRegion(
              cursor: SystemMouseCursors.resizeColumn,
              onEnter: (_) => setState(() => _hover = true),
              onExit: (_) => setState(() => _hover = false),
              child: GestureDetector(
                key: const Key('split-divider'),
                behavior: HitTestBehavior.opaque,
                onHorizontalDragStart: (_) => setState(() => _drag = true),
                onHorizontalDragUpdate: (d) => setState(() => _f = _clamp(_f + d.delta.dx / (w - handle), w)),
                onHorizontalDragEnd: (_) {
                  setState(() => _drag = false);
                  widget.onChanged(_f);
                },
                onDoubleTap: () {
                  setState(() => _f = 0.5);
                  widget.onChanged(_f);
                },
                child: SizedBox(
                  width: handle,
                  child: Center(
                    child: AnimatedContainer(
                      duration: Motion.fast,
                      width: active ? 3 : 1,
                      decoration: BoxDecoration(color: active ? pal.accent : pal.border, borderRadius: BorderRadius.circular(2)),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
        Expanded(child: widget.right),
      ]);
    });
  }
}
