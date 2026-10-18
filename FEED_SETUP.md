# Latest three Instagram posts

The homepage uses the owner-supplied BSE Behold widget sFN34nTkKgsojHqbSpK2 and Skylar widget KGMpGUBmykhZSUl8qKDW immediately below it, loaded once through https://w.behold.so/widget.js. It replaces the previous homepage preview grids and contributor selector. Layout, post count, theme, playback and source selection for this widget are controlled in the Behold dashboard. Its actual content must be verified against the live provider.

Individual portfolios still support the custom latest-three-post JSON carousels. Their JSON feed IDs remain unconfigured; direct Instagram links remain until those feeds are provided.

## Owner setup

1. Create a Behold account at https://behold.so/.
2. Each Instagram account must be a Business or Creator account. In Behold, open Sources, choose Add source, then Basic source. Connect an account you manage. For collaborators, copy the authorization link and send it to that account's owner; they can authorize without sharing their password or logging in to your Behold account.
3. Connect six distinct sources: blankslate.lv, sh00kones, carlosdherreraphotos, ieatpizzarollsdaily, ciddypics and munozmanor. Roland and Chloe share the munozmanor source and one portfolio page.
4. Add a User feed for each source and choose JSON output. Set Number of Posts to 3. Include images, videos, reels and albums. For Logan, enable off-feed reels if desired. To feature only video on his feed, select videos/reels; this then represents the latest three qualifying video posts rather than the latest three posts of any type.
5. Copy each public JSON feed URL, formatted as https://feeds.behold.so/FEED_ID. Send the six URLs with their associated handles. No Instagram password, Meta access token or Behold administrative API key is needed in the site.
6. Put each returned feed ID into its matching entry in public/social-feeds.json. In Behold's domain whitelist, add blank-slate-entertainment.readyray14.chatgpt.site; add any future custom domains separately.
7. Validate each portfolio displays its matching source, then publish. The homepage widget is independent of this JSON configuration.

## Behavior

- The site sorts posts by publication time, deduplicates them and displays at most three. A carousel counts as one post; its first item is previewed, with a link to the complete post.
- Videos have normal playback controls. Reels autoplay muted and loop only while the active slide is visible; they pause offscreen and respect reduced-motion preferences. Captions render as text. Instagram biographies are intentionally omitted at the owner's request.
- The browser requests the configured feed on page visits and checks visible feeds again every five minutes while the page is open. Behold's own update interval and quotas depend on the selected plan. Updates are not instantaneous.
- Posts stay with the provider and load dynamically; they are not automatically committed to Git. Static asset imports from Drive are separate.
- Wrong-account responses, missing feeds and provider failures retain direct Instagram links. Empty or unavailable feeds never generate fabricated posts.

## Plans checked during this change

The official pricing page lists Free: one source/feed with daily updates; Starter: three sources/feeds with hourly updates; Pro: 15 sources/feeds at $30/month with five-minute updates. All six sources fit within Pro, subject to its page-view quota. Start by testing one source on Free. Verify the current pricing before subscribing.

Sources:
- https://behold.so/docs/getting-started/
- https://behold.so/docs/json-feeds/
- https://behold.so/pricing/

## Drive photographs imported

On October 18, 2026, the connected Google Drive plugin located the shared ‘1. Blank Slate Website Staging’ folder and downloaded all 44 JPEGs from Member Portfolio Master/Carlos. Originals retain their exact filenames and bytes under dist/assets/photography/carlos/. Optimized gallery derivatives are under its web/ subfolder. Original Drive IDs, file URLs, sizes and SHA-256 hashes are recorded in dist/assets/media-manifest.json.

The four files in Top Crowd Shots also appear in Carlos’s collection. They are reused without duplicate original downloads; optimized backgrounds live under dist/assets/crowd/. Carlos’s Appleseed image is featured in the homepage hero with a photography credit. No generated crowd illustration remains.

dist/assets/portfolio-media.json maps the 44 gallery images to preserved full-resolution originals and lists the four alternating crowd backgrounds. This is a local snapshot; future Drive changes require another import. Drive imports do not activate live Instagram feeds.
