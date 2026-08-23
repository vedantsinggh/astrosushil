import 'package:flutter/material.dart';

/// Subtle banner indicating that displayed content is loaded from local cache
class AstroStaleDataBanner extends StatelessWidget {
  final String ageText;
  final VoidCallback? onRefresh;

  const AstroStaleDataBanner({
    super.key,
    required this.ageText,
    this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF9F6EE),
        border: Border(
          bottom: BorderSide(
            color: const Color(0xFFD9B13B).withOpacity(0.3),
            width: 1,
          ),
        ),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.cloud_off_rounded,
            size: 16,
            color: Color(0xFF61568C),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Saved version • Updated $ageText',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: Color(0xFF61568C),
              ),
            ),
          ),
          if (onRefresh != null)
            GestureDetector(
              onTap: onRefresh,
              child: const Text(
                'Refresh',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF121440),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
