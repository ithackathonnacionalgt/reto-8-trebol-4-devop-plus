# MSPAS source inspection

Inspected on 2026-09-10 from the official MSPAS/Salud portal:

- Listing used by the provider: <https://salud.gob.gt/noticias/>
- Category focus: `health_wellbeing` (Salud y Prevención).
- The listing exposes institutional notices regarding national vaccination campaigns, dengue/vector prevention campaigns, hospital announcements and health advisories.
- The parser consumes semantic `article` blocks and heading links. It does not execute scripts or depend on client-side rendering.
- WordPress post URLs and permalinks are normalized into canonical representations.
- The HTML fixture is intentionally reduced and must be refreshed if the observed markup changes.

The real-network check is opt-in and is not part of the default test suite.
