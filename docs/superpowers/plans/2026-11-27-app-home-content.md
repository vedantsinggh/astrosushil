# App Home Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show featured consultations, reports, shop products, celebrity MP4 videos, YouTube videos, testimonials and blogs on the app home page, below the greeting, horoscope, panchang and free tools, with staff choosing the featured items in the admin.

**Architecture:** A new `appHome` site-settings section stores the featured ids and section switches. A new public `GET /api/v1/app/home` returns that section plus CMS content (media, testimonials, latest blogs). The app joins the featured ids with the consultation, report and product lists it already loads, so prices come from the same code as checkout.

**Tech Stack:** Fastify + Zod (`zod/v3`) + Prisma (API), Next.js (admin), Flutter + Riverpod + Dio (app). No new packages.

**Spec:** `docs/superpowers/specs/2026-11-27-app-home-content-design.md`

## Global Constraints

- Do not edit any report code: `packages/report-engine/**`, `apps/mobile/lib/features/reports/**`, `apps/mobile/lib/home/screens/reports_screen.dart`, `apps/website/**`, `apps/api/src/modules/web-astrology/**`, `apps/api/src/modules/commerce/report-catalog*`. Reading and importing from them is allowed.
- No commits (owner: "dont commit anything"). Every "Commit" step below is replaced by "leave changes uncommitted".
- No new npm or pub packages. Videos and links open with `url_launcher` (`LaunchMode.externalApplication`).
- Home order: greeting + profile, horoscope, panchang, astrology tools grid + "All tools", then Consult Astro Sushil, Popular reports, From the shop, Stars who rely on Astro Sushil, Watch on YouTube, What clients say, From the blog, Services grid.
- App feel: horizontal carousels with a peek of the next card, section title + "See all" row; no banners or long text.
- A section with no items, or whose data fails to load, is hidden; the rest of home keeps working.
- Section titles in English and Hindi (`app_en.arb`, `app_hi.arb`).
- Settings saves are already audited by `settingsService.update`; keep using it.

## Review Focus

1. Featured id no longer active (consultation removed, report off sale, product unpublished): skipped, no blank card. Test in Task 4.
2. `/app/home` fails or times out (offline): home still shows horoscope and tools; content sections hidden. Test in Task 6.
3. YouTube URL forms (`watch?v=`, `watch?si=..&v=`, `youtu.be/`, `shorts/`, garbage): id parsed or card dropped. Test in Task 4.
4. Blog HTML with unexpected tags, scripts, nested lists or empty content: renders text, never crashes, never runs script. Test in Task 7.
5. Settings with unknown or duplicate ids / too many ids: rejected or de-duplicated by the schema, limit 20 per list. Test in Task 1.

---

### Task 1: `appHome` settings section (API)

**Files:**
- Modify: `apps/api/src/modules/content/content.schemas.ts` (SETTINGS_SHAPE, SETTINGS_DEFAULTS, updateSettingsSchema)
- Test: `apps/api/tests/unit/app-home-settings.test.ts`

**Interfaces:**
- Produces: settings section `appHome` with fields
  `featuredConsultationSkus: string[]`, `featuredReportIds: string[]`, `featuredProductIds: string[]` (each max 20, each id 1..100 chars, trimmed, de-duplicated preserving order),
  `showStarVideos: boolean`, `showYoutube: boolean`, `showTestimonials: boolean`, `showBlogs: boolean`.
  Defaults: empty lists, all switches `true`. Not added to the public settings view.

- [ ] **Step 1: Write the failing test**

