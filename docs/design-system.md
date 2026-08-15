# Astro Platform Design System — Visual & Color Tokens

This document defines the official visual identity, design tokens, color hierarchy, and usage rules for the **Astro Platform** across all client channels (Flutter Mobile, Next.js Admin, and Web).

---

## 1. Brand Philosophy & Design Direction

The Astro Platform visual identity is engineered to be **modern, sophisticated, technical, calm, trustworthy, and distinctive**.

### Design Principles:
- **Product & Data Experience**: Treat astrological calculations as a high-precision, rule-based data engine rather than a "mystical horoscope app."
- **Restraint Over Ornamentation**: Avoid stereotypical astrology clichés—NO glowing planets, stars everywhere, mystical gradients, excessive gold, or ornamental zodiac graphics.
- **Hierarchical Clarity**: High-value accents (Gold `#D9B13B` and Burgundy `#824661`) are used strictly for deliberate semantic highlights (premium features, paid reports, key metrics), never as dominant screen colors.

---

## 2. Official Brand Palette

The brand identity relies on five core hex colors. **Do NOT invent additional brand colors or replace them with generic framework defaults.**

| Role | Color Name | Hex Code | RGB | Flutter / Dart Token | CSS Variable |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PRIMARY** | Deep Space Navy | `#121440` | `18, 20, 64` | `AppColors.primary` | `--color-primary` |
| **SECONDARY** | Muted Amethyst | `#61568C` | `97, 86, 140` | `AppColors.secondary` | `--color-secondary` |
| **TERTIARY** | Dark Indigo Surface | `#1D2059` | `29, 32, 89` | `AppColors.tertiary` | `--color-tertiary` |
| **PREMIUM ACCENT** | Celestial Gold | `#D9B13B` | `217, 177, 59` | `AppColors.premiumAccent` | `--color-premium-accent` |
| **SUPPORTING ACCENT** | Royal Burgundy | `#824661` | `130, 70, 97` | `AppColors.supportingAccent` | `--color-supporting-accent` |

---

## 3. Color Roles & Detailed Usage Rules

### 1. PRIMARY — `#121440`
- **Role**: Main brand identity. Dominant color for headers, main app branding, primary navigation bars, selected tab states, and primary action buttons.
- **Rule**: Do **NOT** use as a solid background for every screen. Combine with dark surface neutrals for contrast and depth.

### 2. SECONDARY — `#61568C`
- **Role**: Supporting brand color. Complements primary navy without competing.
- **Use for**: Secondary actions, subtle card borders, secondary navigation, interactive hover/press states, and secondary chart accents.

### 3. TERTIARY / DARK SURFACE — `#1D2059`
- **Role**: Structural dark surface color.
- **Use for**: Dark card backgrounds, elevated sheets, section headers, modal containers, and dark-mode content blocks.

### 4. PREMIUM ACCENT / GOLD — `#D9B13B`
- **Role**: High-value, premium accent for monetization and critical highlights (Gupta Nadi rules, paid PDF reports, premium subscription CTAs).
- **Rule**: **USE SPARINGLY**. Maximum 5–10% visual coverage per screen.
- **DO NOT** use as dominant background or for body copy on light surfaces where contrast is insufficient.

### 5. SUPPORTING ACCENT / BURGUNDY — `#824661`
- **Role**: Secondary supporting accent.
- **Use for**: Retrograde indicators, special categories, secondary data visualization, tag badges, and subtle highlights.
- **Rule**: Do **NOT** use for standard destructive/error states unless semantically appropriate (use `#EF4444` for standard error alerts).

---

## 4. Derived & Supporting Semantic Tokens

To ensure accessibility and clean UI rendering, the brand palette is supported by derived neutral tokens:

```
                  PRIMARY (#121440)
                         ↓
                 SECONDARY (#61568C)
                         ↓
                 TERTIARY (#1D2059)
                         ↓
             PREMIUM ACCENT (#D9B13B)
                         ↓
            SUPPORTING ACCENT (#824661)
```

