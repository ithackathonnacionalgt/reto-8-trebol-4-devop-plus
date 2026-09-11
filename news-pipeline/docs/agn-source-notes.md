# AGN source inspection

Inspected on 2026-09-10 from the official AGN site:

- Listing used by the provider: <https://agn.gt/ultimas-noticias/>
- A listing contains article links with visible Spanish headlines and dates.
- Individual articles expose a headline, a visible subtitle/summary in some cases, a publication date and body text.
- The parser consumes semantic `article` blocks and heading links. It does not execute scripts or depend on client-side rendering.
- The HTML fixture is intentionally reduced and must be refreshed if the observed markup changes.

The real-network check is opt-in and is not part of the default test suite.
