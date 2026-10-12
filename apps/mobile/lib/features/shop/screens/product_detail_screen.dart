import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/theme/app_colors.dart';
import '../models/product_model.dart';
import '../providers/cart_provider.dart';
import '../../sushil_explainer/models/explanation_context.dart';
import '../../sushil_explainer/widgets/sushil_explainer_button.dart';
import 'cart_screen.dart';

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

  int get _currentPricePaise =>
      _selectedVariant != null ? _selectedVariant!.price : widget.product.price;

  int get _currentMrpPaise =>
      _selectedVariant != null ? _selectedVariant!.mrp : widget.product.mrp;

  String get _formattedCurrentPrice => '₹${(_currentPricePaise / 100).round()}';
  String get _formattedCurrentMrp => '₹${(_currentMrpPaise / 100).round()}';

  @override
  Widget build(BuildContext context) {
    final locale = ref.watch(localeProvider);
    final isHindi = locale.languageCode == 'hi';
    final product = widget.product;

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.primary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          product.displayTitle(locale.languageCode),
          style: const TextStyle(
            color: AppColors.primary,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Product Hero Image
            Container(
              width: double.infinity,
              height: 320,
              color: Colors.white,
              child: Stack(
                children: [
                  Center(
                    child: product.imageUrl != null && product.imageUrl!.isNotEmpty
                        ? Image.network(
                            product.imageUrl!,
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => _buildPlaceholder(),
                          )
                        : _buildPlaceholder(),
                  ),
                  Positioned(
                    top: 16,
                    left: 16,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: product.isPhysical ? AppColors.primary : AppColors.secondary,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        product.isPhysical
                            ? (isHindi ? 'भौतिक उत्पाद' : 'PHYSICAL PRODUCT')
                            : (product.isBundle
                                ? (isHindi ? 'डिजिटल बंडल किट' : 'DIGITAL BUNDLE')
                                : (isHindi ? 'डिजिटल डाउनलोड' : 'INSTANT DOWNLOAD')),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Details Container
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title
                  Text(
                    product.displayTitle(locale.languageCode),
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.lightTextPrimary,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Pricing row
                  Row(
                    children: [
                      Text(
                        _formattedCurrentPrice,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                      if (_currentMrpPaise > _currentPricePaise) ...[
                        const SizedBox(width: 10),
                        Text(
                          _formattedCurrentMrp,
                          style: const TextStyle(
                            fontSize: 16,
                            decoration: TextDecoration.lineThrough,
                            color: AppColors.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.premiumAccent,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '${product.discountPercent}% OFF',
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 8),

                  // GST Inclusive note
                  Text(
                    isHindi ? 'सभी कर शामिल (18% जीएसटी सम्मिलित)' : 'Inclusive of all applicable taxes (18% GST)',
                    style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary),
                  ),

                  const SizedBox(height: 20),

                  // Variant Selector (if size variants exist)
                  if (product.variants.isNotEmpty) ...[
                    Text(
                      isHindi ? 'आकार / वैरिएंट चुनें:' : 'Select Size Variant:',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: AppColors.lightTextPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 10,
                      children: product.variants.map((v) {
                        final isSelected = _selectedVariant?.id == v.id;
                        return ChoiceChip(
                          label: Text(
                            '${v.value} (₹${(v.price / 100).round()})',
                            style: TextStyle(
                              color: isSelected ? Colors.white : AppColors.lightTextPrimary,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                              fontSize: 12,
                            ),
                          ),
                          selected: isSelected,
                          selectedColor: AppColors.primary,
                          backgroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                            side: BorderSide(
                              color: isSelected ? AppColors.primary : AppColors.lightBorder,
                            ),
                          ),
                          onSelected: (_) {
                            setState(() {
                              _selectedVariant = v;
                            });
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Contextual Spiritual & Factual Significance Explainer
                  SushilExplainerButton(
                    label: isHindi
                        ? 'सुशील सर से इसका महत्व समझें'
                        : 'Explain spiritual significance',
                    contextData: ExplanationContext(
                      feature: 'shop_product',
                      screenTitle: product.displayTitle(locale.languageCode),
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

                  const SizedBox(height: 16),

                  // Delivery & Fulfillment Info Card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.lightBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              product.isPhysical ? Icons.local_shipping : Icons.bolt_rounded,
                              color: AppColors.primary,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              product.isPhysical
                                  ? (isHindi ? 'डिलिवरी एवं शिपिंग नियम' : 'Shipping & Delivery Terms')
                                  : (isHindi ? 'तत्काल डिजिटल सुपुर्दगी' : 'Instant Digital Fulfillment'),
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        if (product.isPhysical) ...[
                          Text(
                            isHindi
                                ? '• ₹2,000 से अधिक के आर्डर पर निःशुल्क होम डिलीवरी।\n• अयोध्या धाम में अभिमंत्रित। डिस्पैच समय: 48-72 घंटे।'
                                : '• Free pan-India shipping on orders above ₹2,000.\n• Consecrated in Ayodhya Dham. Dispatched within 48-72 hours with express tracking.',
                            style: const TextStyle(fontSize: 12, color: AppColors.lightTextPrimary, height: 1.5),
                          ),
                          if (product.stock > 0)
                            Padding(
                              padding: const EdgeInsets.only(top: 6),
                              child: Text(
                                isHindi ? 'उपलब्ध स्टॉक: ${product.stock} इकाइयां' : 'Stock remaining: ${product.stock} units',
                                style: const TextStyle(fontSize: 11, color: AppColors.success, fontWeight: FontWeight.bold),
                              ),
                            ),
                        ] else ...[
                          Text(
                            isHindi
                                ? '• भुगतान पश्चात तुरंत "मेरी डिजिटल लाइब्रेरी" से डाउनलोड करें।\n• उच्च रिज़ॉल्यूशन (4K / HD) में सुरक्षित डाउनलोड लिंक।'
                                : '• Instant access in "My Downloads" library immediately upon payment.\n• High-resolution 4K/HD files with expiring signed security tokens.',
                            style: const TextStyle(fontSize: 12, color: AppColors.lightTextPrimary, height: 1.5),
                          ),
                        ],
                      ],
                    ),
                  ),

                  // Bundle Included Assets (if Kit)
                  if (product.isBundle) ...[
                    const SizedBox(height: 18),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.tertiary.withValues(alpha: 0.05),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.premiumAccent.withValues(alpha: 0.5)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.stars_rounded, color: AppColors.premiumAccent, size: 20),
                              const SizedBox(width: 8),
                              Text(
                                isHindi ? 'किट में सम्मिलित सामग्री:' : 'Included in this Kit:',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.primary),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            isHindi
                                ? '1. माँ लक्ष्मी डिजिटल कला (4K हाई-रेसोल्यूशन)\n2. धन प्राप्ति वॉलपेपर (मोबाइल एवं लैपटॉप हेतु)\n3. गुप्त धन प्राप्ति मंत्र (पूज्य गुरुदेव एस्ट्रो सुशील की पावन वाणी में ऑडियो)'
                                : '1. Maa Lakshmi Digital Fine Art (Ultra 4K Resolution)\n2. Dhan Prapti Wallpaper (Mobile & Desktop HD)\n3. Secret Wealth Mantra Audio (Chanted in Astro Sushil\'s voice)',
                            style: const TextStyle(fontSize: 12, height: 1.5, color: AppColors.lightTextPrimary),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 20),

                  // Description
                  Text(
                    isHindi ? 'विवरण एवं आध्यात्मिक महत्व' : 'Description & Significance',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: AppColors.lightTextPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    product.displayDescription(locale.languageCode),
                    style: const TextStyle(
                      fontSize: 13,
                      height: 1.6,
                      color: AppColors.lightTextPrimary,
                    ),
                  ),

                  const SizedBox(height: 100), // Space for sticky bottom bar
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 10,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          child: Row(
            children: [
              // Add to cart
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    ref.read(cartProvider.notifier).addItem(
                          product,
                          variant: _selectedVariant,
                        );
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          isHindi ? 'कार्ट में जोड़ा गया' : 'Added to cart',
                        ),
                        duration: const Duration(seconds: 2),
                      ),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary, width: 1.5),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    isHindi ? 'कार्ट में जोड़ें' : 'Add to Cart',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // Buy now
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    ref.read(cartProvider.notifier).addItem(
                          product,
                          variant: _selectedVariant,
                        );
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const CartScreen()),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    isHindi ? 'अभी खरीदें' : 'Buy Now',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Center(
      child: Icon(
        widget.product.isPhysical ? Icons.spa_outlined : Icons.image_outlined,
        color: AppColors.secondary.withValues(alpha: 0.4),
        size: 70,
      ),
    );
  }
}
