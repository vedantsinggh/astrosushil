# Web astrology: the website's free astrology pages and report purchase on our own engine

**Status:** built on `staging`. No new tables, no migration, no new environment variables, no new packages.
**Purpose:** the website's free kundli, match-making, daily horoscope, place search and paid-report purchase are answered by this backend, so the paid astrology vendor and Google Places can be switched off.
**Website sources read:** `backend/src/modules/Astrology/*`, `src/service/astroApi.js`, `src/modules/Reports/*`, `src/utils/processReportPdf.js`, `src/utils/constants.js` (`REPORT_CONFIG`), `src/workers/notification.worker.js`; `frontend/src/store/useAstrologyStore.js`, `useReportStore.js`, `src/pages/Kundli/**`, `src/pages/Reports/**`, `src/pages/Profile/Myreportssection.jsx`.

This page is the hand-off to the frontend developer. Section 3 lists, page by page, every field the current frontend reads and what it now gets.

## 1. Where things are

| Area | Files |
|---|---|
| Request validation | `apps/api/src/modules/web-astrology/web-astrology.schemas.ts`, `web-reports.schemas.ts` |
| Timezone of the birth place | `web-astrology.timezone.ts` |
| Engine calls, cache | `web-astrology.service.ts` |
| Engine values to website field names | `web-astrology.mapper.ts` |
| Birth chart SVG | `web-astrology.chart-svg.ts` |
| Routes | `web-astrology.routes.ts`, `web-reports.routes.ts`; registered in `apps/api/src/routes/index.ts` |
| Report purchase | `web-reports.service.ts` |
| Tests | `apps/api/tests/unit/web-astrology-engine.test.ts`, `web-astrology-routes.test.ts`, `web-astrology-reports.test.ts` |

Rules this module follows (AGENTS.md): no paid astrology API; every astrological value comes from `packages/astrology-engine`; no LLM calculates anything; no rule, threshold or score is defined here. The mapper only renames and re-cases values the engine returned. Where the website shows something the engine does not compute, the field is absent and listed in section 3.

Calculation conventions are the API's defaults (the same as `POST /astrology/kundli` with no options): sidereal zodiac, true Chitrapaksha Lahiri ayanamsa, whole-sign houses, mean node. A test compares a chart from this module with `AstrologyService` for the same input.

## 2. Endpoints

All under `/api/v1`. Each route exists at two paths: the canonical `/web/...` path and the website's own path, so the current frontend needs only a new base URL for these calls. None of the website paths existed in this backend (`/astrology/geo-details`, `/astrology/generate-kundli`, `/astrology/match-making`, `/astrology/daily-horoscope`, and `/report/...` in the singular; our own report API is `/reports`).

| Method | Path (canonical) | Website path | Auth | Limit per IP | Notes |
|---|---|---|---|---|---|
| GET | `/web/astrology/geo-details?place=` | `/astrology/geo-details` | public | 30 / min | Place search; bare array |
| GET, POST | `/web/astrology/generate-kundli` | `/astrology/generate-kundli` | public | 12 / min | Free kundli; `{ success, data }` |
| GET, POST | `/web/astrology/match-making` | `/astrology/match-making` | public | 10 / min | Match-making; `{ success, data }` |
| POST | `/web/astrology/daily-horoscope` | `/astrology/daily-horoscope` | public | 20 / min | Daily horoscope, `en` or `hi`; `{ success, data }` |
| GET | `/web/reports` | `/report` | public | 60 / min | The four website products |
| GET | `/web/reports/slug/:slug` | `/report/slug/:slug` | public | 60 / min | One product with `priceBreakdown` |
| GET | `/web/reports/:id` | `/report/:id` | public | 60 / min | One product by id |
| POST | `/web/reports/buy` | `/report/buy` | customer | 10 / min | Creates the order |
| POST | `/web/reports/verify-payment` | `/report/verify-payment` | customer | 20 / min | Verifies the payment, starts the report |
| GET | `/web/reports/orders` | `/report/orders` | customer | 30 / min | Delivered report orders of the buyer |

No admin endpoints and no permission keys: nothing here is staff-facing.

"customer" means a valid access token and an account that is not blocked (`fastify.authenticate` plus `requireActiveCustomer`).

The POST forms of `generate-kundli` and `match-making` take the same fields as JSON. A new frontend should use them: a query string (date, time and place of birth) is written to the request log, a body is not.

Not built here, on purpose:

| Website route | Where it is instead |
|---|---|
| `POST /report/add`, `PUT /report/edit/:id`, `DELETE /report/delete/:id` (admin) | The products are catalogue items of this backend (`commerce.catalog.ts`); there is no editable report-product table. See open question 4 |
| `GET /report/orders/all` (admin) | Our admin's orders and reports screens |
| `GET /report/orders/:orderId/invoice` | `GET /invoices/orders/:orderId/pdf` (invoices module) |

### Errors

