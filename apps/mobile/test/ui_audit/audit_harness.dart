// UI audit harness (QA only). Pumps screens across a device / text-scale /
// theme / locale matrix, collects layout exceptions, small tap targets,
// truncated / off-screen text, and writes screenshots + JSON for offline
// contrast analysis. Writes ONLY to the scratchpad output directory.
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:astro_mobile/l10n/app_localizations.dart';
import 'package:astro_mobile/shared/theme/app_theme.dart';

const String _kDefaultAuditOut =
    '/tmp/claude-1000/-home-pilot-Projects-astrosushil/d6ba5a31-03f4-4048-99fe-7b4ab097b4c9/scratchpad/ui-audit';

/// Output directory. Override with the AUDIT_OUT environment variable.
final String kAuditOut = Platform.environment['AUDIT_OUT'] ?? _kDefaultAuditOut;

/// Optional matrix override, e.g. AUDIT_MATRIX="xs320@1.0,p390@1.0,t1024p@2.0".
/// Every override config captures a screenshot.
List<AuditConfig>? _envMatrix() {
  final raw = Platform.environment['AUDIT_MATRIX'];
  if (raw == null || raw.trim().isEmpty) return null;
  return raw.split(',').map((t) {
    final parts = t.trim().split('@');
    return AuditConfig(parts[0],
        scale: parts.length > 1 ? double.parse(parts[1]) : 1.0,
        platform: parts.length > 2 ? parts[2] : 'android',
        shot: true);
  }).toList();
}

/// Optional screen filter, e.g. AUDIT_SCREENS="home,shop_catalog".
Set<String>? _envScreens() {
  final raw = Platform.environment['AUDIT_SCREENS'];
  if (raw == null || raw.trim().isEmpty) return null;
  return raw.split(',').map((e) => e.trim()).toSet();
}

class AuditDevice {
  final String name;
  final double w;
  final double h;
  final double dpr;
  const AuditDevice(this.name, this.w, this.h, this.dpr);
}

const kDevices = <String, AuditDevice>{
  'xs320': AuditDevice('xs320', 320, 568, 2),
  's360': AuditDevice('s360', 360, 640, 3),
  'se375': AuditDevice('se375', 375, 667, 2),
  'p390': AuditDevice('p390', 390, 844, 3),
  'p412': AuditDevice('p412', 412, 915, 2.625),
  'l430': AuditDevice('l430', 430, 932, 3),
  'land640': AuditDevice('land640', 640, 360, 3),
  't600': AuditDevice('t600', 600, 960, 2),
  't800': AuditDevice('t800', 800, 1280, 2),
  't1024p': AuditDevice('t1024p', 1024, 1366, 2),
  't1366l': AuditDevice('t1366l', 1366, 1024, 2),
  'tall390': AuditDevice('tall390', 390, 2600, 2),
  'tall320': AuditDevice('tall320', 320, 2600, 2),
};

class AuditConfig {
  final String device;
  final double scale;
  final bool dark;
  final String locale;
  final bool shot;

  /// 'android' (default) or 'ios'. Sets the theme / default target platform.
  final String platform;
  const AuditConfig(this.device,
      {this.scale = 1.0, this.dark = false, this.locale = 'en', this.shot = false, this.platform = 'android'});

  String get id =>
      '${device}_x${scale.toStringAsFixed(1)}_${dark ? 'dark' : 'light'}_$locale${platform == 'ios' ? '_ios' : ''}';
}

/// Full matrix for primary screens.
const kFullMatrix = <AuditConfig>[
  AuditConfig('p390', shot: true),
  AuditConfig('xs320', shot: true),
  AuditConfig('s360'),
  AuditConfig('se375'),
  AuditConfig('p412'),
  AuditConfig('l430'),
  AuditConfig('land640', shot: true),
  AuditConfig('t600'),
  AuditConfig('t800', shot: true),
  AuditConfig('t1024p'),
  AuditConfig('t1366l', shot: true),
  AuditConfig('s360', scale: 1.3, shot: true),
  AuditConfig('s360', scale: 2.0, shot: true),
  AuditConfig('p390', scale: 1.3),
  AuditConfig('p390', scale: 2.0),
  AuditConfig('xs320', scale: 1.3),
  AuditConfig('xs320', scale: 2.0),
  AuditConfig('p390', dark: true, shot: true),
  AuditConfig('s360', locale: 'hi', shot: true),
  AuditConfig('s360', locale: 'hi', scale: 1.3),
  AuditConfig('xs320', locale: 'hi', scale: 2.0),
  AuditConfig('tall390', shot: true),
  AuditConfig('tall320', scale: 1.3, shot: true),
];

