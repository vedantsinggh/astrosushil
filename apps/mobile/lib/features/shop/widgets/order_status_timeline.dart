import 'package:flutter/material.dart';
import '../../../core/utils/app_date_time.dart';
import '../../../shared/theme/app_colors.dart';
import '../models/shop_order_model.dart';

/// Simple vertical timeline that shows how far an order has progressed,
/// based only on the status fields the backend already returns.
class OrderStatusTimeline extends StatelessWidget {
  final ShopOrderModel order;
  final bool isHindi;

  const OrderStatusTimeline({super.key, required this.order, required this.isHindi});

  String _date(DateTime? d) => AppDateTime.shortNumericDate(d);

  @override
  Widget build(BuildContext context) {
    final f = order.fulfillmentStatus.toUpperCase();
    final s = order.status.toUpperCase();

    if (s == 'CANCELLED' || s == 'FAILED' || f == 'CANCELLED' || f == 'FAILED') {
      final failed = s == 'FAILED' || f == 'FAILED';
      return _Step(
        title: failed
            ? (isHindi ? 'आर्डर पूरा नहीं हो सका' : 'This order could not be completed')
            : (isHindi ? 'आर्डर रद्द किया गया' : 'This order was cancelled'),
        subtitle: isHindi ? 'सहायता के लिए नीचे संपर्क करें।' : 'Contact support below if you need help.',
        state: _StepState.problem,
        isLast: true,
      );
    }

    final paid = order.isPaid || f != 'UNFULFILLED';
    final dispatched = const ['DISPATCHED', 'DELIVERED', 'FULFILLED'].contains(f);
    final delivered = const ['DELIVERED', 'FULFILLED'].contains(f);

    final steps = <_StepData>[
      _StepData(isHindi ? 'आर्डर किया गया' : 'Order placed', _date(order.createdAt), true),
      _StepData(isHindi ? 'भुगतान प्राप्त' : 'Payment received', '', paid),
      if (order.hasPhysicalItems) ...[
        // Packing counts as finished once the parcel has been dispatched;
        // while PROCESSING it is the highlighted current step.
        _StepData(isHindi ? 'पैक हो रहा है' : 'Being packed', '', dispatched),
        _StepData(isHindi ? 'भेज दिया गया' : 'On the way', _date(order.dispatchedAt), dispatched),
        _StepData(isHindi ? 'डिलीवर हुआ' : 'Delivered', _date(order.deliveredAt), delivered),
      ] else
        _StepData(isHindi ? 'डाउनलोड के लिए तैयार' : 'Ready to download', '', delivered),
    ];

    // The first step that is not yet done is the "current" one.
    final currentIndex = steps.indexWhere((st) => !st.done);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < steps.length; i++)
          _Step(
            title: steps[i].title,
            subtitle: steps[i].subtitle,
            state: steps[i].done
                ? _StepState.done
                : (i == currentIndex ? _StepState.current : _StepState.upcoming),
            isLast: i == steps.length - 1,
            lineDone: i + 1 < steps.length && steps[i + 1].done,
          ),
      ],
    );
  }
}

class _StepData {
  final String title;
  final String subtitle;
  final bool done;
  const _StepData(this.title, this.subtitle, this.done);
}

enum _StepState { done, current, upcoming, problem }

class _Step extends StatelessWidget {
  final String title;
  final String subtitle;
  final _StepState state;
  final bool isLast;
  final bool lineDone;

  const _Step({
    required this.title,
    required this.subtitle,
    required this.state,
    required this.isLast,
    this.lineDone = false,
  });

  @override
  Widget build(BuildContext context) {
    final Color dotColor;
    final IconData? icon;
    switch (state) {
      case _StepState.done:
        dotColor = AppColors.tintSageText;
        icon = Icons.check;
      case _StepState.current:
        dotColor = AppColors.gold;
        icon = Icons.more_horiz;
      case _StepState.upcoming:
        dotColor = AppColors.cardBorder;
        icon = null;
      case _StepState.problem:
        dotColor = AppColors.tintRoseText;
        icon = Icons.close;
    }

    final titleColor = state == _StepState.upcoming ? AppColors.textSecondary : AppColors.textPrimary;

    // Fixed-size dot column + flexible text; the connecting line is drawn as
    // a bottom-aligned decoration, so no intrinsic measuring is needed.
    return Stack(
      children: [
        if (!isLast)
          Positioned(
            left: 13,
            top: 30,
            bottom: 0,
            child: Container(
              width: 2,
              color: lineDone ? AppColors.tintSageText : AppColors.cardBorder,
            ),
          ),
        Padding(
          padding: EdgeInsets.only(bottom: isLast ? 0 : 18),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: state == _StepState.upcoming ? AppColors.cardSurface : dotColor,
                  shape: BoxShape.circle,
                  border: Border.all(color: dotColor, width: 2),
                ),
                child: icon == null
                    ? null
                    : Icon(icon, size: 16, color: state == _StepState.current ? AppColors.primary : Colors.white),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 3),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: 16,
                          height: 1.3,
                          fontWeight: state == _StepState.upcoming ? FontWeight.w500 : FontWeight.bold,
                          color: state == _StepState.problem ? AppColors.tintRoseText : titleColor,
                        ),
                      ),
                      if (subtitle.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text(
                            subtitle,
                            style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
