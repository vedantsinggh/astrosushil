# Website integration: decisions needed from the owner

**Last updated:** 2026-11-24 (second round of decisions recorded)

Each item says what is built today, so nothing is blocked while it is open. Full detail is in the module documents under `docs/integration/modules/`.

## Decided on 2026-11-24 (second round)

| Item | Decision | Status |
|---|---|---|
| M3 Cash on delivery | Stays off. Old COD orders still migrate as history. | Done |
| M4 Refund endpoint | Staff only; customers can no longer call it. | Done |
| M6 Shipping | Website rule for both: flat Rs 500 when any item is physical. | Done |
| M9 Paid, slot taken | Staff reschedule the customer; a staff refund is the fallback. | Done |
| C1 `sharp` | Approved: WebP conversion and watermarked previews. | Done |
| M1 Full Kundli price | Rs 999 + GST. | Done |
| M8 Coupons | Apply to products, reports and consultations. | Done |
| R1 Report delay | The 24-hour delay applies everywhere: the app shows the report and sends its push after the delay too. | Done |
| B1 Working hours | Copy the website's live setting at migration; the app's hours stay until then. | At migration |
| B2 Consultation types | Only the website's are bookable after migration; the app's 18 tiers are switched off and kept for history. | At migration |
| S2 Staff password reset | An admin types the new password, as on the website. | Done |
| S1 Granting permissions | A staff member can grant only permissions they hold; super admins are unrestricted. | Done |
| C5 Courses | The app shows external links too; existing enrolments keep access. | Done |
| A1 Horoscope language | Follows the app language until the customer switches. | Done |
| S4 Customer delete | As built: erased and kept as "Deleted User" when there are paid orders, removed otherwise. | Done |
| OTP-only login | Now, backend and app together; staff keep e-mail and password. | Done |
| A2 App consultation booking | Fixed and verified. | Done |

The items below are still open unless listed above.

## Money

| # | Question | Built today |
|---|---|---|
| M1 | The full Kundli (about 83 pages) costs Rs 299 including GST; the Basic Kundli costs Rs 299 plus GST. What should the full Kundli cost? | Unchanged at Rs 299 |
| M2 | Match Making has GST rate 0 on the website. Intended? | Copied as it is |
| M3 | Cash on delivery: the website marks such orders paid at once. Offer it at all? | Switched off; old COD orders can still be migrated |
| M4 | The app has a refund endpoint the customer can call. Owner decision is no refunds: remove it, or restrict it to staff? | Kept; refuses foreign-currency orders |
| M5 | The website's note says product orders must not share the invoice counter; its code shares it. Which is true for the live data? | Shared by all sale types |
| M6 | Shipping: website charges a flat Rs 500 if any item is physical; the app charges Rs 99, free from Rs 2,000. Which? | App rule, configurable |
| M7 | A customer can cancel a paid product order before shipping and gets nothing back. Keep it open to customers, or staff only? | Open to customers, stock restored |
| M8 | Coupons apply to product carts only on the website. Also reports, consultations, courses? | Product carts only |
| M9 | A payment that arrives after its 15-minute slot hold expired and the slot was taken: who refunds or reschedules that customer? | Flagged to staff as a payment conflict |
| M10 | Printed invoice for a foreign-currency sale: INR, the paid currency, or both? | Not built (no invoice PDF yet) |
| M11 | Has anyone paid in Japanese yen on the live site? Its code would have charged 100 times too much. | Ours charges the correct amount |

## Reports and messages

| # | Question | Built today |
|---|---|---|
| R1 | In the app, the "report ready" push arrives at completion; e-mail and WhatsApp arrive 24 hours later as on the website. Delay the push too? | Push immediate |
| R2 | "Report ready" message: direct download link, or the reports page behind login? | Reports page |
| R3 | App report purchases now also get the website's "within 48 hours" message. Right wording for the app? | Sent |
| R4 | The other ten reports have never been generated in Hindi with the real model. Measure them? | Offline only |

## Staff and accounts

| # | Question | Built today |
|---|---|---|
| S1 | May a staff member grant permissions they do not hold themselves? The website allows it. | Allowed |
| S2 | Staff password reset: an admin types the new password (website), or e-mail a reset code? | Admin types it |
| S3 | A website admin and a customer with the same e-mail cannot be two accounts here. Merge, or change one? | Not decided; matters for the data migration |
| S4 | Deleting a customer who has paid orders: personal data is erased and the row kept as "Deleted User" so invoices and the ledger still add up. A customer who never paid is removed entirely. Acceptable? | As described |

## Bookings

| # | Question | Built today |
|---|---|---|
| B1 | Working hours after the switch: the app's (11:00 to 14:00 and 15:00 to 19:00, Sundays off, 60 days ahead) or the website's single window? | App's, editable in the admin |
| B2 | The app's 18 consultation tiers and the website's consultations will both exist after migration. Which are on sale? | Both kept |
| B3 | Booking confirmation writes a generated `meet.astrosushil.com` link and a fixed office address. Is that link real? | Existing behaviour kept |

## Content and uploads

| # | Question | Built today |
|---|---|---|
| C1 | Add the `sharp` image library (the website already uses it) for WebP conversion and watermarking product previews? | Not added; watermark requests are refused |
| C2 | Images capped at 10 MB, videos and product files at 50 MB (website: 50 MB for everything). Fine? | As described |
| C3 | Blog links: the website rebuilt a post's link when its title changed. Keep the link fixed once set? | Fixed |
| C4 | Many website settings (shipping charge, tax percent, maintenance mode, COD switch) are stored but never acted on by the website. Should any start to do something? | Stored only |
| C5 | Courses: the app's three courses are the ones the website links to. Should the app show links too, or stay on enrolment? | Both exist side by side |

## Mobile app

| # | Question | Built today |
|---|---|---|
| A1 | Horoscope language starts in English even when the app is in Hindi. Follow the app language? | Separate, English first |
| A2 | The app's consultation booking screen sends fields the backend has never accepted, so booking from the app likely does not work. Fix it now? | Not fixed |

## For the client's developer

- Staging environment, a copy of the live MongoDB data, and the list of environment settings.
- Whether SMSLane needs DLT template ids (none are in the website's code).
- Whether the S3 bucket still allows per-file public access.
- The security findings in `SECURITY-FINDINGS-2026-11-24.md`, plus two found since: yen payments charged 100 times too much, and any real values in the public settings record must be rotated.