```ts
import { normalizeSettings, mergeSettings } from '../../src/modules/content/settings.service';
import { updateSettingsSchema } from '../../src/modules/content/content.schemas';

describe('appHome settings', () => {
  it('defaults to empty lists and every section on', () => {
    expect(normalizeSettings({}).appHome).toEqual({
      featuredConsultationSkus: [], featuredReportIds: [], featuredProductIds: [],
      showStarVideos: true, showYoutube: true, showTestimonials: true, showBlogs: true,
    });
  });
  it('de-duplicates ids keeping order', () => {
    const patch = updateSettingsSchema.parse({ appHome: { featuredReportIds: ['b', 'a', 'b'] } });
    expect(mergeSettings(normalizeSettings({}), patch).appHome.featuredReportIds).toEqual(['b', 'a']);
  });
  it('rejects more than 20 ids and unknown fields', () => {
    expect(updateSettingsSchema.safeParse({ appHome: { featuredProductIds: Array.from({ length: 21 }, (_, i) => `p${i}`) } }).success).toBe(false);
    expect(updateSettingsSchema.safeParse({ appHome: { bogus: 1 } }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL** — `cd apps/api && npx vitest run tests/unit/app-home-settings.test.ts` (appHome undefined).
- [ ] **Step 3: Add the section** to `SETTINGS_SHAPE`, `SETTINGS_DEFAULTS` and `updateSettingsSchema`, using an `idList` schema: `z.array(z.string().trim().min(1).max(100)).max(20).transform(unique)`.
- [ ] **Step 4: Run it, expect PASS**; run `npx tsc --noEmit -p apps/api` with 0 errors.
- [ ] **Step 5:** leave uncommitted.

### Task 2: `GET /api/v1/app/home` (API)

**Files:**
- Create: `apps/api/src/modules/app-home/app-home.service.ts`, `apps/api/src/modules/app-home/app-home.routes.ts`
- Modify: `apps/api/src/routes/index.ts` (register `appHomeRoutes` with prefix `/app`)
- Modify: `apps/api/src/modules/content/settings.service.ts` (clear the app-home cache after `update`)
- Test: `apps/api/tests/integration/app-home.test.ts`

**Interfaces:**
- Consumes: `settingsService.getSettings()` → `appHome` (Task 1); `mediaService.listPublic('celebrity' | 'podcast')`; `testimonialsService.listPublic({...})`; `blogsService.listPublished({ limit: 6 })`.
- Produces: `appHomeService.get(): Promise<AppHomeView>` and `appHomeService.clearCache(): void`;
  ```ts
  interface AppHomeView {
    featured: { consultationSkus: string[]; reportIds: string[]; productIds: string[] };
    show: { starVideos: boolean; youtube: boolean; testimonials: boolean; blogs: boolean };
    celebrityVideos: { id: string; title: string; personName: string | null; videoUrl: string; thumbnailUrl: string | null }[];
    youtubeVideos: { id: string; title: string; url: string; thumbnailUrl: string | null }[]; // max 10
    testimonials: { id: string; name: string; rating: number | null; text: string; imageUrl: string | null }[]; // max 10, text only
    blogs: { id: string; slug: string; title: string; shortDescription: string; category: string; thumbnailUrl: string | null; publishedAt: string | null }[]; // latest 6
  }
  ```
  Response envelope as other public routes (`send(reply, data, message)`). A switched-off section returns `[]`. In-memory cache 60 s.

- [ ] **Step 1: Write the failing test** `app-home.test.ts`: build the app, seed one celebrity media, one podcast media, one inactive podcast, one testimonial, 7 published blogs, set `appHome.showTestimonials=false` and `featuredReportIds=['KUNDLI']`; assert `GET /api/v1/app/home` → 200, `featured.reportIds` = `['KUNDLI']`, `testimonials` = `[]`, `blogs.length` = 6 newest first, inactive podcast absent, no field named `email`/`phone`/`createdById` anywhere in the JSON. Clean up seeded rows in `afterAll`.
- [ ] **Step 2: Run, expect FAIL (404).**
- [ ] **Step 3: Implement service + route** (route has no auth preHandler; caching via module-level `{ value, expiresAt }`).
- [ ] **Step 4: Run, expect PASS**; typecheck 0 errors.
- [ ] **Step 5:** leave uncommitted.

### Task 3: Admin "App Home" page

**Files:**
- Create: `apps/admin/app/app-home/page.tsx`
- Modify: `apps/admin/lib/api/content.ts` (add `appHome` to `SiteSettings` type), `apps/admin/components/Sidebar.tsx` (item `{ label: 'App Home', href: '/app-home', perm: 'settings:read', icon: 'home' }` first in "Mobile App"; add a `home` icon to `components/icons.tsx` if missing)

**Interfaces:**
- Consumes: `settingsApi.get/update` (`appHome` patch), `listConsultationOptions()` (bookings.ts), `listReportCatalog()` (catalogue.ts), `fetchShopProducts({ ... })` (catalogue.ts).

- [ ] **Step 1:** Page with three cards (Consultations, Reports, Products). Each: an "Add" select of items not yet chosen (consultations listed per mode as `Title · Mode`, value = mode catalogId/sku; reports value = catalogId, off-sale ones marked "(off sale)"; products value = product id, unpublished marked), and the ordered chosen list with Up / Down / Remove. Below: four switches (Stars videos, YouTube, Testimonials, Blogs). One Save button calling `settingsApi.update({ appHome })`; show "Saved" or the API error. Hint text: "Leave a list empty to show the first few automatically." Disable Save without `settings:update`.
- [ ] **Step 2:** `cd apps/admin && npm run build` passes; page title resolves via `pageTitleFor('/app-home')` = "App Home".
- [ ] **Step 3:** Manually: save a list, reload, order kept; confirm an `audit` row for the settings update.
- [ ] **Step 4:** leave uncommitted.

### Task 4: App data layer

**Files:**
- Create: `apps/mobile/lib/features/home_content/models/home_content_models.dart`, `.../data/home_content_repository.dart`, `.../providers/home_content_providers.dart`, `.../utils/youtube.dart`
- Test: `apps/mobile/test/unit/home_content/home_content_test.dart`

**Interfaces:**
- Consumes: `apiClientProvider`; `consultationNotifierProvider` (`state.catalog: List<ConsultationOfferingModel>`, key `sku`); `reportCatalogProvider` + `buildCanonicalReportCatalog(...)` → `List<ReportCatalogDisplayEntry>` (match `serverItem?.id` or `brand.canonicalKey`/`brand.reportType` against ids); `ShopService.fetchProducts()` → `List<ProductModel>` (key `id`).
- Produces:
  - `class AppHomeContent { HomeFeaturedIds featured; HomeSectionSwitches show; List<HomeVideo> celebrityVideos; List<HomeVideo> youtubeVideos; List<HomeTestimonial> testimonials; List<HomeBlogSummary> blogs; factory AppHomeContent.fromJson(Map<String, dynamic>) }` (tolerant parsing: missing lists → empty).
  - `String? youtubeIdOf(String url)` and `String youtubeThumb(String id)` → `https://img.youtube.com/vi/$id/hqdefault.jpg`.
  - `final appHomeContentProvider = FutureProvider<AppHomeContent>` (GET `/app/home`).
  - `final homeFeaturedConsultationsProvider = Provider<List<ConsultationOfferingModel>>`, `homeFeaturedReportsProvider = Provider<List<ReportCatalogDisplayEntry>>`, `homeFeaturedProductsProvider = Provider<AsyncValue<List<ProductModel>>>`, plus `homeShopProductsProvider = FutureProvider<List<ProductModel>>` (unfiltered `fetchProducts()`, not the search-bound `shopProductsProvider`).
  - Pure helper used by all three: `List<T> pickFeatured<T>(List<T> all, List<String> ids, String Function(T) keyOf, bool Function(T) usable, int fallback)` — ids order kept, unusable/unknown skipped, empty ids → first `fallback` usable items. Fallbacks: consultations 6 (`isAvailable`), reports 6 (`isAvailable`), products 8 (all returned).

