import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../shared/widgets/subtle_celestial_background.dart';
import '../models/shipping_address_model.dart';
import '../providers/cart_provider.dart';
import '../providers/shop_provider.dart';

class ShippingAddressesScreen extends ConsumerStatefulWidget {
  final bool isSelectionMode;

  const ShippingAddressesScreen({super.key, this.isSelectionMode = false});

  @override
  ConsumerState<ShippingAddressesScreen> createState() => _ShippingAddressesScreenState();
}

class _ShippingAddressesScreenState extends ConsumerState<ShippingAddressesScreen> {
  void _openAddressForm([ShippingAddressModel? addressToEdit]) {
    final fullNameCtrl = TextEditingController(text: addressToEdit?.fullName ?? '');
    final phoneCtrl = TextEditingController(text: addressToEdit?.phoneNumber ?? '');
    final addr1Ctrl = TextEditingController(text: addressToEdit?.addressLine1 ?? '');
    final addr2Ctrl = TextEditingController(text: addressToEdit?.addressLine2 ?? '');
    final cityCtrl = TextEditingController(text: addressToEdit?.city ?? '');
    final stateCtrl = TextEditingController(text: addressToEdit?.state ?? '');
    final postalCtrl = TextEditingController(text: addressToEdit?.postalCode ?? '');
    bool isDefault = addressToEdit?.isDefault ?? false;
    final formKey = GlobalKey<FormState>();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
            top: 20,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Form(
            key: formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        addressToEdit != null ? 'Edit Address' : 'Add Delivery Address',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.primary),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.of(ctx).pop(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: fullNameCtrl,
                    decoration: const InputDecoration(labelText: 'Full Name *', border: OutlineInputBorder()),
                    validator: (v) => v == null || v.trim().length < 2 ? 'Please enter full name' : null,
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: phoneCtrl,
                    decoration: const InputDecoration(labelText: 'Phone Number (10 digits) *', border: OutlineInputBorder()),
                    keyboardType: TextInputType.phone,
                    validator: (v) => v == null || v.trim().length < 10 ? 'Enter valid 10-digit phone' : null,
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: addr1Ctrl,
                    decoration: const InputDecoration(labelText: 'House / Flat / Street *', border: OutlineInputBorder()),
                    validator: (v) => v == null || v.trim().length < 5 ? 'Please enter address' : null,
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: addr2Ctrl,
                    decoration: const InputDecoration(labelText: 'Landmark / Area (Optional)', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: cityCtrl,
                          decoration: const InputDecoration(labelText: 'City *', border: OutlineInputBorder()),
                          validator: (v) => v == null || v.trim().isEmpty ? 'Enter city' : null,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextFormField(
                          controller: postalCtrl,
                          decoration: const InputDecoration(labelText: 'PIN Code *', border: OutlineInputBorder()),
                          keyboardType: TextInputType.number,
                          validator: (v) => v == null || v.trim().length < 6 ? 'Enter valid PIN code' : null,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: stateCtrl,
                    decoration: const InputDecoration(labelText: 'State *', border: OutlineInputBorder()),
                    validator: (v) => v == null || v.trim().isEmpty ? 'Enter state' : null,
                  ),
                  const SizedBox(height: 10),
                  CheckboxListTile(
                    title: const Text('Set as default delivery address', style: TextStyle(fontSize: 13)),
                    value: isDefault,
                    onChanged: (val) {
                      setModalState(() {
                        isDefault = val ?? false;
                      });
                    },
                    controlAffinity: ListTileControlAffinity.leading,
                    contentPadding: EdgeInsets.zero,
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: () async {
                        if (formKey.currentState!.validate()) {
                          final newAddress = ShippingAddressModel(
                            id: addressToEdit?.id ?? '',
                            fullName: fullNameCtrl.text.trim(),
                            phoneNumber: phoneCtrl.text.trim(),
                            addressLine1: addr1Ctrl.text.trim(),
                            addressLine2: addr2Ctrl.text.trim().isNotEmpty ? addr2Ctrl.text.trim() : null,
                            city: cityCtrl.text.trim(),
                            state: stateCtrl.text.trim(),
                            postalCode: postalCtrl.text.trim(),
                            country: 'India',
                            isDefault: isDefault,
                          );

                          final service = ref.read(shopServiceProvider);
                          if (addressToEdit != null) {
                            await service.updateShippingAddress(addressToEdit.id, newAddress);
                          } else {
                            await service.createShippingAddress(newAddress);
                          }

                          ref.invalidate(shippingAddressesProvider);
                          if (ctx.mounted) Navigator.of(ctx).pop();
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: Text(addressToEdit != null ? 'Update Address' : 'Save Address'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final addressesAsync = ref.watch(shippingAddressesProvider);
    final selectedAddress = ref.watch(cartProvider).selectedAddress;

    return Scaffold(
      backgroundColor: AppColors.lightBackground,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Saved Addresses',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openAddressForm(),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Add Address', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: SubtleCelestialBackground(
        child: addressesAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
          error: (err, _) => Center(child: Text(err.toString())),
          data: (addresses) {
            if (addresses.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.08),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.location_on_outlined, size: 56, color: AppColors.primary),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'No addresses saved yet',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: AppColors.lightTextPrimary),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Save your address for quick delivery of sanctified Ayurvedic herbs and physical items.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppColors.lightTextSecondary, fontSize: 13, height: 1.4),
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton.icon(
                        onPressed: () => _openAddressForm(),
                        icon: const Icon(Icons.add, size: 18),
                        label: const Text('Add Address Now'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          minimumSize: const Size(180, 48),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: addresses.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (ctx, idx) {
                final addr = addresses[idx];
                final isSelected = widget.isSelectionMode && selectedAddress?.id == addr.id;

                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.cardSurfaceWarm,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isSelected ? AppColors.primary : AppColors.cardBorder,
                      width: isSelected ? 2 : 1,
                    ),
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
                          Row(
                            children: [
                              const Icon(Icons.home_outlined, size: 18, color: AppColors.primary),
                              const SizedBox(width: 6),
                              Text(
                                addr.fullName,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.lightTextPrimary),
                              ),
                            ],
                          ),
                          if (addr.isDefault)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppColors.premiumAccent.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: AppColors.premiumAccent.withValues(alpha: 0.4)),
                              ),
                              child: const Text(
                                'DEFAULT',
                                style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        addr.formattedAddress,
                        style: const TextStyle(fontSize: 13, height: 1.4, color: AppColors.lightTextPrimary),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const Icon(Icons.phone_outlined, size: 14, color: AppColors.lightTextSecondary),
                          const SizedBox(width: 4),
                          Text(
                            addr.phoneNumber,
                            style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary),
                          ),
                        ],
                      ),
                      const Divider(height: 20, color: AppColors.cardBorder),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          if (widget.isSelectionMode)
                            ElevatedButton(
                              onPressed: () {
                                ref.read(cartProvider.notifier).selectAddress(addr);
                                Navigator.of(context).pop();
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: isSelected ? AppColors.success : AppColors.primary,
                                foregroundColor: Colors.white,
                                minimumSize: const Size(120, 48),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              child: Text(isSelected ? 'Selected' : 'Deliver Here'),
                            )
                          else ...[
                            TextButton.icon(
                              onPressed: () => _openAddressForm(addr),
                              icon: const Icon(Icons.edit_outlined, size: 16),
                              label: const Text('Edit'),
                              style: TextButton.styleFrom(
                                foregroundColor: AppColors.primary,
                                minimumSize: const Size(64, 48),
                              ),
                            ),
                            const SizedBox(width: 8),
                            TextButton.icon(
                              onPressed: () async {
                                await ref.read(shopServiceProvider).deleteShippingAddress(addr.id);
                                ref.invalidate(shippingAddressesProvider);
                              },
                              icon: const Icon(Icons.delete_outline, size: 16, color: AppColors.error),
                              label: const Text('Delete', style: TextStyle(color: AppColors.error)),
                              style: TextButton.styleFrom(
                                minimumSize: const Size(64, 48),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
