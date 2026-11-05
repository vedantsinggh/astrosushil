import 'package:flutter/material.dart';
import '../../../../shared/theme/app_colors.dart';
import '../models/report_purchase_models.dart';

typedef RazorpaySuccessCallback = void Function({
  required String razorpayOrderId,
  required String razorpayPaymentId,
  required String razorpaySignature,
});

typedef RazorpayFailureCallback = void Function({
  required String errorCode,
  required String errorMessage,
});

typedef RazorpayCancelCallback = void Function();

class RazorpayCheckoutSheet extends StatefulWidget {
  final ReportPaymentOrder order;
  final String reportTitle;
  final RazorpaySuccessCallback onSuccess;
  final RazorpayFailureCallback onFailure;
  final RazorpayCancelCallback onCancel;

  const RazorpayCheckoutSheet({
    super.key,
    required this.order,
    required this.reportTitle,
    required this.onSuccess,
    required this.onFailure,
    required this.onCancel,
  });

  static Future<void> show({
    required BuildContext context,
    required ReportPaymentOrder order,
    required String reportTitle,
    required RazorpaySuccessCallback onSuccess,
    required RazorpayFailureCallback onFailure,
    required RazorpayCancelCallback onCancel,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      enableDrag: false,
      isDismissible: false,
      builder: (_) => RazorpayCheckoutSheet(
        order: order,
        reportTitle: reportTitle,
        onSuccess: onSuccess,
        onFailure: onFailure,
        onCancel: onCancel,
      ),
    );
  }

  @override
  State<RazorpayCheckoutSheet> createState() => _RazorpayCheckoutSheetState();
}

class _RazorpayCheckoutSheetState extends State<RazorpayCheckoutSheet> {
  bool _isProcessing = false;
  String _selectedMethod = 'UPI';

  void _handlePay() {
    if (_isProcessing) return;
    setState(() => _isProcessing = true);

    // In non-production/test environment, the signature starts with mock_sig_
    // which is accepted by paymentService.verifyCheckoutSignature.
    final simulatedPaymentId = 'pay_${DateTime.now().millisecondsSinceEpoch}';
    final mockSignature = 'mock_sig_${widget.order.razorpayOrderId}';

    Navigator.of(context).pop();
    widget.onSuccess(
      razorpayOrderId: widget.order.razorpayOrderId,
      razorpayPaymentId: simulatedPaymentId,
      razorpaySignature: mockSignature,
    );
  }

  void _handleFailure() {
    if (_isProcessing) return;
    setState(() => _isProcessing = true);

    Navigator.of(context).pop();
    widget.onFailure(
      errorCode: 'BAD_REQUEST_ERROR',
      errorMessage: 'Payment was declined by issuing bank or customer',
    );
  }

  void _handleCancel() {
    if (_isProcessing) return;
    Navigator.of(context).pop();
    widget.onCancel();
  }

  @override
  Widget build(BuildContext context) {
    final subtotal = widget.order.subtotal > 0
        ? widget.order.subtotal
        : (widget.order.amount / 1.18).round();
    final tax = widget.order.taxAmount > 0
        ? widget.order.taxAmount
        : (widget.order.amount - subtotal);

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(
          top: BorderSide(color: AppColors.cardBorderGold, width: 1.5),
        ),
      ),
      padding: EdgeInsets.only(
        top: 16,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag Handle
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.cardBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0C2340),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.shield_rounded,
                        color: Color(0xFF528FF0),
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Razorpay Secure',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimaryDark,
                              letterSpacing: 0.2,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            '128-bit Encrypted Checkout',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.textMutedDark,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                key: const Key('razorpay_cancel_button'),
                icon: const Icon(Icons.close_rounded, color: AppColors.textMutedDark),
                onPressed: _isProcessing ? null : _handleCancel,
              ),
            ],
          ),

          const SizedBox(height: 18),
          const Divider(height: 1, color: AppColors.cardBorder),
          const SizedBox(height: 16),

          // Order Details Card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.backgroundCream,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        widget.reportTitle,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: AppColors.midnightNavy,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      widget.order.formattedAmount,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.midnightNavy,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Base Price',
                      style: TextStyle(fontSize: 12, color: AppColors.textSecondaryDark),
                    ),
                    Text(
                      '₹${(subtotal / 100).toStringAsFixed(2)}',
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryDark),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'GST (18% Inclusive)',
                      style: TextStyle(fontSize: 12, color: AppColors.textSecondaryDark),
                    ),
                    Text(
                      '₹${(tax / 100).toStringAsFixed(2)}',
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryDark),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Order Ref',
                      style: TextStyle(fontSize: 11, color: AppColors.textMutedDark),
                    ),
                    Text(
                      widget.order.razorpayOrderId.isNotEmpty
                          ? widget.order.razorpayOrderId
                          : widget.order.orderId,
                      style: const TextStyle(fontSize: 11, color: AppColors.textMutedDark),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 18),

          // Payment Methods
          const Text(
            'Select Payment Method',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimaryDark,
            ),
          ),
          const SizedBox(height: 10),

          _buildPaymentMethodTile(
            id: 'UPI',
            title: 'UPI (Google Pay, PhonePe, Paytm)',
            icon: Icons.account_balance_wallet_rounded,
          ),
          const SizedBox(height: 8),
          _buildPaymentMethodTile(
            id: 'CARD',
            title: 'Credit / Debit Card (Visa, RuPay, MC)',
            icon: Icons.credit_card_rounded,
          ),
          const SizedBox(height: 8),
          _buildPaymentMethodTile(
            id: 'NETBANKING',
            title: 'Net Banking (All Indian Banks)',
            icon: Icons.account_balance_rounded,
          ),

          const SizedBox(height: 22),

          // Primary Pay CTA
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              key: const Key('razorpay_pay_button'),
              onPressed: _isProcessing ? null : _handlePay,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0C2340),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                elevation: 1,
              ),
              child: _isProcessing
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.lock_rounded, size: 16, color: Color(0xFF528FF0)),
                        const SizedBox(width: 8),
                        Text(
                          'Pay ${widget.order.formattedAmount}',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
            ),
          ),

          const SizedBox(height: 10),

          // Simulated Failure / Cancel testing button
          Center(
            child: TextButton(
              key: const Key('razorpay_simulate_failure_button'),
              onPressed: _isProcessing ? null : _handleFailure,
              child: const Text(
                'Simulate Payment Failure',
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.error,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentMethodTile({
    required String id,
    required String title,
    required IconData icon,
  }) {
    final isSelected = _selectedMethod == id;
    return InkWell(
      onTap: _isProcessing ? null : () => setState(() => _selectedMethod = id),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0x100C2340) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? const Color(0xFF0C2340) : AppColors.cardBorder,
            width: isSelected ? 1.4 : 1.0,
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 20,
              color: isSelected ? const Color(0xFF0C2340) : AppColors.textMutedDark,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  color: isSelected ? AppColors.midnightNavy : AppColors.textPrimaryDark,
                ),
              ),
            ),
            Icon(
              isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
              size: 18,
              color: isSelected ? const Color(0xFF0C2340) : AppColors.textMutedDark,
            ),
          ],
        ),
      ),
    );
  }
}
