import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../models/product_model.dart';
import '../screens/product_detail_screen.dart';
import 'shop_ui.dart';

/// Catalog tile: full-bleed artwork with a soft fade and type tag, serif
/// product name and price. Tapping anywhere opens the product page (where
/// "Add to cart" lives).
class ProductCard extends ConsumerWidget {
  final ProductModel product;

  const ProductCard({super.key, required this.product});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final isHindi = locale.languageCode == 'hi';
    final l10n = context.l10n;
    final title = product.displayTitle(locale.languageCode);

    final typeLabel = product.isPhysical
        ? (isHindi ? 'भौतिक' : 'Physical')
        : (product.isBundle ? (isHindi ? 'बंडल' : 'Bundle') : (isHindi ? 'डिजिटल' : 'Digital'));
    final typeIcon = product.isPhysical
        ? Icons.local_shipping_outlined
        : (product.isBundle ? Icons.inventory_2_outlined : Icons.download_rounded);
    final hasDiscount = product.mrp > product.price;

    return Semantics(
      button: true,
      label: '$title, ${product.formattedPrice}',
      child: AstroSurfaceCard(
        padding: EdgeInsets.zero,
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => ProductDetailScreen(product: product)),
          );
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AspectRatio(
              aspectRatio: 1,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ShopProductImage(
                    assetKey: product.slug.isNotEmpty ? product.slug : product.catalogId,
                    imageUrl: product.imageUrl,
                    isPhysical: product.isPhysical,
                    iconSize: 44,
                  ),
                  // Soft fade so the tag reads on any artwork.
                  const Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 56,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [Color(0x00121440), Color(0x24121440)],
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    left: 8,
                    bottom: 8,
                    right: 8,
                    child: Align(
                      alignment: Alignment.bottomLeft,
                      child: ShopTag(label: typeLabel, icon: typeIcon, background: AppColors.cardSurface),
                    ),
                  ),
                  if (hasDiscount && product.discountPercent > 0)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: ShopTag(
                        label: '-${product.discountPercent}%',
                        background: AppColors.gold,
                        foreground: AppColors.primary,
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTypography.headlineMedium.copyWith(fontSize: 17, height: 1.3, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.end,
                    spacing: 6,
                    runSpacing: 2,
                    children: [
                      Text(
                        product.formattedPrice,
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.primary),
                      ),
                      if (hasDiscount)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 2),
                          child: Text(
                            product.formattedMrp,
                            style: const TextStyle(
                              fontSize: 14,
                              decoration: TextDecoration.lineThrough,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(l10n.inclusiveGstBadge, style: const TextStyle(fontSize: 14, color: AppColors.textSecondary)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