/// Reduced matrix for edge-case variants (long data / empty / error).
const kLiteMatrix = <AuditConfig>[
  AuditConfig('xs320', shot: true),
  AuditConfig('p390', shot: true),
  AuditConfig('s360', scale: 1.3, shot: true),
  AuditConfig('s360', scale: 2.0),
  AuditConfig('s360', locale: 'hi', shot: true),
  AuditConfig('t800'),
  AuditConfig('tall320', scale: 1.3, shot: true),
];

bool _fontsLoaded = false;

/// Family name the harness registers Noto Sans Devanagari under (loaded at
/// runtime from the system font directory; nothing is copied into the repo).
const String kAuditDevanagariFamily = 'AuditNotoSansDevanagari';

/// Whether a system Noto Sans Devanagari was found and loaded.
bool auditDevanagariLoaded = false;

/// On a device the OS falls back to a Devanagari font for any style; the
/// test engine has no system fallback, so text whose style names no
/// Devanagari-capable family (theme defaults: 'Roboto' on Android,
/// 'CupertinoSystemText' on iOS) renders as boxes. Append the system Noto
/// Sans Devanagari to every theme text style's fallback list to mimic the
/// device. Existing fallbacks are kept (and come first).
TextStyle? _withDeva(TextStyle? s) =>
    s?.copyWith(fontFamilyFallback: [...?s.fontFamilyFallback, kAuditDevanagariFamily]);

TextTheme _devaTextTheme(TextTheme t) => TextTheme(
      displayLarge: _withDeva(t.displayLarge),
      displayMedium: _withDeva(t.displayMedium),
      displaySmall: _withDeva(t.displaySmall),
      headlineLarge: _withDeva(t.headlineLarge),
      headlineMedium: _withDeva(t.headlineMedium),
      headlineSmall: _withDeva(t.headlineSmall),
      titleLarge: _withDeva(t.titleLarge),
      titleMedium: _withDeva(t.titleMedium),
      titleSmall: _withDeva(t.titleSmall),
      bodyLarge: _withDeva(t.bodyLarge),
      bodyMedium: _withDeva(t.bodyMedium),
      bodySmall: _withDeva(t.bodySmall),
      labelLarge: _withDeva(t.labelLarge),
      labelMedium: _withDeva(t.labelMedium),
      labelSmall: _withDeva(t.labelSmall),
    );

ThemeData _withDevanagariFallback(ThemeData theme) {
  if (!auditDevanagariLoaded) return theme;
  return theme.copyWith(
    textTheme: _devaTextTheme(theme.textTheme),
    primaryTextTheme: _devaTextTheme(theme.primaryTextTheme),
    chipTheme: theme.chipTheme.copyWith(
      labelStyle: _withDeva(theme.chipTheme.labelStyle ?? theme.textTheme.labelLarge),
      secondaryLabelStyle: _withDeva(theme.chipTheme.secondaryLabelStyle ?? theme.textTheme.labelLarge),
    ),
  );
}

Future<void> _loadFamily(String family, List<String> paths) async {
  final loader = FontLoader(family);
  for (final p in paths) {
    final f = File(p);
    if (!f.existsSync()) continue;
    loader.addFont(Future.value(ByteData.view(Uint8List.fromList(f.readAsBytesSync()).buffer)));
  }
  await loader.load();
}

