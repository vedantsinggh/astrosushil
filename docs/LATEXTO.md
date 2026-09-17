# LaTeX.to CLI Compilation Architecture

## 1. Executive Summary & Rationale

The **Astro Sushil** career report pipeline uses **LaTeX.to CLI** (`npx latexto pdf`) to compile 50–75 page personalized career reports directly on local development machines without installing TeX Live or XeLaTeX on the host operating system.

LaTeX.to runs a WebAssembly-compiled TeX environment inside a Chromium headless browser context, supporting complete multi-file projects, custom fonts (`fontspec`), and the `xelatex` engine.

---

## 2. Architecture & Data Flow

```
Android Mobile App / Admin Portal
       │
       ▼ (HTTPS via Cloudflare Tunnel)
 Fastify API Backend (Linux Machine)
       │
       ▼ (BullMQ Queue / Redis)
 Career Report Worker (worker.ts)
       │
       ├─► 1. Astrology Engine (Deterministic Chart Calculation)
       ├─► 2. Prediction Engine (Rule-based Evidence + OpenRouter / LLM)
       ├─► 3. Report Engine (Generates report_data.tex)
       │
       ▼
 LatexCompiler Abstraction (latexCompiler)
       │
       ▼
 LatextoCompiler (latexto-compiler.ts)
       │ (Spawns: npx latexto pdf <project-dir> --main main.tex --engine xelatex)
       ▼
 LaTeX.to WebAssembly XeLaTeX Environment
       │
       ▼ (Generates main.pdf in project directory)
 Validate PDF Header, EOF, Page Count & QA Placeholders
       │
       ▼
 Cloudflare R2 Object Storage
       │
       ▼
 PostgreSQL DB Status Update (`COMPLETED`)
```

---

## 3. Environment Variable Configuration

```env
# Compiler Provider Selector: 'latexto' (default) or 'local' (offline XeLaTeX binary)
LATEX_COMPILER=latexto
```

---

## 4. Isolated Project Directory Structure

For each report compilation request, `LatextoCompiler` creates an isolated directory at `/tmp/astro-sushil/reports/career-report-{reportId}`:

```
/tmp/astro-sushil/reports/career-report-{reportId}/
├── main.tex                 # Visual master template (XeLaTeX + fontspec)
├── report_data.tex          # Generated client astrology & interpretation macros
├── assets/                  # Logos and binary image assets
```

---

## 5. Execution Command & Process Security

`LatextoCompiler` spawns `npx` with safe argument arrays (avoiding shell string concatenation):

```bash
npx latexto pdf /tmp/astro-sushil/reports/career-report-{reportId} --main main.tex --engine xelatex
```

- **Engine**: `xelatex` (Required for `fontspec` and OpenType fonts: TeX Gyre Pagella, Open Sans, Libre Bodoni).
- **Timeout**: 180,000ms (3 minutes) to allow WebAssembly package streaming and caching on first run.

---

## 6. PDF Quality Assurance & Validation

After compilation, the output PDF is validated:
1. Binary header check (`%PDF-`).
2. Page count verification (50–75 pages expected for full report).
3. QA Placeholder checks (`Valued Client`, `Not supplied`, `TODO`, `Lorem ipsum`, `Personalized interpretation unavailable`, etc.).

If validation succeeds, the PDF is uploaded to Cloudflare R2 and deleted from local `/tmp` disk storage.

---

## 7. Troubleshooting & Diagnostics

- `LATEX_ENGINE_UNAVAILABLE`: LaTeX.to CLI or Chromium environment missing.
- `LATEX_COMPILATION_FAILED`: TeX source error or CLI execution failure.
- `LATEX_PDF_NOT_FOUND`: Output PDF was not produced.
- `LATEX_PDF_VALIDATION_FAILED`: Generated PDF failed QA checks.
