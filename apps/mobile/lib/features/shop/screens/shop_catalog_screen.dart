import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../models/product_model.dart';
import '../providers/shop_provider.dart';
import '../widgets/cart_badge.dart';
import '../widgets/product_card.dart';

/// Shop front: hero large-title bar, a search field, category pills and a
/// responsive grid of premium product tiles.
class ShopCatalogScreen extends ConsumerStatefulWidget {
  const ShopCatalogScreen({super.key});

  @override
  ConsumerState<ShopCatalogScreen> createState() => _ShopCatalogScreenState();
}

class _ShopCatalogScreenState extends ConsumerState<ShopCatalogScreen> {
  final TextEditingController _searchController = TextEditingController();

  /// Grid / header width cap on tablets (wider than text pages: it's a grid).
  static const double _maxWidth = 1068;

  final List<Map<String, String>> _categories = [
    {'id': 'ALL', 'en': 'All Offerings', 'hi': 'सभी उत्पाद'},
    {'id': 'WALLPAPER', 'en': 'Wallpapers', 'hi': 'वॉलपेपर'},
    {'id': 'DIGITAL_ART', 'en': 'Sacred Art', 'hi': 'पवित्र कला'},
    {'id': 'DIGITAL_BUNDLE', 'en': 'Kits & Bundles', 'hi': 'धन वर्षा किट'},
    {'id': 'PHYSICAL_HERB', 'en': 'Ayodhya Herb', 'hi': 'दुर्लभ जड़ी-बूटी'},
  ];

  static const Map<String, IconData> _categoryIcons = {
    'ALL': Icons.auto_awesome_rounded,
    'WALLPAPER': Icons.wallpaper_rounded,
    'DIGITAL_ART': Icons.palette_outlined,
    'DIGITAL_BUNDLE': Icons.inventory_2_outlined,
    'PHYSICAL_HERB': Icons.spa_outlined,
  };

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _resetFilters() {
    _searchController.clear();
    ref.read(shopSearchQueryProvider.notifier).state = '';
    ref.read(selectedShopCategoryProvider.notifier).state = 'ALL';
  }

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    final isHindi = locale.languageCode == 'hi';
    final l10n = context.l10n;
    final selectedCategory = ref.watch(selectedShopCategoryProvider);
    final productsAsync = ref.watch(shopProductsProvider);

