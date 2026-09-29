import 'package:flutter/material.dart';
import '../../../shared/theme/app_colors.dart';

/// Reusable formatting and presentation component for astrological degrees, minutes, and coordinates.
/// Formats numerical degree floats (e.g. 18.4088) into standard Vedic format: 18° 24′ 32″ or 18° 24′.
class DegreeValueDisplay extends StatelessWidget {
  final double? degree;
  final String? rawText;
  final String? label;
  final bool showSeconds;
  final TextStyle? valueStyle;
  final TextStyle? labelStyle;
  final bool isMonospace;
  final bool isBold;
  final Color? color;

  const DegreeValueDisplay({
    super.key,
    this.degree,
    this.rawText,
    this.label,
    this.showSeconds = false,
    this.valueStyle,
    this.labelStyle,
    this.isMonospace = true,
    this.isBold = true,
    this.color,
  });

  String _formatDegree(double val) {
    final deg = val.floor();
    final minutesDouble = (val - deg) * 60;
    final min = minutesDouble.floor();
    if (!showSeconds) {
      return '$deg° ${min.toString().padLeft(2, '0')}′';
    }
    final secondsDouble = (minutesDouble - min) * 60;
    final sec = secondsDouble.round();
    return '$deg° ${min.toString().padLeft(2, '0')}′ ${sec.toString().padLeft(2, '0')}″';
  }

  @override
  Widget build(BuildContext context) {
    final formatted = rawText ?? (degree != null ? _formatDegree(degree!) : '—');
    final effectiveColor = color ?? AppColors.primary;

    final defaultStyle = TextStyle(
      fontSize: 13,
      fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
      fontFamily: isMonospace ? 'monospace' : null,
      color: effectiveColor,
      letterSpacing: -0.2,
    );

    if (label == null) {
      return Text(
        formatted,
        style: valueStyle ?? defaultStyle,
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label!,
          style: labelStyle ??
              const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: AppColors.lightTextSecondary,
              ),
        ),
        const SizedBox(height: 2),
        Text(
          formatted,
          style: valueStyle ?? defaultStyle,
        ),
      ],
    );
  }
}
