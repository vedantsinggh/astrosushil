# App home page: website content in the mobile app

Date: 2026-11-27. Status: approved by owner with the layout change below. Not committed.

## Why

The website home page shows consultations, reports, shop products, celebrity videos,
YouTube podcasts, testimonials and blogs. The app home page shows none of it: only the
greeting, today's horoscope, panchang and tool grids. The owner wants app users to see
the same offer, with this priority:

1. Consultations and reports (main business).
2. Shop products, easy to browse (a carousel of selected products).
3. Blogs and videos (YouTube podcasts and the celebrity MP4 videos): nice to have, lower.

## Goals

- Home page sections for featured consultations, featured reports and selected products,
  each a horizontal carousel with "See all".
- Lower down: celebrity videos ("Stars who rely on Astro Sushil"), YouTube videos,
  testimonials, latest blogs.
- A Blogs screen (list) and a blog reading screen inside the app.
- Staff choose which consultations, reports and products appear, in the admin.

## Non-goals

- No changes to report code (report engine, app report screens, website report pages,
  report catalogue code). Another agent is working there. The home page only reads the
  existing report list and opens the existing report detail screen.
- No wishes photo gallery, press logos, FAQs or courses section on the app home (owner
  did not ask; can follow later).
- No in-app video player.
- No commits until the owner asks.

## Anti-goals

- The home page must not get slower or break when content is missing: a section with no
  items, or that fails to load, is hidden. The horoscope and tools keep working.
- The home page must not feel like the website (see layout).

## Constraints

- Flutter talks only to our API (AGENTS.md). Content comes from the existing CMS tables:
  `MediaItem` (sections `celebrity`, `podcast`), `Testimonial`, `BlogPost`, `Product`,
  `ConsultationType`, and the report catalogue (with admin overrides).
- Every staff change goes through `adminService.logAction` (settings saves already do).
- Adding a package needs a reason and licence check; this design adds none.

## Approaches considered

1. **One home endpoint + an "App home" settings section (chosen).** A new
   `GET /api/v1/app/home` returns every home section in one response. Staff pick
   featured items in a new "Mobile App Home" tab under Settings, stored as a JSON
   settings section (no database migration). One round trip for the app; no changes
   to report or product tables.
2. Add `isFeatured` columns to consultation types and the report catalogue, and have the
   app call 6 existing endpoints. Rejected: needs migrations, touches report catalogue
   code (owner asked us not to), and 6 calls on every home load.
3. Reuse the existing product `isFeatured` flag. Rejected: all 28 products are flagged,
   because the website uses it for its own list, so it cannot mean "show on the app".

## Design

### Home page order (top to bottom)

Owner decision (2026-11-27): the app must not feel like the website. Greeting first, then
today's horoscope, then the free tools, then the rest.

```
Namaste, Asha                       [bell] [avatar]
Active profile: Asha · Change
Today's horoscope card
Panchang (slim)
─ Astrology tools grid (free, as today) + "All tools"
─ Consult Astro Sushil ──────── See all
[Call 30 min ₹2,100] [Video ...] [WhatsApp msg ...]   (swipe)
─ Popular reports ───────────── See all
[cover][cover][cover]                                  (swipe)
─ From the shop ─────────────── See all
[product][product][product]                            (swipe)
─ Stars who rely on Astro Sushil
[video thumb][video thumb]                             (swipe)
─ Watch on YouTube ──────────── See all
[thumb][thumb][thumb]                                  (swipe)
─ What clients say
[quote card][quote card]                               (swipe)
─ From the blog ─────────────── See all
[blog card][blog card]                                 (swipe)
─ Services grid (as today)
```

App feel, not website: compact horizontal carousels built from the app's existing design
system widgets (section title + "See all" row as the tools grid uses today), no hero
banners, no long text blocks, no full-width website-style sections. Each carousel shows
a peek of the next card so it reads as swipeable.

### Cards and taps

- **Consultation card:** title, mode label (Call / Video / In person / WhatsApp message),
  starting price incl. GST, duration. Tap: opens the existing booking flow for that type.
  See all: Consult tab.
- **Report card:** cover image, name, price. Tap: existing report detail screen. See all:
  Reports tab. Read-only use of report code.
- **Product card:** first image, name, price (and struck-through MRP when there is one).
  Tap: existing shop product screen. See all: Shop.
- **Celebrity video card:** thumbnail, person name, title. Tap: opens the MP4 in the
  phone's video player/browser (`url_launcher`).
- **YouTube card:** thumbnail from `img.youtube.com/vi/<id>/hqdefault.jpg` (id parsed from
  the URL), title. Tap: opens the YouTube app or browser. See all: a Videos screen listing
  every podcast video.
- **Testimonial card:** name, rating, short quote (3 lines).
- **Blog card:** thumbnail, title, category, date. Tap: blog reading screen. See all: Blogs
  screen (list, newest first, category chips, paged).

### Blog reading screen

Renders the post HTML with a small in-app converter for the tags blog posts use (p,
h1 to h4, strong/b, em/i, ul/ol/li, br, a, img, blockquote). Unknown tags fall back to
their plain text. Links open in the browser. Shows thumbnail, title, author, date. A
"Read on website" link covers anything the converter cannot show. No new package.

### API

`GET /api/v1/app/home` (public, no personal data) returns the home configuration and the
CMS content in one response:

```
{ featured: { consultationSkus: [...], reportIds: [...], productIds: [...] },
  show: { starVideos, youtube, testimonials, blogs },
  celebrityVideos: [...], youtubeVideos: [...up to 10], testimonials: [...up to 10],
  blogs: [...latest 6] }
```

The app joins the featured ids with the lists it already loads (`GET /consultations`,
the report catalogue, `GET /shop` products), so names, prices and GST are exactly what
checkout uses and no pricing is duplicated. Ids that are no longer active or on sale are
skipped in the app. An empty list falls back to the first 6 bookable consultations, the
first 6 available reports, and the first 8 products.

Blogs screen uses the existing `GET /blogs` and `GET /blogs/slug/:slug`.
Videos screen uses the existing `GET /media?section=podcast`.

### Admin

New page **Mobile App → App Home**: three ordered pickers (consultations by mode, reports,
products) with up/down and remove, plus on/off switches for the lower sections. Saved as
the new `appHome` settings section through the existing settings save (audited, permission
`settings:update`).

### App structure

New folder `apps/mobile/lib/features/home_content/` (models, repository, provider, home
section widgets, blogs list/detail, videos list). `home_screen.dart` gets the new sections
inserted; existing widgets stay. Section titles in English and Hindi (existing l10n files).

### Tests

- API: home endpoint (fallbacks, inactive ids skipped, prices incl. GST, no staff/personal
  data), settings validation.
- App: widget tests for each section hiding when empty, taps navigating, blog HTML
  converter (each tag, unknown tags, links), YouTube id parsing.
- Admin build passes.

## Left to the builder

Card sizes and spacing (follow the app's existing design system widgets), exact limits,
loading placeholders, and how "See all" is styled.

## Confirmed

"mp3" in the request meant the celebrity MP4 videos (owner, 2026-11-27).
