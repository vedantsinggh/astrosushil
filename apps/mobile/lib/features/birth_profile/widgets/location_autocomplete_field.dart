import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/theme/app_colors.dart';
import '../models/location_model.dart';
import '../providers/location_provider.dart';

/// Location Autocomplete Field for selecting verified geographic locations.
/// Enforces selection of a real place with latitude, longitude, and IANA timezone.
class LocationAutocompleteField extends ConsumerStatefulWidget {
  final LocationModel? initialLocation;
  final ValueChanged<LocationModel?> onLocationSelected;
  final String? Function(String?)? validator;

  const LocationAutocompleteField({
    super.key,
    this.initialLocation,
    required this.onLocationSelected,
    this.validator,
  });

  @override
  ConsumerState<LocationAutocompleteField> createState() => _LocationAutocompleteFieldState();
}

class _LocationAutocompleteFieldState extends ConsumerState<LocationAutocompleteField> {
  final TextEditingController _textController = TextEditingController();
  final FocusNode _focusNode = FocusNode();

  Timer? _debounceTimer;
  LocationModel? _selectedLocation;
  bool _isOpen = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialLocation != null) {
      _selectedLocation = widget.initialLocation;
      _textController.text = widget.initialLocation!.displayName;
    }

    _focusNode.addListener(() {
      if (_focusNode.hasFocus) {
        if (_textController.text.trim().length >= 2) {
          setState(() => _isOpen = true);
          ref.read(locationSearchNotifierProvider.notifier).search(_textController.text.trim());
        }
      }
    });
  }

  @override
  void didUpdateWidget(covariant LocationAutocompleteField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialLocation != null && widget.initialLocation != oldWidget.initialLocation) {
      _selectedLocation = widget.initialLocation;
      _textController.text = widget.initialLocation!.displayName;
    }
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _textController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onTextChanged(String text) {
    // If text changed after selection, clear selection
    if (_selectedLocation != null && _selectedLocation!.displayName != text) {
      setState(() {
        _selectedLocation = null;
      });
      widget.onLocationSelected(null);
    }

    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 250), () {
      if (text.trim().length >= 2) {
        setState(() => _isOpen = true);
        ref.read(locationSearchNotifierProvider.notifier).search(text.trim());
      } else {
        setState(() => _isOpen = false);
        ref.read(locationSearchNotifierProvider.notifier).clear();
      }
    });
  }

  void _selectLocation(LocationModel location) {
    _debounceTimer?.cancel();
    setState(() {
      _selectedLocation = location;
      _textController.text = location.displayName;
      _isOpen = false;
    });
    _focusNode.unfocus();
    widget.onLocationSelected(location);
  }

  void _clearSelection() {
    _debounceTimer?.cancel();
    setState(() {
      _selectedLocation = null;
      _textController.clear();
      _isOpen = false;
    });
    ref.read(locationSearchNotifierProvider.notifier).clear();
    widget.onLocationSelected(null);
  }

  @override
  Widget build(BuildContext context) {
    final searchState = ref.watch(locationSearchNotifierProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. SEARCH TEXT FIELD
        TextFormField(
          key: const Key('location_search_field'),
          controller: _textController,
          focusNode: _focusNode,
          style: const TextStyle(fontSize: 14, color: AppColors.primary),
          onChanged: _onTextChanged,
          decoration: InputDecoration(
            hintText: 'Search city or place (e.g. Delhi, London)',
            hintStyle: TextStyle(color: AppColors.secondary.withOpacity(0.5)),
            prefixIcon: const Icon(Icons.place_outlined, size: 18, color: AppColors.secondary),
            suffixIcon: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (searchState.isLoading)
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 10),
                    child: SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                    ),
                  )
                else if (_textController.text.isNotEmpty)
                  IconButton(
                    icon: const Icon(Icons.clear, size: 16, color: AppColors.secondary),
                    onPressed: _clearSelection,
                  ),
              ],
            ),
            filled: true,
            fillColor: AppColors.lightBackground,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.lightBorder),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.lightBorder),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
            ),
          ),
          validator: (val) {
            if (val == null || val.trim().isEmpty) {
              return 'Birthplace is required';
            }
            if (_selectedLocation == null) {
              return 'Please select a verified location from the suggestions';
            }
            if (widget.validator != null) {
              return widget.validator!(val);
            }
            return null;
          },
        ),

        // 2. VERIFIED LOCATION BADGE (WHEN SELECTED)
        if (_selectedLocation != null) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.premiumAccent.withOpacity(0.12),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.premiumAccent.withOpacity(0.4)),
            ),
            child: Row(
              children: [
                const Icon(Icons.verified_rounded, size: 14, color: AppColors.primary),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Verified • ${_selectedLocation!.timezone} (${_selectedLocation!.latitude.toStringAsFixed(2)}°, ${_selectedLocation!.longitude.toStringAsFixed(2)}°)',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ],

        // 3. INLINE SUGGESTIONS DROPDOWN (WHEN SEARCHING)
        if (_isOpen && _textController.text.trim().length >= 2) ...[
          const SizedBox(height: 6),
          Container(
            constraints: const BoxConstraints(maxHeight: 240),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.lightBorder),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.08),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: _buildSuggestionsList(searchState),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildSuggestionsList(LocationSearchState state) {
    if (state.isLoading && state.suggestions.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(16.0),
        child: Center(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
              ),
              SizedBox(width: 10),
              Text(
                'Searching places...',
                style: TextStyle(fontSize: 13, color: AppColors.lightTextSecondary),
              ),
            ],
          ),
        ),
      );
    }

    if (state.errorMessage != null && state.suggestions.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(12.0),
        child: Row(
          children: [
            const Icon(Icons.info_outline, size: 16, color: Colors.amber),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                state.errorMessage!,
                style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary),
              ),
            ),
            TextButton(
              onPressed: () {
                ref.read(locationSearchNotifierProvider.notifier).search(_textController.text.trim());
              },
              child: const Text('Retry', style: TextStyle(fontSize: 12)),
            ),
          ],
        ),
      );
    }

    if (state.suggestions.isEmpty && !state.isLoading) {
      return const Padding(
        padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
        child: Row(
          children: [
            Icon(Icons.location_off_outlined, size: 16, color: AppColors.secondary),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'No locations found. Try searching for a nearby major city.',
                style: TextStyle(fontSize: 12, color: AppColors.lightTextSecondary),
              ),
            ),
          ],
        ),
      );
    }

    return Material(
      color: Colors.transparent,
      child: ListView.separated(
        shrinkWrap: true,
        physics: const ClampingScrollPhysics(),
        padding: EdgeInsets.zero,
        itemCount: state.suggestions.length,
        separatorBuilder: (_, __) => const Divider(height: 1, color: AppColors.lightBorder),
        itemBuilder: (context, index) {
          final loc = state.suggestions[index];
          final subtitle = [
            if (loc.state != null && loc.state!.isNotEmpty && loc.state != loc.name) loc.state,
            if (loc.country.isNotEmpty) loc.country,
          ].join(', ');

          return InkWell(
            key: Key('location_item_${loc.id}'),
            onTap: () => _selectLocation(loc),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: Row(
                children: [
                  const Icon(Icons.location_city_rounded, size: 18, color: AppColors.secondary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          loc.name,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                        if (subtitle.isNotEmpty)
                          Text(
                            subtitle,
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppColors.lightTextSecondary,
                            ),
                          ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.lightBackground,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: AppColors.lightBorder),
                    ),
                    child: Text(
                      loc.timezone,
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.lightTextSecondary,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
