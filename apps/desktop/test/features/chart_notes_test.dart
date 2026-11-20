import 'package:astro_desktop/features/chart_notes/chart_notes_panel.dart';
import 'package:astro_desktop/src/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget host(Widget child) => MaterialApp(theme: buildDesktopTheme(), home: Scaffold(body: child));

void main() {
  test('wordCount', () {
    expect(wordCount(''), 0);
    expect(wordCount('   \n '), 0);
    expect(wordCount('one'), 1);
    expect(wordCount(' two  words\nand\tmore '), 4);
  });

  testWidgets('shows notes, counts words and debounces onChanged', (tester) async {
    final sent = <String>[];
    await tester.pumpWidget(host(ChartNotesPanel(notes: 'Initial note', onChanged: sent.add)));
    expect(find.text('Initial note'), findsOneWidget);
    expect(find.text('2 words · 12 characters'), findsOneWidget);
    expect(find.text('Saved in the chart file'), findsOneWidget);

    await tester.enterText(find.byKey(const ValueKey('chart-notes-editor')), 'Rectified to 14:31');
    await tester.pump(const Duration(milliseconds: 300));
    expect(sent, isEmpty); // still within the debounce window
    expect(find.text('Editing…'), findsOneWidget);
    await tester.enterText(find.byKey(const ValueKey('chart-notes-editor')), 'Rectified to 14:31 IST');
    await tester.pump(const Duration(milliseconds: 300));
    expect(sent, isEmpty);
    await tester.pump(const Duration(milliseconds: 400));
    expect(sent, ['Rectified to 14:31 IST']);
    expect(find.text('4 words · 22 characters'), findsOneWidget);
    expect(find.text('Editing…'), findsNothing);
  });

  testWidgets('flushes unsent edits on dispose and follows external notes', (tester) async {
    final sent = <String>[];
    await tester.pumpWidget(host(ChartNotesPanel(notes: 'A', onChanged: sent.add)));
    await tester.pumpWidget(host(ChartNotesPanel(notes: 'Other chart', onChanged: sent.add)));
    expect(find.text('Other chart'), findsOneWidget);
    expect(sent, isEmpty);
    await tester.enterText(find.byKey(const ValueKey('chart-notes-editor')), 'Unsaved typing');
    await tester.pumpWidget(host(const SizedBox()));
    await tester.pump();
    expect(sent, ['Unsaved typing']);
  });
}
