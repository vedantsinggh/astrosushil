import 'package:astro_mobile/features/home_content/widgets/simple_html.dart';
import 'package:flutter_test/flutter_test.dart';

String textOf(HtmlBlock b) => b.spans.map((s) => s.text).join();

void main() {
  test('paragraph with a bold span', () {
    final blocks = parseSimpleHtml('<p>Hi <strong>there</strong></p>');
    expect(blocks, hasLength(1));
    expect(blocks.single.kind, HtmlBlockKind.paragraph);
    expect(textOf(blocks.single), 'Hi there');
    expect(blocks.single.spans.last.bold, isTrue);
    expect(blocks.single.spans.first.bold, isFalse);
  });

  test('list items become bullets, ordered lists are numbered', () {
    final ul = parseSimpleHtml('<ul><li>a</li><li>b</li></ul>');
    expect(ul.map((b) => b.kind), [HtmlBlockKind.bullet, HtmlBlockKind.bullet]);
    expect(ul.map(textOf), ['a', 'b']);
    final ol = parseSimpleHtml('<ol><li>x</li><li>y</li></ol>');
    expect(ol.map((b) => b.number), [1, 2]);
  });

  test('headings keep their level', () {
    final blocks = parseSimpleHtml('<h2>Title</h2><p>Body</p>');
    expect(blocks.first.kind, HtmlBlockKind.heading);
    expect(blocks.first.level, 2);
    expect(textOf(blocks.last), 'Body');
  });

  test('scripts, styles and iframes are dropped with their content', () {
    final blocks = parseSimpleHtml('<script>alert(1)</script><style>p{}</style><iframe src="x">y</iframe><p>x</p>');
    expect(blocks.map(textOf), ['x']);
  });

  test('unknown tags keep their text', () {
    expect(parseSimpleHtml('<custom>text</custom>').map(textOf), ['text']);
  });

  test('empty input gives nothing', () {
    expect(parseSimpleHtml(''), isEmpty);
    expect(parseSimpleHtml('<p> </p>'), isEmpty);
  });

  test('entities are decoded', () {
    expect(textOf(parseSimpleHtml('<p>&amp;&#8217;&lt;&gt;&quot;&#39;&nbsp;&#x2014;</p>').single), '&’<>"\' —');
  });

  test('only https links and images are kept', () {
    final bad = parseSimpleHtml('<p><a href="javascript:x">t</a></p>').single;
    expect(bad.spans.single.href, isNull);
    final good = parseSimpleHtml('<p><a href="https://astrosushil.com">site</a></p>').single;
    expect(good.spans.single.href, 'https://astrosushil.com');
    final images = parseSimpleHtml('<img src="http://x/a.png"><img src="https://x/b.png">');
    expect(images.map((b) => b.imageUrl), ['https://x/b.png']);
  });

  test('br splits a line and blockquote is a quote', () {
    expect(textOf(parseSimpleHtml('<p>a<br>b</p>').single), 'a\nb');
    expect(parseSimpleHtml('<blockquote>wise</blockquote>').single.kind, HtmlBlockKind.quote);
  });

  test('text outside any block is a paragraph', () {
    expect(parseSimpleHtml('loose <em>words</em>').single.spans.last.italic, isTrue);
  });

  test('a table row is one line with its cells separated, empty cells skipped', () {
    const html = '<table><colgroup><col></colgroup><tbody>'
        '<tr><td><p><strong>Your requirement</strong></p></td><td><p><strong>Consultation</strong></p></td><td><p></p></td></tr>'
        '<tr><td><p>Marriage timing</p></td><td><p>Marriage astrology</p></td></tr>'
        '</tbody></table><p>After</p>';
    final blocks = parseSimpleHtml(html);
    expect(blocks.map(textOf), ['Your requirement · Consultation', 'Marriage timing · Marriage astrology', 'After']);
    expect(blocks.first.spans.first.bold, isTrue);
  });
}
