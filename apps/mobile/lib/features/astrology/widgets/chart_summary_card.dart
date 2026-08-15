import 'package:flutter/material.dart';
import '../../../core/utils/formatters.dart';
import '../../../shared/theme/app_theme.dart';
import '../models/astro_chart_model.dart';

/// Card widget displaying chart calculation parameters and ascendant info
class ChartSummaryCard extends StatelessWidget {
  final AstroChartModel chart;

  const ChartSummaryCard({
    super.key,
    required this.chart,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.info_outline, color: theme.colorScheme.secondary),
                const SizedBox(width: 8),
                const Text(
                  'Chart Calculation Metadata',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const Divider(height: 20),
            _buildRow(context, 'Engine Version', chart.calculationVersion),
            _buildRow(context, 'Provider', '${chart.providerName} (${chart.providerVersion})'),
            _buildRow(context, 'Ayanamsa', chart.config.ayanamsa),
            _buildRow(context, 'Zodiac System', chart.config.zodiacType),
            _buildRow(context, 'House System', chart.config.houseSystem),
            _buildRow(context, 'Node Mode', chart.config.nodeCalculation),
            if (chart.ascendant != null) ...[
              const Divider(height: 20),
              Row(
                children: [
                  Icon(Icons.star_outline, color: theme.colorScheme.premiumAccent, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Ascendant (Lagna): ${chart.ascendant!.rashiName} (${Formatters.formatDegree(chart.ascendant!.degreeInRashi)})',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: theme.colorScheme.premiumAccent,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Padding(
                padding: const EdgeInsets.only(left: 28),
                child: Text(
                  'Nakshatra: ${chart.ascendant!.nakshatraName} (Pada ${chart.ascendant!.pada}) - Lord: ${chart.ascendant!.nakshatraLord}',
                  style: TextStyle(fontSize: 12, color: theme.colorScheme.textSecondary),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildRow(BuildContext context, String label, String value) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(fontSize: 13, color: theme.colorScheme.textSecondary),
          ),
          Flexible(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: theme.colorScheme.onSurface,
              ),
              textAlign: TextAlign.right,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
