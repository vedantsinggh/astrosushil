import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/localization/locale_provider.dart';
import '../../../shared/theme/app_colors.dart';
import 'digital_downloads_screen.dart';
import 'order_history_screen.dart';
import 'shop_catalog_screen.dart';

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
        ((digitalEntitlements is List && (digitalEntitlements as List).isNotEmpty) ||
            digitalEntitlements == true);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.close, color: AppColors.primary),
            onPressed: () {
              Navigator.of(context).popUntil((route) => route.isFirst);
            },
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Success Icon Animation
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Icon(Icons.check_circle_rounded, color: AppColors.success, size: 54),
                ),
              ),
              const SizedBox(height: 20),

              Text(
                isHindi ? 'आर्डर सफलतापूर्वक स्वीकार हुआ!' : 'Order Placed Successfully!',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 8),

              Text(
                isHindi
                    ? 'आपका भुगतान सत्यापित हो चुका है एवं रसीद आपके खाते में सुरक्षित है।'
                    : 'Your payment was securely verified and order confirmed.',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.lightTextSecondary,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 24),

              // Order Summary Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.lightBackground,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.lightBorder),
                ),
                child: Column(
                  children: [
                    _InfoRow(
                      label: isHindi ? 'आर्डर संख्या' : 'Order ID',
                      value: orderId.length > 12 ? orderId.substring(0, 12).toUpperCase() : orderId,
                    ),
                    const Divider(height: 20, color: AppColors.lightBorder),
                    _InfoRow(
                      label: isHindi ? 'भुगतान स्थिति' : 'Payment Status',
                      value: 'PAID (Captured)',
                      isSuccess: true,
                    ),
                    const Divider(height: 20, color: AppColors.lightBorder),
                    _InfoRow(
                      label: isHindi ? 'कुल भुगतान' : 'Total Amount',
                      value: formattedAmount,
                      isBold: true,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Digital Fulfillment CTA
              if (hasDigital) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.secondary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.secondary.withValues(alpha: 0.3)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.download_for_offline_rounded, color: AppColors.secondary, size: 24),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              isHindi ? 'डिजिटल उत्पाद तैयार हैं!' : 'Digital Products Ready!',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.primary),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        isHindi
                            ? 'आपके द्वारा खरीदे गए वॉलपेपर और कला "मेरी डिजिटल लाइब्रेरी" में उपलब्ध करा दिए गए हैं।'
                            : 'Your purchased wallpapers and sacred art are active in your personal library.',
                        style: const TextStyle(fontSize: 12, color: AppColors.lightTextPrimary, height: 1.4),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        height: 40,
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(builder: (_) => const DigitalDownloadsScreen()),
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.secondary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: Text(
                            isHindi ? 'मेरी डिजिटल लाइब्रेरी खोलें' : 'Open My Digital Library',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
              ],

              // Actions
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const OrderHistoryScreen()),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary, width: 1.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(
                    isHindi ? 'आर्डर विवरण एवं इतिहास' : 'View Order Details & History',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              SizedBox(
                width: double.infinity,
                height: 48,
                child: TextButton(
                  onPressed: () {
                    Navigator.of(context).pushAndRemoveUntil(
                      MaterialPageRoute(builder: (_) => const ShopCatalogScreen()),
                      (route) => route.isFirst,
                    );
                  },
                  child: Text(
                    isHindi ? 'दुकान में वापस जाएं' : 'Continue Shopping',
                    style: const TextStyle(color: AppColors.secondary, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isSuccess;
  final bool isBold;

  const _InfoRow({
    required this.label,
    required this.value,
    this.isSuccess = false,
    this.isBold = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: AppColors.lightTextSecondary)),
        Text(
          value,
          style: TextStyle(
            fontSize: isBold ? 15 : 13,
            fontWeight: isBold || isSuccess ? FontWeight.bold : FontWeight.normal,
            color: isSuccess ? AppColors.success : AppColors.lightTextPrimary,
          ),
        ),
      ],
    );
  }
}
