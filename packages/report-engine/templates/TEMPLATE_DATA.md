# Astro Sushil LaTeX data interface

`main.tex` is the presentation template. It owns the page design, editorial text,
tables, diagrams, colors, typography and reusable rendering macros. It loads exactly
one generated data file:

```tex
\input{report_data.tex}
```

`report_data.tex` is the client-specific data layer. The checked-in version is an
example that reproduces the original unavailable-data demonstration without inventing
a birth chart. In production, the report generator replaces this file.

## Status and missing data

Values can use `\RenderVerified{...}`, `\RenderDerived{...}` or
`\RenderUnavailable{...}`. Evidence labels use `\VerifiedStatus`,
`\DerivedStatus` or `\UnavailableStatus`. Missing chart or Dasha values must remain
unavailable; they must never be replaced with inferred calculations.

## Data categories

The generated file supplies:

- client and report record fields;
- calculation configuration and chart status;
- Ascendant and Ascendant-lord fields;
- 2nd, 5th, 6th, 9th, 10th, 11th and 12th-house fields;
- Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu and Ketu fields;
- Vimshottari Dasha, timing and outlook fields;
- career synthesis, aptitudes, work mode, fields, money, relationships, growth,
  recommendations and action-plan fields.

The complete macro names and schema helpers are documented directly in
`report_data.tex`.

## Escaping generated text

The generator must escape LaTeX-reserved characters before writing values:

| Input | Generated TeX |
|---|---|
| `%` | `\%` |
| `&` | `\&` |
| `#` | `\#` |
| `_` | `\_` |
| `{` | `\{` |
| `}` | `\}` |
| backslash | `\textbackslash{}` |

Use `\textdegree{}` for degree symbols when pdfLaTeX compatibility is required.
Generated values must have balanced braces and must not contain application logic or
astrology calculations.

## Compilation

The template supports either:

```sh
pdflatex main.tex
pdflatex main.tex
pdflatex main.tex
```

or, for the premium OpenType font configuration:

```sh
xelatex main.tex
xelatex main.tex
xelatex main.tex
```

Multiple passes populate the table of contents and PDF bookmarks.
