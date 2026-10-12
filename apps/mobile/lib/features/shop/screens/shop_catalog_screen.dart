import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/theme/app_colors.dart';
import '../providers/shop_provider.dart';
import '../widgets/cart_badge.dart';
import '../widgets/product_card.dart';

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
    final selectedCategory = ref.watch(selectedShopCategoryProvider);
    final productsAsync = ref.watch(shopProductsProvider);

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          isHindi ? 'आध्यात्मिक शॉप' : 'Spiritual Shop',
          style: const TextStyle(
            color: AppColors.primary,
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
        actions: const [
          CartBadgeButton(),
          SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // Search & Filter Header
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: Column(
              children: [
                // Search Field
                Container(
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.lightBackground,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.lightBorder),
                  ),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (val) {
                      ref.read(shopSearchQueryProvider.notifier).state = val;
                    },
                    decoration: InputDecoration(
                      hintText: isHindi ? 'खोजें वॉलपेपर, कला या जड़ी-बूटी...' : 'Search wallpapers, art or herbs...',
                      hintStyle: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 13),
                      prefixIcon: const Icon(Icons.search, color: AppColors.secondary, size: 20),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              onPressed: () {
                                _searchController.clear();
                                ref.read(shopSearchQueryProvider.notifier).state = '';
                              },
                            )
                          : null,
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Category Chips
                SizedBox(
                  height: 34,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _categories.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (ctx, idx) {
                      final cat = _categories[idx];
                      final isSelected = selectedCategory == cat['id'];
                      return ChoiceChip(
                        label: Text(
                          isHindi ? cat['hi']! : cat['en']!,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            color: isSelected ? Colors.white : AppColors.lightTextPrimary,
                          ),
                        ),
                        selected: isSelected,
                        selectedColor: AppColors.primary,
                        backgroundColor: AppColors.lightBackground,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                          side: BorderSide(
                            color: isSelected ? AppColors.primary : AppColors.lightBorder,
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

          // Product Grid
          Expanded(
            child: productsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
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
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        err.toString(),
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 12),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () => ref.refresh(shopProductsProvider),
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                        child: Text(isHindi ? 'पुनः प्रयास करें' : 'Retry'),
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
                          Icon(Icons.inventory_2_outlined, size: 54, color: AppColors.secondary.withValues(alpha: 0.5)),
                          const SizedBox(height: 12),
                          Text(
                            isHindi ? 'कोई उत्पाद नहीं मिला' : 'No products found',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            isHindi ? 'कृपया अपनी खोज या श्रेणी बदलें' : 'Try clearing your search or category filter',
                            style: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                return RefreshIndicator(
                  color: AppColors.primary,
                  onRefresh: () async {
                    ref.invalidate(shopProductsProvider);
                  },
                  child: GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 14,
                      mainAxisSpacing: 14,
                      childAspectRatio: 0.65,
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
    );
  }
}
