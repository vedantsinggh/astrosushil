import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:astro_mobile/features/reports/models/user_report_item_model.dart';

void main() {
  group('Phase 6.11: UserReportItemModel Fortune Plus Tests', () {
    test('UserReportItemModel correctly handles FORTUNE_PLUS', () {
      final item = UserReportItemModel(
        id: 'rep_fortune_plus_001',
        userId: 'usr_001',
        birthProfileId: 'bp_001',
        reportType: 'FORTUNE_PLUS',
        status: 'COMPLETED',
        stage: 'COMPLETED',
        progress: 100,
        createdAt: DateTime(2026, 11, 11),
        profileName: 'Puneet Kumar',
      );

      expect(item.displayTitle, 'Personalised Fortune Report Plus (Comprehensive Edition)');
      expect(item.displayTagline, '25-CHAPTER VEDIC NUMEROLOGY & ASTROLOGICAL DOSSIER');
      expect(item.displayPrice, 'Pricing Pending');
      expect(item.icon, Icons.diamond_rounded);
      expect(item.isCompleted, isTrue);
    });

    test('UserReportItemModel preserves existing FORTUNE mappings', () {
      final item = UserReportItemModel(
        id: 'rep_fortune_001',
        userId: 'usr_001',
        birthProfileId: 'bp_001',
        reportType: 'FORTUNE',
        status: 'COMPLETED',
        stage: 'COMPLETED',
        progress: 100,
        createdAt: DateTime(2026, 11, 11),
        profileName: 'Puneet Kumar',
      );

      expect(item.displayTitle, 'Personalised Fortune Report Plus');
      expect(item.displayTagline, 'CHALDEAN NUMEROLOGY, LO-SHU GRID & 17-PART VEDIC BLUEPRINT');
      expect(item.displayPrice, '₹499');
      expect(item.icon, Icons.diamond_outlined);
    });
  });
}
