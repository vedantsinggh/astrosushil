import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/astro_loader/astro_loader.dart';
import '../../../shared/widgets/error_banner.dart';
import '../providers/astrology_provider.dart';
import '../widgets/chart_summary_card.dart';
import '../widgets/planet_table_widget.dart';

class ChartResultScreen extends ConsumerWidget {
  final String birthProfileId;

  const ChartResultScreen({
    super.key,
    required this.birthProfileId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final chartAsync = ref.watch(astrologyChartProvider(birthProfileId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Natal Chart Result'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.refresh(astrologyChartProvider(birthProfileId));
            },
          ),
        ],
      ),
      body: SafeArea(
        child: chartAsync.when(
          loading: () => const AstroLoader.fullScreen(
            message: AstroLoaderMessages.kundli,
          ),
          error: (err, stack) => Padding(
            padding: const EdgeInsets.all(16.0),
            child: ErrorBanner(
              message: err.toString(),
              onRetry: () => ref.refresh(astrologyChartProvider(birthProfileId)),
            ),
          ),
          data: (chart) => SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ChartSummaryCard(chart: chart),
                const SizedBox(height: 16),
                PlanetTableWidget(planets: chart.planets),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
