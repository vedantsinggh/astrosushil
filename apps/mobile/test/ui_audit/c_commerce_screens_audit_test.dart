// UI audit: reports / consult / courses / shop screens (QA only).
@Tags(['ui_audit'])
library;

import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:astro_mobile/shared/theme/app_theme.dart';
import 'package:astro_mobile/home/screens/reports_screen.dart';
import 'package:astro_mobile/home/screens/consult_screen.dart';
import 'package:astro_mobile/features/courses/screens/courses_hub_screen.dart';
import 'package:astro_mobile/features/courses/screens/course_detail_screen.dart';
import 'package:astro_mobile/features/courses/screens/course_player_screen.dart';
import 'package:astro_mobile/features/shop/screens/shop_catalog_screen.dart';
import 'package:astro_mobile/features/shop/screens/product_detail_screen.dart';
import 'package:astro_mobile/features/shop/screens/cart_screen.dart';
import 'package:astro_mobile/features/shop/screens/checkout_screen.dart';
import 'package:astro_mobile/features/shop/screens/order_history_screen.dart';
import 'package:astro_mobile/features/shop/screens/order_detail_screen.dart';
import 'package:astro_mobile/features/shop/screens/order_confirmation_screen.dart';
import 'package:astro_mobile/features/shop/screens/digital_downloads_screen.dart';
import 'package:astro_mobile/features/shop/screens/shipping_addresses_screen.dart';
import 'package:astro_mobile/features/shop/models/cart_item_model.dart';
import 'package:astro_mobile/features/shop/models/product_model.dart';
import 'package:astro_mobile/features/shop/models/shipping_address_model.dart';
import 'package:astro_mobile/features/shop/providers/shop_provider.dart';
import 'package:astro_mobile/features/shop/providers/cart_provider.dart';
import 'package:astro_mobile/features/reports/screens/report_detail_screen.dart';
import 'package:astro_mobile/features/reports/screens/report_generation_screen.dart';
import 'package:astro_mobile/features/reports/screens/report_pdf_viewer_screen.dart';
import 'package:astro_mobile/features/reports/screens/report_view_screen.dart';
import 'package:astro_mobile/features/reports/screens/career_report_overview_screen.dart';
import 'package:astro_mobile/features/reports/screens/career_report_generation_screen.dart';
import 'package:astro_mobile/features/reports/screens/career_report_pdf_screen.dart';
import 'package:astro_mobile/features/reports/providers/reports_provider.dart';

import '../widget/phase8_screens_capture_test.dart' as p8 show MockCaptureShopService;
import 'audit_fixtures.dart';
import 'audit_harness.dart';

/// Runs [child] with a platform-specific theme (the Consult tab branches its
/// sheets and scroll physics on `Theme.of(context).platform`).
Widget _onPlatform(TargetPlatform platform, Widget child) => Builder(
      builder: (ctx) => Theme(data: Theme.of(ctx).copyWith(platform: platform), child: child),
    );

class _AuditCart extends CartNotifier {
  _AuditCart(super.ref, CartState s) {
    state = s;
  }
}

ProductModel _longProduct(ProductModel p) => ProductModel(
      id: 'prod_long',
      slug: 'long',
      catalogId: 'long',
      title: 'Ancient Ramayana Era Sacred Consecrated Herb for Unlimited Wealth, Prosperity & Protection (Premium Edition)',
      hindiTitle: 'प्राचीन रामायण कालीन दुर्लभ पावन जड़ी-बूटी — असीमित धन, समृद्धि एवं सुरक्षा हेतु (प्रीमियम संस्करण)',
      category: p.category,
      productType: p.productType,
      mrp: 9999900,
      price: 8999900,
      stock: 3,
      requiresShipping: true,
      description: p.description,
    );

/// Shop fake with no saved addresses (checkout address step, empty state).
class _NoAddressShop extends p8.MockCaptureShopService {
  @override
  Future<List<ShippingAddressModel>> fetchShippingAddresses() async => const [];
}

/// Shop fake with two saved addresses (default second, to show pre-selection).
class _TwoAddressShop extends p8.MockCaptureShopService {
  @override
  Future<List<ShippingAddressModel>> fetchShippingAddresses() async => [
        const ShippingAddressModel(
          id: 'addr_office',
          fullName: 'Office Desk',
          phoneNumber: '9123456780',
          addressLine1: '12 MG Road, Tower B',
          city: 'Lucknow',
          state: 'Uttar Pradesh',
          postalCode: '226001',
        ),
        ...mockAddresses,
      ];
}

