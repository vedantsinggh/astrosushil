import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Shared sizing for Jyoti chat bubbles so every message lines up like a
/// familiar messaging app: Jyoti on the left, the user on the right.
class JyotiBubbleLayout {
  JyotiBubbleLayout._();

  /// Horizontal page gutter for every chat row.
  static const double gutter = 16;

  /// Max bubble width: most of a phone screen, capped on tablets so lines
  /// stay comfortable to read.
  static double maxWidth(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    return math.min(width * 0.86, 600);
  }

  /// Wraps a bubble so it hugs one side of the screen.
  static Widget align({
    required BuildContext context,
    required bool fromUser,
    required Widget child,
    EdgeInsetsGeometry padding = const EdgeInsets.symmetric(horizontal: gutter, vertical: 6),
  }) {
    return Padding(
      padding: padding,
      child: Align(
        alignment: fromUser ? Alignment.centerRight : Alignment.centerLeft,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: maxWidth(context)),
          child: child,
        ),
      ),
    );
  }
}
