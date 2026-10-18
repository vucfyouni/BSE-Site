# Blank Slate Entertainment

BSE's public marketing site, photographer portfolios, starting-quote calculator, private team applications and approved-crew show board.

Production: https://blank-slate-entertainment.readyray14.chatgpt.site

## Source and hosting

`public/` contains the marketing pages, local photographs and browser scripts. `app/api/[...segments]/route.ts` routes authenticated requests to `server/portal.mjs`. Vinext and the Sites Vite plugin build a Cloudflare Worker with D1 (`DB`) for records and private R2 (`BUCKET`) for portfolio uploads. `.openai/hosting.json` retains the existing Sites project identity.

GitHub contains the complete source. The backend runs on Sites; GitHub Pages alone cannot run the crew service. Do not reuse this project's hosting identity for an unrelated site.

## Crew portal and applications

Marketing pages are public. Applications and crew access use ChatGPT sign-in through Sites. New applicants must confirm they are 18 or older and upload a PDF, JPEG, PNG or WebP portfolio, up to 8 MB. Uploads are private to their applicant and administrators.

The server-only `ADMIN_EMAILS` runtime setting contains comma-separated verified administrator emails. Configure it in Sites settings, never in frontend files or committed environment files. Sign in to `/crew-portal.html` with an administrator account to review applications, approve crew disciplines, post approved shows with limited photo/video slots, close shows and revoke access. Approved crew can accept or release one eligible slot per show. Pending and revoked accounts cannot access the show board.

Authorization uses Sites-provided identity headers, server-side membership checks and same-origin writes. SQL is parameterized; slot acceptance is atomic; portfolio downloads require applicant or administrator access. Do not expose the Worker directly outside the trusted Sites identity gateway.

## Pricing

Photography and videography start at $50 per contractor per set. The estimate adds an attendance charge per set:

- $15 per started 100 expected attendees for venues with capacity up to 400.
- $40 per started 100 expected attendees when venue capacity exceeds 400.
- When capacity is omitted, expected attendance determines the tier.
- Photography bookings expecting more than 300 attendees require at least two photographers. Video-only bookings do not add a photographer.

Formula: `sets × (50 × requested contractors + ceil(expected attendance / 100) × attendance rate)`.

Editing, RAW delivery and audio recording are scope choices quoted separately until the owner supplies add-on prices. Their costs are excluded from the starting estimate and clearly identified in the inquiry. The booking form opens an email draft containing the calculation and scope; it does not send email or confirm a booking.

## Local development

Use Node 22.13 or newer:

```sh
npm ci
npm run build
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_amusing_star_brand.sql
npm start -- --port 8788 --var ADMIN_EMAILS:owner@example.test
```

Local D1/R2 state stays in ignored `.wrangler/`. For browser interaction tests only, local requests may supply the trusted identity headers; production identity must come from Sites. Never publish test identities or local state. `npm run dev` is also available for development. Schema changes belong in `db/schema.ts`; run `npm run db:generate` and commit each generated migration. The Sites plugin includes migrations in the build artifact for deployment.

`npm test` runs security and workflow tests against actual SQLite with an R2 test adapter. Additional browser verification covered responsive pages, quote thresholds and email content, and application → admin approval → crew acceptance/release against a locally built Worker with D1/R2.

## Media and feeds

The public local galleries contain Carlos's 44 photographs, Connor's 18 and Skylar's 14. Five available team headshots are included. The homepage cycles through nine credited photographs from those three contributors; actual crowd photos provide subdued section backgrounds. Images have keyboard-accessible viewers and responsive display derivatives. Provenance is recorded in `public/assets/media-manifest.json`.

Drive imports are snapshots, not automatic synchronization. Larger new source originals are retained locally in ignored `source-media/`; optimized display copies are committed. At the latest import, Nick and Roland/Chloe portfolio folders and Logan's clips folder were empty, and no shared Roland/Chloe headshot was available. Their bios and social links remain present. Clip sections stay hidden until genuine local clips are added to `public/assets/portfolio-media.json`; the renderer supports muted inline playback with visibility and reduced-motion handling.

The homepage includes the supplied BSE and Skylar native Behold widgets. See `FEED_SETUP.md` for feed settings and optional portfolio JSON feeds. Live provider content depends on Behold authorization and settings. External Behold/Instagram playback could not be verified from this environment's restricted network.

Fonts are self-hosted under the included license. The displayed BSE logo is circular; the multi-resolution ICO is square.
