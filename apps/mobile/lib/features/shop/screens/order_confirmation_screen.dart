import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../widgets/shop_ui.dart';
import 'digital_downloads_screen.dart';
import 'order_history_screen.dart';
import 'shop_catalog_screen.dart';

/// Order confirmation: clear success mark, short summary with the total and
/// one gold next step (digital library, or order details).
class OrderConfirmationScreen extends ConsumerWidget {
  final Map<String, dynamic> orderData;
  final dynamic digitalEntitlements;

  const OrderConfirmationScreen({
    super.key,
    required this.orderData,
    this.digitalEntitlements,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final isHindi = locale.languageCode == 'hi';

    final orderId = orderData['id'] as String? ?? orderData['orderId'] as String? ?? '';
    final amount = orderData['amount'] is int ? orderData['amount'] as int : 0;
    final formattedAmount = '₹${(amount / 100).round()}';
    final hasDigital = digitalEntitlements != null &&
        ((digitalEntitlements is List && (digitalEntitlements as List).isNotEmpty) || digitalEntitlements == true);

    void openLibrary() {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const DigitalDownloadsScreen()),
      );
    }

    void openOrders() {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const OrderHistoryScreen()),
      );
    }

    final libraryLabel = isHindi ? 'मेरी डिजिटल लाइब्रेरी खोलें' : 'Open My Digital Library';
    final ordersLabel = isHindi ? 'आर्डर विवरण एवं इतिहास' : 'View Order Details & History';

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AstroNavBar(
        showBack: false,
        actions: [
          AstroNavAction.text(
            label: isHindi ? 'बंद करें' : 'Close',
            onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(AstroMetrics.gutter, 8, AstroMetrics.gutter, 24),
          child: ShopContentWidth(
            maxWidth: 520,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Hero: success + receipt summary in one card.
                AstroGradientCard(
                  padding: const EdgeInsets.fromLTRB(20, 28, 20, 20),
                  child: Column(
                    children: [
                      Container(
                        width: 76,
                        height: 76,
                        decoration: BoxDecoration(
                          color: AppColors.gold.withValues(alpha: 0.16),
                          shape: BoxShape.circle,
                          border: Border.all(color: AppColors.gold.withValues(alpha: 0.5)),
                        ),
                        child: const Icon(Icons.check_rounded, color: AppColors.gold, size: 46),
                      ),
                      const SizedBox(height: 18),
                      Semantics(
                        header: true,
                        child: Text(
                          isHindi ? 'आर्डर सफलतापूर्वक स्वीकार हुआ!' : 'Order Placed Successfully!',
                          textAlign: TextAlign.center,
                          style: AppTypography.headlineLarge.copyWith(fontSize: 24, color: Colors.white, height: 1.25),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        isHindi
                            ? 'आपका भुगतान सत्यापित हो चुका है एवं रसीद आपके खाते में सुरक्षित है।'
                            : 'Your payment was securely verified and order confirmed.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 16, color: AppColors.textInverseSecondary, height: 1.4),
                      ),
                      const SizedBox(height: 18),
                      Container(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Column(
                          children: [
                            _HeroRow(
                              label: isHindi ? 'आर्डर संख्या' : 'Order ID',
                              value: orderId.length > 12 ? orderId.substring(0, 12).toUpperCase() : orderId,
                            ),
                            _HeroRow(
                              label: isHindi ? 'भुगतान स्थिति' : 'Payment Status',
                              value: isHindi ? 'भुगतान हो गया' : 'Paid',
                            ),
                            Divider(height: 20, color: Colors.white.withValues(alpha: 0.18)),
                            _HeroRow(
                              label: isHindi ? 'कुल भुगतान' : 'Total Amount',
                              value: formattedAmount,
                              emphasize: true,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                if (hasDigital) ...[
                  AstroNote(
                    isHindi
                        ? 'आपके द्वारा खरीदे गए वॉलपेपर और कला "मेरी डिजिटल लाइब्रेरी" में उपलब्ध करा दिए गए हैं।'
                        : 'Your purchased wallpapers and sacred art are active in your personal library.',
                    icon: Icons.download_done_rounded,
                    tint: AstroTint.sage,
                  ),
                  const SizedBox(height: 16),
                  AstroPrimaryButton(label: libraryLabel, icon: Icons.folder_open_outlined, onPressed: openLibrary),
                  const SizedBox(height: 12),
                  AstroSecondaryButton(label: ordersLabel, icon: Icons.receipt_long_outlined, onPressed: openOrders),
                ] else
                  AstroPrimaryButton(label: ordersLabel, icon: Icons.receipt_long_outlined, onPressed: openOrders),

                const SizedBox(height: 8),
                TextButton(
                  onPressed: () {
                    Navigator.of(context).pushAndRemoveUntil(
                      MaterialPageRoute(builder: (_) => const ShopCatalogScreen()),
                      (route) => route.isFirst,
                    );
                  },
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.accent,
                    minimumSize: const Size(double.infinity, 48),
                  ),
                  child: Text(
                    isHindi ? 'दुकान में वापस जाएं' : 'Continue Shopping',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Label / value line on the dark hero card.
class _HeroRow extends StatelessWidget {
  final String label;
  final String value;
  final bool emphasize;

  const _HeroRow({required this.label, required this.value, this.emphasize = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: SizedBox(
        width: double.infinity,
        child: Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 12,
          runSpacing: 2,
          children: [
            Text(label, style: const TextStyle(fontSize: 16, color: AppColors.textInverseSecondary)),
            Text(
              value,
              style: TextStyle(
                fontSize: emphasize ? 24 : 16,
                fontWeight: FontWeight.w700,
                color: emphasize ? AppColors.gold : Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
