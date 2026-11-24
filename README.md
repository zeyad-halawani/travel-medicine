# Travel consult desk

Clinician-facing travel medicine reference for **Dr. Zeyad Halawani** (family medicine, Medina). Static files. No server, no paid API, no build step.

The live site is whatever is on `main`: [https://zeyad-halawani.github.io/travel-medicine/](https://zeyad-halawani.github.io/travel-medicine/). This branch is not live until it is merged. The GitHub account was renamed from `lubdupsm-lab` to `zeyad-halawani`. Do not change Pages settings or the domain from an agent session.

## What a visit is

1. Traveler profile (age band, pregnancy, immune status, a few contraindications, vaccines already documented). Kept in the browser only.
2. Itinerary of one or more destinations, with dates and a purpose (tourism, family, work, Hajj, Umrah).
3. A plan: CDC quotations with the page’s own review date, a vaccine timeline counted back from the first arrival, a malaria option list that flags contraindications, a counseling checklist, and a bilingual print sheet.

The map is a finder. Color means “a prophylaxis line exists” or “a notice is on file”, not a risk score.

## How it is published

GitHub Pages serves the repository root. `index.html` loads `css/`, `js/`, and `data/` with relative URLs, so the project site at `/travel-medicine/` works without a base-tag change. `.nojekyll` stops Jekyll from touching the files.

There is no GitHub Actions workflow and no compile step. `package.json` only marks the files as ES modules so the Node tests can import them.

`tools/build-destinations.py` is how `data/destinations.json` was produced on 24 November 2026. Re-running it needs network access to CDC destination pages and the cached WHO page under `/tmp/sources`. The site does not run that script.

## Clinical status on 24 Nov 2026

182 destinations.

- **171 reviewed:** the CDC destination page was fetched that day and the malaria table (or its absence plus the WHO malaria-free table) and the yellow fever lines shown on the card were taken from that page.
- **11 partial:** Bhutan, Türkiye, Iraq, Oman, Syria, Palestine, Hong Kong, Trinidad and Tobago, Puerto Rico, New Caledonia, French Polynesia. A CDC page was read for each except Palestine, but malaria was not established from a prophylaxis table or the WHO list. Palestine has no separate CDC destination page; the only sourced line is the global polio notice naming the West Bank and Gaza.
- **0 unreviewed.** “Reviewed” here means the quoted page was read. It is not a specialist sign-off of every sentence, and it is not entry clearance.

Saudi Hajj and Umrah text is the **1447H (2026)** MOH edition. The MOH pilgrims page, opened the same day, still said 1447–2026. No 1448H/2027 document was on that page.

## Tests

```bash
node tests/clinical-acceptance.mjs
node tests/ui-regression.mjs
```

The UI test needs Chrome and `puppeteer-core` (`npm install --prefix /tmp puppeteer-core`). It checks 360, 390, 768, and 1280 CSS pixels, Arabic RTL, the disclaimer, search, the malaria flags, Hajj tables, and print. Firefox was not installed in the environment that produced this branch.