Errors use this backend's standard shape `{ "error": { "code", "message", "details?", "requestId" } }`, not the website's `{ success: false, message }`. The frontend stores read `err.response.data.message`; they must read `err.response.data.error.message`.

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | A field is missing, not a number, out of range, an impossible or future date, an unknown section or an unknown field |
| `TIMEZONE_REQUIRED` | 422 | No `timezone` was sent and the coordinates did not come from our place search (section 4) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests from one address. See "changes needed elsewhere": today the shared limiter answers 500 instead |
| `GEOCODING_UNAVAILABLE` | 503 | Place search provider is down and the built-in city list has no match |
| `NOT_FOUND` | 404 | Unknown report product, or an order that is not the caller's |
| `REPORT_LANGUAGE_NOT_AVAILABLE` | 400 | The report has no edition in the chosen language |
| `ORDER_NOT_PAID` | 409 | Report creation asked for an unpaid order |

## 3. Field tables: what each website page reads and what it gets

Legend: **provided** (same meaning as before), **provided, different value** (and why), **not provided** (our engine does not compute it; the page shows its own "—").

### 3.1 Free kundli form (`KundliGenerate.jsx`): place search

Request: `GET /astrology/geo-details?place=<text>` (two characters or more; the website backend demanded three although the page already searched from two).

Response: a bare array, as before.

| Field the page reads | Result |
|---|---|
| `[].formattedAddress` | provided. Our format is "City, State, Country" |
| `[].location.latitude`, `[].location.longitude` | provided (4 decimal places) |
| `[].timezone` | **new**: the IANA timezone of the place. The page should keep it with the selected place and send it with the kundli, match-making and report requests |

Source is our `GET /locations/search` (Open-Meteo geocoding with a built-in list of major cities), not Google Places, so the suggestions for the same text can differ from Google's: towns and cities are found, street addresses and landmarks are not.

### 3.2 Free kundli result (`Kundlireport.jsx`, `BasicDetail.jsx`, `BirthCharts.jsx`, `DoshaSections.jsx`)

Request: `GET /astrology/generate-kundli?latitude=&longitude=&dob=&hour=&min=&label=` and optionally `&timezone=`.

- `dob`: `DD-MM-YYYY` (what the page sends) or `YYYY-MM-DD`; a real date from 1900 up to today.
- `label`: comma-separated list of `astro_details, basic_panchang, planets, manglik, sadhesati_current_status, vimshottri_major_vdasha, vimshottri_antar_vdasha, birth_chart`. Only the requested sections are calculated and returned. `kalsarpa_details` and `pitra_dosha_report` are accepted from the unchanged page and nothing is returned for them.
- Response: `{ success: true, data: { <section>: ..., calculation: { timezone, source, utc_offset_minutes, ayanamsa, house_system, node, engine_version } } }`. The store's `res.data?.data` keeps working.

**Basic details card** (`BasicDetail.jsx`, `data.astro_details`)