Override _cart({bool long = false, bool withAddress = false}) {
  final products = p8.MockCaptureShopService().mockProducts;
  final items = [
    CartItemModel(product: long ? _longProduct(products.first) : products.first, quantity: long ? 12 : 1),
    CartItemModel(product: products[1], quantity: 2),
  ];
  final total = items.fold<int>(0, (s, i) => s + i.totalPaise);
  return cartProvider.overrideWith((ref) => _AuditCart(
        ref,
        CartState(
          items: items,
          selectedAddress: withAddress ? p8.MockCaptureShopService().mockAddresses.first : null,
          calculation: CartCalculationResult(
            items: items
                .map((i) => CartItemCalculated(
                    productId: i.product.id, title: i.product.title, quantity: i.quantity, unitPrice: i.unitPricePaise, totalAmount: i.totalPaise))
                .toList(),
            subtotalPaise: total,
            taxAmountPaise: 0,
            shippingAmountPaise: 0,
            totalAmountPaise: total,
            requiresShipping: true,
            eligibleForFreeShipping: true,
          ),
        ),
      ));
}

Future<void> _tapText(WidgetTester t, String s) async {
  final f = find.text(s);
  if (f.evaluate().isNotEmpty) {
    await t.tap(f.first, warnIfMissed: false);
  }
}