- [ ] **Step 1: Write failing tests:** `pickFeatured` keeps order `['c','a']`, skips unknown `'z'` and unusable item, empty ids gives first N usable; `youtubeIdOf` for `https://www.youtube.com/watch?v=_jmCNWLZT0s` → `_jmCNWLZT0s`, `https://www.youtube.com/watch?si=Bt5&v=dw1gbV7--Bk&feature=youtu.be` → `dw1gbV7--Bk`, `https://youtu.be/abc123DEF45` → `abc123DEF45`, `https://youtube.com/shorts/abc123DEF45` → `abc123DEF45`, `not a url` → null; `AppHomeContent.fromJson({})` gives empty lists and switches true.
- [ ] **Step 2: Run, expect FAIL** — `cd apps/mobile && flutter test test/unit/home_content/home_content_test.dart`.
- [ ] **Step 3: Implement.** A YouTube card whose id is null is dropped.
- [ ] **Step 4: Run, expect PASS**; `flutter analyze lib/features/home_content` clean.
- [ ] **Step 5:** leave uncommitted.

### Task 5: Home carousels

**Files:**
- Create: `apps/mobile/lib/features/home_content/widgets/home_carousel.dart` (generic section: title, optional "See all", horizontal `ListView` with card width ~ 72% of screen for big cards / 42% for small so the next card peeks), `.../widgets/home_content_cards.dart` (ConsultationCard, ReportCard, ProductCard, StarVideoCard, YoutubeCard, TestimonialCard, BlogCard)
- Create: `apps/mobile/lib/features/home_content/home_report_opener.dart` (builds `ReportDetailScreen` from a `ReportCatalogDisplayEntry` and the active profile with the same arguments `reports_screen.dart` `_openEntry` uses; no profile → `CreateBirthProfileScreen`)
- Modify: `apps/mobile/lib/l10n/app_en.arb`, `app_hi.arb` (+ regenerate): `homeSectionConsult` "Consult Astro Sushil" / "एस्ट्रो सुशील से परामर्श", `homeSectionReports` "Popular reports" / "लोकप्रिय रिपोर्ट", `homeSectionShop` "From the shop" / "शॉप से", `homeSectionStars` "Stars who rely on Astro Sushil" / "एस्ट्रो सुशील पर भरोसा करने वाले सितारे", `homeSectionYoutube` "Watch on YouTube" / "YouTube पर देखें", `homeSectionTestimonials` "What clients say" / "ग्राहकों की राय", `homeSectionBlog` "From the blog" / "ब्लॉग से", `homeSeeAll` "See all" / "सभी देखें"
- Test: `apps/mobile/test/widget/home_content_sections_test.dart`

