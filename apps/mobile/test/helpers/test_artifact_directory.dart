import 'dart:io';

/// Creates a unique system temporary directory for generated test artifacts.
Directory createTestArtifactDirectory(String prefix) {
  return Directory.systemTemp.createTempSync('astro-sushil-$prefix-');
}