/// Loads real fonts so screenshots show real text metrics.
/// Production does NOT bundle 'Outfit'/'Philosopher' (pubspec has no fonts:)
/// so a real Android device falls back to Roboto / Noto Serif. We mimic that:
/// 'Roboto' + 'sans-serif' -> Roboto/Noto Devanagari, 'serif'/'Georgia' -> Noto Serif.
Future<void> loadAuditFonts() async {
  if (_fontsLoaded) return;
  _fontsLoaded = true;
  const mf = '/home/pilot/develop/flutter/bin/cache/artifacts/material_fonts';
  const noto = '/usr/share/fonts/truetype/noto';
  final roboto = [
    '$mf/Roboto-Regular.ttf',
    '$mf/Roboto-Medium.ttf',
    '$mf/Roboto-Bold.ttf',
    '$mf/Roboto-Light.ttf',
    '$mf/Roboto-Black.ttf',
    '$mf/Roboto-Italic.ttf',
  ];
  final devaSans = [
    '$noto/NotoSansDevanagari-Regular.ttf',
    '$noto/NotoSansDevanagari-Medium.ttf',
    '$noto/NotoSansDevanagari-SemiBold.ttf',
    '$noto/NotoSansDevanagari-Bold.ttf',
  ];
  final devaSerif = [
    '$noto/NotoSerifDevanagari-Regular.ttf',
    '$noto/NotoSerifDevanagari-Bold.ttf',
  ];
  final serif = ['$noto/NotoSerif-Regular.ttf', '$noto/NotoSerif-Bold.ttf'];
  if (devaSans.any((p) => File(p).existsSync())) {
    await _loadFamily(kAuditDevanagariFamily, devaSans);
    auditDevanagariLoaded = true;
  }
  await _loadFamily('Roboto', roboto);
  await _loadFamily('Outfit', roboto);
  await _loadFamily('Philosopher', serif);
  await _loadFamily('sans-serif', devaSans);
  await _loadFamily('Georgia', serif);
  await _loadFamily('serif', devaSerif);
  await _loadFamily('MaterialIcons', ['$mf/MaterialIcons-Regular.otf']);
  // iOS system font names used by the iOS typography (SF on a real device).
  for (final fam in ['CupertinoSystemText', 'CupertinoSystemDisplay', '.SF UI Text', '.SF UI Display', '.SF Pro Text', '.SF Pro Display']) {
    await _loadFamily(fam, roboto);
  }
}

class AuditCase {
  final String screen;
  final Widget Function() build;
  final List<Override> Function() overrides;
  final List<AuditConfig> matrix;
  final Future<void> Function(WidgetTester tester)? interact;
  const AuditCase(this.screen, this.build, {required this.overrides, this.matrix = kFullMatrix, this.interact});
}

final _overflowLoc = RegExp(r'(lib/[A-Za-z0-9_/]+\.dart):(\d+):(\d+)');

String _shortLoc(String s) {
  final all = _overflowLoc.allMatches(s).map((m) => '${m.group(1)}:${m.group(2)}').toList();
  return all.isEmpty ? '' : all.first;
}

Map<String, dynamic> _rectJson(Rect r) => {
      'l': double.parse(r.left.toStringAsFixed(1)),
      't': double.parse(r.top.toStringAsFixed(1)),
      'w': double.parse(r.width.toStringAsFixed(1)),
      'h': double.parse(r.height.toStringAsFixed(1)),
    };

String _hex(Color? c) {
  if (c == null) return '';
  // ignore: deprecated_member_use
  return '#${c.value.toRadixString(16).padLeft(8, '0')}';
}

bool _hiddenByAncestor(RenderObject ro) {
  RenderObject? child = ro;
  RenderObject? p = ro.parent;
  while (p != null) {
    if (p is RenderOffstage && p.offstage) return true;
    if (p is RenderOpacity && p.opacity == 0) return true;
    if (p is RenderAnimatedOpacity && p.opacity.value == 0) return true;
    if (p is RenderIndexedStack) {
      final idx = p.index;
      int i = 0;
      RenderBox? c = p.firstChild;
      while (c != null) {
        if (identical(c, child)) {
          if (i != idx) return true;
          break;
        }
        i++;
        c = (c.parentData as StackParentData).nextSibling;
      }
    }
    child = p;
    p = p.parent;
  }
  return false;
}

Color _over(Color top, Color bottom) {
  final a = top.a;
  return Color.from(
    alpha: 1,
    red: top.r * a + bottom.r * (1 - a),
    green: top.g * a + bottom.g * (1 - a),
    blue: top.b * a + bottom.b * (1 - a),
  );
}

List<Color>? _decorationColors(Decoration? d) {
  if (d is BoxDecoration) {
    if (d.gradient != null) return d.gradient!.colors;
    if (d.color != null) return [d.color!];
  } else if (d is ShapeDecoration) {
    if (d.gradient != null) return d.gradient!.colors;
    if (d.color != null) return [d.color!];
  }
  return null;
}

