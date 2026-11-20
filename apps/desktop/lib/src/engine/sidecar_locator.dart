import 'dart:io';

import 'package:path/path.dart' as p;

/// How to start the engine sidecar.
class SidecarCommand {
  const SidecarCommand(this.executable, this.arguments, {this.workingDirectory, required this.description});
  final String executable;
  final List<String> arguments;
  final String? workingDirectory;
  final String description;
  @override
  String toString() => description;
}

/// Finds the engine sidecar.
///
/// Order:
/// 1. `ASTRO_ENGINE_SIDECAR` environment variable (path to an executable).
/// 2. Bundled standalone executable shipped next to the app:
///    Linux/Windows `<app dir>/engine/astro-engine-sidecar[.exe]`,
///    macOS `<App>.app/Contents/Resources/engine/astro-engine-sidecar`.
/// 3. Development fallbacks inside the monorepo (`apps/desktop/engine-sidecar`):
///    `dist/astro-engine-sidecar` (SEA build), `node dist/sidecar.cjs`, then `node tsx src/main.ts`.
class SidecarLocator {
  SidecarLocator({Map<String, String>? environment, String? resolvedExecutable, String? currentDirectory, bool Function(String)? fileExists})
      : _env = environment ?? Platform.environment,
        _exe = resolvedExecutable ?? Platform.resolvedExecutable,
        _cwd = currentDirectory ?? Directory.current.path,
        _exists = fileExists ?? ((path) => File(path).existsSync());

  final Map<String, String> _env;
  final String _exe;
  final String _cwd;
  final bool Function(String) _exists;

  static String get exeName => Platform.isWindows ? 'astro-engine-sidecar.exe' : 'astro-engine-sidecar';

  List<String> bundledCandidates() {
    final dir = p.dirname(_exe);
    return [
      p.join(dir, 'engine', exeName),
      p.normalize(p.join(dir, '..', 'Resources', 'engine', exeName)),
    ];
  }

  /// Walks up from [start] looking for `apps/desktop/engine-sidecar` (or `engine-sidecar`).
  String? findSidecarSourceDir(String start) {
    var dir = p.normalize(p.absolute(start));
    for (var i = 0; i < 12; i++) {
      for (final rel in [p.join('apps', 'desktop', 'engine-sidecar'), 'engine-sidecar']) {
        final candidate = p.join(dir, rel);
        if (_exists(p.join(candidate, 'src', 'main.ts'))) return candidate;
      }
      final parent = p.dirname(dir);
      if (parent == dir) break;
      dir = parent;
    }
    return null;
  }

  SidecarCommand? locate() {
    final override = _env['ASTRO_ENGINE_SIDECAR'];
    if (override != null && override.isNotEmpty) {
      return SidecarCommand(override, const [], description: 'ASTRO_ENGINE_SIDECAR=$override');
    }
    for (final c in bundledCandidates()) {
      if (_exists(c)) return SidecarCommand(c, const [], description: 'bundled $c');
    }
    final src = findSidecarSourceDir(_cwd) ?? findSidecarSourceDir(p.dirname(_exe));
    if (src == null) return null;
    final node = _env['ASTRO_NODE'] ?? 'node';
    final sea = p.join(src, 'dist', exeName);
    if (_exists(sea)) return SidecarCommand(sea, const [], workingDirectory: src, description: 'dev SEA $sea');
    final cjs = p.join(src, 'dist', 'sidecar.cjs');
    if (_exists(cjs)) return SidecarCommand(node, [cjs], workingDirectory: src, description: 'dev bundle $cjs');
    final tsx = p.normalize(p.join(src, '..', '..', '..', 'node_modules', 'tsx', 'dist', 'cli.mjs'));
    if (_exists(tsx)) {
      return SidecarCommand(node, [tsx, '--tsconfig', p.join(src, 'tsconfig.dev.json'), p.join(src, 'src', 'main.ts')],
          workingDirectory: src, description: 'dev tsx ${p.join(src, 'src', 'main.ts')}');
    }
    return null;
  }
}
