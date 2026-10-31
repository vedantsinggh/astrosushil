import 'package:flutter/material.dart';
import '../../shared/theme/app_colors.dart';
import '../models/home_models.dart';

/// Section showcasing paid personalized report options in horizontal carousel/list
class ReportsSection extends StatelessWidget {
  final List<PaidReportInfo> reports;
  final Function(PaidReportInfo report) onReportTap;
  final VoidCallback? onViewAllTap;

  const ReportsSection({
    super.key,
    required this.reports,
    required this.onReportTap,
    this.onViewAllTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section Header: "Personalized Reports" + "View All"
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Expanded(
                child: Text(
                  'Personalized Reports',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                    letterSpacing: -0.3,
                  ),
                ),
              ),
              InkWell(
                onTap: onViewAllTap ?? () {},
                borderRadius: BorderRadius.circular(8),
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 4.0, vertical: 2.0),
                  child: Text(
                    'View All',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.secondary,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Horizontal Carousel of Report Cards
        SizedBox(
          height: 235,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            itemCount: reports.length,
            separatorBuilder: (context, index) => const SizedBox(width: 14),
            itemBuilder: (context, index) {
              final report = reports[index];
              return _ReportCardItem(
                report: report,
                index: index,
                onTap: () => onReportTap(report),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _ReportCardItem extends StatelessWidget {
  final PaidReportInfo report;
  final int index;
  final VoidCallback onTap;

  const _ReportCardItem({
    required this.report,
    required this.index,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final Color iconBgColor;
    final Color iconColor;
    final Color btnBgColor;
    final Color btnTextColor;
    final IconData cardIcon;
    final String pageCount;

    if (report.id.contains('career')) {
      iconBgColor = const Color(0xFFEAE8F4);
      iconColor = AppColors.secondary;
      btnBgColor = const Color(0xFFEAE8F4);
      btnTextColor = AppColors.secondary;
      cardIcon = Icons.work_outline_rounded;
      pageCount = '68 Pages';
    } else if (report.id.contains('marriage') || report.id.contains('relationship')) {
      iconBgColor = const Color(0xFFFBE8EE);
      iconColor = AppColors.supportingAccent;
      btnBgColor = const Color(0xFFFBE8EE);
      btnTextColor = AppColors.supportingAccent;
      cardIcon = Icons.favorite_border_rounded;
      pageCount = '45 Pages';
    } else {
      iconBgColor = const Color(0xFFFAF3DC);
      iconColor = const Color(0xFFB38E22);
      btnBgColor = const Color(0xFFFAF3DC);
      btnTextColor = const Color(0xFFB38E22);
      cardIcon = Icons.menu_book_rounded;
      pageCount = '52 Pages';
    }

    return Container(
      width: 220,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.lightBorder, width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Top Right Premium Crown Badge
          Positioned(
            top: 14,
            right: 14,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF8EC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFD97706).withValues(alpha: 0.3), width: 0.6),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('👑', style: TextStyle(fontSize: 9)),
                  const SizedBox(width: 3),
                  Text(
                    pageCount,
                    style: const TextStyle(
                      fontSize: 8,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF92400E),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Main Card Content
          Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(20),
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(20),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Top Icon Container
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: iconBgColor,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Icon(
                          cardIcon,
                          size: 20,
                          color: iconColor,
                        ),
                      ),
                    ),

                    const SizedBox(height: 10),

                    // Title & Description
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          report.title,
                          style: const TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                            height: 1.25,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          report.description,
                          style: const TextStyle(
                            fontSize: 10.5,
                            color: AppColors.lightTextSecondary,
                            height: 1.3,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),

                    const SizedBox(height: 10),

                    // View Report Button Pill
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 7),
                      decoration: BoxDecoration(
                        color: btnBgColor,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Center(
                        child: Text(
                          report.ctaText,
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.bold,
                            color: btnTextColor,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
