import 'package:flutter/material.dart';

/// Models for Home Screen components and mock data representations.
/// 
/// IMPORTANT: These models and mock objects are isolated UI presentation models.
/// They MUST NOT contain business or calculation logic.

class RashiBhavishyaPreview {
  final String rashiName;
  final String date;
  final String predictionPreview;
  final String luckyColor;
  final int luckyNumber;

  const RashiBhavishyaPreview({
    required this.rashiName,
    required this.date,
    required this.predictionPreview,
    required this.luckyColor,
    required this.luckyNumber,
  });
}

class PaidReportInfo {
  final String id;
  final String title;
  final String description;
  final String? badgeText;
  final String ctaText;
  final IconData icon;

  const PaidReportInfo({
    required this.id,
    required this.title,
    required this.description,
    this.badgeText,
    this.ctaText = 'View Report',
    required this.icon,
  });
}

class QuickAccessItem {
  final String id;
  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;

  const QuickAccessItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
  });
}
