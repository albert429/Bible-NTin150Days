# العهد الجديد بالترتيب الزمني

An Arabic-first, chronological New Testament reading app: 150 days, personal start dates, no password, and private group check-ins.

## Run locally

Requires Node.js 22 or newer and npm.

```sh
npm install
npm run dev
```

Open http://localhost:5173. The Vite frontend proxies `/api` to Express on port 3001.

```sh
npm test
npm run build
npm start
```

The production server serves both the built React app and API on port 3001. Set `PORT` and `DB_PATH` to override defaults. Keep the SQLite database on persistent storage; back it up using SQLite's backup API (or stop the server before copying the database and WAL files). Use HTTPS in a deployment because device credentials grant access to progress. No hosted service is configured or deployed.

## Experience

- Browse the entire plan before joining. Starting at the root creates your own group; share the invitation from “مجموعتي” to bring others into it.
- Enter a name and start date once. Names need not be unique; short member IDs distinguish people with the same name in activity.
- Arabic RTL reading with locally bundled Amiri and Noto Sans Arabic fonts, verse numbers, source section headings, 22–38px text size, dark mode and focus mode. The reading area uses the full workspace, with navigation in a collapsible drawer and an expandable passage index.
- Calendar dates follow Cairo time. Catch-up and advance readings never move the schedule. Future start dates are supported.
- A completion is idempotent and can be undone. Group activity shows check-ins made today, including readings for other days, and refreshes every 30 seconds.
- Device credentials are stored in localStorage; only their SHA-256 hashes are stored on the server. Each progress write is scoped to the credential's member.
- Settings contains a private recovery link. Open it on another device to restore access; its secret is removed from the address bar immediately. Keep it private: it authorizes access to the member's name and progress. This version does not provide credential revocation or password-based recovery.
- Invites and recovery links are different. Reading data is public; group activity requires membership. Existing members retain their group when opening another invitation.

## Source and import

The supplied `New_Testament_150_Day_Arabic.docx` is the authority for reading order. Its original table text is retained in `data/source-plan.json`; the importer explicitly normalizes the document's reversed RTL range notation rather than guessing with browser rendering.

Bible text: [Arabic Van Dyck, eBible.org](https://ebible.org/bible/details.php?id=arb-vd), marked public domain by the publisher. Download: https://ebible.org/Scriptures/arb-vd_usfm.zip. Text wording and source headings are retained. USFM presentation markers are removed.

To regenerate:

```sh
python3 scripts/extract-plan.py /path/to/New_Testament_150_Day_Arabic.docx
curl -L --fail https://ebible.org/Scriptures/arb-vd_usfm.zip -o /tmp/arb-vd.zip
python3 scripts/import.py /tmp/arb-vd.zip
```

Validated: 150 days, 537 passages, 7,966 verse occurrences, all 7,959 unique verses in the source New Testament. Seven repeats are present in the supplied plan and intentionally retained. All 27 books and 260 chapters are represented. Imported data is bundled; Bible reading does not call a third-party service at runtime.

Tests cover all daily payloads and ranges, Cairo midnight/DST and leap-date handling, invalid dates, duplicate names, credential isolation, private group activity, invalid invites, catch-up, advance readings, idempotency, undo and recovery credentials.

## Project layout

- `src/main.tsx`, `src/styles.css`: React UI and responsive reading design.
- `server/app.js`: Express routes, SQLite storage and member authorization.
- `server/dates.js`: Cairo date helpers.
- `data/plan.json`: validated passages and Bible text.
- `scripts/`: reproducible import tools.
- `tests/`: integration and date checks.

This version has an in-app calendar, as planned; it does not connect to Google/Outlook calendars or send WhatsApp messages. Group sharing requires deploying the server at a URL reachable by group members.
