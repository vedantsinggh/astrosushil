import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../models/product_model.dart';
import '../providers/cart_provider.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import '../widgets/cart_badge.dart';
import '../widgets/shop_ui.dart';
import 'cart_screen.dart';

/// Product page: large image, price, a few short key points and one clear
/// "Buy Now" action (with "Add to Cart" beside it). The longer description
/// sits behind a "Learn more" expander.
class ProductDetailScreen extends ConsumerStatefulWidget {
  final ProductModel product;

  const ProductDetailScreen({super.key, required this.product});

  @override
  ConsumerState<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> {
  ProductVariantModel? _selectedVariant;

  @override
  void initState() {
    super.initState();
    if (widget.product.variants.isNotEmpty) {
      _selectedVariant = widget.product.variants.first;
    }
  }

  int get _currentPricePaise => _selectedVariant != null ? _selectedVariant!.price : widget.product.price;

  int get _currentMrpPaise => _selectedVariant != null ? _selectedVariant!.mrp : widget.product.mrp;

  String get _formattedCurrentPrice => '₹${(_currentPricePaise / 100).round()}';
  String get _formattedCurrentMrp => '₹${(_currentMrpPaise / 100).round()}';

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    final isHindi = locale.languageCode == 'hi';
    final l10n = context.l10n;
    final product = widget.product;
    final title = product.displayTitle(locale.languageCode);

    final typeLabel = product.isPhysical
        ? (isHindi ? 'भौतिक उत्पाद' : 'Physical product')
        : (product.isBundle
            ? (isHindi ? 'डिजिटल बंडल किट' : 'Digital bundle')
            : (isHindi ? 'डिजिटल डाउनलोड' : 'Instant download'));
    final typeIcon = product.isPhysical
        ? Icons.local_shipping_outlined
        : (product.isBundle ? Icons.inventory_2_outlined : Icons.download_rounded);

    // Short key points (same wording as before, shown as separate bullets).
    final keyPoints = (product.isPhysical
            ? (isHindi
                ? '• ₹2,000 से अधिक के आर्डर पर निःशुल्क अखिल भारतीय डिलीवरी।\n• अयोध्या धाम में अभिमंत्रित। डिस्पैच समय: 48-72 घंटे।'
                : '• Free pan-India shipping on orders above ₹2,000.\n• Consecrated in Ayodhya Dham. Dispatched within 48-72 hours with express tracking.')
            : (isHindi
                ? '• भुगतान पश्चात तुरंत "मेरी डिजिटल लाइब्रेरी" से डाउनलोड करें।\n• उच्च रिज़ॉल्यूशन (4K / HD) में सुरक्षित 15-मिनट डाउनलोड लिंक।'
                : '• Instant access in "My Downloads" library immediately upon payment.\n• High-resolution 4K/HD files with expiring signed security tokens.'))
        .split('\n')
        .map((line) => line.replaceFirst('• ', '').trim())
        .where((line) => line.isNotEmpty)
        .toList();

    final kitItems = (isHindi
            ? '1. माँ लक्ष्मी डिजिटल कला (4K हाई-रेसोल्यूशन)\n2. धन प्राप्ति वॉलपेपर (मोबाइल एवं लैपटॉप हेतु)\n3. गुप्त धन प्राप्ति मंत्र (पूज्य गुरुदेव एस्ट्रो सुशील की पावन वाणी में ऑडियो)'
            : '1. Maa Lakshmi Digital Fine Art (Ultra 4K Resolution)\n2. Dhan Prapti Wallpaper (Mobile & Desktop HD)\n3. Secret Wealth Mantra Audio (Chanted in Astro Sushil\'s voice)')
        .split('\n')
        .map((line) => line.replaceFirst(RegExp(r'^\d+\.\s*'), '').trim())
        .toList();

    // Compact bar (no large title): the artwork is the hero of this page and
    // the serif product name sits right below it.
    return Scaffold(
      backgroundColor: AppColors.canvas,
      bottomNavigationBar: ShopBottomBar(
        child: _ActionButtons(
          addLabel: l10n.addToCart,
          buyLabel: l10n.buyNow,
          onAdd: () {
            ref.read(cartProvider.notifier).addItem(
                  product,
                  variant: _selectedVariant,
                );
            ScaffoldMessenger.of(context).hideCurrentSnackBar();
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  isHindi ? 'कार्ट में जोड़ा गया' : 'Added to cart',
                  style: const TextStyle(fontSize: 16),
                ),
                duration: const Duration(seconds: 2),
              ),
            );
          },
          onBuy: () {
            ref.read(cartProvider.notifier).addItem(
                  product,
                  variant: _selectedVariant,
                );
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const CartScreen()),
            );
          },
        ),
      ),
      body: CustomScrollView(
        slivers: [
          AstroSliverNavBar(
            title: title,
            largeTitle: false,
            actions: const [CartBadgeButton()],
          ),
          AstroSliverContent(
            top: 8,
            sliver: SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Product artwork, framed like a gallery print (4:3 suits both the
                  // square and the wide product artwork without heavy letterboxing).
                  Center(
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        maxHeight: math.min(420, MediaQuery.sizeOf(context).height * 0.45),
                        maxWidth: 560,
                      ),
                      child: AspectRatio(
                        aspectRatio: 4 / 3,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(AstroMetrics.cardRadius),
                            boxShadow: AstroShadows.hero,
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(AstroMetrics.cardRadius),
                            child: ShopProductImage(
                              assetKey: product.slug.isNotEmpty ? product.slug : product.catalogId,
                              imageUrl: product.imageUrl,
                              isPhysical: product.isPhysical,
                              fit: BoxFit.contain,
                              iconSize: 72,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Type tags
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ShopTag(
                          label: typeLabel,
                          icon: typeIcon,
                          background: AstroTint.indigo.background,
                          foreground: AstroTint.indigo.foreground),
                      if (product.isPhysical)
                        ShopTag(
                          label: isHindi ? 'अयोध्या धाम' : 'Ayodhya Dham',
                          icon: Icons.place_outlined,
                          background: AstroTint.amber.background,
                          foreground: AstroTint.amber.foreground,
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Title (serif)
                  Semantics(
                    header: true,
                    child: Text(
                      title,
                      style: AppTypography.headlineLarge.copyWith(fontSize: 24, height: 1.25, letterSpacing: -0.3),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Price
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 10,
                    runSpacing: 6,
                    children: [
                      Text(
                        _formattedCurrentPrice,
                        style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppColors.primary),
                      ),
                      if (_currentMrpPaise > _currentPricePaise) ...[
                        Text(
                          _formattedCurrentMrp,
                          style: const TextStyle(
                            fontSize: 16,
                            decoration: TextDecoration.lineThrough,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        ShopTag(
                          label: '${product.discountPercent}% OFF',
                          background: AppColors.gold,
                          foreground: AppColors.primary,
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    l10n.inclusiveGstBadge,
                    style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 24),

                  // Variant selector
                  if (product.variants.isNotEmpty) ...[
                    Padding(
                      padding: const EdgeInsets.only(left: 4, bottom: 10),
                      child: Text(
                        isHindi ? 'आकार / वैरिएंट चुनें:' : 'Select Size Variant:',
                        style: AppTypography.sectionHeader,
                      ),
                    ),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: product.variants.map((v) {
                        final isSelected = _selectedVariant?.id == v.id;
                        return AstroPill(
                          label: '${v.value} (₹${(v.price / 100).round()})',
                          selected: isSelected,
                          onTap: () => setState(() => _selectedVariant = v),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Key points
                  AstroSurfaceCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            AstroIconSquare(
                              icon: product.isPhysical ? Icons.local_shipping_outlined : Icons.bolt_rounded,
                              tint: product.isPhysical ? AstroTint.amber : AstroTint.sky,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                product.isPhysical
                                    ? (isHindi ? 'डिलिवरी एवं शिपिंग नियम' : 'Shipping & Delivery Terms')
                                    : (isHindi ? 'तत्काल डिजिटल सुपुर्दगी' : 'Instant Digital Fulfillment'),
                                style: AppTypography.headlineMedium,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        ...keyPoints.map((point) => _Bullet(text: point)),
                        if (product.isPhysical && product.stock > 0)
                          _Bullet(
                            text: isHindi
                                ? 'उपलब्ध स्टॉक: ${product.stock} इकाइयां'
                                : 'Stock remaining: ${product.stock} units',
                            icon: Icons.inventory_outlined,
                          ),
                      ],
                    ),
                  ),

                  // Bundle contents
                  if (product.isBundle) ...[
                    const SizedBox(height: 16),
                    AstroSurfaceCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const AstroIconSquare(icon: Icons.inventory_2_outlined, tint: AstroTint.violet),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  isHindi ? 'किट में सम्मिलित सामग्री:' : 'Included in this Kit:',
                                  style: AppTypography.headlineMedium,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          ...kitItems.map((item) => _Bullet(text: item, icon: Icons.star_outline_rounded)),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 16),

                  // Description, tucked away behind "Learn more"
                  AstroSurfaceCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const AstroIconSquare(icon: Icons.menu_book_outlined, tint: AstroTint.rose),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                isHindi ? 'विवरण एवं आध्यात्मिक महत्व' : 'Description & Significance',
                                style: AppTypography.headlineMedium,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        AstroExpander(
                          child: Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              product.displayDescription(locale.languageCode),
                              style: const TextStyle(fontSize: 16, height: 1.6, color: AppColors.textPrimary),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Contextual explainer
                  SushilExplainerButton(
                    label: isHindi ? 'सुशील सर से इसका महत्व समझें' : 'Explain spiritual significance',
                    contextData: ExplanationContext(
                      feature: 'shop_product',
                      screenTitle: title,
                      data: {
                        'productId': product.id,
                        'title': product.title,
                        'category': product.category,
                        'isPhysical': product.isPhysical,
                        'isBundle': product.isBundle,
                        'description': product.description,
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// "Add to Cart" (outlined) beside the gold "Buy Now"; stacks when narrow
/// or when the system text is large.
class _ActionButtons extends StatelessWidget {
  final String addLabel;
  final String buyLabel;
  final VoidCallback onAdd;
  final VoidCallback onBuy;

  const _ActionButtons({
    required this.addLabel,
    required this.buyLabel,
    required this.onAdd,
    required this.onBuy,
  });

  @override
  Widget build(BuildContext context) {
    final add = AstroSecondaryButton(label: addLabel, icon: Icons.add_shopping_cart, onPressed: onAdd);
    final buy = AstroPrimaryButton(label: buyLabel, icon: Icons.shopping_bag_outlined, onPressed: onBuy);

    return LayoutBuilder(
      builder: (context, constraints) {
        final scale = MediaQuery.textScalerOf(context).scale(1.0);
        final stacked = constraints.maxWidth / scale < 340;
        if (stacked) {
          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [buy, const SizedBox(height: 10), add],
          );
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Expanded(child: add),
            const SizedBox(width: 12),
            Expanded(child: buy),
          ],
        );
      },
    );
  }
}

class _Bullet extends StatelessWidget {
  final String text;
  final IconData icon;

  const _Bullet({required this.text, this.icon = Icons.check_circle_outline});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Icon(icon, size: 20, color: AppColors.successText),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text, style: const TextStyle(fontSize: 16, height: 1.4, color: AppColors.textPrimary)),
          ),
        ],
      ),
    );
  }
}
