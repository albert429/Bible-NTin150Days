# Development guide

## Structure

| Path                                                | Responsibility                                                               |
| --------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/main.tsx`                                      | React bootstrap and global styles                                            |
| `src/App.tsx`                                       | Reader state, navigation, progress actions, and application dialogs          |
| `src/components/Reader.tsx`                         | Continuous Arabic Scripture and completion                                   |
| `src/components/Navigation.tsx`                     | Sticky toolbar and sheet coordination                                        |
| `src/components/navigation/`                        | Menu, day details, and appearance panels                                     |
| `src/components/Sheet.tsx`                          | Accessible native dialog, restrained motion, focus restoration               |
| `src/components/{About,Calendar,Dialogs,Share}.tsx` | Secondary screens loaded on demand                                           |
| `src/{readings,useReading}.ts`                      | Static fetching, validation, cache, deduplication, stale-response protection |
| `src/progress.ts`                                   | Validated local profiles, completion, backups, and restore                   |
| `src/useAppearance.ts`                              | Saved font size and theme preferences                                        |
| `src/useAdjacentPrefetch.ts`                        | Deferred, connection-aware preparation of neighbouring readings              |
| `src/appInfo.ts`                                    | App credits, contact links, and Scripture source                             |
| `data/`                                             | Canonical Scripture plan and extracted source table                          |
| `scripts/`                                          | Static build, imports, asset regeneration, visual and performance checks     |
| `tests/`                                            | Unit/data checks and mobile browser workflows                                |
| `docs/assets/`                                      | README artwork and actual app screenshot; never shipped in the app           |

## Commands

| Command                           | Purpose                                                            |
| --------------------------------- | ------------------------------------------------------------------ |
| `npm run dev`                     | Development server, port 5173; generates static readings first     |
| `npm run build`                   | Generate readings, type-check, and build `dist/`                   |
| `npm start`                       | Preview `dist/`, port 4173                                         |
| `npm test`                        | Progress, dates, loading, and exact static-data fidelity           |
| `npm run test:browser`            | Mobile Chromium and WebKit workflows, layout and axe accessibility |
| `npm run format` / `format:check` | Apply / verify repository formatting                               |
| `npm run validate`                | Formatting, unit/data checks, and build                            |
| `npm run test:visual`             | Save preview screenshots under `artifacts/`                        |
| `npm run audit:performance`       | Save repeatable mobile Lighthouse reports under `artifacts/`       |

Browser tests start the production preview themselves. Install their browsers with `npx playwright install chromium webkit` (`--with-deps` on Linux). `CHROMIUM_PATH` optionally selects an existing Chromium executable; WebKit uses its own installed browser.

Visual and performance scripts expect a running `npm start`. `BASELINE_URL` optionally adds a baseline site. Compare builds using the same server, throttling, and environment. Reports and traces are ignored by Git.

## State and privacy

`nt-reading-progress-v1` stores profiles, the active reader, personal start dates, and completed days in localStorage. Backup imports create a separate profile. `word-font` and `word-dark` preserve appearance settings. Clearing site data or moving to another browser/domain requires restoring a saved backup to retain progress.

Schedules use Cairo dates. Catch-up and advance reading do not move a reader's start date. Daily JSON is cached in memory during the browser session, with concurrent requests deduplicated; failed requests can be retried. This is not a persistent offline/PWA implementation.

While reading, adjacent days are prepared 500ms after the selected day and its fonts settle. Save-Data and reported slow-2g, 2g, or 3g connections suppress this background work; browsers without connection information allow it. Navigation cancels queued work, while already-started requests remain shared with foreground loading. Speculative failures are silent and do not prevent a later retry.

Closed sheets keep only their native dialog shell mounted. Their content mounts on opening and stays mounted through the exit animation. Opening takes 150ms and closing takes 100ms, with animation completion and a CSS-duration fallback coordinating queued actions. Reduced motion closes immediately. Scripture and font-size changes are not animated.

## Static hosting

On Vercel, import the repository, use the **Vite** preset, build with **`npm run build`**, and publish **`dist`**. `vercel.json` records these settings. Pushes to the connected production branch redeploy automatically. There are no `/api` routes or database environment variables.

If the app shows **تعذر تحميل القراءة**, verify that `/readings/plan.json` and `/readings/1.json` return JSON. The build must run `npm run build`, which invokes `prebuild`; running `vite build` directly skips the reading-data generation step.

## Source regeneration

The supplied `New_Testament_150_Day_Arabic.docx` controls passage order. The original table is retained in `data/source-plan.json`; the importer normalizes the document's reversed RTL reference notation.

```sh
python3 scripts/extract-plan.py /path/to/New_Testament_150_Day_Arabic.docx
curl -L --fail https://ebible.org/Scriptures/arb-vd_usfm.zip -o /tmp/arb-vd.zip
python3 scripts/import.py /tmp/arb-vd.zip
npm run validate
```

Expected coverage: **150 days, 537 passages, 7,966 verse occurrences, 7,959 unique verses, all 27 New Testament books and 260 chapters**. Seven repeated verses in the original plan are intentional. Never remove repeats or reorder passages merely to simplify data.

To regenerate committed font and logo assets, install Python packages `fonttools brotli pillow` and run `python3 scripts/optimize-assets.py`. Production deployment does not require Python. Original fonts and logo sources are preserved; license texts are bundled under `public/fonts/`.

The Bible favicon is drawn in `src/assets/favicon.svg`. Edit that vector source and run `npm run icons:build` to export its 32px PNG fallback (requires the installed Playwright Chromium browser). The church logo regeneration script handles only the church artwork.

## Verification baseline

The mobile redesign was checked at 320, 360, 390, and 430px, landscape, dark/light themes, 38px text, and narrow reflow. At 390×844 the first verse starts at approximately **162px**. Browser coverage uses Chromium and mobile WebKit emulation; it is not a claim of physical-device testing.

Three identically throttled mobile Lighthouse runs before/after the redesign produced median performance scores **82 → 87**, LCP **3,754 → 3,693ms**, and CLS **0.154 → 0.082**, with accessibility **100**. These are local measurements rather than guaranteed scores on every device. Re-run the audit when changes affect initial rendering or assets.

The subsequent repository refactor and About addition were compared against release `e5204db` with three runs per build under identical throttling: median performance **87 → 87**, accessibility **100 → 100**, LCP **3,680 → 3,678ms**, and CLS **0.08646 → 0.08646**. Initial transfer increased by about 0.3KB. The README images are documentation-only and do not load in the app.

The focused responsiveness pass was compared against `781e060`, with three runs per build under the same mobile Lighthouse throttling: median performance **87 → 88**, accessibility **100 → 100**, LCP **3,678 → 3,604ms**, CLS **0.08646 → 0.08646**, and total transfer **525.2 → 501.8KB**, including speculative reading requests. The hidden 192px menu logo no longer loads before opening the menu. In three separate Chromium mobile runs with 150ms network latency and 200,000 bytes/s download throughput, tapping Next after a 1.5s settling period took a median **183.6 → 7.5ms** to paint the next reading. The prefetched reading showed no loading placeholder. These are controlled local measurements, not guarantees for every connection or device.
