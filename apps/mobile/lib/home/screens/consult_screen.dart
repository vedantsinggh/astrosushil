import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/localization/locale_provider.dart';
import '../../features/consultations/models/consultation_models.dart';
import '../../features/consultations/providers/consultation_provider.dart';
import '../../features/consultations/widgets/booking_flow_sheet.dart';
import '../../features/sushil_explainer/models/explanation_context.dart';
import '../../features/sushil_explainer/widgets/sushil_explainer_button.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/widgets/subtle_celestial_background.dart';

/// Complete Online Consultations & Appointment Booking Screen
class ConsultScreen extends ConsumerStatefulWidget {
  const ConsultScreen({super.key});

  @override
  ConsumerState<ConsultScreen> createState() => _ConsultScreenState();
}

class _ConsultScreenState extends ConsumerState<ConsultScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (_tabController.index == 1 && !_tabController.indexIsChanging) {
        ref.read(consultationNotifierProvider.notifier).loadMyBookings();
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _launchWhatsApp(BuildContext context) async {
    const phone = '919621127233';
    final message = Uri.encodeComponent(
      'Namaste Astro Sushil Ji, I would like to inquire about an astrological consultation.',
    );
    final uri = Uri.parse('https://wa.me/$phone?text=$message');

    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && context.mounted) {
        _showContactDialog(context);
      }
    } catch (_) {
      if (context.mounted) {
        _showContactDialog(context);
      }
    }
  }

  void _showContactDialog(BuildContext context) {
    final l10n = context.l10n;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            const Icon(Icons.support_agent_rounded, color: AppColors.primary, size: 26),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                l10n.consultContactOffice,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                  color: AppColors.primary,
                ),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.consultOfficeDetails,
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.lightTextPrimary,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 16),
            const Divider(color: AppColors.lightBorder),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton.icon(
                  onPressed: () {
                    Clipboard.setData(const ClipboardData(text: '+919621127233'));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Phone number copied to clipboard')),
                    );
                  },
                  icon: const Icon(Icons.copy, size: 16),
                  label: const Text('Copy Phone'),
                ),
                TextButton.icon(
                  onPressed: () {
                    Clipboard.setData(const ClipboardData(text: 'connect@astrosushil.com'));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Email copied to clipboard')),
                    );
                  },
                  icon: const Icon(Icons.copy, size: 16),
                  label: const Text('Copy Email'),
                ),
              ],
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            ),
            child: Text(l10n.close),
          ),
        ],
      ),
    );
  }

  void _confirmCancel(BuildContext context, ConsultationBookingModel booking) {
    final l10n = context.l10n;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.consultCancel),
        content: Text(
          'Are you sure you want to cancel booking ${booking.bookingReference}? ${l10n.consultCancellationPolicy}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Keep Appointment'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              await ref
                  .read(consultationNotifierProvider.notifier)
                  .cancelBooking(bookingId: booking.id, reason: 'Client requested via app');
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Yes, Cancel', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final state = ref.watch(consultationNotifierProvider);

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AppBar(
        title: Text(
          l10n.consultTitle,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: AppColors.lightSurface,
        foregroundColor: AppColors.lightTextPrimary,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.lightTextSecondary,
          indicatorColor: AppColors.primary,
          indicatorWeight: 3,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          tabs: [
            Tab(text: l10n.consultTabsBook),
            Tab(text: l10n.consultTabsMyAppointments),
          ],
        ),
      ),
      body: SubtleCelestialBackground(
        child: SafeArea(
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildBookingTab(context, l10n, state),
              _buildMyAppointmentsTab(context, l10n, state),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBookingTab(
    BuildContext context,
    AppLocalizations l10n,
    ConsultationState state,
  ) {
    final catalog = state.catalog.isNotEmpty ? state.catalog : _fallbackOfferings();

    return RefreshIndicator(
      onRefresh: () => ref.read(consultationNotifierProvider.notifier).loadCatalog(),
      child: ListView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
        children: [
          // 1. Hero Header Banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
              border: Border.all(
                color: AppColors.premiumAccent.withValues(alpha: 0.35),
                width: 1.2,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppColors.premiumAccent.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.star_rounded,
                        color: AppColors.premiumAccent,
                        size: 16,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '1-ON-1 GUIDANCE',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.3,
                        color: AppColors.premiumAccent.withValues(alpha: 0.95),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  l10n.consultTitle,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  l10n.consultSubtitle,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.white.withValues(alpha: 0.9),
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // Contextual Explainer for Consultation Preparation
          SushilExplainerButton(
            label: ref.watch(localeProvider).languageCode == 'hi'
                ? 'परामर्श की तैयारी कैसे करें?'
                : 'How to prepare for consultation',
            contextData: ExplanationContext(
              feature: 'consultation_prep',
              screenTitle: ref.watch(localeProvider).languageCode == 'hi'
                  ? 'परामर्श की तैयारी'
                  : 'Consultation Preparation',
              data: {
                'availableServices': catalog.map((c) => c.title).toList(),
                'note':
                    'Guidelines on birth time verification, specific queries, and ethical boundaries.',
              },
            ),
          ),

          const SizedBox(height: 18),

          // 2. Verified Service Offerings
          Text(
            l10n.consultFormatsTitle,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.3,
              color: AppColors.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 12),

          if (state.isLoading && state.catalog.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator(),
              ),
            )
          else
            ...catalog.map((offering) => _buildOfferingCard(context, l10n, offering)),

          const SizedBox(height: 24),

          // 3. Fallback WhatsApp & Office Inquiry
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton.icon(
              onPressed: () => _launchWhatsApp(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF25D366),
                foregroundColor: Colors.white,
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.chat_bubble_outline_rounded, size: 20),
              label: Text(
                l10n.consultInquireWhatsApp,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              ),
            ),
          ),
          const SizedBox(height: 10),

          SizedBox(
            width: double.infinity,
            height: 46,
            child: OutlinedButton.icon(
              onPressed: () => _showContactDialog(context),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                side: const BorderSide(color: AppColors.primary),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.business_outlined, size: 18),
              label: Text(
                l10n.consultContactOffice,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              ),
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildOfferingCard(
    BuildContext context,
    AppLocalizations l10n,
    ConsultationOfferingModel offering,
  ) {
    final modeIcon = offering.mode == 'ONLINE_VOICE'
        ? Icons.phone_in_talk_rounded
        : (offering.mode == 'IN_PERSON'
            ? Icons.handshake_rounded
            : Icons.videocam_rounded);

    final modeColor = offering.mode == 'ONLINE_VOICE'
        ? Colors.blue
        : (offering.mode == 'IN_PERSON' ? Colors.deepPurple : Colors.teal);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.lightBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: modeColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(modeIcon, color: modeColor, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      offering.title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.lightTextPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      offering.description,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.lightTextSecondary,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Badges row
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              _buildBadge(
                Icons.timer_outlined,
                l10n.consultDurationMin(offering.durationMinutes),
                Colors.grey.shade700,
                Colors.grey.shade100,
              ),
              _buildBadge(
                Icons.calendar_today_outlined,
                l10n.consultDaysNotice(offering.responseDaysNotice),
                Colors.amber.shade900,
                Colors.amber.shade50,
              ),
              _buildBadge(
                Icons.receipt_outlined,
                l10n.consultInclusiveGST,
                Colors.green.shade800,
                Colors.green.shade50,
              ),
            ],
          ),

          const SizedBox(height: 14),
          const Divider(height: 1),
          const SizedBox(height: 12),

          // Price & Book Now CTA
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '₹${offering.priceRupees}',
                    style: const TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                  const Text(
                    'All-inclusive',
                    style: TextStyle(fontSize: 11, color: AppColors.lightTextSecondary),
                  ),
                ],
              ),
              ElevatedButton(
                onPressed: () => BookingFlowSheet.show(context, offering),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                ),
                child: Text(
                  l10n.consultBookNow,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMyAppointmentsTab(
    BuildContext context,
    AppLocalizations l10n,
    ConsultationState state,
  ) {
    if (state.isLoading && state.myBookings.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.myBookings.isEmpty) {
      return RefreshIndicator(
        onRefresh: () => ref.read(consultationNotifierProvider.notifier).loadMyBookings(),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(32),
          children: [
            const SizedBox(height: 60),
            Icon(Icons.event_note_outlined, size: 64, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text(
              l10n.consultNoAppointments,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.grey.shade700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Your booked consultations will appear here with live session links and status.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 24),
            Center(
              child: ElevatedButton(
                onPressed: () {
                  _tabController.animateTo(0);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: Text(l10n.consultBookNow),
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => ref.read(consultationNotifierProvider.notifier).loadMyBookings(),
      child: ListView.separated(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(16),
        itemCount: state.myBookings.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (ctx, idx) {
          final booking = state.myBookings[idx];
          return _buildAppointmentCard(context, l10n, booking);
        },
      ),
    );
  }

  Widget _buildAppointmentCard(
    BuildContext context,
    AppLocalizations l10n,
    ConsultationBookingModel booking,
  ) {
    final statusColor = booking.isConfirmed
        ? Colors.green
        : (booking.isPendingPayment
            ? Colors.orange
            : (booking.isCancelled ? Colors.red : Colors.blue));

    final statusLabel = booking.isConfirmed
        ? l10n.consultStatusConfirmed
        : (booking.isPendingPayment
            ? l10n.consultStatusPending
            : (booking.isCancelled
                ? l10n.consultStatusCancelled
                : (booking.isCompleted
                    ? l10n.consultStatusCompleted
                    : l10n.consultStatusRescheduled)));

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.lightBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                booking.bookingReference,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  statusLabel,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: statusColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            booking.serviceTitle,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: AppColors.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.calendar_month_outlined, size: 16, color: AppColors.lightTextSecondary),
              const SizedBox(width: 6),
              Text(
                '${booking.appointmentDate}  •  ${booking.startTime} - ${booking.endTime}',
                style: const TextStyle(fontSize: 13, color: AppColors.lightTextSecondary),
              ),
            ],
          ),
          if (booking.query != null && booking.query!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              'Query: ${booking.query}',
              style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary, fontStyle: FontStyle.italic),
            ),
          ],
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 10),

          // Actions
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              if (booking.isConfirmed && booking.meetingLink != null) ...[
                ElevatedButton.icon(
                  onPressed: () => _launchUrl(booking.meetingLink!),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  icon: const Icon(Icons.video_call_rounded, size: 18),
                  label: Text(l10n.consultJoinSession, style: const TextStyle(fontSize: 12)),
                ),
                const SizedBox(width: 8),
              ],
              if (!booking.isCancelled && !booking.isCompleted) ...[
                OutlinedButton(
                  onPressed: () => _confirmCancel(context, booking),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red,
                    side: const BorderSide(color: Colors.red),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  ),
                  child: Text(l10n.consultCancel, style: const TextStyle(fontSize: 12)),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBadge(IconData icon, String text, Color textColor, Color bgColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: textColor),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
        ],
      ),
    );
  }

  List<ConsultationOfferingModel> _fallbackOfferings() {
    return const [
      ConsultationOfferingModel(
        sku: 'consult-budget-friendly',
        title: 'Budget Friendly Consultation',
        description: 'Voice call session (15 mins) with Astro Sushil Kumar Singh.',
        mode: 'ONLINE_VOICE',
        durationMinutes: 15,
        pricePaise: 500000,
        responseDaysNotice: 15,
        category: 'Audio Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-general-audio',
        title: 'General Audio Consultation',
        description: 'Voice call session (30 mins) with comprehensive chart analysis.',
        mode: 'ONLINE_VOICE',
        durationMinutes: 30,
        pricePaise: 1000000,
        responseDaysNotice: 15,
        category: 'Audio Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-general-video',
        title: 'General Video Consultation',
        description: 'Interactive video session (30 mins) with direct screen sharing.',
        mode: 'ONLINE_VIDEO',
        durationMinutes: 30,
        pricePaise: 1500000,
        responseDaysNotice: 15,
        category: 'Video Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-standard-video',
        title: 'Standard Video Consultation',
        description: 'Comprehensive 1-on-1 video reading with 7-day notice.',
        mode: 'ONLINE_VIDEO',
        durationMinutes: 30,
        pricePaise: 2000000,
        responseDaysNotice: 7,
        category: 'Video Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-urgent-video',
        title: 'Urgent Video Consultation',
        description: 'Fast-track priority 1-on-1 video reading within 4 days.',
        mode: 'ONLINE_VIDEO',
        durationMinutes: 30,
        pricePaise: 3500000,
        responseDaysNotice: 4,
        category: 'Urgent Consultation',
      ),
    ];
  }
}
