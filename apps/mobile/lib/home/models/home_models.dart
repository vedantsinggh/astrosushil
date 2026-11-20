import 'package:flutter/material.dart';

/// UI presentation models for Home Screen components.
///
/// IMPORTANT: These models carry backend data only. They MUST NOT contain
/// business/calculation logic or invented default values.

class RashiBhavishyaPreview {
  final String rashiName;
  final String date;

  /// Null when the backend has no verified prediction for today.
  final String? predictionPreview;
  final String? luckyColor;
  final int? luckyNumber;

  const RashiBhavishyaPreview({
    required this.rashiName,
    required this.date,
    this.predictionPreview,
    this.luckyColor,
    this.luckyNumber,
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