### Supporting Neutral Tokens:
- **`background`**: `#0D0E2B` *(Deep night background derived from Primary `#121440`)*
- **`surface`**: `#1D2059` *(Tertiary dark surface)*
- **`surfaceElevated`**: `#2A2E78` *(Elevated card/modal surface)*
- **`textPrimary`**: `#F8FAFC` *(High contrast Slate 50 for body/heading text)*
- **`textSecondary`**: `#94A3B8` *(Muted Slate 400 for subtext and captions)*
- **`border`**: `#2E3378` *(Structural divider border)*
- **`success`**: `#10B981` *(Emerald green for success states)*
- **`warning`**: `#F59E0B` *(Amber for caution states)*
- **`error`**: `#EF4444` *(Red 500 for validation errors and failure alerts)*
- **`disabled`**: `#475569` *(Muted slate for inactive states)*

---

## 5. Accessibility & Contrast Audit

All color pairings must satisfy WCAG 2.1 AA contrast requirements (minimum 4.5:1 for normal text, 3:1 for large text/UI components):

| Text Token | Surface Token | Contrast Ratio | WCAG Compliance | Usage |
| :--- | :--- | :---: | :---: | :--- |
| `textPrimary` (`#F8FAFC`) | `primary` (`#121440`) | **15.4:1** | AAA ✅ | Primary Buttons, App Bar Headers |
| `textPrimary` (`#F8FAFC`) | `surface` (`#1D2059`) | **13.2:1** | AAA ✅ | Card Body Text, Modal Content |
| `textPrimary` (`#F8FAFC`) | `background` (`#0D0E2B`) | **17.1:1** | AAA ✅ | Screen Body Text |
| `textSecondary` (`#94A3B8`) | `surface` (`#1D2059`) | **6.1:1** | AA ✅ | Subtitles, Form Labels, Field Captions |
| `premiumAccent` (`#D9B13B`) | `surface` (`#1D2059`) | **7.4:1** | AAA ✅ | Gold Badges, Premium Metric Headers |
| `supportingAccent` (`#824661`) | `textPrimary` (`#F8FAFC`) | **4.8:1** | AA ✅ | Badge Text, Highlights |

> [!IMPORTANT]
> **Accessibility Rule**: Never render `#D9B13B` (Gold) body text on a white/light background. Use `#D9B13B` only on dark surfaces (`#121440`, `#1D2059`, `#0D0E2B`) or as a solid button fill with dark text (`#121440`).

---

## 6. Implementation Rules

### Flutter (`apps/mobile`):
- All widgets MUST consume colors via `Theme.of(context).colorScheme` or centralized `AppColors` tokens.
- **NEVER** write inline hex values like `Color(0xFF121440)` directly inside screen or widget files.

### Next.js Admin (`apps/admin`):
- All styles MUST reference CSS variables defined in `globals.css` (e.g. `var(--color-primary)`).
- Maintains identical brand look and feel across admin portal and mobile client.

---

## 7. Correct vs. Incorrect Usage Examples

### Correct Usage:
- ✅ Using `#121440` (Primary) for app bar headers and primary CTA buttons.
- ✅ Using `#1D2059` (Tertiary) as dark card background with `#F8FAFC` primary text.
- ✅ Using `#D9B13B` (Gold) for a small "Premium Report Available" pill badge.
- ✅ Using `#824661` (Burgundy) for retrograde planet indicator badges (`(R)`).

### Incorrect Usage:
- ❌ Painting an entire screen background with gold `#D9B13B`.
- ❌ Using generic red (`#FF0000`) or random purple (`#818CF8`) instead of brand tokens.
- ❌ Hardcoding raw `Color(0xFF...)` hex values inside Flutter `Widget build()` methods.
- ❌ Using gold text on a white card background.