**Interfaces:**
- Consumes: Task 4 providers; `BookingFlowSheet.show(context, offering)`; `ProductDetailScreen(product:)`; `ShopCatalogScreen`; `homeTabControllerProvider` (tab 1 = Reports, tab 2 = Consult); `launchUrl`.
- Produces: `class HomeContentSections extends ConsumerWidget` with `const HomeContentSections({super.key})` rendering, in order, Consult, Reports, Shop, Stars, YouTube, Testimonials, Blog — each hidden when empty, loading or errored. Keys: `ValueKey('home-section-consult')` etc. (`-reports`, `-shop`, `-stars`, `-youtube`, `-testimonials`, `-blog`).
- Card content: consultation = title, mode label (Call / Video / In person / WhatsApp message), duration (omit for message mode), price incl. GST; report = brand cover asset, title, price text or "Coming soon"; product = first image, name, price + struck MRP when higher; star video = thumbnail + play badge, person name; YouTube = thumbnail + play badge, title (2 lines); testimonial = name, stars, 3-line quote; blog = thumbnail, title (2 lines), category · date.
- Taps: consultation → booking sheet; report → report opener; product → product screen; star/YouTube → `launchUrl(external)`; blog → `BlogDetailScreen(slug:)` (Task 7). See all: Consult → tab 2, Reports → tab 1, Shop → `ShopCatalogScreen`, YouTube → `VideosScreen` (Task 7), Blog → `BlogListScreen` (Task 7).

- [ ] **Step 1: Write failing widget tests** (override providers with fakes): all sections show in the stated order when data exists; consult section hidden when featured list empty and no usable fallback; tapping a product card pushes `ProductDetailScreen`; switch `show.blogs=false` hides the blog section; `appHomeContentProvider` erroring hides star/YouTube/testimonial/blog sections but still shows consult/reports/shop.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** with existing design-system widgets (`AstroCard`, `AstroPressable`, `HomeSectionTitle`, `AppColors`, `AppSpacing`). Network images with a tinted placeholder and error fallback.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5:** leave uncommitted.

### Task 6: Put the sections on the home page

