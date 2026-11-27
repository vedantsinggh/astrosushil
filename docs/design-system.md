# Design System & Theme Specification

Astro Sushil uses a cohesive **Vedic Astrology Design Language** across Mobile (Flutter iOS & Android) and Website (React + Tailwind v4), and a clean high-contrast operational theme for the Admin Portal (Next.js).

## 1. Typography

| Platform | Headings | Body / UI | Notes |
| --- | --- | --- | --- |
| **Website** (`apps/website/src/index.css`) | `Philosopher` (Bold 700, `/fonts/Philosopher-Bold.woff2`) | `Outfit` (Regular 400, `/fonts/Outfit-Regular.woff2`) | Base `16px`, `--font-heading` & `--font-body` |
| **Mobile** (`apps/mobile/lib/shared/theme/app_typography.dart`) | `Philosopher` (fallback: `Georgia`, `serif`) | `Outfit` (fallback: `Roboto`, `sans-serif`) | Full English & Hindi (Devanagari) script support |
| **Admin** (`apps/admin/app/globals.css`) | `Inter` / system sans-serif | `Inter` / system sans-serif | Base `14px`, line-height `1.5` |

## 2. Mobile App Theme (`apps/mobile/lib/shared/theme/app_colors.dart`)

### Brand Core Palette
- **Primary (Midnight Royal Navy)**: `#121440` (`AppColors.primary`)
- **Secondary (Deep Muted Indigo / Violet)**: `#61568C` (`AppColors.secondary`)
- **Tertiary (Deep Royal Indigo Surface)**: `#1D2059` (`AppColors.tertiary`)
- **Cosmic Midnight**: `#0D0E2B` (`AppColors.midnight`)
- **Vedic Plum**: `#2A1B3D` (`AppColors.deepPlum`)
- **Indigo Dark**: `#171A4A` (`AppColors.indigoDark`)

### Gold & Saffron Accents
- **Antique Gold**: `#D4AF37` (`AppColors.gold` / `premiumAccent`)
- **Gold Dark (high-contrast on light)**: `#B45309` (`AppColors.goldDark`)
- **Gold Light**: `#FDF6B2` (`AppColors.goldLight`)
- **Vedic Saffron**: `#E58A1F` (`AppColors.saffron`), Deep Saffron `#C26715`, Light Saffron `#FEF3C7`
- **Supporting Burgundy**: `#824661` (`AppColors.supportingAccent`)

### Canvas & Surface Hierarchy
- **Main Light Canvas (Warm Ivory / Parchment)**: `#FAF7F2` (`AppColors.canvas` / `lightBackground`)
- **Secondary Canvas**: `#F3EDE2` (`AppColors.canvasSecondary`)
- **Pure White Card Surface**: `#FFFFFF` (`AppColors.cardSurface`) with crisp border `#E2DDD5` (`AppColors.cardBorder`)
- **Warm Ivory / Parchment Surfaces**: `#FBF8F3` (`cardSurfaceWarm`), `#F5EFE6` (`cardSurfaceParchment`)
- **Dark Card Surface**: `#1D2059` (`cardSurfaceDark`), Elevated `#2E3378`, Border `#2E3378`

## 3. Website Theme (`apps/website/src/index.css`)

Defined via Tailwind CSS v4 `@theme`:
- `--color-primary`: `#424874`
- `--color-secondary`: `#F4EEFF`
- `--color-gold`: `#d4af37`
- `--color-black`: `#111111`
- `--color-white`: `#ffffff`
- `--gradient-primary`: `linear-gradient(135deg, #3b3f63, #6c70a3)`
- `--gradient-gold`: `linear-gradient(135deg, #c9a227, #f5d76e)`

## 4. Admin Portal Theme (`apps/admin/app/globals.css`)

High-legibility light operational palette:
- **Backgrounds**: Main `#F5F6F8`, Sidebar/Surface `#FFFFFF`, Hover `#F8FAFC`, Subtle `#F1F3F6`
- **Borders**: `#E3E6EB`
- **Text**: Primary `#111827`, Secondary `#4B5563`, Muted `#8A93A3`, Sidebar `#374151`
- **Accents**: Primary `#1E3A8A` (hover `#172E6E`), Soft `#EEF2FA`, Gold `#9A6B12`
- **Status Badges**: Success (`#E8F5EE` / `#166534`), Warning (`#FDF4E3` / `#92400E`), Danger (`#FDECEC` / `#B42318`), Info (`#EEF2FA` / `#1E3A8A`)
