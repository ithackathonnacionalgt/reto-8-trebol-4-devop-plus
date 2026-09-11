# SEGEPLAN source inspection

Inspected on 2026-09-10 from official SEGEPLAN pages:

- Listing used by the provider: <https://portal.segeplan.gob.gt/segeplan/?page_id=7505>
- The listing exposes notes in semantic heading links with visible Spanish excerpts and dates.
- WordPress post URLs may use a `?p=<id>` query parameter; the provider preserves that stable identifier as `sourceId`.
- The source emits raw title/content only. Relevance, category and citizen action remain responsibilities of the AI processor.
- The HTML fixture is reduced and must be refreshed if the observed markup changes.

The real-network check is opt-in and is not part of the default test suite.
