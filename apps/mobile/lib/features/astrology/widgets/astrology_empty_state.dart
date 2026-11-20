import 'package:flutter/material.dart';
import '../../../shared/widgets/astro_design_system.dart';

/// Reusable empty state view when no birth profile or chart data exists.
class AstrologyEmptyState extends StatelessWidget {
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;
  final IconData icon;

  const AstrologyEmptyState({
    super.key,
    this.title = 'No Birth Profile Selected',
    this.message =
        'Please select or add a birth profile to view detailed astrological calculations.',
    this.actionLabel = 'Add Birth Profile',
    this.onAction,
    this.icon = Icons.auto_awesome_rounded,
  });

  @override
  Widget build(BuildContext context) {
    return AstroSurfaceCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: AstroStateView.empty(
        compact: true,
        icon: icon,
        tint: AstroTint.amber,
        title: title,
        message: message,
        actionLabel: actionLabel,
        onAction: onAction,
      ),
    );
  }
}
