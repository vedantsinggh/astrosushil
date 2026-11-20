import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../../shared/widgets/astro_image.dart';
import '../../../shared/widgets/astro_loader/astro_loader.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../models/vastu_model.dart';
import '../providers/vastu_provider.dart';
import '../widgets/adv_widgets.dart';
import '../widgets/astrology_error_state.dart';
import 'vastu_detail_screen.dart';

class VastuScreen extends ConsumerWidget {
  const VastuScreen({super.key});

  ExplanationContext _buildExplanationContext(List<VastuCategoryModel>? categories) {
    return ExplanationContext(
      feature: 'vastu',
      screenTitle: 'Vedic Vastu Shastra',
      purpose: 'Explain the directional energies, spatial harmony principles, and living spaces alignment.',
      astrologyData: {
        'totalZones': categories?.length ?? 8,
        'categories': categories?.map((c) => {
          'name': c.name,
          'idealDirection': c.idealDirection,
        }).toList(),
      },
      importantValues: const {
        'corePrinciple': 'Pancha Maha Bhootas spatial alignment',
      },
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(vastuCategoriesProvider);
    final categories = categoriesAsync.valueOrNull;

    return AstroPage(
      title: 'Vastu Shastra',
      child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 1. AT-A-GLANCE SUMMARY
                const AdvSummaryCard(
                  label: 'Home guidance',
                  icon: Icons.home_rounded,
                  title: 'Harmonize Your Environment',
                  subtitle: 'Align your home layout with five natural elements for peace, prosperity and health.',
                ),

                const SizedBox(height: kAdvGap),

                // Sushil Sir Explainer Button
                SushilExplainerButton(
                  contextBuilder: () => _buildExplanationContext(categories),
                  poseAsset: AppAssets.sushilGuiding,
                ),

                const SizedBox(height: kAdvGap + 4),

                // 2. ROOM CATEGORIES
                AdvSection(
                  title: 'Explore Your Space',
                  subtitle: 'Simple guidance for a balanced space.',
                  icon: Icons.grid_view_rounded,
                  tint: AstroTint.sage,
                  inCard: false,
                  child: categoriesAsync.when(
                    loading: () => const AstroLoaderCard(
                      message: AstroLoaderMessages.vastu,
                    ),
                    error: (err, _) => AstrologyErrorState(
                      error: err,
                      customMessage: 'Vastu categories could not be loaded. Please try again.',
                      onRetry: () => ref.invalidate(vastuCategoriesProvider),
                    ),
                    data: (categories) => categories.isEmpty
                        ? const AstroEmptyState(
                            title: 'No Vastu guidance available',
                            message: 'Vastu categories have not been published yet. Please check back later.',
                          )
                        : _buildCategoryGrid(context, categories),
                  ),
                ),
              ],
            ),
    );
  }

  /// Inset-grouped list of rooms: illustration thumbnail, room name and the
  /// ideal direction. Rows wrap at large text sizes.
  Widget _buildCategoryGrid(BuildContext context, List<VastuCategoryModel> categories) {
    return AstroGroupedSection(
      dividerInset: 16 + 48 + 14,
      children: [
        for (final cat in categories) _buildGridCard(context, cat),
      ],
    );
  }

  Widget _buildGridCard(BuildContext context, VastuCategoryModel cat) {
    final assetPath = _getVastuAssetPath(cat.slug);
    const tint = AstroTint.sage;

    return AstroListRow(
      leading: SizedBox(
        width: 48,
        height: 48,
        child: assetPath != null
            ? ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: AstroImage(
                  assetPath: assetPath,
                  width: 48,
                  height: 48,
                  fit: BoxFit.cover,
                  fallback: AstroImageFallback.icon,
                  semanticLabel: '${cat.name} vastu illustration',
                ),
              )
            : AstroIconSquare(icon: _getIconForCategory(cat.slug), tint: tint, size: 48),
      ),
      title: cat.name,
      subtitle: 'Ideal: ${cat.idealDirection}',
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => VastuDetailScreen(category: cat),
          ),
        );
      },
    );
  }

  String? _getVastuAssetPath(String slug) {
    switch (slug) {
      case 'main-entrance':
        return AppAssets.vastuEntrance;
      case 'master-bedroom':
        return AppAssets.vastuBedroom;
      case 'living-room':
        return AppAssets.vastuLivingRoom;
      case 'kitchen':
        return AppAssets.vastuKitchen;
      case 'study-office':
        return AppAssets.vastuStudy;
      case 'puja-room':
        return AppAssets.vastuPuja;
      default:
        return null;
    }
  }

  IconData _getIconForCategory(String slug) {
    switch (slug) {
      case 'main-entrance':
        return Icons.door_front_door_rounded;
      case 'puja-room':
        return Icons.auto_awesome_rounded;
      case 'master-bedroom':
        return Icons.bed_rounded;
      case 'kitchen':
        return Icons.soup_kitchen_rounded;
      case 'study-office':
        return Icons.menu_book_rounded;
      case 'living-room':
        return Icons.weekend_rounded;
      default:
        return Icons.home_rounded;
    }
  }
}
