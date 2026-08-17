import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/assets/app_assets.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/astro_app_bar.dart';
import '../../../shared/widgets/astro_card.dart';
import '../../../shared/widgets/astro_loader/astro_loader.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../models/vastu_model.dart';
import '../providers/vastu_provider.dart';
import 'vastu_detail_screen.dart';

class VastuScreen extends ConsumerWidget {
  const VastuScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(vastuCategoriesProvider);

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: const AstroAppBar(
        title: 'Vastu',
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
            physics: const BouncingScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. HERO VASTU BANNER
                _buildHeroVastuCard(),

                const SizedBox(height: 20),

                // 2. SUBTITLE & GRID HEADER
                const Text(
                  'Explore Your Space',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Simple guidance for a balanced space.',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.lightTextSecondary,
                  ),
                ),

                const SizedBox(height: 16),

                // 3. 2-COLUMN GRID OF ROOM CATEGORIES
                categoriesAsync.when(
                  loading: () => const AstroLoaderCard(
                    message: AstroLoaderMessages.vastu,
                  ),
                  error: (err, _) => _buildCategoryGrid(context, _getMockCategories()),
                  data: (categories) => _buildCategoryGrid(
                    context,
                    categories.isNotEmpty ? categories : _getMockCategories(),
                  ),
                ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeroVastuCard() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.premiumAccent.withOpacity(0.3)),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.15),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          children: [
            // Background Vastu hero image if present
            Positioned.fill(
              child: Image.asset(
                AppAssets.vastuHero,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppColors.primary,
                        AppColors.secondary.withOpacity(0.4),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                ),
              ),
            ),
            // Dark gradient overlay for text readability
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.primary.withOpacity(0.92),
                    AppColors.primary.withOpacity(0.6),
                    Colors.transparent,
                  ],
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.premiumAccent.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.premiumAccent.withOpacity(0.4)),
                    ),
                    child: const Text(
                      'VASTU SHASTRA',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: AppColors.premiumAccent,
                        letterSpacing: 1.0,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Harmonize Your Environment',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 6),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 220),
                    child: Text(
                      'Align your home layout with five natural elements for peace, prosperity and health.',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.white.withOpacity(0.85),
                        height: 1.35,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryGrid(BuildContext context, List<VastuCategoryModel> categories) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.1,
      ),
      itemCount: categories.length,
      itemBuilder: (context, index) {
        final cat = categories[index];
        return _buildGridCard(context, cat);
      },
    );
  }

  Widget _buildGridCard(BuildContext context, VastuCategoryModel cat) {
    final assetPath = _getVastuAssetPath(cat.slug);

    return AstroCard(
      padding: const EdgeInsets.all(14),
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => VastuDetailScreen(category: cat),
          ),
        );
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.06),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.primary.withOpacity(0.08)),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: assetPath != null
                      ? Image.asset(
                          assetPath,
                          width: 28,
                          height: 28,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Icon(_getIconForCategory(cat.slug), size: 18, color: AppColors.primary),
                        )
                      : Icon(_getIconForCategory(cat.slug), size: 18, color: AppColors.primary),
                ),
              ),
              const Icon(Icons.arrow_forward_rounded, size: 16, color: AppColors.lightTextMuted),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                cat.name,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 2),
              Text(
                'Ideal: ${cat.idealDirection}',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.secondary,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ],
      ),
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

  List<VastuCategoryModel> _getMockCategories() {
    return const [
      VastuCategoryModel(
        id: 1,
        slug: 'main-entrance',
        name: 'Entrance',
        sanskritName: 'Simhadwara',
        description: 'The primary gateway of cosmic Prana energy entering the residence.',
        idealDirection: 'North / East',
        element: 'Air / Space',
        iconName: 'door',
      ),
      VastuCategoryModel(
        id: 2,
        slug: 'master-bedroom',
        name: 'Bedroom',
        sanskritName: 'Nairrutya',
        description: 'Zone of stability, deep rest, leadership, and emotional security.',
        idealDirection: 'South-West',
        element: 'Earth',
        iconName: 'bed',
      ),
      VastuCategoryModel(
        id: 3,
        slug: 'living-room',
        name: 'Living Room',
        sanskritName: 'Sabhagruha',
        description: 'Zone of social interaction, harmony, and welcoming energy.',
        idealDirection: 'North-East',
        element: 'Air',
        iconName: 'couch',
      ),
      VastuCategoryModel(
        id: 4,
        slug: 'kitchen',
        name: 'Kitchen',
        sanskritName: 'Agni Kona',
        description: 'Zone of fire energy, health, digestive strength, and vitality.',
        idealDirection: 'South-East',
        element: 'Fire',
        iconName: 'kitchen',
      ),
      VastuCategoryModel(
        id: 5,
        slug: 'study-office',
        name: 'Study Space',
        sanskritName: 'Vidyasthana',
        description: 'Zone of intellect, memory, sharp concentration, and career growth.',
        idealDirection: 'North / East',
        element: 'Air',
        iconName: 'book',
      ),
      VastuCategoryModel(
        id: 6,
        slug: 'puja-room',
        name: 'Puja Space',
        sanskritName: 'Devasthana',
        description: 'Sacred sanctuary for spiritual focus, peace, and divine vibrations.',
        idealDirection: 'North-East',
        element: 'Water / Ether',
        iconName: 'temple',
      ),
    ];
  }
}
