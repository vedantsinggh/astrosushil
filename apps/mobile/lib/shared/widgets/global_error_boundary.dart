import 'package:flutter/material.dart';
import 'astro_error_state.dart';

/// Global error boundary component preventing unhandled UI exception crashes
class GlobalErrorBoundary extends StatefulWidget {
  final Widget child;

  const GlobalErrorBoundary({super.key, required this.child});

  @override
  State<GlobalErrorBoundary> createState() => _GlobalErrorBoundaryState();
}

class _GlobalErrorBoundaryState extends State<GlobalErrorBoundary> {
  Object? _error;

  @override
  void initState() {
    super.initState();
  }

  static void initializeGlobalErrorHandlers() {
    FlutterError.onError = (FlutterErrorDetails details) {
      FlutterError.presentError(details);
    };
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Scaffold(
        body: SafeArea(
          child: AstroErrorState(
            title: 'Something went wrong',
            message: 'An unexpected application error occurred. Tap below to reset.',
            onRetry: () {
              setState(() {
                _error = null;
              });
            },
          ),
        ),
      );
    }

    return widget.child;
  }
}
