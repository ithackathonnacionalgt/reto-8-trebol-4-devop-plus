# MINTRAB source inspection

Inspected on 2026-09-10 from the official MINTRAB portal:

- Listing used by the provider: <https://mintrabajo.gob.gt/noticias/>
- Category focus: `employment_development` (Empleo y Emprendimiento).
- The listing exposes announcements about national job fairs, technical courses, and the Temporary Foreign Work Program (Programa de Trabajo Temporal en el Extranjero).
- The parser consumes semantic `article` blocks and heading links. It does not execute scripts or depend on client-side rendering.
- WordPress post URLs and permalinks are normalized into canonical representations.
- The HTML fixture is intentionally reduced and must be refreshed if the observed markup changes.

The real-network check is opt-in and is not part of the default test suite.
