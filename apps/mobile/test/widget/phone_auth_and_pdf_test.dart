import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:astro_mobile/features/auth/screens/verification_screen.dart';
import 'package:astro_mobile/features/auth/providers/auth_provider.dart';
import 'package:astro_mobile/core/storage/secure_storage_service.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

void main() {
  group('Phone Verification & Multi-Page PDF Tests', () {
    testWidgets('VerificationScreen renders phone verification UI with 6 digit boxes and countdown', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            secureStorageProvider.overrideWithValue(InMemorySecureStorageService()),
          ],
          child: const MaterialApp(
            home: VerificationScreen(
              phoneNumber: '+919876543210',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Verify title and masked phone number
      expect(find.text('Verify Your Phone'), findsOneWidget);
      expect(find.textContaining('+91••••••10'), findsOneWidget);
      expect(find.byType(TextFormField), findsNWidgets(6));
      expect(find.text('Verify & Continue'), findsOneWidget);
      expect(find.textContaining('Resend Code in'), findsOneWidget);
    });

    testWidgets('VerificationScreen validates incomplete OTP entry', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            secureStorageProvider.overrideWithValue(InMemorySecureStorageService()),
          ],
          child: const MaterialApp(
            home: VerificationScreen(
              phoneNumber: '+919876543210',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Tap without entering 6 digits
      await tester.tap(find.text('Verify & Continue'));
      await tester.pumpAndSettle();

      expect(find.text('Please enter the full 6-digit verification code.'), findsOneWidget);
    });

    test('Multi-page PDF Document generates full page count without truncation', () async {
      final pdfDoc = pw.Document();
      const totalPages = 5;

      for (int i = 1; i <= totalPages; i++) {
        pdfDoc.addPage(
          pw.Page(
            pageFormat: PdfPageFormat.a4,
            build: (pw.Context context) {
              return pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text('Astro Sushil Complete Dossier', style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold)),
                  pw.SizedBox(height: 20),
                  pw.Text('Section $i: In-Depth Astrological Analysis Page $i of $totalPages'),
                  pw.SizedBox(height: 10),
                  pw.Text('Planetary dynamic analysis indicates strong Raja Yogas and planetary alignment.'),
                ],
              );
            },
          ),
        );
      }

      final bytes = await pdfDoc.save();
      expect(bytes.isNotEmpty, true);
      expect(bytes.length, greaterThan(1000));
      expect(pdfDoc.document.pdfPageList.pages.length, equals(totalPages));
    });
  });
}
