import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/astro_design_system.dart';
import '../../../core/localization/locale_provider.dart';
import '../models/shipping_address_model.dart';
import '../providers/cart_provider.dart';
import '../providers/shop_provider.dart';
import '../widgets/shop_ui.dart';
import 'checkout_screen.dart';

/// Saved delivery addresses.
///
/// In checkout ([isSelectionMode]) this is the address step, "Step 2 of 3",
/// and it is always shown for physical or mixed carts: the saved addresses
/// are listed radio-style with the last-used or default one pre-selected,
/// each with "Edit", plus "Add new address" and one big "Deliver Here"
/// button that continues to Review & Pay. With no saved addresses the
/// add-address form is shown inline as the first thing on the step.
///
/// Outside checkout (Account → Delivery addresses) it is a plain manager
/// with Edit / Delete on each card.
class ShippingAddressesScreen extends ConsumerStatefulWidget {
  final bool isSelectionMode;

  const ShippingAddressesScreen({super.key, this.isSelectionMode = false});

  @override
  ConsumerState<ShippingAddressesScreen> createState() => _ShippingAddressesScreenState();
}

class _ShippingAddressesScreenState extends ConsumerState<ShippingAddressesScreen> {
  /// Address the user tapped on this step (checkout mode only).
  String? _chosenId;

  /// The pre-selected address: the one tapped on this step, else the one
  /// already in the cart (last used), else the default, else the first.
  ShippingAddressModel? _resolveChoice(List<ShippingAddressModel> addresses, ShippingAddressModel? inCart) {
    if (addresses.isEmpty) return null;
    for (final id in [_chosenId, inCart?.id]) {
      if (id == null) continue;
      for (final a in addresses) {
        if (a.id == id) return a;
      }
    }
    return addresses.firstWhere((a) => a.isDefault, orElse: () => addresses.first);
  }

