# Reference Forensics: "Baby Name Report.pdf"

Source: `docs/referencerepots/Baby Name Report.pdf`. I extracted the text with `pdftotext -layout` and rendered every page at 40–60 dpi to look at it.

## 1. Identity

| Item | Value |
|---|---|
| Title | "Baby Name Report" (cover p1) |
| Pages | 15 (A4, 596x842 pt) |
| Producer | Skia/PDF m149 **Google Docs Renderer**. The report was hand-assembled in Google Docs and is not a templated HTML render like the other three. |
| Fonts | Calibri, Calibri-Bold/Italic, Times New Roman, Arial Bold |
| Language | English only. There is no Devanagari. |
| Scanned/image-only? | No. Every content page has a text layer. The cover p1 is a full-bleed image with the title only. The name-grid tables are real text tables. |
| Brand/author | "ASTRO ARUN PANDIT" signs p3 and p15. This is a third-party brand, not Astro Sushil. |
| Sample client (reference data) | Order ID `ORD-eHSW2Zb2TY`; Guardian first name **Puneet**, surname **Kumar**; Baby DOB **08/01/2021**, gender **Male**, time **6:18 PM**, place **Pinjore** (p4) |

## 2. Section inventory (ordered)

| # | Page | Heading (as printed) | Topics |
|---|---|---|---|
| 1 | 1 | Cover "Baby Name Report" | Watercolour image of a baby inside a cosmic bubble, Pisces and Taurus constellation doodles. The client name is not printed. |
| 2 | 2 | DISCLAIMER: | Numerology framed as a "pseudoscience"; no legal or scientific validity; the parents are responsible for the choice; this is not professional advice (4 paragraphs, red text) |
| 3 | 3 | MESSAGE FROM AUTHOR | "five years… baby naming" narrative; signed "Sincerely, ASTRO ARUN PANDIT" (6 paragraphs, red text) |
| 4 | 4 | YOUR DETAILS | 2-column table: Order ID, Guardian's first name, Guardian's surname, Baby's DOB, gender, time of birth, place of birth |
| 5 | 5–6 | WHY NAME IS IMPORTANT | Intro to numerology. "Name significance in numerology:" has 4 numbered points (Personal vibrations / Expression or Destiny Number; Life path and destiny; Self-identity; Interpersonal relationships). "Why name correction is important in numerology" has 4 numbered points (Aligning with destiny; Boosting confidence; Improving relationships; Personal growth and success) plus a conclusion. |
| 6 | 7 | SUGGESTION OF YOUR NAME | 3 names, each with a one-line meaning and one paragraph of personality: **Tegbir** ("Brave, warrior", Punjabi), **Raghu** ("Swift, fast, quick"), **Ramith** ("Pleasing, delightful") |
| 7 | 8 | YOUR DETAILS (a second page with the same title) | A 3x3 Lo Shu-style grid built from the DOB, with only 4 cells filled: top-right "22", centre "5", bottom-left "8", bottom-middle "11". There is no explanatory text. |
| 8 | 9–10 | NAME GRID FOR SUGGESTION 1 (Tegbir) | Planes-of-expression letter grid, then "Knowledge plane: 1", "Strength plane: 1", "Emotions plane: 4", "Spiritual plane: 0", each with one paragraph |
| 9 | 11–12 | NAME GRID FOR SUGGESTION 2 (Raghu) | Same structure: Knowledge 3, Strength 0, Emotions 1, Spiritual 1 |
| 10 | 13–14 | NAME GRID FOR SUGGESTION 3 (Ramith) | Same structure: Knowledge 2, Strength 1, Emotions 3, Spiritual 0 |
| 11 | 15 | (closing, untitled) | "Thank you for entrusting us…", signed "With heartfelt best wishes, Astro Arun Pandit" |

That is **11 sections** and about **25 topics/sub-items**.

## 3. Tables, charts, visuals

- **Tables**
  - p4: details table, 2 columns (label | value), 7 rows, gold border and cream fill.
  - p8: 3x3 numeric grid (Lo Shu). Cell positions follow the Lo Shu layout 4-9-2 / 3-5-7 / 8-1-6. The "2" cell shows "22" and the "1" cell shows "11", so repeated digits are written repeatedly. DOB digits 0,8,0,1,2,0,2,1 give 1x2, 2x2 and 8x1, and zeros are ignored. The "5" in the centre is **not** in the DOB. It equals the Bhagyank (0+8+0+1+2+0+2+1 = 14 → 5). Mulank (day 08 → 8) does not appear twice. **The rule for adding driver/conductor numbers is ambiguous and needs clarification.**
  - p9/11/13: "Name grid" tables with 4 columns (KNOWLEDGE, STRENGTH, EMOTIONS, SPIRITUAL), 3 rows of letter buckets with per-letter counts in parentheses, and a total row. The letter groups are reproduced exactly from the PDF:
    - Knowledge: A | H J N P | G L
    - Strength: E | W | D M
    - Emotions: O R I | B S T | X
    - Spiritual: K | F Q U Y | Z C V

    Each plane total is the count of the name's letters in that group. For example, TEGBIR gives K=1 (G), S=1 (E), E=4 (R, I, B, T), Sp=0.
