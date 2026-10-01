# العهد الجديد بالترتيب الزمني

A frontend-only Arabic New Testament reading app with the supplied 150-day chronological plan. React + TypeScript + Vite. No backend, database, credentials, or environment variables are required.

## Run

Node.js 22:

```sh
npm install
npm run dev
npm test
npm run build
npm start
```

`npm run dev` opens a development server on port 5173. `npm start` previews the production build on port 4173. The predev/prebuild scripts generate 150 daily JSON files and a small plan index in `public/readings/`; Vite includes them in `dist/`.

## Deploy on Vercel

Import the GitHub repository, choose the **Vite** preset, use **npm run build**, and set the output directory to **dist**. The checked-in `vercel.json` supplies these defaults. Pushes to the connected branch trigger redeployment. No `/api` routes, serverless functions, Neon account, database, or paid plan are needed for this version.

Verify `/readings/plan.json` and `/readings/1.json` return JSON after deployment. If they do not, check that the deployment built the latest commit using the complete `npm run build` command (which runs `prebuild`), not `vite build` alone.

## Reading and progress

- Read all 150 days in their original passage order, with Arabic verse numbers, source headings, Amiri typography, 22–38px text, and light/dark modes.
- The main workspace prioritizes Scripture. Navigation is in a drawer; the passage index expands on demand.
- Each reader selects a personal start date. Calendar dates use Cairo time. Catch-up and advance readings never shift the schedule.
- Progress is stored only in the current browser's localStorage under `nt-reading-progress-v1`. It survives refreshes and ordinary browser restarts. Clearing site data, private browsing cleanup, changing browsers, or changing the site's domain does not preserve that browser's progress.
- Multiple readers can use the same browser. Switching readers preserves each profile, including duplicate names.
- Settings allows downloading a JSON backup and restoring it on another browser. A backup is a snapshot, not a sync link. Imports create a separate profile and do not overwrite existing progress. Keep backups private because they contain the reader's name, start date, and completed days.
- There is no live group activity or automatic device synchronization. Readers can copy a completion message or choose to open WhatsApp to share it themselves. Site links share only the public reading app.
- Existing server-based device tokens/recovery links from the earlier implementation are not usable in this version. Local SQLite files are left untouched and remain excluded from Git. Previously saved server progress is not automatically migrated.
- Bible files are static but still require a network connection when first fetched. This is not an offline/PWA implementation.

## Source and import

The user-supplied `New_Testament_150_Day_Arabic.docx` is the authority for passage order. Original table text is retained in `data/source-plan.json`. The importer normalizes its reversed RTL range notation.

Bible source: [Arabic Van Dyck, eBible.org](https://ebible.org/bible/details.php?id=arb-vd), identified as public domain. Scripture wording and section headings are preserved; presentation markers are removed.

```sh
python3 scripts/extract-plan.py /path/to/New_Testament_150_Day_Arabic.docx
curl -L --fail https://ebible.org/Scriptures/arb-vd_usfm.zip -o /tmp/arb-vd.zip
python3 scripts/import.py /tmp/arb-vd.zip
npm run build
```

Validation: 150 days, 537 passages, 7,966 verse occurrences, and all 7,959 unique verses in this source New Testament. Seven repeated verses from the original plan are intentionally retained. All 27 books and 260 chapters are represented.

Tests verify exact static passage fidelity, saved progress, duplicate names, catch-up, undo, switching readers, backup restoration, malformed data, date validation, and storage failures.

## Design and performance verification

The reader uses a responsive ivory/olive design, accessible light/dark themes, larger touch controls, and an 800px reading surface. Calendar and dialog components load on demand. Daily readings are cached for the browser session, concurrent requests are deduplicated, and failed requests offer a retry. Existing progress and backup formats are unchanged.

Font assets now use WOFF2: approximately 396 KB instead of 1.14 MB (65% smaller). Conversion preserves glyphs, character mappings, and Arabic shaping tables. Original fonts are retained in `assets/source-fonts/`; licenses remain in `public/fonts/`. To regenerate assets, install Python packages `fonttools brotli pillow` and run `python scripts/optimize-assets.py`. Generated assets are committed, so deployment needs no Python tooling.

```sh
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:browser
# With the production preview running (npm start):
npm run test:visual
npm run audit:performance
```

`CHROMIUM_PATH` optionally selects an existing Chromium executable. `BASELINE_URL` optionally adds a baseline site to screenshot and performance comparisons. Reports are saved under ignored `artifacts/`. Performance comparisons should use the same server and environment for both builds.

Validated locally: production build, 11 unit/data tests, and 7 browser tests, including progress/backup flows, request races and retry, keyboard focus, and automated accessibility checks at 360, 390, 768, and 1440px in both themes. Lighthouse scores and deployed cache headers have not yet been verified. GitHub Actions runs the build and test suites on Node 22.
