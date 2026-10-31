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
/// Redesigned in Phase 6 according to the Astro Sushil Design System.
class ConsultScreen extends ConsumerStatefulWidget {
  const ConsultScreen({super.key});

  @override
  ConsumerState<ConsultScreen> createState() => _ConsultScreenState();
}

class _ConsultScreenState extends ConsumerState<ConsultScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _selectedCategoryFilter = 'All';
  String _selectedStatusFilter = 'All';

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
        backgroundColor: AppColors.cardSurfaceWarm,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: AppColors.cardBorder),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.support_agent_rounded, color: AppColors.primary, size: 22),
            ),
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
            const Divider(color: AppColors.cardBorder),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton.icon(
                  onPressed: () {
                    Clipboard.setData(const ClipboardData(text: '+919621127233'));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Phone number copied to clipboard')),
                    );
                  },
                  icon: const Icon(Icons.copy, size: 16),
                  label: const Text('Copy Phone'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.cardBorder),
                  ),
                ),
                OutlinedButton.icon(
                  onPressed: () {
                    Clipboard.setData(const ClipboardData(text: 'connect@astrosushil.com'));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Email copied to clipboard')),
                    );
                  },
                  icon: const Icon(Icons.copy, size: 16),
                  label: const Text('Copy Email'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.cardBorder),
                  ),
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
        backgroundColor: AppColors.cardSurfaceWarm,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.cardBorder),
        ),
        title: Text(l10n.consultCancel, style: const TextStyle(fontWeight: FontWeight.bold)),
        content: Text(
          'Are you sure you want to cancel booking ${booking.bookingReference}? ${l10n.consultCancellationPolicy}',
          style: const TextStyle(fontSize: 14, height: 1.4),
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
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFDC2626)),
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
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: AppColors.lightSurface,
        foregroundColor: AppColors.lightTextPrimary,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: AppColors.cardBorder, width: 1)),
            ),
            child: TabBar(
              controller: _tabController,
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.lightTextSecondary,
              indicatorColor: AppColors.premiumAccent,
              indicatorWeight: 3,
              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              tabs: [
                Tab(text: l10n.consultTabsBook),
                Tab(text: l10n.consultTabsMyAppointments),
              ],
            ),
          ),
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
    final rawCatalog = state.catalog.isNotEmpty ? state.catalog : _fallbackOfferings();
    final catalog = _filterOfferings(rawCatalog);

    return RefreshIndicator(
      onRefresh: () => ref.read(consultationNotifierProvider.notifier).loadCatalog(),
      child: ListView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
        children: [
          // 1. Cosmic Hero Header Banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.midnight, AppColors.tertiary],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.25),
                  blurRadius: 18,
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
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.premiumAccent.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: AppColors.premiumAccent.withValues(alpha: 0.6),
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.star_rounded, color: AppColors.premiumAccent, size: 14),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              '1-ON-1 GUIDANCE',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1.1,
                                color: AppColors.premiumAccent.withValues(alpha: 0.95),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.lock_outline_rounded, color: Colors.white70, size: 12),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              '100% CONFIDENTIAL',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.8,
                                color: Colors.white.withValues(alpha: 0.9),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  l10n.consultTitle,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: 0.2,
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
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.25),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.schedule_rounded, color: AppColors.goldLight, size: 14),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          l10n.consultTimeZoneNotice,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.goldLight,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // 2. How Consultation Works 3-Step Guide
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.cardSurfaceWarm,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.auto_stories_outlined, color: AppColors.primary, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        l10n.consultHowItWorksTitle,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: AppColors.lightTextPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildStepItem('1', l10n.consultStep1),
                    const SizedBox(height: 6),
                    _buildStepItem('2', l10n.consultStep2),
                    const SizedBox(height: 6),
                    _buildStepItem('3', l10n.consultStep3),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // 3. Explainer Button for Preparation
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
                'availableServices': rawCatalog.map((c) => c.title).toList(),
                'note':
                    'Guidelines on birth time verification, specific queries, and ethical boundaries.',
              },
            ),
          ),

          const SizedBox(height: 16),

          // 4. Category Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildCategoryFilterChip('All', l10n.consultFilterAll),
                _buildCategoryFilterChip('Video', l10n.consultFilterVideo),
                _buildCategoryFilterChip('Audio', l10n.consultFilterAudio),
                _buildCategoryFilterChip('Urgent', l10n.consultFilterUrgent),
                _buildCategoryFilterChip('Specialized', l10n.consultFilterSpecialized),
                _buildCategoryFilterChip('InPerson', l10n.consultFilterInPerson),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // 5. Offerings List
          if (state.isLoading && state.catalog.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator(),
              ),
            )
          else if (catalog.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.cardSurfaceWarm,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Column(
                children: [
                  Icon(Icons.filter_list_off_rounded, size: 40, color: Colors.grey.shade400),
                  const SizedBox(height: 10),
                  Text(
                    'No consultations found in this category.',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey.shade700,
                    ),
                  ),
                ],
              ),
            )
          else
            ...catalog.map((offering) => _buildOfferingCard(context, l10n, offering)),

          const SizedBox(height: 20),

          // 6. Direct Inquiry & Office Contact Buttons
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              onPressed: () => _launchWhatsApp(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF25D366),
                foregroundColor: Colors.white,
                elevation: 1,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18),
              label: Text(
                l10n.consultInquireWhatsApp,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
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
                side: const BorderSide(color: AppColors.primary, width: 1.2),
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

  Widget _buildStepItem(String number, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.cardBorderSubtle),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 8,
            backgroundColor: AppColors.primary,
            child: Text(
              number,
              style: const TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.lightTextPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryFilterChip(String key, String label) {
    final isSelected = _selectedCategoryFilter == key;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (val) {
          if (val) {
            setState(() {
              _selectedCategoryFilter = key;
            });
          }
        },
        selectedColor: AppColors.primary,
        backgroundColor: AppColors.cardSurfaceWarm,
        labelStyle: TextStyle(
          fontSize: 12,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          color: isSelected ? Colors.white : AppColors.lightTextPrimary,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
          side: BorderSide(
            color: isSelected ? AppColors.primary : AppColors.cardBorder,
            width: 1,
          ),
        ),
      ),
    );
  }

  List<ConsultationOfferingModel> _filterOfferings(List<ConsultationOfferingModel> list) {
    switch (_selectedCategoryFilter) {
      case 'Video':
        return list.where((o) => o.mode.contains('VIDEO')).toList();
      case 'Audio':
        return list
            .where((o) => o.mode.contains('VOICE') || o.mode.contains('AUDIO'))
            .toList();
      case 'Urgent':
        return list
            .where((o) =>
                o.responseDaysNotice <= 4 ||
                o.title.toLowerCase().contains('urgent') ||
                o.title.toLowerCase().contains('instant'))
            .toList();
      case 'Specialized':
        return list
            .where((o) =>
                o.sku.contains('signature') ||
                o.sku.contains('watch') ||
                o.sku.contains('longevity') ||
                o.category.toLowerCase().contains('specialized'))
            .toList();
      case 'InPerson':
        return list
            .where((o) =>
                o.mode.contains('IN_PERSON') ||
                o.sku.contains('in-person'))
            .toList();
      case 'All':
      default:
        return list;
    }
  }

  Widget _buildOfferingCard(
    BuildContext context,
    AppLocalizations l10n,
    ConsultationOfferingModel offering,
  ) {
    final isVoice = offering.mode.contains('VOICE') || offering.mode.contains('AUDIO');
    final isInPerson = offering.mode.contains('IN_PERSON');

    final modeIcon = isVoice
        ? Icons.phone_in_talk_rounded
        : (isInPerson ? Icons.handshake_rounded : Icons.videocam_rounded);

    final modeColor = isVoice
        ? const Color(0xFF2563EB)
        : (isInPerson ? const Color(0xFF7C3AED) : const Color(0xFF0D9488));

    final isUrgent = offering.responseDaysNotice <= 4;
    final isSpecialized = offering.sku.contains('signature') ||
        offering.sku.contains('watch') ||
        offering.sku.contains('longevity');

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isUrgent
              ? AppColors.premiumAccent.withValues(alpha: 0.5)
              : AppColors.cardBorder,
          width: isUrgent ? 1.2 : 1,
        ),
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
                        height: 1.35,
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
                const Color(0xFF374151),
                const Color(0xFFF3F4F6),
              ),
              _buildBadge(
                Icons.calendar_today_outlined,
                l10n.consultDaysNotice(offering.responseDaysNotice),
                isUrgent ? const Color(0xFFB45309) : const Color(0xFF4B5563),
                isUrgent ? const Color(0xFFFEF3C7) : const Color(0xFFF3F4F6),
              ),
              _buildBadge(
                Icons.receipt_outlined,
                l10n.consultInclusiveGST,
                const Color(0xFF065F46),
                const Color(0xFFD1FAE5),
              ),
              if (isInPerson)
                _buildBadge(
                  Icons.location_on_outlined,
                  offering.sku.contains('delhi') ? 'Delhi / NCR' : 'Client City',
                  const Color(0xFF6D28D9),
                  const Color(0xFFEDE9FE),
                ),
              if (isSpecialized)
                _buildBadge(
                  Icons.auto_awesome_rounded,
                  'Specialized',
                  AppColors.goldDark,
                  AppColors.saffronLight,
                ),
            ],
          ),

          const SizedBox(height: 14),
          const Divider(height: 1, color: AppColors.cardBorder),
          const SizedBox(height: 12),

          // Price & Book Now CTA
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '₹${offering.priceRupees}',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                        letterSpacing: 0.2,
                      ),
                    ),
                    const Text(
                      'All-inclusive (18% GST)',
                      style: TextStyle(fontSize: 11, color: AppColors.lightTextSecondary),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: () => BookingFlowSheet.show(context, offering),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  minimumSize: const Size(110, 48),
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

    final rawBookings = state.myBookings;
    final filteredBookings = _filterBookings(rawBookings);

    return RefreshIndicator(
      onRefresh: () => ref.read(consultationNotifierProvider.notifier).loadMyBookings(),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          // Status filter chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildStatusFilterChip('All', '${l10n.consultFilterAll} (${rawBookings.length})'),
                _buildStatusFilterChip(
                  'Upcoming',
                  '${l10n.consultFilterUpcoming} (${rawBookings.where((b) => b.isConfirmed).length})',
                ),
                _buildStatusFilterChip(
                  'Pending',
                  '${l10n.consultFilterPending} (${rawBookings.where((b) => b.isPendingPayment).length})',
                ),
                _buildStatusFilterChip(
                  'Completed',
                  '${l10n.consultFilterCompleted} (${rawBookings.where((b) => b.isCompleted).length})',
                ),
                _buildStatusFilterChip(
                  'Cancelled',
                  '${l10n.consultFilterCancelled} (${rawBookings.where((b) => b.isCancelled).length})',
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          if (filteredBookings.isEmpty)
            _buildEmptyAppointmentsView(l10n)
          else
            ...filteredBookings.map((b) => _buildAppointmentCard(context, l10n, b)),
        ],
      ),
    );
  }

  Widget _buildStatusFilterChip(String key, String label) {
    final isSelected = _selectedStatusFilter == key;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (val) {
          if (val) {
            setState(() {
              _selectedStatusFilter = key;
            });
          }
        },
        selectedColor: AppColors.primary,
        backgroundColor: AppColors.cardSurfaceWarm,
        labelStyle: TextStyle(
          fontSize: 12,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          color: isSelected ? Colors.white : AppColors.lightTextPrimary,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
          side: BorderSide(
            color: isSelected ? AppColors.primary : AppColors.cardBorder,
            width: 1,
          ),
        ),
      ),
    );
  }

  List<ConsultationBookingModel> _filterBookings(List<ConsultationBookingModel> list) {
    switch (_selectedStatusFilter) {
      case 'Upcoming':
        return list.where((b) => b.isConfirmed).toList();
      case 'Pending':
        return list.where((b) => b.isPendingPayment).toList();
      case 'Completed':
        return list.where((b) => b.isCompleted).toList();
      case 'Cancelled':
        return list.where((b) => b.isCancelled).toList();
      case 'All':
      default:
        return list;
    }
  }

  Widget _buildEmptyAppointmentsView(AppLocalizations l10n) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 40),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.05),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.event_note_outlined,
              size: 56,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            l10n.consultNoAppointments,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.lightTextPrimary,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Your booked consultations will appear here with live session links and status.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: AppColors.lightTextSecondary, height: 1.4),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () {
              _tabController.animateTo(0);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              minimumSize: const Size(160, 48),
            ),
            child: Text(l10n.consultBookNow, style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildAppointmentCard(
    BuildContext context,
    AppLocalizations l10n,
    ConsultationBookingModel booking,
  ) {
    Color statusBgColor;
    Color statusTextColor;
    String statusLabel;

    if (booking.isConfirmed) {
      statusBgColor = const Color(0xFFD1FAE5);
      statusTextColor = const Color(0xFF065F46);
      statusLabel = l10n.consultStatusConfirmed;
    } else if (booking.isPendingPayment) {
      statusBgColor = const Color(0xFFFEF3C7);
      statusTextColor = const Color(0xFFB45309);
      statusLabel = l10n.consultStatusPending;
    } else if (booking.isCancelled) {
      statusBgColor = const Color(0xFFFEE2E2);
      statusTextColor = const Color(0xFFB91C1C);
      statusLabel = l10n.consultStatusCancelled;
    } else if (booking.isCompleted) {
      statusBgColor = const Color(0xFFF3F4F6);
      statusTextColor = const Color(0xFF374151);
      statusLabel = l10n.consultStatusCompleted;
    } else {
      statusBgColor = const Color(0xFFE0E7FF);
      statusTextColor = const Color(0xFF3730A3);
      statusLabel = l10n.consultStatusRescheduled;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardSurfaceWarm,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.cardBorder),
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
              Expanded(
                child: Text(
                  booking.bookingReference,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusBgColor,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  statusLabel,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: statusTextColor,
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
              Expanded(
                child: Text(
                  '${booking.appointmentDate}  •  ${booking.startTime} - ${booking.endTime} IST',
                  style: const TextStyle(fontSize: 13, color: AppColors.lightTextSecondary),
                ),
              ),
            ],
          ),
          if (booking.query != null && booking.query!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.cardSurfaceParchment,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.cardBorderSubtle),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.lock_outline_rounded, size: 14, color: AppColors.lightTextSecondary),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Query: ${booking.query}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.lightTextSecondary,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          const Divider(height: 1, color: AppColors.cardBorder),
          const SizedBox(height: 10),

          // Actions
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.end,
            children: [
              if (booking.isConfirmed && booking.meetingLink != null)
                ElevatedButton.icon(
                  onPressed: () => _launchUrl(booking.meetingLink!),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF059669),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    minimumSize: const Size(120, 48),
                  ),
                  icon: const Icon(Icons.video_call_rounded, size: 20),
                  label: Text(l10n.consultJoinSession, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              if (!booking.isCancelled && !booking.isCompleted)
                OutlinedButton(
                  onPressed: () => _confirmCancel(context, booking),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFDC2626),
                    side: const BorderSide(color: Color(0xFFDC2626)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    minimumSize: const Size(100, 48),
                  ),
                  child: Text(l10n.consultCancel, style: const TextStyle(fontSize: 12)),
                ),
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
        description: '15-minute voice call session with Astro Sushil answering up to 3 specific questions.',
        mode: 'ONLINE_VOICE',
        durationMinutes: 15,
        pricePaise: 500000,
        responseDaysNotice: 15,
        category: 'Audio Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-general-audio',
        title: 'General Consultation (Audio)',
        description: '30-minute direct one-on-one voice call covering comprehensive life issues and remedies.',
        mode: 'ONLINE_VOICE',
        durationMinutes: 30,
        pricePaise: 1000000,
        responseDaysNotice: 15,
        category: 'Audio Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-general-video',
        title: 'General Consultation (Video)',
        description: '30-minute interactive video call with thorough chart analysis and solutions.',
        mode: 'ONLINE_VIDEO',
        durationMinutes: 30,
        pricePaise: 1500000,
        responseDaysNotice: 15,
        category: 'Video Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-standard-audio',
        title: 'Standard Consultation (Audio)',
        description: '30-minute priority scheduling voice consultation with Astro Sushil for reliable clarity.',
        mode: 'ONLINE_VOICE',
        durationMinutes: 30,
        pricePaise: 1500000,
        responseDaysNotice: 7,
        category: 'Audio Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-standard-video',
        title: 'Standard Consultation (Video)',
        description: '30-minute priority video consultation with comprehensive planetary remedy roadmap.',
        mode: 'ONLINE_VIDEO',
        durationMinutes: 30,
        pricePaise: 2000000,
        responseDaysNotice: 7,
        category: 'Video Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-urgent-audio',
        title: 'Urgent Consultation (Audio)',
        description: '30-minute expedited phone session guaranteed within 4 days for critical life turning points.',
        mode: 'ONLINE_VOICE',
        durationMinutes: 30,
        pricePaise: 2500000,
        responseDaysNotice: 4,
        category: 'Urgent Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-urgent-video',
        title: 'Urgent Consultation (Video)',
        description: '30-minute expedited video call guaranteed within 4 days for fast astrological clarity.',
        mode: 'ONLINE_VIDEO',
        durationMinutes: 30,
        pricePaise: 3500000,
        responseDaysNotice: 4,
        category: 'Urgent Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-signature-analysis',
        title: 'Signature Analysis Consultation',
        description: '30-minute specialized graphology session optimizing your signature for wealth and success.',
        mode: 'ONLINE_VIDEO',
        durationMinutes: 30,
        pricePaise: 2500000,
        responseDaysNotice: 7,
        category: 'Specialized Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-wrist-watch-therapy',
        title: 'Wrist Watch Therapy Consultation',
        description: '30-minute astrological wrist watch selection, dial alignment, and metal recommendation.',
        mode: 'ONLINE_VIDEO',
        durationMinutes: 30,
        pricePaise: 5000000,
        responseDaysNotice: 7,
        category: 'Specialized Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-longevity',
        title: 'Age & Longevity Consultation',
        description: '30-minute in-depth lifespan, Maraka/Badhaka evaluation, and health milestone consultation.',
        mode: 'ONLINE_VIDEO',
        durationMinutes: 30,
        pricePaise: 6000000,
        responseDaysNotice: 7,
        category: 'Specialized Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-instant-audio',
        title: 'Instant Consultation (Audio - 24h)',
        description: '30-minute emergency voice call booked within 24 hours directly with Astro Sushil.',
        mode: 'ONLINE_VOICE',
        durationMinutes: 30,
        pricePaise: 9000000,
        responseDaysNotice: 1,
        category: 'Urgent Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-instant-video',
        title: 'Instant Consultation (Video - 24h)',
        description: '30-minute emergency video consultation booked within 24 hours directly with Astro Sushil.',
        mode: 'ONLINE_VIDEO',
        durationMinutes: 30,
        pricePaise: 10000000,
        responseDaysNotice: 1,
        category: 'Urgent Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-in-person-delhi',
        title: 'Face-to-Face Consultation (Delhi / NCR)',
        description: '30-minute private in-person consultation at Astro Sushil’s Delhi NCR office.',
        mode: 'IN_PERSON',
        durationMinutes: 30,
        pricePaise: 10000000,
        responseDaysNotice: 7,
        category: 'In-Person Consultation',
      ),
      ConsultationOfferingModel(
        sku: 'consult-in-person-other',
        title: 'Face-to-Face Consultation (Other Cities)',
        description: 'Exclusive in-person consultation in client’s home city with personalized remedies.',
        mode: 'IN_PERSON',
        durationMinutes: 30,
        pricePaise: 15000000,
        responseDaysNotice: 7,
        category: 'In-Person Consultation',
      ),
    ];
  }
}
