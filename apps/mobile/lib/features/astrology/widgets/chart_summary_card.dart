import 'package:flutter/material.dart';
import '../../../core/utils/formatters.dart';
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
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.info_outline, color: Color(0xFF818CF8)),
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
            _buildRow('Engine Version', chart.calculationVersion),
            _buildRow('Provider', '${chart.providerName} (${chart.providerVersion})'),
            _buildRow('Ayanamsa', chart.config.ayanamsa),
            _buildRow('Zodiac System', chart.config.zodiacType),
            _buildRow('House System', chart.config.houseSystem),
            _buildRow('Node Mode', chart.config.nodeCalculation),
            if (chart.ascendant != null) ...[
              const Divider(height: 20),
              Row(
                children: [
                  const Icon(Icons.star_outline, color: Color(0xFFF59E0B), size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Ascendant (Lagna): ${chart.ascendant!.rashiName} (${Formatters.formatDegree(chart.ascendant!.degreeInRashi)})',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: Color(0xFFFBBF24),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Padding(
                padding: const EdgeInsets.only(left: 28),
                child: Text(
                  'Nakshatra: ${chart.ascendant!.nakshatraName} (Pada ${chart.ascendant!.pada}) - Lord: ${chart.ascendant!.nakshatraLord}',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
          ),
          Flexible(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: Color(0xFFE2E8F0),
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
