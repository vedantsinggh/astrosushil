import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/home_models.dart';

/// DEVELOPMENT ONLY MOCK REPOSITORY FOR ASTRO SUSHIL HOME SCREEN
/// 
/// Strictly isolated data source providing visual mock details for unbuilt
/// MVP backend features (Rashi Bhavishya, Vastu, Reports, Gupta Nadi UI entry point).
/// 
/// DO NOT USE FOR ASTROLOGICAL CALCULATIONS OR PRODUCTION BUSINESS LOGIC.
class MockHomeRepository {
  /// Fetch today's Rashi Bhavishya mock preview
  RashiBhavishyaPreview getDailyPrediction() {
    final todayStr = DateFormat('EEEE, MMM d, yyyy').format(DateTime.now());
    return RashiBhavishyaPreview(
      rashiName: 'Mesha (Aries)',
      date: todayStr,
      predictionPreview:
          'Favorable planetary positioning supports key decision-making today. Focus on clarity in personal pursuits and strategic patience in career moves.',
      luckyColor: 'Royal Gold',
      luckyNumber: 7,
    );
  }

  /// Fetch approved MVP paid personalized report metadata
  List<PaidReportInfo> getPersonalizedReports() {
    return const [
      PaidReportInfo(
        id: 'career_report',
        title: 'Career Report',
        description:
            'Detailed analysis of your professional path, career growth cycles, and business opportunities.',
        badgeText: 'MOST POPULAR',
        ctaText: 'View Report',
        icon: Icons.work_outline,
      ),
      PaidReportInfo(
        id: 'marriage_report',
        title: 'Marriage & Relationship Report',
        description:
            'Understand life partner compatibility timing, marital harmony, and relationship dynamics.',
        badgeText: 'HIGHLY DETAILED',
        ctaText: 'View Report',
        icon: Icons.favorite_border,
      ),
      PaidReportInfo(
        id: 'childbirth_report',
        title: 'Childbirth Report',
        description:
            'Astrological insights into family planning, progeny timing, and planetary alignment for lineage.',
        badgeText: null,
        ctaText: 'View Report',
        icon: Icons.child_care_outlined,
      ),
    ];
  }
}