    return AstroPage(
      title: l10n.spiritualShopTitle,
      style: AstroNavBarStyle.hero,
      actions: const [CartBadgeButton()],
      onRefresh: () async => ref.invalidate(shopProductsProvider),
      slivers: [
        AstroSliverContent(
          maxWidth: _maxWidth,
          top: 16,
          bottom: 8,
          sliver: SliverToBoxAdapter(child: _buildHeader(isHindi, l10n, selectedCategory)),
        ),
        ...productsAsync.when(
          loading: () => [
            SliverFillRemaining(
              hasScrollBody: false,
              child: AstroStateView.loading(message: isHindi ? 'उत्पाद लोड हो रहे हैं...' : 'Loading products...'),
            ),
          ],
          error: (err, _) => [
            SliverFillRemaining(
              hasScrollBody: false,
              child: AstroStateView.error(
                icon: Icons.cloud_off_outlined,
                title: isHindi ? 'उत्पाद लोड करने में असमर्थ' : 'Unable to load products',
                message: isHindi ? 'कृपया अपना इंटरनेट जांचें।' : 'Please check your internet connection.',
                retryLabel: l10n.commonTryAgain,
                onRetry: () => ref.invalidate(shopProductsProvider),
              ),
            ),
          ],
          data: (products) {
            if (products.isEmpty) {
              final hasFilter = _searchController.text.isNotEmpty || selectedCategory != 'ALL';
              return [
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: AstroStateView.empty(
                    icon: Icons.search_off_rounded,
                    title: isHindi ? 'कोई उत्पाद नहीं मिला' : 'No products found',
                    message: isHindi ? 'कृपया अपनी खोज या श्रेणी बदलें' : 'Try a different word or category.',
                    actionLabel: hasFilter ? (isHindi ? 'फ़िल्टर हटाएं' : 'Show all products') : null,
                    actionIcon: Icons.filter_alt_off_outlined,
                    onAction: hasFilter ? _resetFilters : null,
                  ),
                ),
              ];
            }
            return [
              AstroSliverContent(
                maxWidth: _maxWidth,
                top: 8,
                sliver: SliverToBoxAdapter(child: _ProductGrid(products: products)),
              ),
            ];
          },
        ),
      ],
    );
  }

  Widget _buildHeader(bool isHindi, AppLocalizations l10n, String selectedCategory) {
    OutlineInputBorder border(Color c, [double w = 1]) => OutlineInputBorder(
          borderRadius: BorderRadius.circular(AstroMetrics.buttonRadius),
          borderSide: BorderSide(color: c, width: w),
        );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.spiritualShopSubtitle,
          style: AppTypography.rowSubtitle.copyWith(fontSize: 16, height: 1.45),
        ),
        const SizedBox(height: 16),

        // Search
        DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AstroMetrics.buttonRadius),
            boxShadow: AstroShadows.card,
          ),
          child: TextField(
            controller: _searchController,
            onChanged: (val) {
              ref.read(shopSearchQueryProvider.notifier).state = val;
              setState(() {});
            },
            style: const TextStyle(fontSize: 16, color: AppColors.textPrimary),
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: l10n.searchShopHint,
              hintMaxLines: 3,
              hintStyle: const TextStyle(color: AppColors.textSecondary, fontSize: 16),
              prefixIcon: const Icon(Icons.search_rounded, color: AppColors.textSecondary, size: 24),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      tooltip: isHindi ? 'खोज हटाएं' : 'Clear search',
                      icon: const Icon(Icons.cancel_rounded, size: 22, color: AppColors.textMuted),
                      onPressed: () {
                        _searchController.clear();
                        ref.read(shopSearchQueryProvider.notifier).state = '';
                        setState(() {});
                      },
                    )
                  : null,
              filled: true,
              fillColor: AppColors.cardSurface,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              border: border(AppColors.cardBorder),
              enabledBorder: border(AppColors.cardBorder),
              focusedBorder: border(AppColors.accent, 2),
            ),
          ),
        ),
        const SizedBox(height: 14),

        // Category pills (wrap onto new lines instead of hiding off-screen)
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _categories.map((cat) {
            final isSelected = selectedCategory == cat['id'];
            return AstroPill(
              label: isHindi ? cat['hi']! : cat['en']!,
              icon: _categoryIcons[cat['id']],
              selected: isSelected,
              onTap: () => ref.read(selectedShopCategoryProvider.notifier).state = cat['id']!,
            );
          }).toList(),
        ),
      ],
    );
  }
}

/// Responsive grid whose tiles size to their content, so long names wrap
/// instead of being cut off. Column count follows width and text size.
class _ProductGrid extends StatelessWidget {
  final List<ProductModel> products;
  const _ProductGrid({required this.products});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final textScale = MediaQuery.textScalerOf(context).scale(1.0).clamp(1.0, 2.0);
        final columns = (constraints.maxWidth / (140 * textScale)).floor().clamp(1, 4);
        const gap = 14.0;

        final rows = <Widget>[];
        for (var i = 0; i < products.length; i += columns) {
          final rowItems = products.skip(i).take(columns).toList();
          rows.add(
            Padding(
              padding: EdgeInsets.only(bottom: i + columns < products.length ? gap : 0),
              child: IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (var c = 0; c < columns; c++) ...[
                      if (c > 0) const SizedBox(width: gap),
                      Expanded(
                        child: c < rowItems.length ? ProductCard(product: rowItems[c]) : const SizedBox.shrink(),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          );
        }
        return Column(children: rows);
      },
    );
  }
}