**Files:**
- Modify: `apps/mobile/lib/home/screens/home_screen.dart` (insert `const HomeContentSections()` after the tools "All tools" link and before the Services title; update the doc comment listing the order)
- Test: `apps/mobile/test/widget/home_screen_test.dart` (extend)

- [ ] **Step 1: Failing test:** on home, the vertical order of keys is horoscope card → panchang → `home-service-all-tools` → `home-section-consult` → services title; with `/app/home` throwing, horoscope and tools still render.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Insert the widget**; add pull-to-refresh invalidation of `appHomeContentProvider` and `homeShopProductsProvider` if the screen already has a refresh hook, otherwise none.
- [ ] **Step 4: Run all home tests and the full `flutter test`; expect PASS** (update existing capture/golden-style tests only if they assert the old exact child list).
- [ ] **Step 5:** leave uncommitted.

### Task 7: Blogs and Videos screens

**Files:**
- Create: `apps/mobile/lib/features/home_content/screens/blog_list_screen.dart`, `.../screens/blog_detail_screen.dart`, `.../screens/videos_screen.dart`, `.../widgets/simple_html.dart`
- Modify: `.../data/home_content_repository.dart` (add `fetchBlogs({int page, int limit, String? category})` → `GET /blogs`, `fetchBlog(String slug)` → `GET /blogs/slug/:slug`, `fetchYoutubeVideos()` → `GET /media?section=podcast`)
- Test: `apps/mobile/test/unit/home_content/simple_html_test.dart`, `apps/mobile/test/widget/blog_screens_test.dart`

**Interfaces:**
- Produces: `BlogListScreen()`, `BlogDetailScreen({required String slug})`, `VideosScreen()`, `class SimpleHtml extends StatelessWidget { const SimpleHtml(this.html); }`, and the pure parser `List<HtmlBlock> parseSimpleHtml(String html)` it renders.
- `parseSimpleHtml` supports `p`, `h1`–`h4`, `strong`/`b`, `em`/`i`, `ul`/`ol`/`li` (nesting flattened one level with indent), `br`, `a href` (tap → external browser, `https` only), `img src` (`https` only), `blockquote`; drops `script`/`style`/`iframe` with their content; any other tag → its text; decodes `&amp; &lt; &gt; &quot; &#39; &nbsp;` and numeric entities.
- Blog list: newest first, category chips from the loaded posts, infinite scroll pages of 12. Detail: thumbnail, title, author, date, `SimpleHtml(content)`, "Read on website" link to `https://astrosushil.com/<slug>` at the end.

- [ ] **Step 1: Failing parser tests:** `<p>Hi <strong>there</strong></p>` → one paragraph with a bold span; `<ul><li>a</li><li>b</li></ul>` → two bullet blocks; `<script>alert(1)</script><p>x</p>` → only `x`; `<custom>text</custom>` → `text`; `''` → empty list; `&amp;&#8217;` → `&’`; `<a href="javascript:x">t</a>` → plain text `t` (no link).
- [ ] **Step 2: Failing widget tests:** list shows titles from a fake repository and tapping pushes `BlogDetailScreen`; detail renders a heading from HTML; Videos screen lists only items with a parseable YouTube id.
- [ ] **Step 3: Run, expect FAIL.**
- [ ] **Step 4: Implement.**
- [ ] **Step 5: Run, expect PASS**; full `flutter test` and `flutter analyze` clean; `flutter build apk --debug` succeeds.
- [ ] **Step 6:** leave uncommitted.

### Task 8: End-to-end check

- [ ] Start API (port 3000) with local DB; `curl -s localhost:3000/api/v1/app/home | jq '.data | keys'` lists `blogs celebrityVideos featured show testimonials youtubeVideos`.
- [ ] Set featured items in the admin App Home page; reload the endpoint; ids appear in order.
- [ ] Run the app widget capture of the home screen and look at it: order matches Global Constraints, carousels peek, no overflow at 360 px width, Hindi titles fit.
- [ ] Confirm `git status` shows no changes under the forbidden report paths listed in Global Constraints.
- [ ] Stop servers started for the check. Leave everything uncommitted.
