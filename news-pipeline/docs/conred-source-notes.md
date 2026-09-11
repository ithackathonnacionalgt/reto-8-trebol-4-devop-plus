# CONRED source inspection

Inspected on 2026-09-10 from the official CONRED portal:

- Listing used by the provider: <https://conred.gob.gt/noticias/>
- Category focus: `security_alerts` (Alertas y Emergencias).
- A listing contains article links with visible Spanish headlines, alert notices and dates.
- WordPress post structure utilizes semantic `article` elements, headings `<h1>`-`<h6>` with links, and optional `<time>` elements with ISO datetime or Spanish formatted dates.
- Individual posts expose headlines, excerpts/summaries, timestamps and emergency guidance.
- The HTML fixture is intentionally reduced and must be refreshed if the observed markup changes.

The real-network check is opt-in and is not part of the default test suite.