- **Astrological charts:** none. There is no birth chart, nakshatra or rashi, even though time and place were collected.
- **Visuals:** a full-bleed cover illustration. Content pages use a cream/yellow background with faint baby motifs (bottle, rattle, rocking horse, stars) and orange dashed wave curves at the corners. There is no logo and no author photo.

## 4. Required data per section

| Section | Data required |
|---|---|
| Your Details | Order ID, guardian's name, baby's DOB, gender, birth time, birth place (collected but **not used** in visible calculations) |
| Suggestions | 3 names with meaning and origin. **The selection rule is not shown anywhere.** There is no nakshatra-syllable (Namakshar), Expression/Destiny number or compatibility number in the output. The source of the names is unknown (it is probably a curated list filtered by gender and culture, since all three are Punjabi/Hindu male names). **Ambiguous: needs a spec.** |
| Lo Shu grid (p8) | DOB digits plus the Bhagyank (life path). Mulank is not shown separately. |
| Name grids | Per-name letter counts in the 4 "planes of expression" groups. A text lookup keyed by (plane, count) is needed for counts 0–4 or more. Count values seen: Knowledge 1/2/3; Strength 0/1; Emotions 1/3/4; Spiritual 0/1. |

Not used: planets, houses, dashas, divisional charts, yogas, doshas, ashtakavarga, transits. This report is **numerology only**.

## 5. Content depth

- Total is about 2,550 words.
- Per name: one 50–80 word meaning paragraph, plus 4 plane paragraphs of 40–110 words each (about 300 words per name, about 900 for 3 names).
- Proportions:
  - Generic boilerplate: disclaimer, author message, "why name is important" and closing, about 1,400 words (**about 55%**).
  - Lookup-selected text (name meanings and plane-count paragraphs): about 1,100 words (**about 43%**).
  - Computed data (grid numbers): about 2%.
- The plane paragraphs are **identical across names when the count matches**. For example, "Strength plane: 1" is verbatim the same for Tegbir (p9) and Ramith (p13), and "Spiritual plane: 0" is reused too.
- Style excerpts:
  - p7: "Tegbir, originating from Punjabi, signifies "brave warrior" or "courageous hero." Those named Tegbir are natural leaders, possessing strength, courage, and resilience in the face of adversity."
  - p9: "Knowledge plane: 1 — You possess a dominant role in your social circle, where you assert your ideas onto others. Occasionally, you are observed promoting your ideas, displaying a sense of arrogance and stubbornness."
  - p2: "…rooted in the principles of numerology—a practice not recognized by the scientific community as a legitimate science but rather considered a pseudoscience."
- **Quality note:** some plane texts include adult sexual content (p9/p10/p13 Strength: "When it comes to your sex life…"; p11 Strength 0: "…emotionally detached in sexual relationships"). This is inappropriate for a baby report and should **not** be copied.

## 6. Boilerplate and unique content

- **Shared boilerplate** (same pattern as the other reports): Disclaimer (p2), Message from Author (p3), Your Details (p4), closing thank-you with signature (p15). Unlike Love/Career/Kundli, there is no "Best way to study", no index, no coupon and no consultation banner.
- **Unique to this report:** "Why name is important", the 3 name suggestions, the Lo Shu DOB grid, and the planes-of-expression grids with interpretations.

## 7. Visual identity

- Palette: warm cream and pale yellow (about #FFF6D5) page background, a darker yellow and orange accent wave with orange dashed lines, and a gold/ochre table border (about #C8961E). The disclaimer and author message are in **red** text (about #C0392B). Headings are black/dark brown, bold, uppercase, in a rounded sans display face.
- Body fonts are Calibri and Times New Roman (Google Docs).
- There are no headers, footers, page numbers or borders. There is no brand logo on content pages.
- The cover is a muted grey-beige watercolour with a black serif title.
- This is the least polished reference: Google Docs layout, an inconsistent page title ("YOUR DETAILS" twice), and no table of contents.