  /// Step 2 → step 3. Passes the same address into the cart that checkout
  /// and order creation read (`cartState.selectedAddress?.id`).
  void _continueToPay(ShippingAddressModel address) {
    ref.read(cartProvider.notifier).selectAddress(address);
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const CheckoutScreen(openedFromAddressStep: true)),
    );
  }

  void _openAddressForm([ShippingAddressModel? addressToEdit]) {
    showAstroSheet<void>(
      context: context,
      builder: (ctx) => _AddressForm(
        addressToEdit: addressToEdit,
        onClose: () => Navigator.of(ctx).pop(),
        onSaved: (saved) {
          if (ctx.mounted) Navigator.of(ctx).pop();
          // A newly added address becomes the selection on the checkout step.
          if (widget.isSelectionMode && addressToEdit == null && saved.id.isNotEmpty && mounted) {
            setState(() => _chosenId = saved.id);
          }
        },
      ),
    );
  }

  /// First address saved from the inline form on the checkout step:
  /// select it and continue to Review & Pay.
  Future<void> _onInlineSaved(ShippingAddressModel saved) async {
    var chosen = saved;
    if (saved.id.isEmpty) {
      final fresh = await ref.read(shippingAddressesProvider.future);
      if (fresh.isNotEmpty) chosen = fresh.firstWhere((a) => a.isDefault, orElse: () => fresh.first);
    }
    if (!mounted) return;
    setState(() => _chosenId = chosen.id);
    _continueToPay(chosen);
  }

  Future<void> _confirmDelete(ShippingAddressModel addr) async {
    final confirmed = await showAstroConfirm(
      context: context,
      title: 'Delete this address?',
      message: addr.formattedAddress,
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
      destructive: true,
    );
    if (!confirmed) return;
    await ref.read(shopServiceProvider).deleteShippingAddress(addr.id);
    ref.invalidate(shippingAddressesProvider);
  }

  @override
  Widget build(BuildContext context) {
    final addressesAsync = ref.watch(shippingAddressesProvider);
    final selectedAddress = ref.watch(cartProvider).selectedAddress;
    final isHindi = ref.watch(localeProvider).languageCode == 'hi';
    final addresses = addressesAsync.valueOrNull ?? const <ShippingAddressModel>[];
    final hasAddresses = addresses.isNotEmpty;
    final selecting = widget.isSelectionMode;
    final chosen = selecting ? _resolveChoice(addresses, selectedAddress) : null;

    Widget fill(Widget child) => SliverFillRemaining(hasScrollBody: false, child: child);

    Widget? bottomBar;
    if (selecting) {
      bottomBar = hasAddresses
          ? ShopBottomBar(
              child: AstroPrimaryButton(
                key: const ValueKey('address-step-continue'),
                label: isHindi ? 'यहाँ डिलीवर करें' : 'Deliver Here',
                icon: Icons.local_shipping_outlined,
                onPressed: chosen == null ? null : () => _continueToPay(chosen),
              ),
            )
          : null;
    } else if (hasAddresses) {
      bottomBar = ShopBottomBar(
        child: AstroPrimaryButton(label: 'Add Address', icon: Icons.add, onPressed: () => _openAddressForm()),
      );
    }

    return AstroPage(
      title: selecting ? context.l10n.deliveryAddress : 'Saved Addresses',
      onRefresh: () async => ref.invalidate(shippingAddressesProvider),
      bottomBar: bottomBar,
      slivers: [
        addressesAsync.when(
          loading: () => fill(const AstroStateView.loading()),
          error: (err, _) => fill(ShopStateView(
            icon: Icons.cloud_off_outlined,
            isError: true,
            title: isHindi ? 'पते लोड नहीं हो सके' : 'Unable to load addresses',
            message: isHindi ? 'कृपया अपना इंटरनेट जांचें।' : 'Please check your internet connection.',
            actionLabel: context.l10n.commonTryAgain,
            actionIcon: Icons.refresh,
            onAction: () => ref.invalidate(shippingAddressesProvider),
          )),
          data: (addresses) {
            if (selecting) return _buildAddressStep(addresses, chosen, isHindi);

            if (addresses.isEmpty) {
              return fill(ShopStateView(
                icon: Icons.location_on_outlined,
                title: 'No addresses saved yet',
                message: 'Save your address for quick delivery of sanctified Ayurvedic herbs and physical items.',
                actionLabel: 'Add Address Now',
                actionIcon: Icons.add,
                onAction: () => _openAddressForm(),
              ));
            }

            return AstroSliverContent(
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (final addr in addresses) ...[
                      _AddressCard(
                        address: addr,
                        onEdit: () => _openAddressForm(addr),
                        onDelete: () => _confirmDelete(addr),
                      ),
                      const SizedBox(height: 12),
                    ],
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  /// Checkout step 2: radio-style list, or the inline form when empty.
  Widget _buildAddressStep(List<ShippingAddressModel> addresses, ShippingAddressModel? chosen, bool isHindi) {
    return AstroSliverContent(
      bottom: 24,
      sliver: SliverToBoxAdapter(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ShopStepIndicator(current: 2, isHindi: isHindi),
            const SizedBox(height: 20),
            if (addresses.isEmpty) ...[
              AstroSectionHeading(
                isHindi ? 'डिलीवरी पता जोड़ें' : 'Add a delivery address',
                subtitle: isHindi
                    ? 'भौतिक उत्पाद इस पते पर भेजे जाएंगे।'
                    : 'Your physical items will be shipped here.',
              ),
              AstroSurfaceCard(
                child: _AddressForm(
                  key: const ValueKey('address-step-inline-form'),
                  saveLabel: isHindi ? 'सहेजें और आगे बढ़ें' : 'Save & Continue',
                  onSaved: _onInlineSaved,
                ),
              ),
            ] else ...[
              AstroSectionHeading(
                isHindi ? 'कहाँ डिलीवर करें?' : 'Deliver to',
                subtitle: isHindi ? 'एक पता चुनें' : 'Choose one address',
              ),
              for (final addr in addresses) ...[
                _SelectableAddressCard(
                  key: ValueKey('address-option-${addr.id}'),
                  address: addr,
                  isSelected: chosen?.id == addr.id,
                  isHindi: isHindi,
                  onSelect: () => setState(() => _chosenId = addr.id),
                  onEdit: () => _openAddressForm(addr),
                ),
                const SizedBox(height: 12),
              ],
              const SizedBox(height: 4),
              AstroSecondaryButton(
                key: const ValueKey('address-step-add'),
                label: isHindi ? 'नया पता जोड़ें' : 'Add new address',
                icon: Icons.add_location_alt_outlined,
                onPressed: () => _openAddressForm(),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Add / edit address form. Used in a sheet (with a Close action) and inline
/// on the checkout address step when no address is saved yet.
class _AddressForm extends ConsumerStatefulWidget {
  final ShippingAddressModel? addressToEdit;

  /// Called after the address is saved and the address list refreshed.
  final ValueChanged<ShippingAddressModel> onSaved;

  /// Shows the title row with a Close action (sheet presentation).
  final VoidCallback? onClose;
  final String? saveLabel;

  const _AddressForm({super.key, this.addressToEdit, required this.onSaved, this.onClose, this.saveLabel});

  @override
  ConsumerState<_AddressForm> createState() => _AddressFormState();
}

class _AddressFormState extends ConsumerState<_AddressForm> {
  late final TextEditingController _fullName;
  late final TextEditingController _phone;
  late final TextEditingController _addr1;
  late final TextEditingController _addr2;
  late final TextEditingController _city;
  late final TextEditingController _state;
  late final TextEditingController _postal;
  late bool _isDefault;
  final _formKey = GlobalKey<FormState>();
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final a = widget.addressToEdit;
    _fullName = TextEditingController(text: a?.fullName ?? '');
    _phone = TextEditingController(text: a?.phoneNumber ?? '');
    _addr1 = TextEditingController(text: a?.addressLine1 ?? '');
    _addr2 = TextEditingController(text: a?.addressLine2 ?? '');
    _city = TextEditingController(text: a?.city ?? '');
    _state = TextEditingController(text: a?.state ?? '');
    _postal = TextEditingController(text: a?.postalCode ?? '');
    _isDefault = a?.isDefault ?? false;
  }

  @override
  void dispose() {
    for (final c in [_fullName, _phone, _addr1, _addr2, _city, _state, _postal]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    if (_saving || !_formKey.currentState!.validate()) return;
    final edit = widget.addressToEdit;
    final newAddress = ShippingAddressModel(
      id: edit?.id ?? '',
      fullName: _fullName.text.trim(),
      phoneNumber: _phone.text.trim(),
      addressLine1: _addr1.text.trim(),
      addressLine2: _addr2.text.trim().isNotEmpty ? _addr2.text.trim() : null,
      city: _city.text.trim(),
      state: _state.text.trim(),
      postalCode: _postal.text.trim(),
      country: 'India',
      isDefault: _isDefault,
    );

    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final service = ref.read(shopServiceProvider);
      final saved = edit != null
          ? await service.updateShippingAddress(edit.id, newAddress)
          : await service.createShippingAddress(newAddress);
      ref.invalidate(shippingAddressesProvider);
      if (!mounted) return;
      setState(() => _saving = false);
      widget.onSaved(saved);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  InputDecoration _field(String label) => InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(fontSize: 16, color: AppColors.textSecondary),
        floatingLabelStyle: const TextStyle(fontSize: 16, color: AppColors.primary),
        errorStyle: const TextStyle(fontSize: 14),
        errorMaxLines: 2,
        filled: true,
        fillColor: AppColors.cardSurface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.cardBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.cardBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.accent, width: 2),
        ),
      );

  @override
  Widget build(BuildContext context) {
    const fieldText = TextStyle(fontSize: 16, color: AppColors.textPrimary);
    const gap = SizedBox(height: 14);
    final isEdit = widget.addressToEdit != null;

    return Form(
      key: _formKey,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (widget.onClose != null) ...[
            Row(
              children: [
                Expanded(
                  child: Text(
                    isEdit ? 'Edit Address' : 'Add Delivery Address',
                    style: AppTypography.headlineLarge.copyWith(fontSize: 21),
                  ),
                ),
                TextButton(
                  onPressed: widget.onClose,
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.accent,
                    minimumSize: const Size(48, 48),
                  ),
                  child: Text(context.l10n.commonClose, style: AppTypography.navAction),
                ),
              ],
            ),
            const SizedBox(height: 12),
          ],
          TextFormField(
            key: const ValueKey('address-form-fullName'),
            controller: _fullName,
            style: fieldText,
            textInputAction: TextInputAction.next,
            decoration: _field('Full Name *'),
            validator: (v) => v == null || v.trim().length < 2 ? 'Please enter full name' : null,
          ),
          gap,
          TextFormField(
            key: const ValueKey('address-form-phone'),
            controller: _phone,
            style: fieldText,
            textInputAction: TextInputAction.next,
            decoration: _field('Phone Number (10 digits) *'),
            keyboardType: TextInputType.phone,
            validator: (v) => v == null || v.trim().length < 10 ? 'Enter valid 10-digit phone' : null,
          ),
          gap,
          TextFormField(
            key: const ValueKey('address-form-line1'),
            controller: _addr1,
            style: fieldText,
            textInputAction: TextInputAction.next,
            decoration: _field('House / Flat / Street *'),
            validator: (v) => v == null || v.trim().length < 5 ? 'Please enter address' : null,
          ),
          gap,
          TextFormField(
            key: const ValueKey('address-form-line2'),
            controller: _addr2,
            style: fieldText,
            textInputAction: TextInputAction.next,
            decoration: _field('Landmark / Area (Optional)'),
          ),
          gap,
          TextFormField(
            key: const ValueKey('address-form-city'),
            controller: _city,
            style: fieldText,
            textInputAction: TextInputAction.next,
            decoration: _field('City *'),
            validator: (v) => v == null || v.trim().isEmpty ? 'Enter city' : null,
          ),
          gap,
          TextFormField(
            key: const ValueKey('address-form-postal'),
            controller: _postal,
            style: fieldText,
            textInputAction: TextInputAction.next,
            decoration: _field('PIN Code *'),
            keyboardType: TextInputType.number,
            validator: (v) => v == null || v.trim().length < 6 ? 'Enter valid PIN code' : null,
          ),
          gap,
          TextFormField(
            key: const ValueKey('address-form-state'),
            controller: _state,
            style: fieldText,
            textInputAction: TextInputAction.done,
            decoration: _field('State *'),
            validator: (v) => v == null || v.trim().isEmpty ? 'Enter state' : null,
          ),
          const SizedBox(height: 8),
          SwitchListTile.adaptive(
            title: const Text(
              'Set as default delivery address',
              style: TextStyle(fontSize: 16, color: AppColors.textPrimary),
            ),
            value: _isDefault,
            activeTrackColor: AppColors.successText,
            onChanged: (val) => setState(() => _isDefault = val),
            contentPadding: EdgeInsets.zero,
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: const TextStyle(fontSize: 15, color: AppColors.tintRoseText)),
          ],
          const SizedBox(height: 16),
          AstroPrimaryButton(
            key: const ValueKey('address-form-save'),
            label: widget.saveLabel ?? (isEdit ? 'Update Address' : 'Save Address'),
            icon: Icons.check,
            isLoading: _saving,
            onPressed: _save,
          ),
        ],
      ),
    );
  }
}

/// Name, Default tag, address and phone of one saved address.
class _AddressDetails extends StatelessWidget {
  final ShippingAddressModel address;
  const _AddressDetails({required this.address});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 10,
          runSpacing: 6,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text(
              address.fullName,
              style: AppTypography.headlineMedium.copyWith(fontSize: 17),
            ),
            if (address.isDefault)
              ShopTag(
                label: 'Default',
                icon: Icons.star_rounded,
                background: AstroTint.amber.background,
                foreground: AstroTint.amber.foreground,
              ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          address.formattedAddress,
          style: const TextStyle(fontSize: 16, height: 1.4, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 6),
        Row(
          children: [
            const Icon(Icons.phone_outlined, size: 18, color: AppColors.textSecondary),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                address.phoneNumber,
                style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

/// Checkout step 2 option: the whole card is tappable and shows a radio
/// mark; the selected card gets a gold border. "Edit" opens the form.
class _SelectableAddressCard extends StatelessWidget {
  final ShippingAddressModel address;
  final bool isSelected;
  final bool isHindi;
  final VoidCallback onSelect;
  final VoidCallback onEdit;

  const _SelectableAddressCard({
    super.key,
    required this.address,
    required this.isSelected,
    required this.isHindi,
    required this.onSelect,
    required this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      selected: isSelected,
      inMutuallyExclusiveGroup: true,
      child: AstroSurfaceCard(
        borderColor: isSelected ? AppColors.accent : null,
        borderWidth: isSelected ? 2 : 1,
        padding: const EdgeInsets.fromLTRB(14, 16, 14, 6),
        onTap: onSelect,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 1),
                  child: Icon(
                    isSelected ? Icons.radio_button_checked : Icons.radio_button_unchecked,
                    size: 26,
                    color: isSelected ? AppColors.accent : AppColors.textMuted,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(child: _AddressDetails(address: address)),
              ],
            ),
            Padding(
              padding: const EdgeInsetsDirectional.only(start: 30),
              child: TextButton.icon(
                key: ValueKey('address-edit-${address.id}'),
                onPressed: onEdit,
                icon: const Icon(Icons.edit_outlined, size: 20),
                label: Text(isHindi ? 'संपादित करें' : 'Edit', style: const TextStyle(fontSize: 16)),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  minimumSize: const Size(64, 48),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Account-mode card with Edit / Delete.
class _AddressCard extends StatelessWidget {
  final ShippingAddressModel address;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _AddressCard({
    required this.address,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return AstroSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const AstroIconSquare(icon: Icons.home_outlined, tint: AstroTint.coral),
              const SizedBox(width: 12),
              Expanded(
                child: Wrap(
                  spacing: 10,
                  runSpacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      address.fullName,
                      style: AppTypography.headlineMedium.copyWith(fontSize: 17),
                    ),
                    if (address.isDefault)
                      ShopTag(
                        label: 'Default',
                        icon: Icons.star_rounded,
                        background: AstroTint.amber.background,
                        foreground: AstroTint.amber.foreground,
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            address.formattedAddress,
            style: const TextStyle(fontSize: 16, height: 1.4, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.phone_outlined, size: 18, color: AppColors.textSecondary),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  address.phoneNumber,
                  style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              TextButton.icon(
                onPressed: onEdit,
                icon: const Icon(Icons.edit_outlined, size: 20),
                label: const Text('Edit', style: TextStyle(fontSize: 16)),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  minimumSize: const Size(64, 48),
                ),
              ),
              TextButton.icon(
                onPressed: onDelete,
                icon: const Icon(Icons.delete_outline, size: 20),
                label: const Text('Delete', style: TextStyle(fontSize: 16)),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.tintRoseText,
                  minimumSize: const Size(64, 48),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
