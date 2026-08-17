import 'package:flutter/material.dart';
import 'astro_loader/astro_loader.dart';

/// Standard centered loading indicator with message support backed by AstroLoader
class LoadingIndicator extends StatelessWidget {
  final String? message;
  final bool isDark;

  const LoadingIndicator({
    super.key,
    this.message,
    this.isDark = false,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AstroLoader.inline(
        message: message,
        size: 32.0,
        isDark: isDark,
      ),
    );
  }
}

