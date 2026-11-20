import 'dart:math' as math;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';

/// Scrolling helpers that know about the pinned, frosted `AstroSliverNavBar`.
class AstroScroll {
  AstroScroll._();

  /// Scrolls the nearest [Scrollable] around [target] so that [target] is
  /// revealed *below* any pinned headers (the collapsed `AstroSliverNavBar`,
  /// its pinned `bottom`, or any other pinned `SliverPersistentHeader`)
  /// that precede it, with a small [gap].
  ///
  /// `Scrollable.ensureVisible` at best parks the target flush against the
  /// frosted bar's hairline (with `alignment` fractions measured against
  /// the whole viewport), and it cannot see bars that are not pinned
  /// slivers of the same viewport. This helper measures the target's live
  /// position and the collapsed pinned extent itself.
  ///
  /// [target] is the target's [BuildContext] (e.g. `key.currentContext`).
  /// [alignment] works like `ensureVisible`: 0 puts the target's top just
  /// under the pinned bar, 1 puts its bottom at the bottom of the viewport.
  /// [gap] adds breathing room between the bar and the target. Without a
  /// [duration] it jumps. Returns once the scroll has finished; does
  /// nothing when [target] is not in a scrollable or is unmounted.
  ///
  /// ```dart
  /// AstroScroll.reveal(_sectionKey.currentContext!, duration: const Duration(milliseconds: 350));
  /// ```
  static Future<void> reveal(
    BuildContext target, {
    double alignment = 0,
    double gap = 8,
    Duration duration = Duration.zero,
    Curve curve = Curves.easeInOut,
  }) async {
    if (!target.mounted) return;
    final scrollable = Scrollable.maybeOf(target);
    final object = target.findRenderObject();
    if (scrollable == null || object == null || !object.attached) return;
    final viewport = RenderAbstractViewport.maybeOf(object);
    if (viewport == null) return;
    final position = scrollable.position;

    // Where the target is now, in the viewport's coordinates, and so the
    // scroll offset that would put its leading edge at the viewport's
    // leading edge. Computed from the paint transform (not
    // getOffsetToReveal) so pinned headers are subtracted exactly once.
    final box = object is RenderBox ? object : null;
    final size = box?.size ?? object.paintBounds.size;
    final rect = MatrixUtils.transformRect(object.getTransformTo(viewport as RenderObject), Offset.zero & size);
    final vertical = position.axis == Axis.vertical;
    final leading = vertical ? rect.top : rect.left;
    final targetExtent = vertical ? rect.height : rect.width;
    final pinned = pinnedExtentBefore(viewport, object);
    final visible = math.max(0.0, position.viewportDimension - pinned - gap);
    final offset = position.pixels + leading - pinned - gap - alignment.clamp(0.0, 1.0) * math.max(0.0, visible - targetExtent);
    final clamped = offset.clamp(position.minScrollExtent, position.maxScrollExtent).toDouble();
    if ((clamped - position.pixels).abs() < 0.5) return;
    if (duration == Duration.zero) {
      position.jumpTo(clamped);
    } else {
      await position.animateTo(clamped, duration: duration, curve: curve);
    }
  }

  /// Total collapsed extent of the pinned persistent headers that come
  /// before [target] in [viewport] (the height they cover once collapsed).
  static double pinnedExtentBefore(RenderAbstractViewport viewport, RenderObject target) {
    if (viewport is! RenderViewportBase) return 0;
    // The viewport's direct child that contains the target.
    RenderObject? child = target;
    while (child != null && child.parent != viewport) {
      child = child.parent;
    }
    double total = 0;
    RenderSliver? sliver = viewport.firstChild;
    while (sliver != null && sliver != child) {
      total += _pinnedExtent(sliver);
      sliver = viewport.childAfter(sliver);
    }
    return total;
  }

  static double _pinnedExtent(RenderObject node) {
    if (node is RenderSliverPinnedPersistentHeader) return node.minExtent;
    if (node is! RenderSliver) return 0;
    double sum = 0;
    // Look through sliver wrappers (SliverLayoutBuilder, SliverPadding, ...)
    // but not into box content.
    node.visitChildren((c) => sum += _pinnedExtent(c));
    return sum;
  }
}
