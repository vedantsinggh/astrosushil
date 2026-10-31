import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/theme/app_theme.dart';
import '../../../shared/widgets/loading_indicator.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../providers/shop_provider.dart';
import '../widgets/cart_badge.dart';
import '../widgets/product_card.dart';

/// Redesigned Shop Catalog Discovery Screen for Astro Sushil
/// Following the shared design system: Cosmic hero header, category filter chips,
/// warm ivory product cards, verified catalog offerings, and inclusive 18% GST badges.
class ShopCatalogScreen extends ConsumerStatefulWidget {
  const ShopCatalogScreen({super.key});

  @override
  ConsumerState<ShopCatalogScreen> createState() => _ShopCatalogScreenState();
}

class _ShopCatalogScreenState extends ConsumerState<ShopCatalogScreen> {
  final TextEditingController _searchController = TextEditingController();

  final List<Map<String, String>> _categories = [
    {'id': 'ALL', 'en': 'All Offerings', 'hi': 'सभी उत्पाद'},
    {'id': 'WALLPAPER', 'en': 'Wallpapers', 'hi': 'वॉलपेपर'},
    {'id': 'DIGITAL_ART', 'en': 'Sacred Art', 'hi': 'पवित्र कला'},
    {'id': 'DIGITAL_BUNDLE', 'en': 'Kits & Bundles', 'hi': 'धन वर्षा किट'},
    {'id': 'PHYSICAL_HERB', 'en': 'Ayodhya Herb', 'hi': 'दुर्लभ जड़ी-बूटी'},
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    final isHindi = locale.languageCode == 'hi';
    final l10n = context.l10n;
    final selectedCategory = ref.watch(selectedShopCategoryProvider);
    final productsAsync = ref.watch(shopProductsProvider);

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AppBar(
        backgroundColor: AppColors.midnightNavy,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: Text(
          l10n.spiritualShopTitle,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        actions: const [
          CartBadgeButton(),
          SizedBox(width: 8),
        ],
      ),
      body: SubtleCelestialBackground(
        child: Column(
          children: [
            // Cosmic Hero Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              decoration: const BoxDecoration(
                gradient: AppGradients.heroCosmic,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.auto_awesome, color: AppColors.gold, size: 16),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          l10n.spiritualShopSubtitle,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.9),
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Search Field
                  Container(
                    height: 46,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.cardBorder),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.08),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: TextField(
                      controller: _searchController,
                      onChanged: (val) {
                        ref.read(shopSearchQueryProvider.notifier).state = val;
                      },
                      style: const TextStyle(fontSize: 13, color: AppColors.lightTextPrimary),
                      decoration: InputDecoration(
                        hintText: l10n.searchShopHint,
                        hintStyle: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 13),
                        prefixIcon: const Icon(Icons.search, color: AppColors.primary, size: 20),
                        suffixIcon: _searchController.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear, size: 18, color: AppColors.primary),
                                onPressed: () {
                                  _searchController.clear();
                                  ref.read(shopSearchQueryProvider.notifier).state = '';
                                },
                              )
                            : null,
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Category Filter Chips
                  SizedBox(
                    height: 38,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _categories.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (ctx, idx) {
                        final cat = _categories[idx];
                        final isSelected = selectedCategory == cat['id'];
                        final labelText = isHindi ? cat['hi']! : cat['en']!;

                        return ChoiceChip(
                          label: Text(
                            labelText,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                              color: isSelected ? AppColors.primary : Colors.white.withValues(alpha: 0.9),
                            ),
                          ),
                          selected: isSelected,
                          selectedColor: AppColors.gold,
                          backgroundColor: Colors.white.withValues(alpha: 0.12),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                            side: BorderSide(
                              color: isSelected ? AppColors.gold : Colors.white.withValues(alpha: 0.25),
                            ),
                          ),
                          onSelected: (selected) {
                            if (selected) {
                              ref.read(selectedShopCategoryProvider.notifier).state = cat['id']!;
                            }
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),

            // Product Grid Area
            Expanded(
              child: productsAsync.when(
                loading: () => const LoadingIndicator(message: 'Loading sacred offerings...'),
                error: (err, _) => Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                        const SizedBox(height: 12),
                        Text(
                          isHindi ? 'उत्पाद लोड करने में असमर्थ' : 'Unable to load products',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          err.toString(),
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 12),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: () => ref.refresh(shopProductsProvider),
                          icon: const Icon(Icons.refresh, size: 16),
                          label: Text(isHindi ? 'पुनः प्रयास करें' : 'Retry'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            minimumSize: const Size(120, AppTouchTargets.minTouchTarget),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                data: (products) {
                  if (products.isEmpty) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppColors.cardSurfaceParchment,
                                shape: BoxShape.circle,
                                border: Border.all(color: AppColors.cardBorder),
                              ),
                              child: const Icon(
                                Icons.inventory_2_outlined,
                                size: 48,
                                color: AppColors.gold,
                              ),
                            ),
                            const SizedBox(height: 14),
                            Text(
                              isHindi ? 'कोई उत्पाद नहीं मिला' : 'No products found',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              isHindi ? 'कृपया अपनी खोज या श्रेणी बदलें' : 'Try clearing your search or category filter',
                              style: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 13),
                            ),
                            if (_searchController.text.isNotEmpty || selectedCategory != 'ALL') ...[
                              const SizedBox(height: 16),
                              OutlinedButton(
                                onPressed: () {
                                  _searchController.clear();
                                  ref.read(shopSearchQueryProvider.notifier).state = '';
                                  ref.read(selectedShopCategoryProvider.notifier).state = 'ALL';
                                },
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: AppColors.primary,
                                  side: const BorderSide(color: AppColors.cardBorder),
                                  minimumSize: const Size(140, AppTouchTargets.minTouchTarget),
                                ),
                                child: Text(isHindi ? 'फ़िल्टर हटाएं' : 'Reset Filters'),
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  }

                  final textScale = MediaQuery.textScalerOf(context).scale(1.0);
                  final childAspectRatio = textScale >= 1.8 ? 0.44 : (textScale >= 1.3 ? 0.50 : 0.58);

                  return RefreshIndicator(
                    color: AppColors.primary,
                    onRefresh: () async {
                      ref.invalidate(shopProductsProvider);
                    },
                    child: GridView.builder(
                      padding: const EdgeInsets.all(16),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 14,
                        mainAxisSpacing: 14,
                        childAspectRatio: childAspectRatio,
                      ),
                      itemCount: products.length,
                      itemBuilder: (ctx, idx) {
                        return ProductCard(product: products[idx]);
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
