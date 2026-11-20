import 'dart:math' as math;

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_theme_tokens.dart';
import 'astro_nav_bar.dart';

/// A complete iOS-style page: [Scaffold] + [CustomScrollView] whose first
/// sliver is the collapsing large-title [AstroSliverNavBar].
///
/// Give it either [child] (any box widget: placed in a padded, width-capped
/// column, so `SingleChildScrollView(child: Column(...))` bodies swap 1:1)
/// or [slivers] (for long lists / grids; wrap them in [AstroSliverContent]
/// to get the same gutters and tablet width cap).
///
/// ```dart
/// AstroPage(
///   title: 'Settings',
///   child: Column(children: [...]),
/// )
/// ```
///
/// Media-led screens (product detail, a lesson player) can drop the large
/// title with [largeTitle] `false`: only the compact bar is shown, so the
/// artwork leads the page.
///
/// ```dart
/// AstroPage(title: product.name, largeTitle: false, actions: [...], child: ...)
/// ```
class AstroPage extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget>? actions;
  final AstroNavBarStyle style;
  final bool showBack;
  final VoidCallback? onBack;
  final String? backLabel;
  final Widget? leading;

  /// Box content (mutually exclusive with [slivers]).
  final Widget? child;

  /// Sliver content (mutually exclusive with [child]).
  final List<Widget>? slivers;

  /// Padding around [child]. Defaults to the 16pt gutter, 4 top, 32 bottom.
  final EdgeInsetsGeometry padding;

  /// Pull to refresh (Cupertino control on iOS, Material indicator elsewhere).
  final Future<void> Function()? onRefresh;

  /// Sticky footer (e.g. a primary button bar).
  final Widget? bottomBar;
  final Widget? floatingActionButton;
  final ScrollController? controller;
  final Color? backgroundColor;
  final bool resizeToAvoidBottomInset;

  /// Optional pinned widget under the nav bar row (e.g. segmented control).
  /// An [AstroAdaptiveBottom] such as `AstroSegmentedNavBottom` is sized to
  /// its real content at the current width and text size.
  final PreferredSizeWidget? navBottom;

  /// Show the collapsing large title (default). `false` shows only the
  /// compact bar (title centred on iOS), for media-led screens.
  final bool largeTitle;

  const AstroPage({
    super.key,
    required this.title,
    this.subtitle,
    this.actions,
    this.style = AstroNavBarStyle.accent,
    this.showBack = true,
    this.onBack,
    this.backLabel,
    this.leading,
    this.child,
    this.slivers,
    this.padding = const EdgeInsets.fromLTRB(AstroMetrics.gutter, 4, AstroMetrics.gutter, 32),
    this.onRefresh,
    this.bottomBar,
    this.floatingActionButton,
    this.controller,
    this.backgroundColor,
    this.resizeToAvoidBottomInset = true,
    this.navBottom,
    this.largeTitle = true,
  }) : assert(child == null || slivers == null, 'Pass either child or slivers, not both');

  @override
  Widget build(BuildContext context) {
    final isIOS = Theme.of(context).platform == TargetPlatform.iOS;
    final content = <Widget>[
      AstroSliverNavBar(
        title: title,
        subtitle: subtitle,
        actions: actions,
        style: style,
        showBack: showBack,
        onBack: onBack,
        backLabel: backLabel,
        leading: leading,
        bottom: navBottom,
        largeTitle: largeTitle,
      ),
      if (onRefresh != null && isIOS) CupertinoSliverRefreshControl(onRefresh: onRefresh),
      if (child != null)
        SliverPadding(
          padding: padding,
          sliver: SliverToBoxAdapter(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: AstroMetrics.maxContentWidth),
                child: child,
              ),
            ),
          ),
        ),
      ...?slivers,
    ];

    Widget scroll = CustomScrollView(controller: controller, slivers: content);
    if (onRefresh != null && !isIOS) {
      scroll = RefreshIndicator.adaptive(
        onRefresh: onRefresh!,
        edgeOffset: MediaQuery.paddingOf(context).top + AstroMetrics.navBarHeight,
        child: scroll,
      );
    }

    return Scaffold(
      backgroundColor: backgroundColor ?? AppColors.canvas,
      resizeToAvoidBottomInset: resizeToAvoidBottomInset,
      bottomNavigationBar: bottomBar,
      floatingActionButton: floatingActionButton,
      body: scroll,
    );
  }
}

/// Wraps slivers with the standard page gutter and centres them at
/// [AstroMetrics.maxContentWidth] on tablets / landscape.
class AstroSliverContent extends StatelessWidget {
  final Widget sliver;
  final double top;
  final double bottom;
  final double maxWidth;

  const AstroSliverContent({
    super.key,
    required this.sliver,
    this.top = 4,
    this.bottom = 32,
    this.maxWidth = AstroMetrics.maxContentWidth,
  });

  @override
  Widget build(BuildContext context) {
    return SliverLayoutBuilder(
      builder: (context, constraints) {
        final side = math.max(AstroMetrics.gutter, (constraints.crossAxisExtent - maxWidth) / 2);
        return SliverPadding(
          padding: EdgeInsets.fromLTRB(side, top, side, bottom),
          sliver: sliver,
        );
      },
    );
  }
}
