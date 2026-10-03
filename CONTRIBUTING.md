# Contributing

Use Node.js 22 and install the locked dependencies with `npm ci`. Run `npm run dev` to work locally. No secrets or backend services are needed.

Before opening a pull request:

```sh
npm run format
npm run validate
npx playwright install chromium webkit
npm run test:browser
```

Explain the user-facing change and include relevant validation. For UI changes, include a mobile screenshot and check narrow widths, both themes, large Arabic text, keyboard focus, and reduced motion. Keep reading uncluttered and put secondary actions in sheets.

Preserve Scripture wording, section headings, passage order, and existing progress/backup formats. Do not edit generated `public/readings/` files; change the canonical sources through the documented import workflow and verify the data tests. Avoid changing the reading plan without checking the original table.

Keep names, saved progress, backups, credentials, and generated test reports out of commits. Generated reports belong in ignored `artifacts/`. Documentation images belong in `docs/assets/`, not the runtime bundle.

See [docs/development.md](docs/development.md) for architecture and data regeneration. Contributions do not change the repository's [license terms](LICENSE).