/// Resolves the background(s) painted behind a paragraph by walking the widget
/// ancestors (DecoratedBox / Ink / ColoredBox / Material / PhysicalModel) and
/// compositing translucent layers until an opaque one is found. Gradients yield
/// one colour per stop (worst case is what matters). Backgrounds painted by
/// Stack siblings or images are not detected; confirm findings on screenshots.
List<Color> structuralBackgrounds(RenderObject ro) {
  final creator = ro.debugCreator;
  if (creator is! DebugCreator) return const [];
  final layers = <List<Color>>[];
  bool opaque(List<Color> cs) => cs.every((c) => c.a >= 0.999);
  void add(List<Color>? cs) {
    if (cs == null || cs.isEmpty) return;
    if (layers.isNotEmpty && opaque(layers.last)) return;
    layers.add(cs);
  }

  creator.element.visitAncestorElements((a) {
    final w = a.widget;
    if (w is DecoratedBox && w.position == DecorationPosition.background) {
      add(_decorationColors(w.decoration));
    } else if (w is Ink) {
      add(_decorationColors(w.decoration));
    } else if (w is ColoredBox) {
      add([w.color]);
    } else if (w is Material && w.type != MaterialType.transparency) {
      final c = w.color ?? Theme.of(a).colorScheme.surface;
      add([c]);
    } else if (w is PhysicalModel) {
      add([w.color]);
    } else if (w is PhysicalShape) {
      add([w.color]);
    }
    return layers.isEmpty || !opaque(layers.last);
  });
  var result = <Color>[const Color(0xFFFAF7F2)];
  for (final layer in layers.reversed) {
    result = [
      for (final top in layer)
        for (final b in result) _over(top, b)
    ];
  }
  return result.take(6).toList();
}

bool _inHorizontalScroll(RenderObject ro) {
  RenderObject? p = ro.parent;
  while (p != null) {
    if (p is RenderViewportBase && (p.axis == Axis.horizontal)) return true;
    p = p.parent;
  }
  return false;
}

Rect? _globalRect(RenderBox b) {
  if (!b.hasSize || !b.attached) return null;
  try {
    final t = b.getTransformTo(null);
    return MatrixUtils.transformRect(t, Offset.zero & b.size);
  } catch (_) {
    return null;
  }
}

void _collectSpans(InlineSpan span, TextStyle? inherited, List<Map<String, dynamic>> out) {
  if (span is TextSpan) {
    final style = inherited == null ? span.style : inherited.merge(span.style);
    if ((span.text ?? '').trim().isNotEmpty) {
      out.add({
        'text': span.text,
        'color': _hex(style?.color ?? style?.foreground?.color),
        'size': style?.fontSize,
        'weight': style?.fontWeight?.value,
      });
    }
    for (final c in span.children ?? const <InlineSpan>[]) {
      _collectSpans(c, style, out);
    }
  }
}

String _labelFor(Element e) {
  String? label;
  void visit(Element el) {
    if (label != null) return;
    final w = el.widget;
    if (w is Text) label = w.data ?? w.textSpan?.toPlainText();
    if (w is Icon && w.icon != null) label = 'icon:${w.icon!.codePoint.toRadixString(16)}';
    if (w is Tooltip) label = 'tooltip:${w.message}';
    el.visitChildren(visit);
  }

  visit(e);
  return label ?? '';
}

String _creatorLoc(Element e) {
  // Walk up to the first ancestor widget defined in lib/ (debug creation locations unavailable
  // in tests without --track-widget-creation); fall back to widget type chain.
  final chain = <String>[];
  e.visitAncestorElements((a) {
    final t = a.widget.runtimeType.toString();
    if (!t.startsWith('_') && chain.length < 6) chain.add(t);
    return chain.length < 6;
  });
  return chain.join('<');
}

