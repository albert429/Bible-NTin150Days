# Third-party notices

## Arabic Van Dyck Scripture

Source: [eBible.org Arabic Van Dyck (`arb-vd`)](https://ebible.org/bible/details.php?id=arb-vd), edition last updated 2020-08-03. Translation: Syrian Mission. Contributor: American Bible Society.

eBible.org classifies this source edition as **public domain**. The Scripture wording and genuine section headings are preserved in `data/plan.json`; build scripts package the same text as static daily readings. The project claims no copyright over this text. Presentation, reading-plan organization, application code, and third-party assets have separate rights; the public-domain statement is not a license for every asset in the repository or every edition of the translation.

Source archive: [arb-vd USFM](https://ebible.org/Scriptures/arb-vd_usfm.zip). Import provenance and coverage counts are recorded in [data/SOURCES.md](data/SOURCES.md).

## Fonts

- **Amiri** — Copyright 2010–2022 The Amiri Project Authors. [Bundled SIL Open Font License 1.1](public/fonts/Amiri-OFL.txt).
- **Noto Sans Arabic** — Copyright 2022 The Noto Project Authors. [Bundled SIL Open Font License 1.1](public/fonts/NotoSansArabic-OFL.txt).

Original TTF files are retained in `assets/source-fonts/`; WOFF2 conversions preserve glyphs and Arabic shaping tables. Font licenses remain available in the deployed app under `/fonts/`.

## Church logo and reading plan

The church logo and the 150-day plan were supplied for this app. Their inclusion does not grant a separate right to reuse the church identity or source document. The original Word document is not committed; the extracted reading table is retained in `data/source-plan.json` for passage-order verification.

## Documentation artwork

The README banner and community illustration were created with the built-in image generation tool for this repository. They illustrate the purpose of the app; they are not Scripture sources, screenshots, or depictions of identifiable church members. The screenshot in the README was captured from the running app. [Prompts and provenance](docs/design/image-prompts.md).

The banner includes an eBible.org attribution and logo based on the [official logo asset](https://ebible.org/icon/eBibleorglogo.svg). The eBible.org identity belongs to its owner; the Scripture edition's public-domain status does not extend to the logo.

## Software dependencies

React and React DOM use the MIT License; Lucide uses the ISC License. Each installed dependency retains its own license in the npm package. The lockfile records exact dependency versions. The application copyright notice does not override these licenses.

The small React mark in About the app and the README is adapted from the [official React website's Logo component](https://github.com/reactjs/react.dev/blob/main/src/components/Logo.tsx), credited to Meta Platforms, Inc. and affiliates under MIT. It uses a restrained monochrome color. The [MIT notice is bundled](public/licenses/react-logo-MIT.txt).