| Field the page reads | Result |
|---|---|
| `ascendant` | provided (English sign name) |
| `ascendant_lord` | provided |
| `sign` | provided (Moon sign, English name) |
| `SignLord` | provided |
| `Naksahtra` (vendor's spelling) | provided |
| `NaksahtraLord` | provided |
| also returned, not read by this page | `Charan`, `Varna`, `Vashya`, `Yoni`, `Gan`, `Nadi`, `Yog`, `Karan`, `Tithi`, `yunja`, `tatva`, `name_alphabet`, `paya` (all from the engine's Avakhada and Panchang calculators), `ascendant_sanskrit`, `sign_sanskrit` |

Values differ from the vendor's in wording where our engine uses other names: `Varna` is "Brahmin / Kshatriya / Vaishya / Shudra" (vendor "Vipra / ... / Shoodra"), `Vashya` "Manava / Jalachara / ..." (vendor "Maanav / Jalchar"), `Yoni` "Marjara (Cat)" (vendor "Marjaar"), `tatva` "Agni / Prithvi / Vayu / Jala" (vendor "Fire / Earth / Air / Water"), `paya` "Rajata (Silver)" (vendor "Silver").

**Planetary position table** (`BasicDetail.jsx`, `data.planets[]`)

| Field the page reads | Result |
|---|---|
| `id` | provided: 1 to 9 for Sun … Ketu, 10 for the Ascendant |
| `name` | provided: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu, Ascendant |
| `fullDegree` | provided (0 to 360, 4 decimals) |
| `speed` | provided for the nine planets (degrees per day); `null` for the Ascendant |
| `isRetro` | provided as a real boolean (the vendor sent the text "false", which the page treated as true) |
| `sign`, `sign_lord` | provided |
| `nakshatra`, `nakshatraLord` | provided |
| `nakshatra_pad` | provided |
| `house` (used by `BirthCharts.jsx`) | provided (whole-sign house) |
| also returned | `normDegree` (degrees within the sign), `sign_sanskrit`, `planet_awastha` (Baladi avastha) |

Rahu and Ketu are the mean nodes, and the ayanamsa is true Chitrapaksha Lahiri; degrees can differ from the vendor's by a small amount for that reason.

**Birth chart** (`BirthCharts.jsx`, `label=birth_chart`)

| Field the page reads | Result |
|---|---|
| `birth_chart.chart_url` | provided, different value: a `data:image/svg+xml;base64,...` URL instead of a link to a file. It works unchanged in the page's `<img src>` |
| also returned | `birth_chart.svg` (the same SVG as text, for inlining), `chart_style: "NORTH_INDIAN"`, `format` |

The image is the North Indian D1 chart with the geometry and content of our admin chart (`apps/admin/components/KundliChartSvg.tsx`): sign number in each house, planet abbreviations in their houses, "As" in the first house, "(R)" for retrograde, whole degrees where a house holds one or two bodies.

`BirthCharts.jsx` requests the chart with Delhi coordinates when the form has none (`formData?.latitude || "28.6139"`). That request now needs a `timezone` like every other (section 4).

**Dosha tabs** (`DoshaSections.jsx`)

The page labels each tab "Dosha Present" whenever data exists for it and "No Dosha" otherwise, and highlights values in red. That is the page's own wording, not data: it must be removed or reworded by the frontend. Astro Sushil does not present doshas as afflictions; no response of this module contains the word "dosha".

*Mangal tab* (`data.manglik`): our matchmaking engine has a per-person Manglik result with its factors, and exactly that is returned.

| Field the page reads | Result |
|---|---|
| `is_present` | provided: the engine's effective result (a Manglik placement from the Ascendant with no classical exception) |
| `manglik_status` | provided, different value: "Manglik", "Not Manglik", "Manglik placement with an exception" or "Cannot be determined" (the vendor sent codes such as "INEFFECTIVE") |
| `manglik_reason` | provided: where Mars is, in plain words ("Mars is in Aquarius, in the 6th house from the Ascendant.") |
| `manglik_report` | provided: one neutral sentence |
| `consideration` | provided: Mars counted from the Moon and from Venus |
| `percentage_manglik_present` | **not provided**: the engine computes no percentage |
| also returned | `is_mars_manglik_cancelled`, `factors` (houses from Ascendant, Moon and Venus, the status from each, and the engine's list of exceptions) |

The engine's internal grade (`severity`) and its comparison text are not passed on.

*Kaal Sarp tab* (`data.kalsarpa_details`: `present`, `type`, `name`, `one_line`, `direction`): **not provided**. Removed by owner decision (2026-11-24). The tab must be removed from the page.

*Pitra tab* (`data.pitra_dosha_report`: `is_pitri_dosha_present`, `report`, `conclusion`, `pitra_dosha_points`): **not provided**. Removed by owner decision (2026-11-24). The tab must be removed from the page.

*Sadhesati tab* (`data.sadhesati_current_status`)

| Field the page reads | Result |
|---|---|
| `sadhesati_phase` (the page shows "Yes" when it is set) | provided: `null` when Sade Sati is not running, otherwise "Saturn in the 12th sign from the Moon", "Saturn in the Moon sign (peak)" or "Saturn in the 2nd sign from the Moon" |
| `is_sadhesati` | provided (boolean) |
| `is_undergoing_sadhesati` | provided (boolean; the page prints it as text) |
| `report` | provided: one neutral sentence with the cycle's dates |
| `moon_sign` | provided |
| `saturn_sign` | provided while Saturn is in a sign the engine tabulates (the Sade Sati signs, and the 4th and 8th from the Moon); `null` otherwise |
| `sadhesati_phases[]` (`phase`, `start`, `end`, `type`) | provided: the sign-by-sign segments of the running cycle, or of the next cycle when none is running and one begins within ten years; `type` is "completed", "current" or "upcoming"; dates are `YYYY-MM-DD` |
| also returned | `cycle_start`, `cycle_end`, `cycle_is`, `definition` (the engine's own definition), `as_of` |

Source: the engine's `SadeSatiPeriodsCalculator`, the one the reports use, over ten years before and after today. Note that `POST /api/v1/astrology/sade-sati` itself still answers 410 ("decommissioned"); see open question 3.

**Vimshottari** (`data.vimshottri_antar_vdasha`; no current page renders it, the shape is the vendor's as used in the website's own older code)

| Field | Result |
|---|---|
| `vimshottri_major_vdasha[]` (`planet`, `start`, `end`) | provided |
| `vimshottri_antar_vdasha` (`{ <Mahadasha lord>: [{ planet, start, end }] }`) | provided |

`start` and `end` are ISO 8601 UTC instants (the vendor sent local date texts).

**Basic panchang** (`data.basic_panchang`; no current page renders it)

| Field | Result |
|---|---|
| `day` | provided: weekday of the civil date of birth |
| `tithi`, `nakshatra`, `yog`, `karan` | provided, at the birth instant |
| `sunrise`, `sunset` | provided: local time of the birth place, `HH:mm:ss`; `null` where the Sun does not rise and set that day |
| `vedic_sunrise`, `vedic_sunset` | **not provided**: the engine has one sunrise definition (upper limb with refraction) |

### 3.3 Match-making form (`MathKundli.jsx`)

Request: `GET /astrology/match-making?male_lat=&male_long=&male_dob=&male_hour=&male_min=&female_...=&label=`, optionally `male_timezone`, `female_timezone`, `male_name`, `female_name`.

Why the page showed a hardcoded result until now: it sends `male_name` and `female_name`, the website backend's validation refused unknown fields, the request failed, and the page fell back to its built-in sample. Here the names are accepted (and not used, stored or cached).

Two things the frontend must change on this page:

1. It sends fixed coordinates (Delhi for the boy, Mumbai for the girl) whatever place is typed. It must send the coordinates and `timezone` of the selected places.
2. The built-in sample result (`useAstrologyStore.setState({ matchMaking: {...} })` after a failed call) must be removed, so a failed request shows an error and not somebody else's result.

`label`: comma-separated list of `match_ashtakoot_points, match_birth_details, match_astro_details, match_percentage, match_making_report, match_manglik_report, match_planet_details`. `match_dashakoot_points` and `match_obstructions` are accepted and nothing is returned for them.

Response: `{ success: true, data: { ... } }`; the page's check `result.data?.data` passes.

### 3.4 Match report page (`Matchreportpage.jsx`)

The page renders a constant object in its source today, not the response. These are the fields it destructures and what the endpoint returns for them. The boy is the engine's person A, the girl person B.

**`match_ashtakoot_points`**

| Field the page reads | Result |
|---|---|
| `varna`, `vashya`, `tara`, `yoni`, `maitri`, `gan`, `bhakut`, `nadi`: `description` | provided, different value: the engine's own description of the koota |
| ... `male_koot_attribute`, `female_koot_attribute` | provided, different wording: the engine's values ("Brahmin", "Chatushpada", "Mongoose", "Antya", English sign names for `bhakut`, nakshatra names for `tara`, sign lords for `maitri`) |
| ... `total_points`, `received_points` | provided |
| `total.total_points`, `total.received_points` | provided (36 and the engine's total) |
| `total.minimum_required` | provided: 18, the threshold the engine itself applies |
| `conclusion.status` | provided: the engine's result for that threshold |
| `conclusion.report` | provided, different value: a factual sentence ("The Ashtakoota score is 14.5 out of 36 points. ...") |

**`match_birth_details.male_astro_details` / `female_astro_details`**

| Field | Result |
|---|---|
| `year`, `month`, `day`, `hour`, `minute`, `latitude`, `longitude` | provided (the request's values) |
| `timezone` | provided, different value: the real UTC offset of the birth place at birth, in hours (the vendor always sent 5.5). `timezone_name` holds the IANA name |
| `sunrise`, `sunset` | provided, local time |

**`match_astro_details.male_astro_details` / `female_astro_details`**

| Field the page reads | Result |
|---|---|
| `ascendant`, `sign`, `SignLord`, `Naksahtra`, `NaksahtraLord` | provided |
| `Tithi`, `Yog`, `Karan` | provided, at the birth instant |
| `tatva`, `paya` | provided, engine wording (see 3.2) |
| `Varna`, `Vashya`, `Yoni`, `Gan`, `Nadi`, `Charan` | provided |

**`match_percentage`**

| Field the page reads | Result |
|---|---|
| `ashtakoota_percentage` | provided: the score as a share of 36 |
| `manglik_match_percentage`, `rajju_match_percentage`, `vedha_match_percentage`, `match_percentage`, `is_match_good` | **not provided**: the engine computes no such percentages and no overall verdict |

**`match_making_report`**

| Field the page reads | Result |
|---|---|
| `ashtakoota.status`, `ashtakoota.received_points` | provided |
| `manglik.status`, `manglik.male_percentage`, `manglik.female_percentage` | **not provided** (no percentages); the Manglik comparison is in `match_manglik_report` |
| `rajju_dosha.status`, `vedha_dosha.status` | **not provided** |
| `conclusion.match_report` | **not provided**: the engine writes no overall verdict |

**`match_manglik_report`**

| Field the page reads | Result |
|---|---|
| `male` / `female`: `manglik_status`, `manglik_report`, `is_present`, `is_mars_manglik_cancelled` | provided (as in 3.2) |
| `male` / `female`: `percentage_manglik_present` | **not provided** |
| `conclusion.match` | provided: true when both charts agree (both have the placement or neither has) |
| `conclusion.report` | provided, different value: a neutral sentence; `conclusion.verdict` holds the engine's code |

**`match_planet_details.male_planet_details` / `female_planet_details`**

| Field the page reads | Result |
|---|---|
| `name`, `sign`, `nakshatra`, `house` | provided (nine planets) |
| `isRetro` | provided as a boolean |
| `planet_awastha` | provided (Baladi avastha: Bala, Kumara, Yuva, Vriddha, Mrita) |

**`match_dashakoot_points`** (`dina`, `gana`, `yoni`, `rashi`, `rasyadhipati`, `rajju`, `vedha`, `vashya`, `mahendra`, `streeDeergha`, `total`): **not provided**. The engine has a Dashakoota table that says for each of the ten kootas whether it matches, marked "provisional, pending client review", and deliberately assigns no points (no verified point scheme). The page needs points, so nothing is returned. See open question 5.

**`match_obstructions`** (`is_present`, `vedha_report`): **not provided**, for the same reason (Rajju and Vedha exist only in the provisional table).

The page must stop reading the sections marked "not provided": it destructures them without a check and would fail on a missing object.

### 3.5 Daily horoscope (`useAstrologyStore.getDailyHoroscope`)

No page of the current frontend calls it, and the website backend forwarded the body to the vendor unchecked, so the vendor's request and response fields are not known from the code.

Request: `POST /astrology/daily-horoscope` with `{ "sign": "Aries" }` (English or Sanskrit name; `zodiac` and `rashi` are accepted as the same field) or `{ "rashiIndex": 1 }`, and optionally `"date": "YYYY-MM-DD"` (today minus 7 days to tomorrow, Indian time) and `"language": "en" | "hi"` (`lang` is accepted too; default `en`).

Response: `{ success: true, data: <our Rashi Bhavishya result> }`, the same object as `GET /rashi-bhavishya/today`: `date`, `rashi`, `facts` (panchang, Moon, planets, events), `prediction` (the day's text in the requested language), `language`, `narrativeSource`. The signs are Moon signs.

Note: the store calls `handleRequest(url, params, key, "post")` but `handleRequest` always uses `axios.get`, so today's frontend would send a GET and get 404. It must send a POST.

### 3.6 Report list and report page (`Reportssection.jsx`, `ReportsDetails.jsx`, `BookingForm.jsx`)

Requests: `GET /report`, `GET /report/slug/:slug`, `GET /report/:id`. Envelope `{ statusCode, success, message, data }` as on the website.

| Field the pages read | Result |
|---|---|
| `_id` | provided, different value: our catalogue id (for example `report-planetary-summary`), not a MongoDB id. Send it back as `reportId` |
| `name` | provided: Mini Horoscope, Basic Horoscope, Pro Horoscope, Match Making |
| `slug` | provided, **provisional**: `mini-horoscope`, `basic-horoscope`, `pro-horoscope`, `match-making`. The real slugs are in the website database (open question 1) |
| `reportType` | provided: `mini_horoscope_pdf`, `basic_horoscope_pdf`, `pro_horoscope_pdf`, `match_making_pdf` |
| `shortDescription`, `description` | provided, different value: the title and description of the report that is now delivered (our catalogue), not the website's marketing text |
| `originalPrice` | provided (rupees): 499, 799, 1499, 1999 |
| `salePrice` | provided (rupees, before GST): 199, 299, 699, 999 |
| `gst.type`, `gst.rate`, `gst.enabled` | provided: `exclusive`, 18 (0 for Match Making) |
| `priceWithGst` | provided (rupees): 234.82, 352.82, 824.82, 999 |
| `priceBreakdown.total`, `.taxAmount`, `.rate`, `.base` (slug and id routes, and the list) | provided |
| `languages` | provided: the languages the report can be generated in, from the report registry |
| `coverImage` | **not provided** (`null`): the images are records of the website database |
| `benefits[]`, `features[]`, `faqs[]` | **not provided** (empty lists): marketing content of the website database (open question 4) |
| also returned | `salePricePaise`, `gstPaise`, `priceWithGstPaise` (integers), `currency`, `requires` (`customerDetails` or `matchMakingDetails`) |

Every amount comes from our catalogue item; `priceWithGst` is exactly what is charged. The catalogue stores the GST-inclusive amount, and it is shown here the way the website shows it (price before GST, GST added at checkout).

What each product now delivers (owner decision 2026-11-24):

| Website product | Catalogue item | Report |
|---|---|---|
| Mini Horoscope | `report-planetary-summary` | `PLANETARY_SUMMARY` |
| Basic Horoscope | `report-kundli-basic` | `KUNDLI_BASIC` |
| Pro Horoscope | `report-fortune-plus` | `FORTUNE_PLUS` |
| Match Making | `report-marriage` | `MARRIAGE_COMPATIBILITY` |

### 3.7 Report purchase (`BookingForm.jsx`)

`POST /report/buy` (login required).

| Field the form sends | Result |
|---|---|
| `reportId` | used: the `_id` from the list; the slug or the website report type is accepted too |
| `reportType` | optional. The type is taken from the product; a request naming another type is refused (the website trusted it) |
| `currency` | used: validated against the supported list by the commerce layer |
| `currencyRate` | **ignored**. The website multiplied the price by this number from the browser (security finding 3). The rate is looked up on the server |
| `customerDetails.{fullName, email, whatsappNumber, dateOfBirth, timeOfBirth, birthPlace, gender, pinCode, latitude, longitude, reportLanguage}` | used and validated (real date, `HH:mm` time, coordinates in range, e-mail, phone, language `en` or `hi`) |
| `matchMakingDetails.{bride, groom}` with the same person fields, and `reportLanguage` | used and validated |
| `customerDetails.timezone`, `bride.timezone`, `groom.timezone` | **new, needed** unless the coordinates came from our place search (section 4) |
| `idempotencyKey` | new, optional: a repeated request with the same key returns the same order |

Response `data`:

| Field the form reads | Result |
|---|---|
| `razorpayConfig.key`, `.orderId`, `.amount`, `.currency` | provided; `amount` is in the minor units of the charged currency |
| `order` | provided, smaller: `_id` (our order id), `reportId`, `reportType`, `reportLanguage`, `baseAmount`, `amountPaise`, `currency`, `razorpayOrderId`, `paymentStatus`, `reportStatus`. The website returned the whole stored document including the personal details; this does not |

`POST /report/verify-payment` (login required): `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` are read; `reportId` and `formData`, which the form also posts, are ignored. Response `data`: `_id`, `paymentStatus: "paid"`, `reportStatus: "pending"`, `reportGenerationStatus`, `isReportSent: false`, `deliveryMessage`.

### 3.8 My reports (`Myreportssection.jsx`)

`GET /report/orders` (login required).

| Field the page reads | Result |
|---|---|
| `_id` | provided: our order id (use it for the invoice: `GET /invoices/orders/:orderId/pdf`) |
| `reportId.name` | provided |
| `reportUrl` | provided, different value: a signed link that expires after 15 minutes, created when the list is fetched. The website's links were permanent public files (security finding 10). The page must fetch the list again rather than keep an old link |
| also returned | `reportDbId`, `reportId._id/slug/reportType`, `reportType`, `reportLanguage`, `reportStatus: "completed"`, `isReportSent: true`, `paymentStatus: "paid"`, `baseAmount`, `amountPaise`, `currency`, `createdAt`, `deliveredAt` |

As on the website, an order appears only after its report is delivered: the report is completed and `REPORT_SEND_DELAY_HOURS` (default 24) have passed since completion. Refunded and cancelled orders are not listed. The list holds every report the customer bought through an order, including reports bought in the mobile app (website and app share customers and orders); for those `reportId.name` is the catalogue title and `reportType` is `null`.

The page's invoice download calls `GET /report/orders/:orderId/invoice`; it must call the invoices module's route.

## 4. Timezone: an intended correction, and one thing that is missing

The vendor assumed Indian time (UTC+5:30) for every birth (`tzone: 5.5`, `f_timezone ?? 5.5` in `report.controller.js`), so every chart for a birth outside India was calculated for the wrong instant. This backend never assumes a zone. For a birth abroad the results now differ from the vendor's, correctly. For example, 15 May 1990, 14:30 in New York is calculated at UTC-4, not UTC+5:30: the Moon is about 5 degrees further and the Ascendant is another sign (tested).

How the zone is found, in this order:

1. `timezone` in the request (the IANA name place search returns).
2. Otherwise, the zone our own place search returned for exactly these coordinates (4 decimal places). The website pages copy latitude and longitude from the selected place unchanged, so the current free kundli page works with only the base-URL change, as long as the place was picked from the suggestions.
3. Otherwise the request is refused with 422 `TIMEZONE_REQUIRED`. Nothing is guessed.

**What is missing.** The task description assumed our locations or birth-profile code can find a timezone from coordinates. It cannot: place search receives the zone from the geocoding provider together with each place, and birth profiles require the zone as input. There is no coordinates-to-timezone table in the repository. Step 2 above therefore only knows places that were searched through this backend; it is kept in memory (and in Redis when configured, for 30 days), so after a restart without Redis a kundli request without `timezone` is refused until the place is searched again.

The dependable fix is one of:

- the frontend sends `timezone` with every request (it already receives it from place search); or
- a coordinates-to-timezone lookup is added to the backend. That needs a new package (for example `tz-lookup`, CC0 licence, about 70 kB, no network) or a boundary data set. Not added: new packages need approval.

Requests that use the website's fixed fallback coordinates (`28.6139, 77.2090` when the form has none; Delhi and Mumbai on the match-making page) are refused unless they carry a `timezone`.

A birth time that does not exist or exists twice because of a daylight-saving change is refused with `VALIDATION_ERROR` (`AMBIGUOUS_LOCAL_TIME` / `NONEXISTENT_LOCAL_TIME`), as in `POST /astrology/kundli`. These endpoints have no field to choose between the two instants; a saved birth profile has.

## 5. Abuse protection (security finding 8)

The website forwarded these four public endpoints to a paid vendor and to Google with only a global limit of 10,000 requests per 15 minutes.

- **No paid call.** Kundli and match-making are calculated in this process. Place search uses a free provider with a 24-hour cache. The daily horoscope is stored per sign, date and language; an on-demand text is generated at most once per sign, date and language, and only for today and tomorrow (existing behaviour of the Rashi Bhavishya module).
- **Per-IP limits** on every endpoint (table in section 2), through the API's rate limiter. Behind a proxy `TRUST_PROXY` must be set, as for the rest of the API.
- **Cache of identical requests.** A kundli or match-making request with the same birth data and sections is calculated once per process and kept for 6 hours (2,000 entries); identical requests arriving together share one calculation. Names are not part of the key.
- **Strict validation** before any calculation: numbers must be numbers (an empty string is not zero), coordinates and times in range, dates real and between 1900 and today, sections from a fixed list, unknown fields refused.

## 6. Report purchase: how it runs

There is no second payment path and no second report generator.

1. `POST /report/buy`: the product is resolved to its catalogue item; the language is checked against the report registry; the buyer's birth profile is found or created (two for Match Making); `CommerceService.createOrder` is called with `items: [{ catalogId, quantity: 1, metadata }]`. Price, GST and exchange rate are worked out there.
2. The item `metadata` holds `source: "website"`, `websiteReportType`, `birthProfileId`, `partnerProfileId` (Match Making), `language`, and the contact details typed in the form (`contact`, `partnerContact`: name, e-mail, WhatsApp number, PIN code, gender).
3. `POST /report/verify-payment`: `CommerceService.verifyPayment` (owner check, signature, amount and currency read back from the gateway, ledger, invoice number). It sends `PAYMENT_SUCCESS`, which the notification bridge turns into **`reportOrderConfirmed`** ("within the next 48 hours": e-mail, WhatsApp, SMS). Confirmed by reading `notification.bridge.ts`; nothing had to be added.
4. Then `ReportsService.createReportJob({ birthProfileId, partnerProfileId, reportType, orderId, language })`: the report row is created in the purchased language and generated by the existing worker. `ReportsService` itself refuses any other language for a paid slot.
5. **`reportReady`** is raised for the completed report `REPORT_SEND_DELAY_HOURS` after completion: the worker announces at completion only when the delay is 0, otherwise the release sweep (`reports/report-release.sweep.ts`) raises `REPORT_READY` when the delay has passed, and the bridge turns it into `reportReady` (e-mail and WhatsApp). Confirmed by reading `report-worker.service.ts`, `report-release.sweep.ts`, `notification.bridge.ts` and `notification.events.ts`; nothing had to be added.
6. `GET /report/orders` lists the order from that same moment. It uses the release rule of `reports/report-release.ts` (`isReportReleased`), the one the report API uses, so the website list, the app and the announcement cannot disagree.

Birth profiles: a profile of the same customer with the same name, date, time, coordinates and timezone is reused; otherwise one is created through `BirthProfilesService`. For Match Making the **groom is the primary profile and the bride the partner profile**: the couple report counts the primary chart as the groom's in the directional kootas (Varna, Vashya) when no gender is stored, and birth profiles store no gender.

### Differences from the website's purchase

| Website | Here | Why |
|---|---|---|
| Price multiplied by `currencyRate` from the browser | Server price and server rate | Security finding 3 |
| `reportType` from the request | From the product | Security finding 3 |
| Checked the vendor's balance before selling | No such check | No vendor |
| Vendor PDF with our cover and back page added (`processReportPdf.js`, `REPORT_CONFIG` images) | Our own report PDF, with its own cover | The four cover images of `REPORT_CONFIG` are not used |
| Confirmation sent to the contact typed in the form (single-person reports) or to the buyer (Match Making) | Sent to the buyer's account contact | The bridge reads the account. See "changes needed elsewhere", item 3 |
| Report files public on S3 | Signed links, 15 minutes | Security finding 10 |
| Order document with all personal details returned to the browser | Compact order | Less personal data in responses |
| Report generation started by verify or by the webhook | Started by verify only | See "changes needed elsewhere", item 2 |
| Blocked customers could still buy | Refused | Security finding 12 |

## 7. Data migration: website collections to our tables

No table is added by this module. For the later migration:

**`reports` (four product documents)**: not migrated as rows. They correspond to the four catalogue items in section 3.6. `name`, `slug`, `shortDescription`, `description`, `coverImage`, `benefits`, `features`, `faqs`, `isPremium`, `isActive` have no home yet (open question 4). `originalPrice`, `salePrice`, `gst` are already in the catalogue as read from the site on 2026-11-24; the migration should compare them with the live documents and report any difference.

**`reportorders`** (only `paymentStatus: "paid"`; the website deletes pending ones after two days):

| Website field | Our place |
|---|---|
| `_id` | `Order.legacyId` (owned by the money / migration work) |
| `userId` | `Order.userId` through the customer mapping |
| `reportId`, `reportType` | `OrderItem.catalogId` by the table in 3.6; `Order.reportType`; `metadata.websiteReportType` |
| `customerDetails` / `matchMakingDetails.bride`, `.groom` | one `BirthProfile` each (name, date, time, place, coordinates), plus `OrderItem.metadata.contact` / `partnerContact`. **Timezone:** the website stored none and generated with 5.5; set `Asia/Kolkata` only where the place is in India, and list the others for review |
| `reportLanguage` (`customerDetails.reportLanguage` or `matchMakingDetails.reportLanguage`) | `OrderItem.metadata.language`, `Report.language` |
| `baseAmount`, `amount`, `currency`, `currencyRate`, `gst.*` | `Order.amount` (INR paise), `paidAmountMinor`, `paidCurrency`, `exchangeRate`, `taxAmount`; `OrderItem.taxRate`, `taxAmount` |
| `razorpayOrderId`, `razorpayPaymentId` | same-named `Order` fields. `razorpaySignature` is not kept |
| `invoiceNumber`, `invoiceAllocationStatus` | invoices module |
| `paymentStatus` | `Order.status` / `paymentStatus` |
| `reportStatus`, `reportGenerationStatus`, `reportGenerationError`, `...Attempts`, `...Token`, `...StartedAt`, `...NextRetryAt`, `...CompletedAt` | `Report.status`, `completedAt`; the retry bookkeeping is not carried |
| `reportUrl` | The vendor PDF stays in S3: `Report.storageKey` (or `s3Url`) pointing at the existing object. These are vendor reports, not ours, and must not be regenerated |
| `isReportSent`, `isEmailSent`, `isWhatsappSent` | Not carried as flags. A migrated completed report must get a `completedAt` old enough to be listed, and must not raise `reportReady` again |

Quirks seen in the code: `reportUrl` is first set to the vendor's link and later replaced by our S3 copy with covers; an order can be `paid` with `reportGenerationStatus: "failed"` (the migration must list those, they are owed a report); for Match Making the confirmation went to the buyer, for the others to the form's contact.

## 8. Changes needed in files this module does not own

1. **`apps/api/src/plugins/rate-limit.ts`: rate-limited requests answer 500 instead of 429 (whole API, existing defect).** `errorResponseBuilder` returns `{ error: {...} }` without `statusCode`; `@fastify/rate-limit` 9 throws that object, and `globalErrorHandler` falls through to "500 INTERNAL_ERROR". The request is refused and the `retry-after` / `x-ratelimit-*` headers are correct, but the status and code are wrong. Fix: return `{ statusCode: 429, error: {...} }` from the builder (the handler's existing 429 branch then answers `RATE_LIMIT_EXCEEDED`), or handle the builder's object in `error-handler.ts`. Found with `POST /astrology/matchmaking` on the unchanged app; the tests here accept 429 or 500 until it is fixed.
2. **`apps/api/src/modules/webhooks/webhooks.routes.ts`: a payment captured only by the webhook gets no report.** If the buyer closes the browser before `verify-payment`, the webhook marks the order paid (and the confirmation is sent), but nothing creates the report job: in this backend a report is created by an explicit call (`POST /reports`), and for the website flow by `verify-payment`. Needed after the webhook's transaction commits for a claimed order: `await webReportsService.ensureReportForOrder(order.id, { id: order.userId, role: 'USER' })` inside a try/catch. The function is idempotent and ignores orders that did not come from the website form. Until then, a repeated `verify-payment` for that order (already paid: answered without a signature check, owner only) creates the report.
3. **`apps/api/src/modules/notifications/notification.bridge.ts`: confirmation contact.** `reportOrderConfirmed` goes to the account's e-mail and phone. Customers log in by OTP and may have no e-mail on the account, while the form collects one. Suggested: in `orderPaid`, fall back to `items[].metadata.contact` (`email`, `whatsappNumber`, `fullName`) when the account has no e-mail. Product question 2 decides whether the form's contact should even take precedence, as on the website.
4. **`apps/api/src/modules/astrology` (`POST /astrology/sade-sati`)** still answers 410 "decommissioned" although Sade Sati is shown again (decision of 2026-11-20). This module reads the engine's calculator directly. Open question 3.
5. **Coordinates-to-timezone lookup** (section 4), if the frontend is not to send `timezone`: a new package in `apps/api` and one function in the locations module.
6. **`BirthProfile` has no gender.** The form's gender is kept only in the order item metadata. The couple report decides which chart is the groom's from gender when it is known; here it relies on the order of the two profiles.

## 9. Environment variables

None new. Used: `REPORT_SEND_DELAY_HOURS` (existing, default 24), `RAZORPAY_KEY_ID` (existing, returned as the checkout key), `TRUST_PROXY` (existing, needed for per-IP limits behind a proxy), `REDIS_URL` (existing, optional: shares the place-timezone memory between processes).

After cut-over the website backend's `ASTROLOGY_API_URL`, `ASTROLOGY_API_PUBLIC_KEY`, `ASTROLOGY_API_SECRET_KEY` and `GEOCODING_API_KEY` are no longer needed.

## 10. Open questions

1. **Slugs.** What are the four slugs in the website's `reports` collection? The ones here are placeholders; existing links to report pages depend on them.
2. **Who gets the confirmation and the report?** On the website a single-person report is confirmed to the contact typed in the form, which need not be the buyer. Here it goes to the buyer's account. Keep the website's behaviour?
3. **Sade Sati on the public API.** Should `POST /astrology/sade-sati` be re-opened now that Sade Sati is shown again, so there is one public source?
4. **Product page content.** Cover image, benefits, features and FAQs of the four report pages are records of the website database. Should the catalogue become editable (a report-products table with these fields and an admin screen, as on the website), or does the rebuilt frontend carry this content itself?
5. **Dashakoot, Rajju, Vedha.** The engine's Dashakoota table is "provisional, pending client review" and has no points. Should the match report page drop these sections, or should the table be shown as match / no match after the client's review?
6. **Match percentages and overall verdict.** The page shows an overall match percentage and "GOOD / POOR". The engine computes neither. Drop them, or does the client have a rule?
7. **Daily horoscope by Moon sign.** Ours is by Moon sign (rashi). The vendor's was probably by Sun sign. Is Moon sign what the website should show?
8. **Wording of the engine's values.** Attributes appear in the engine's wording ("Brahmin", "Manava", "Rajata (Silver)"). If the website must show the vendor's wording ("Vipra", "Maanav", "Silver"), that is a display table for the frontend or a decision about the engine's names.
9. **Mobile-app reports in "My reports".** The website list now also shows reports bought in the app. Intended?