void main() {
  final products = p8.MockCaptureShopService().mockProducts;
  final reports = [
    reportItem('rep_001', 'KUNDLI', 'COMPLETED', 100),
    reportItem('rep_002', 'CAREER', 'ANALYZING', 45),
    reportItem('rep_003', 'MARRIAGE_COMPATIBILITY', 'FAILED', 10, err: 'Ephemeris calculation timeout'),
  ];
  final longReports = [
    reportItem('rep_001', 'KUNDLI', 'COMPLETED', 100, long: true),
    reportItem('rep_003', 'MARRIAGE_COMPATIBILITY', 'FAILED', 10, long: true,
        err: 'The ephemeris calculation exceeded the allotted processing window; please retry later or contact support.'),
  ];
  Widget detail(String title) => ReportDetailScreen(
        reportType: 'KUNDLI',
        title: title,
        tagline: 'Complete 30+ Page Vedic Horoscope',
        description: 'Comprehensive astrological document detailing Janma & Chandra Kundli, 9 Grahas, Vimshottari Dasha, Doshas, and Gemstones.',
        priceText: '₹2,99,999',
        pricePaise: 29999900,
        icon: Icons.auto_awesome,
        accentColor: AppColors.tintVioletText,
        initialProfile: kProfile,
        includedSections: const [
          'Janma Kundli & Navamsha (D9)',
          '9 Planetary Dignities & Avastas',
          'Vimshottari Mahadasha & Antardasha Timeline with sub-period interpretation for every planet',
        ],
      );

  final cases = <AuditCase>[
    AuditCase('reports_catalog', () => const ReportsScreen(), overrides: () => baseOverrides(reports: reports),
        interact: (t) => _tapText(t, 'Get a report')),
    AuditCase('reports_history', () => const ReportsScreen(), overrides: () => baseOverrides(reports: reports),
        interact: (t) => _tapText(t, 'My reports')),
    AuditCase('reports_history_long', () => const ReportsScreen(), overrides: () => baseOverrides(long: true, reports: longReports),
        interact: (t) => _tapText(t, 'My reports'), matrix: kLiteMatrix),
    AuditCase('reports_history_empty', () => const ReportsScreen(), overrides: () => baseOverrides(),
        interact: (t) => _tapText(t, 'My reports'), matrix: kLiteMatrix),
    AuditCase('reports_noprofile', () => const ReportsScreen(), overrides: () => baseOverrides(noProfile: true), matrix: kLiteMatrix),
    AuditCase('report_detail', () => detail('Birth Chart & Kundli Report'), overrides: () => baseOverrides()),
    AuditCase('report_detail_long', () => detail('Comprehensive Marriage, Relationship & Compatibility Analysis Report (Premium)'),
        overrides: () => baseOverrides(long: true), matrix: kLiteMatrix),
    AuditCase('report_gen_analyzing', () => ReportGenerationScreen(reportId: 'rep_002', reportType: 'CAREER', reportTitle: 'Career & Professional Life', profile: kProfile),
        overrides: () => baseOverrides(extra: [
              reportGenerationNotifierProvider.overrideWith((ref) => AuditGenerationNotifier(
                  ReportGenerationState(isPolling: true, activeReportId: 'rep_002', status: reports[1]))),
            ])),
    AuditCase('report_gen_failed', () => ReportGenerationScreen(reportId: 'rep_003', reportType: 'MARRIAGE_COMPATIBILITY', reportTitle: 'Marriage & Relationship Report', profile: kProfile, partnerProfile: kProfile2),
        overrides: () => baseOverrides(extra: [
              reportGenerationNotifierProvider.overrideWith((ref) => AuditGenerationNotifier(
                  ReportGenerationState(activeReportId: 'rep_003', status: longReports[1]))),
            ]),
        matrix: kLiteMatrix),
    AuditCase('report_pdf_viewer', () => const ReportPdfViewerScreen(reportId: 'rep_001', reportTitle: 'Comprehensive Janma Kundli Dossier with Extended Predictions', clientName: kLongName),
        overrides: () => baseOverrides(extra: [
              reportGenerationNotifierProvider.overrideWith((ref) => AuditGenerationNotifier(
                  ReportGenerationState(pdfBytes: Uint8List.fromList([0x25, 0x50, 0x44, 0x46])))),
            ])),
    AuditCase('report_view', () => ReportViewScreen(birthProfileId: kProfile.id), overrides: () => baseOverrides()),
    AuditCase('career_overview', () => CareerReportOverviewScreen(reportId: 'rep_002', profile: kProfile), overrides: () => baseOverrides(), matrix: kLiteMatrix),
    AuditCase('career_generation', () => CareerReportGenerationScreen(reportId: 'rep_002', profile: kProfile), overrides: () => baseOverrides(), matrix: kLiteMatrix),
    AuditCase('career_pdf', () => const CareerReportPdfScreen(reportId: 'rep_002', clientName: 'Rahul Sharma'), overrides: () => baseOverrides(), matrix: kLiteMatrix),
    AuditCase('consult', () => const ConsultScreen(), overrides: () => baseOverrides()),
    AuditCase('consult_book', () => const ConsultScreen(), overrides: () => baseOverrides(),
        interact: (t) => _tapText(t, 'Book a session')),
    AuditCase('consult_bookings', () => const ConsultScreen(), overrides: () => baseOverrides(), matrix: kLiteMatrix,
        interact: (t) async {
      await _tapText(t, 'My bookings');
      await t.pumpAndSettle();
      await t.drag(find.byType(Scrollable).first, const Offset(0, -60));
      await t.pumpAndSettle();
    }),
    AuditCase('consult_ios', () => _onPlatform(TargetPlatform.iOS, const ConsultScreen()), overrides: () => baseOverrides(), matrix: kLiteMatrix),
    AuditCase('consult_guest', () => const ConsultScreen(), overrides: () => baseOverrides(authenticated: false), matrix: kLiteMatrix),
    AuditCase('courses_hub', () => const CoursesHubScreen(), overrides: () => baseOverrides()),
    AuditCase('courses_my_learning', () => const CoursesHubScreen(initialTab: 1), overrides: () => baseOverrides(), matrix: kLiteMatrix),
    AuditCase('course_detail', () => const CourseDetailScreen(idOrSlug: 'c-gupt-nadi'), overrides: () => baseOverrides()),
    AuditCase('course_player', () => const CoursePlayerScreen(lessonId: 'l-1'), overrides: () => baseOverrides()),
    AuditCase('shop_catalog', () => const ShopCatalogScreen(), overrides: () => baseOverrides()),
    AuditCase('product_detail', () => ProductDetailScreen(product: products.first), overrides: () => baseOverrides()),
    AuditCase('product_detail_long', () => ProductDetailScreen(product: _longProduct(products.first)), overrides: () => baseOverrides(), matrix: kLiteMatrix),
    AuditCase('cart_empty', () => const CartScreen(), overrides: () => baseOverrides(), matrix: kLiteMatrix),
    AuditCase('cart_items', () => const CartScreen(), overrides: () => baseOverrides(extra: [_cart()])),
    AuditCase('cart_items_long', () => const CartScreen(), overrides: () => baseOverrides(extra: [_cart(long: true)]), matrix: kLiteMatrix),
    AuditCase('checkout', () => const CheckoutScreen(), overrides: () => baseOverrides(extra: [_cart()])),
    AuditCase('checkout_step2_address', () => const ShippingAddressesScreen(isSelectionMode: true),
        overrides: () => baseOverrides(extra: [_cart(), shopServiceProvider.overrideWithValue(_TwoAddressShop())]),
        matrix: kLiteMatrix),
    AuditCase('checkout_step2_address_empty', () => const ShippingAddressesScreen(isSelectionMode: true),
        overrides: () => baseOverrides(extra: [_cart(), shopServiceProvider.overrideWithValue(_NoAddressShop())]),
        matrix: kLiteMatrix),
    AuditCase('checkout_step3_review', () => const CheckoutScreen(openedFromAddressStep: true),
        overrides: () => baseOverrides(extra: [_cart(withAddress: true)]), matrix: kLiteMatrix),
    AuditCase('order_history', () => const OrderHistoryScreen(), overrides: () => baseOverrides()),
    AuditCase('order_detail', () => const OrderDetailScreen(orderId: 'ord_101'), overrides: () => baseOverrides()),
    AuditCase('order_confirmation', () => const OrderConfirmationScreen(orderData: {'id': 'ord_7f3c2a9e1b4d4c8a9e2f', 'amount': 1199800}),
        overrides: () => baseOverrides()),
    AuditCase('digital_downloads', () => const DigitalDownloadsScreen(), overrides: () => baseOverrides()),
    AuditCase('shipping_addresses', () => const ShippingAddressesScreen(), overrides: () => baseOverrides()),
  ];
  registerAuditCases('C', cases);
}
