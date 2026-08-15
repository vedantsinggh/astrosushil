import 'package:flutter/material.dart';
import '../../../core/utils/formatters.dart';
import '../../../shared/theme/app_theme.dart';
import '../models/astro_chart_model.dart';

/// Clean table displaying planetary positions, Rashis, and Nakshatras
class PlanetTableWidget extends StatelessWidget {
  final List<PlanetModel> planets;

  const PlanetTableWidget({
    super.key,
    required this.planets,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (planets.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Center(
            child: Text(
              'No planetary data available',
              style: TextStyle(color: theme.colorScheme.textSecondary),
            ),
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.all(8.0),
              child: Text(
                'Planetary Positions',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columnSpacing: 16,
                headingRowHeight: 40,
                dataRowMinHeight: 44,
                dataRowMaxHeight: 52,
                columns: const [
                  DataColumn(label: Text('Planet', style: TextStyle(fontWeight: FontWeight.bold))),
                  DataColumn(label: Text('Rashi (Sign)', style: TextStyle(fontWeight: FontWeight.bold))),
                  DataColumn(label: Text('Degree', style: TextStyle(fontWeight: FontWeight.bold))),
                  DataColumn(label: Text('Nakshatra', style: TextStyle(fontWeight: FontWeight.bold))),
                  DataColumn(label: Text('Pada', style: TextStyle(fontWeight: FontWeight.bold))),
                  DataColumn(label: Text('Lord', style: TextStyle(fontWeight: FontWeight.bold))),
                ],
                rows: planets.map((planet) {
                  return DataRow(
                    cells: [
                      DataCell(
                        Row(
                          children: [
                            Text(
                              planet.planet,
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            if (planet.isRetrograde) ...[
                              const SizedBox(width: 4),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                                decoration: BoxDecoration(
                                  color: theme.colorScheme.supportingAccent,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text(
                                  'R',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      DataCell(Text(planet.rashiName)),
                      DataCell(Text(Formatters.formatDegree(planet.degreeInRashi))),
                      DataCell(Text(planet.nakshatraName)),
                      DataCell(Text(planet.pada.toString())),
                      DataCell(Text(planet.nakshatraLord)),
                    ],
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