/// Runs a single audit case/config. Never fails the test for UI findings;
/// everything is recorded to JSONL.
Future<void> runAudit(WidgetTester tester, AuditCase c, AuditConfig cfg) async {
  await tester.runAsync(loadAuditFonts);
  final dev = kDevices[cfg.device]!;
  tester.view.physicalSize = Size(dev.w * dev.dpr, dev.h * dev.dpr);
  tester.view.devicePixelRatio = dev.dpr;
  tester.platformDispatcher.textScaleFactorTestValue = cfg.scale;
  final boundaryKey = GlobalKey();

  final errors = <List<String>>[];
  final original = FlutterError.onError;
  FlutterError.onError = (d) {
    String full;
    try {
      full = d.toString();
    } catch (_) {
      full = d.exceptionAsString();
    }
    errors.add([d.exceptionAsString(), full]);
  };
  final record = <String, dynamic>{
    'screen': c.screen,
    'cfg': cfg.id,
    'device': cfg.device,
    'w': dev.w,
    'h': dev.h,
    'scale': cfg.scale,
    'dark': cfg.dark,
    'locale': cfg.locale,
  };
  final exceptions = <String>[];
  final isIos = cfg.platform == 'ios';
  debugDefaultTargetPlatformOverride = isIos ? TargetPlatform.iOS : TargetPlatform.android;
  // AUDIT_PUSHED=1 pushes the screen over a blank route so back buttons show.
  final pushed = Platform.environment['AUDIT_PUSHED'] == '1';
  try {
    await tester.pumpWidget(
      RepaintBoundary(
        key: boundaryKey,
        child: ProviderScope(
          overrides: c.overrides(),
          child: MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: _withDevanagariFallback((cfg.dark ? AppTheme.darkTheme : AppTheme.lightTheme)
                .copyWith(platform: isIos ? TargetPlatform.iOS : TargetPlatform.android)),
            // Same fallback for text outside any Material (plain Text under
            // WidgetsApp's default style).
            builder: auditDevanagariLoaded
                ? (context, child) => DefaultTextStyle.merge(
                      style: const TextStyle(fontFamilyFallback: [kAuditDevanagariFamily]),
                      child: child ?? const SizedBox.shrink(),
                    )
                : null,
            scrollBehavior: const AstroScrollBehavior(),
            locale: Locale(cfg.locale),
            localizationsDelegates: const [
              AppLocalizations.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: AppLocalizations.supportedLocales,
            home: pushed ? null : c.build(),
            onGenerateRoute: pushed ? (_) => MaterialPageRoute<void>(builder: (_) => c.build()) : null,
            onGenerateInitialRoutes: pushed
                ? (_) => [
                      MaterialPageRoute<void>(builder: (_) => const Scaffold(body: SizedBox())),
                      MaterialPageRoute<void>(builder: (_) => c.build()),
                    ]
                : null,
          ),
        ),
      ),
    );
    for (var i = 0; i < 12; i++) {
      await tester.pump(const Duration(milliseconds: 100));
    }
    if (c.interact != null) {
      try {
        await c.interact!(tester);
      } catch (e) {
        exceptions.add('interact failed: ${e.toString().split('\n').first}');
      }
      for (var i = 0; i < 8; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
    }

    final screenRect = Offset.zero & Size(dev.w, dev.h);
    final root = boundaryKey.currentContext!.findRenderObject()!;

    // ---- Text scan
    final paragraphs = <Map<String, dynamic>>[];
    final truncated = <Map<String, dynamic>>[];
    final offscreen = <Map<String, dynamic>>[];
    void visitRo(RenderObject ro) {
      if (ro is RenderParagraph) {
        final r = _globalRect(ro);
        if (r != null && r.overlaps(screenRect) && !_hiddenByAncestor(ro)) {
          final spans = <Map<String, dynamic>>[];
          _collectSpans(ro.text, null, spans);
          final text = ro.text.toPlainText();
          if (text.trim().isNotEmpty) {
            final entry = {
              'text': text.length > 80 ? '${text.substring(0, 80)}…' : text,
              'r': _rectJson(r),
              'spans': spans,
              'bg': structuralBackgrounds(ro).map(_hex).toList(),
            };
            paragraphs.add(entry);
            if (ro.didExceedMaxLines) truncated.add(entry);
            if ((r.right > dev.w + 1 || r.left < -1) && !_inHorizontalScroll(ro)) offscreen.add(entry);
          }
        }
      }
      ro.visitChildren(visitRo);
    }

    visitRo(root);

    // ---- Tap targets
    final small = <Map<String, dynamic>>[];
    final seen = <String>{};
    final tappables = find.byWidgetPredicate((w) {
      if (w is InkResponse) return w.onTap != null || w.onLongPress != null;
      if (w is GestureDetector) return w.onTap != null;
      if (w is IconButton) return w.onPressed != null;
      if (w is ButtonStyleButton) return w.onPressed != null;
      if (w is Checkbox || w is Switch || w is Radio) return true;
      return false;
    });
    for (final el in tappables.evaluate()) {
      final ro = el.renderObject;
      if (ro is! RenderBox) continue;
      if (_hiddenByAncestor(ro)) continue;
      final r = _globalRect(ro);
      if (r == null || !r.overlaps(screenRect) || r.width <= 0 || r.height <= 0) continue;
      final key = '${r.left.round()},${r.top.round()},${r.width.round()},${r.height.round()}';
      if (seen.contains(key)) continue;
      seen.add(key);
      // Platform minimum: 44pt on iOS (HIG), 48dp on Android (Material).
      final minTarget = isIos ? 44.0 : 48.0;
      if (r.width < minTarget - 0.5 || r.height < minTarget - 0.5) {
        small.add({
          'type': el.widget.runtimeType.toString(),
          'label': _labelFor(el),
          'r': _rectJson(r),
          'ancestors': _creatorLoc(el),
        });
      }
    }

    record['paragraphCount'] = paragraphs.length;
    record['truncated'] = truncated;
    record['offscreen'] = offscreen;
    record['smallTargets'] = small;

    if (cfg.shot) {
      final name = '${c.screen}__${cfg.id}';
      final pr = dev.w > 700 ? 1.0 : (dev.h > 2000 ? 1.0 : 2.0);
      await tester.runAsync(() async {
        final boundary = root as RenderRepaintBoundary;
        final ui.Image image = await boundary.toImage(pixelRatio: pr);
        final bd = await image.toByteData(format: ui.ImageByteFormat.png);
        if (bd != null) {
          File('$kAuditOut/shots/$name.png').writeAsBytesSync(bd.buffer.asUint8List());
        }
      });
      File('$kAuditOut/json/$name.json').writeAsStringSync(jsonEncode({
        'screen': c.screen,
        'cfg': cfg.id,
        'w': dev.w,
        'h': dev.h,
        'pixelRatio': pr,
        'paragraphs': paragraphs,
      }));
      record['shot'] = 'shots/$name.png';
    }
  } catch (e, st) {
    exceptions.add('harness: ${e.toString().split('\n').first} ${st.toString().split('\n').take(3).join(' | ')}');
  } finally {
    FlutterError.onError = original;
  }

  // Dispose the tree so timers/animations stop.
  try {
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(seconds: 2));
  } catch (_) {}
  Object? ex;
  while ((ex = tester.takeException()) != null) {
    exceptions.add('uncaught: ${ex.toString().split('\n').first}');
  }
  debugDefaultTargetPlatformOverride = null;

  final overflows = <Map<String, dynamic>>[];
  for (final d in errors) {
    final s = d[0];
    final full = d[1];
    final first = s.split('\n').first;
    if (first.contains('overflowed')) {
      overflows.add({'msg': first, 'loc': _shortLoc(full), 'widget': _overflowWidget(full)});
    } else {
      exceptions.add('${first.length > 200 ? first.substring(0, 200) : first} @ ${_shortLoc(full)}');
    }
  }
  record['overflows'] = overflows;
  record['exceptions'] = exceptions;

  File('$kAuditOut/logs/results.jsonl').writeAsStringSync('${jsonEncode(record)}\n', mode: FileMode.append, flush: true);

  tester.platformDispatcher.clearTextScaleFactorTestValue();
  tester.view.resetPhysicalSize();
  tester.view.resetDevicePixelRatio();
}

String _overflowWidget(String full) {
  final m = RegExp(r'The relevant error-causing widget was:\s*\n\s*([^\n]+)').firstMatch(full);
  if (m != null) return m.group(1)!.trim();
  final m2 = RegExp(r'The overflowing (Render\w+)').firstMatch(full);
  return m2?.group(1) ?? '';
}

void registerAuditCases(String group, List<AuditCase> cases) {
  final envMatrix = _envMatrix();
  final envScreens = _envScreens();
  for (final c in cases) {
    if (envScreens != null && !envScreens.contains(c.screen)) continue;
    for (final cfg in envMatrix ?? c.matrix) {
      testWidgets('$group ${c.screen} ${cfg.id}', (tester) async {
        await runAudit(tester, c, cfg);
      });
    }
  }
}

// Silence unused import warning in some analyzers.
// ignore: unused_element
const _kDebug = kDebugMode;
