# Plan de implementación por hitos — News Pipeline

Este documento divide la implementación descrita en `estructura-pipeline-noticias.md` en hitos incrementales. Cada hito debe dejar el repositorio en un estado coherente, verificable y apto para que otra IA continúe desde el siguiente.

## Reglas de ejecución del plan

- Trabajar dentro de `news-pipeline/` y mantener el pipeline como proceso batch de una sola ejecución; no crear un servidor HTTP.
- Usar inglés para código, archivos, carpetas, tipos, propiedades JSON y nombres de tests. Mantener en español los logs y textos visibles, salvo el contenido traducido a K'iche' (`quc`).
- No usar `any`, mantener TypeScript en modo estricto y validar todos los datos externos con Zod.
- No inventar selectores de sitios gubernamentales. Antes de implementar una fuente real, inspeccionar el sitio, documentar la evidencia mínima necesaria y capturar fixtures sin datos sensibles.
- No hacer llamadas reales a Internet, DeepSeek o R2 en la suite unitaria predeterminada.
- No registrar secretos ni incluir archivos `.env` reales en Git.
- Al finalizar cada hito, ejecutar todas las verificaciones indicadas en ese hito. Corregir los errores antes de crear el commit.
- Cada hito corresponde a un único commit. El commit debe contener solamente el encabezado, sin body, con el mensaje exacto propuesto o uno equivalente que conserve Conventional Commits.
- No mezclar trabajo de hitos posteriores en un commit anterior. Si se descubre una decisión relevante, registrarla en la documentación del hito que la introduce.
- Antes de empezar un hito, revisar `git status` y el último commit para identificar con precisión qué está terminado.

## Estado de avance

- [x] Hito 1 — Base del proyecto y herramientas
- [x] Hito 2 — Dominio, taxonomía y validación del documento
- [x] Hito 3 — Configuración, errores, logging y utilidades resilientes
- [x] Hito 4 — Acceso HTTP y normalización para scraping
- [ ] Hito 5 — Abstracción de fuentes, registro y fuente simulada
- [ ] Hito 6 — Identidad y deduplicación determinista
- [ ] Hito 7 — Contrato, prompts y validación de IA
- [ ] Hito 8 — Integración con DeepSeek
- [ ] Hito 9 — Persistencia local y Cloudflare R2
- [ ] Hito 10 — Servicios de procesamiento y consolidación
- [ ] Hito 11 — Orquestador, dry run y ejecutable batch
- [ ] Hito 12 — Fuente real de AGN
- [ ] Hito 13 — Fuente real de SEGEPLAN
- [ ] Hito 14 — Pruebas integrales y comportamiento ante fallos
- [ ] Hito 15 — Docker y operación en Raspberry Pi
- [ ] Hito 16 — Cierre, documentación y aceptación final

---

## Hito 1 — Base del proyecto y herramientas

**Objetivo:** crear un proyecto Node.js + TypeScript reproducible con todos los controles de calidad disponibles, todavía sin lógica de negocio.

**Dependencias:** ninguna.

**Trabajo incluido:**

1. Inicializar `package.json` para pnpm y fijar una versión compatible mediante `packageManager`.
2. Definir la versión LTS soportada de Node.js en `engines` y, si se considera útil, en `.nvmrc`.
3. Instalar y configurar TypeScript estricto, Vitest, ESLint, Prettier, Zod y las definiciones de Node.
4. Crear `tsconfig.json`, `vitest.config.ts`, `eslint.config.js` y `prettier.config.js`.
5. Añadir los scripts `dev`, `build`, `start`, `test`, `test:watch`, `test:integration`, `lint`, `format`, `format:check` y `typecheck`. En esta etapa pueden apuntar a una entrada mínima, pero deben ejecutar correctamente.
6. Crear la estructura base `src/`, `tests/unit/`, `tests/integration/`, `tests/fixtures/`, `tests/helpers/` y `output/` con archivos de conservación cuando sean necesarios.
7. Crear una entrada mínima compilable en `src/index.ts`, sin servidor ni lógica de negocio.
8. Configurar `.gitignore` para excluir `.env`, artefactos compilados, cobertura, previews y dependencias; conservar `output/.gitkeep`.
9. Crear `.dockerignore` inicial para evitar enviar secretos, dependencias locales, resultados de pruebas y artefactos innecesarios al contexto de Docker.
10. Generar y versionar `pnpm-lock.yaml`.

**Verificación:**

- `pnpm lint`
- `pnpm format:check`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Confirmar que no se inicia ningún proceso persistente ni servidor.

**Criterio de cierre:** una instalación limpia puede compilar, probar y revisar el proyecto con los scripts acordados.

**Commit:** `chore(pipeline): scaffold TypeScript project and quality tooling`

---

## Hito 2 — Dominio, taxonomía y validación del documento

**Objetivo:** establecer los contratos centrales y garantizar que solamente se puedan construir documentos `noticias.json` válidos.

**Dependencias:** Hito 1.

**Trabajo incluido:**

1. Implementar `src/domain/newsCandidate.ts`, `news.ts`, `newsFile.ts`, `categories.ts` y `source.ts`.
2. Modelar `NewsCandidate`, `NewsItem`, `LocalizedNewsContent`, `NewsFile`, categorías y metadatos sin usar `any`.
3. Definir la taxonomía cerrada con los seis IDs exigidos y sus nombres visibles en español.
4. Garantizar que `CategoryId` se derive de la constante de categorías para evitar duplicación y categorías libres.
5. Implementar en `src/validation/newsSchemas.ts` esquemas Zod para contenido localizado, noticias, categorías y documento completo.
6. Implementar `validateNewsFile` para devolver un valor tipado o lanzar `ValidationError`; no permitir publicación parcial.
7. Validar URLs, fechas ISO, contenido bilingüe, booleanos, listas de tags, coherencia entre `totalNews` y `news`, categorías disponibles y unicidad de IDs.
8. Decidir y documentar el orden estable del arreglo de categorías y de las noticias.
9. Añadir fixtures válidos e inválidos en `tests/fixtures/news/`.
10. Añadir pruebas unitarias de casos válidos, campos faltantes, categorías inventadas, traducción ausente, fechas inválidas, totales incoherentes e IDs repetidos.

**Verificación:**

- `pnpm test -- tests/unit/validation`
- `pnpm typecheck`
- `pnpm lint`

**Criterio de cierre:** el modelo completo de entrada y salida está tipado y un documento inválido nunca atraviesa la frontera de validación.

**Commit:** `feat(domain): define news models taxonomy and schemas`

---

## Hito 3 — Configuración, errores, logging y utilidades resilientes

**Objetivo:** centralizar configuración y comportamiento transversal antes de conectar servicios externos.

**Dependencias:** Hito 2.

**Trabajo incluido:**

1. Crear `src/config/constants.ts` para valores de dominio que no sean secretos.
2. Crear `src/config/env.ts` con Zod, conversión segura de números y booleanos, valores predeterminados explícitos y validación según el modo de ejecución.
3. Añadir `.env.example` con todas las variables indicadas: logging, DeepSeek, R2, scraping, IA, dry run y ruta de preview.
4. Definir claramente cuándo se exigen credenciales: R2 solo cuando se utiliza storage remoto; DeepSeek solo cuando se selecciona ese procesador. El modo local con fakes debe poder arrancar sin secretos.
5. Implementar `AppError`, `ConfigurationError`, `SourceError`, `AIError`, `ValidationError` y `StorageError`, preservando la causa cuando exista.
6. Implementar `logger.ts` con niveles y mensajes en español, campos estructurados seguros y serialización de errores sin revelar configuración sensible.
7. Implementar `sleep.ts`, `dates.ts` y `hash.ts` con APIs pequeñas e inyectables cuando el tiempo afecte las pruebas.
8. Implementar `retry.ts` con backoff limitado, máximo configurable y predicado explícito de errores temporales.
9. Probar variables faltantes, valores numéricos/booleanos válidos e inválidos, defaults, clasificación de errores reintentables y cantidad/espera de intentos.
10. Añadir una prueba que confirme que API keys y secretos R2 no aparecen en logs ni mensajes formateados.

**Verificación:**

- `pnpm test -- tests/unit/config`
- Ejecutar las pruebas unitarias de `retry` y `logger`.
- `pnpm typecheck`
- `pnpm lint`

**Criterio de cierre:** configuración inválida falla temprano con un mensaje en español y las utilidades transversales quedan cubiertas sin filtrar secretos.

**Commit:** `feat(core): add validated config logging errors and retry utilities`

---

## Hito 4 — Acceso HTTP y normalización para scraping

**Objetivo:** proporcionar una capa HTTP responsable y testeable que todas las fuentes puedan reutilizar.

**Dependencias:** Hito 3.

**Trabajo incluido:**

1. Crear `src/scraping/types.ts` con contratos explícitos para solicitudes y respuestas necesarias por las fuentes.
2. Implementar `httpClient.ts` sobre `fetch` nativo con `AbortController`, timeout, User-Agent configurable y tamaño/método limitado a lo necesario.
3. Clasificar como temporales solamente timeouts, 429, 502, 503 y fallos de red apropiados; no reintentar 404 ni respuestas inválidas permanentes.
4. Integrar el helper de retry sin crear ciclos infinitos y respetar los límites configurados.
5. Implementar `fetchPage.ts` para obtener HTML como texto sin evaluarlo ni ejecutar scripts.
6. Crear `htmlParser.ts` como frontera de parsing. Elegir una dependencia liviana solo si es necesaria y justificarla en README o comentario arquitectónico.
7. Implementar `normalizeUrl.ts`: quitar fragmentos, parámetros `utm_*` y trailing slash inconsistente, conservar parámetros funcionales, normalizar host/protocolo de forma segura y rechazar URLs no HTTP(S).
8. Diseñar la pausa entre solicitudes para que sea inyectable y no ralentice los tests.
9. Probar timeout, retries temporales, ausencia de retry en 404, User-Agent, HTML devuelto como datos y todos los casos de normalización exigidos.

**Verificación:**

- Ejecutar las pruebas unitarias de `scraping` sin Internet.
- `pnpm typecheck`
- `pnpm lint`

**Criterio de cierre:** las fuentes pueden descargar páginas mediante una única capa controlada, sin ejecutar contenido remoto y con URLs canónicas predecibles.

**Commit:** `feat(scraping): add resilient HTTP client and URL normalization`

---

## Hito 5 — Abstracción de fuentes, registro y fuente simulada

**Objetivo:** permitir múltiples fuentes aisladas y demostrar la recolección sin depender de sitios reales.

**Dependencias:** Hito 4.

**Trabajo incluido:**

1. Crear `src/sources/newsSource.ts` con la interfaz `NewsSource` y nombre estable de fuente.
2. Crear `sourceRegistry.ts` para construir la lista habilitada de fuentes sin acoplar el orquestador a implementaciones concretas.
3. Implementar `mockSource.ts` a partir de fixtures deterministas.
4. Añadir `tests/helpers/fakeNewsSource.ts` configurable para devolver candidatos o simular errores.
5. Implementar el esqueleto de `collectCandidates.ts`: consultar con concurrencia baja o secuencial, respetar la pausa configurada, agregar resultados y aislar errores por fuente.
6. Emitir logs en español al iniciar cada fuente, informar su cantidad de candidatos, registrar fallos y confirmar que se continúa.
7. Definir la regla para el caso en que fallan todas las fuentes. Debe evitar una publicación engañosa y quedar cubierta por pruebas.
8. Crear `src/sources/providers/ministries/.gitkeep` y stubs compilables de AGN/SEGEPLAN únicamente si no contienen selectores inventados; la lógica real se reserva para sus hitos.
9. Probar cero fuentes, una fuente, varias fuentes, una fuente fallida, todas fallidas y orden determinista del resultado.

**Verificación:**

- Ejecutar las pruebas unitarias de fuentes y `collectCandidates`.
- `pnpm typecheck`
- `pnpm lint`

**Criterio de cierre:** el sistema reúne candidatos de fuentes intercambiables y un fallo parcial no cancela las fuentes sanas.

**Commit:** `feat(sources): add source registry mocks and isolated collection`

---

## Hito 6 — Identidad y deduplicación determinista

**Objetivo:** impedir llamadas innecesarias a IA y mantener IDs estables entre ejecuciones.

**Dependencias:** Hitos 2, 4 y 5.

**Trabajo incluido:**

1. Implementar `buildNewsFingerprint.ts` con datos de origen normalizados y hashing determinista.
2. Aplicar la prioridad de identidad: `sourceId`, luego URL normalizada, luego fingerprint.
3. Definir namespacing por fuente para evitar colisiones entre IDs externos iguales.
4. Implementar `deduplicateCandidates.ts` contra el histórico y dentro del lote actual.
5. Implementar `deduplicateNews.ts` para proteger la consolidación incluso si recibe entradas repetidas.
6. Evitar depender de títulos, resúmenes o texto generado por IA como única señal.
7. Preservar el primer candidato encontrado de manera determinista y devolver estadísticas suficientes para los logs.
8. Probar misma URL, parámetros de tracking, fragmentos, trailing slash, `sourceId`, candidatos distintos, duplicados internos, colisiones entre fuentes e ID estable.
9. Probar que los arrays de entrada no se mutan.

**Verificación:**

- `pnpm test -- tests/unit/deduplication`
- `pnpm typecheck`
- `pnpm lint`

**Criterio de cierre:** cualquier candidato conocido o repetido se elimina antes del procesamiento de IA y cada noticia aceptada puede recibir un ID reproducible.

**Commit:** `feat(deduplication): add stable identity and early duplicate filtering`

---

## Hito 7 — Contrato, prompts y validación de IA

**Objetivo:** definir una frontera segura e intercambiable para clasificación, síntesis y traducción.

**Dependencias:** Hitos 2 y 3.

**Trabajo incluido:**

1. Crear `src/ai/aiProcessor.ts` con `AIProcessor` y la unión discriminada `ProcessedNewsResult`.
2. Crear `src/ai/schemas.ts` con Zod para respuestas relevantes e irrelevantes.
3. Requerir para resultados relevantes una categoría cerrada, tags, `urgent` y contenido completo `es`/`quc` con `title`, `summary` y `citizenAction`.
4. Rechazar JSON corrupto, tipos incorrectos, campos ausentes, categorías inventadas y traducción ausente.
5. Crear `prompts.ts` con instrucciones en español que exijan JSON estructurado, relevancia ciudadana, taxonomía cerrada, acción clara y traducción automática a K'iche'.
6. Explicar en el prompt que la traducción es automática y evitar afirmaciones de certificación humana u oficial.
7. Tratar todo el contenido scrapeado como datos no confiables y delimitarlo para reducir inyección de instrucciones desde páginas.
8. Crear fixtures `valid-response.json`, `irrelevant-response.json` e `invalid-response.json`.
9. Crear `fakeAIProcessor.ts` determinista y configurable por candidato.
10. Añadir todas las pruebas de validación IA requeridas por la especificación.

**Verificación:**

- Ejecutar las pruebas unitarias de `ai/schemas` y prompts.
- `pnpm typecheck`
- `pnpm lint`

**Criterio de cierre:** ninguna respuesta del modelo puede convertirse en noticia sin atravesar un esquema estricto y la IA puede sustituirse por un fake.

**Commit:** `feat(ai): define processor contract prompts and response validation`

---

## Hito 8 — Integración con DeepSeek

**Objetivo:** implementar el proveedor real de IA con timeouts, reintentos y validación estricta.

**Dependencias:** Hitos 3, 4 y 7.

**Trabajo incluido:**

1. Implementar `src/ai/providers/deepseekProcessor.ts` mediante `fetch` o el cliente mínimo técnicamente necesario.
2. Construir requests con base URL, modelo, API key y timeout provenientes de configuración.
3. Solicitar salida JSON estructurada cuando la API lo permita, sin confiar en esa garantía.
4. Parsear y validar la respuesta con los esquemas del Hito 7.
5. Reintentar errores temporales y respuestas JSON inválidas solamente hasta `AI_MAX_RETRIES`; no reintentar configuración inválida.
6. Lanzar `AIError` con causa y mensajes seguros en español, sin incluir API key, headers de autorización ni el contenido completo si pudiera ser sensible.
7. Permitir inyectar `fetch`, espera y reloj para pruebas deterministas.
8. Probar éxito relevante, irrelevante, JSON corrupto seguido de éxito, agotamiento de retries, timeout, 429/5xx, 4xx permanente y ausencia de secretos en errores.
9. Mantener cualquier prueba real separada y deshabilitada por defecto.

**Verificación:**

- Ejecutar las pruebas unitarias del proveedor con HTTP simulado.
- `pnpm typecheck`
- `pnpm lint`

**Criterio de cierre:** DeepSeek implementa `AIProcessor`, tolera fallos temporales acotados y jamás devuelve datos no validados.

**Commit:** `feat(ai): implement validated DeepSeek processor`

---

## Hito 9 — Persistencia local y Cloudflare R2

**Objetivo:** abstraer la lectura/publicación de `noticias.json` y proteger el histórico remoto.

**Dependencias:** Hitos 2, 3 y 8.

**Trabajo incluido:**

1. Crear `src/storage/newsStorage.ts` con `load()` y `save(newsFile)`.
2. Implementar `localNewsStorage.ts` con lectura validada, escritura UTF-8 y reemplazo seguro mediante archivo temporal cuando sea posible.
3. Implementar `r2NewsStorage.ts` con AWS SDK S3 compatible, endpoint derivado del account ID y credenciales inyectadas.
4. Distinguir objeto inexistente de errores reales de red, permisos o credenciales. Solo el primero devuelve `null`.
5. Validar todo documento cargado y todo documento recibido antes de guardarlo.
6. Publicar exactamente la clave configurada, por defecto `noticias.json`, con `Content-Type: application/json; charset=utf-8`.
7. No imponer todavía una política compleja de caché; dejar el punto de configuración preparado y documentado.
8. Crear `fakeNewsStorage.ts` con historial inicial, registro de guardados y errores simulables.
9. Probar carga inexistente, carga válida, carga inválida, guardado local, guardado R2, metadata, errores simulados y prohibición de guardar un documento inválido.

**Verificación:**

- `pnpm test -- tests/unit/storage`
- `pnpm typecheck`
- `pnpm lint`

**Criterio de cierre:** local y R2 comparten el mismo contrato, el historial inválido falla explícitamente y ninguna escritura acepta un documento corrupto.

**Commit:** `feat(storage): add validated local and R2 news storage`

---

## Hito 10 — Servicios de procesamiento y consolidación

**Objetivo:** implementar las transformaciones del pipeline como servicios pequeños y testeables antes de orquestarlas.

**Dependencias:** Hitos 2, 6, 7, 8 y 9.

**Trabajo incluido:**

1. Implementar `loadHistoricalNews.ts`, tratando `null` como histórico vacío y propagando errores reales.
2. Completar `processCandidates.ts` para invocar IA solo con candidatos nuevos, omitir irrelevantes y continuar tras fallos definitivos de candidatos individuales.
3. Convertir resultados aceptados en `NewsItem`, preservando metadatos de origen, fecha de publicación cuando exista, fecha de extracción e ID estable.
4. Implementar `consolidateNews.ts` como función pura que conserva histórico, añade únicamente novedades, evita duplicados y no muta entradas.
5. Definir un orden determinista de noticias, por ejemplo fecha de publicación/extracción descendente con desempate por ID, y probarlo.
6. Implementar `createNewsFile.ts` con categorías disponibles, `lastUpdatedAt`, `totalNews` y validación completa.
7. Implementar `publishNews.ts` como última frontera antes de storage, de modo que valide antes de serializar/guardar.
8. Añadir logs/resúmenes de candidatos nuevos, duplicados, relevantes, irrelevantes, omitidos y noticias finales.
9. Cubrir todos los casos de consolidación exigidos y casos de fallo individual de IA.

**Verificación:**

- `pnpm test -- tests/unit/services`
- `pnpm typecheck`
- `pnpm lint`

**Criterio de cierre:** todos los pasos de negocio pueden probarse por separado y la consolidación produce un `NewsFile` válido sin efectos secundarios.

**Commit:** `feat(services): implement news processing consolidation and publishing`

---

## Hito 11 — Orquestador, dry run y ejecutable batch

**Objetivo:** conectar el flujo completo con dependencias inyectables y entregar una corrida local funcional.

**Dependencias:** Hitos 5, 6, 8, 9 y 10.

**Trabajo incluido:**

1. Implementar `src/app/runPipeline.ts` con el orden obligatorio: cargar histórico, recolectar, deduplicar, procesar novedades, consolidar, validar y publicar/crear preview.
2. Definir un objeto de dependencias explícito para fuentes, IA, storage, logger, reloj y configuración.
3. Implementar `DRY_RUN=true`: ejecutar el pipeline completo, guardar `OUTPUT_PREVIEW_PATH` localmente y no llamar al `save` de R2.
4. Asegurar que la validación completa ocurre antes de cualquier publicación.
5. Implementar `src/index.ts` mínimo: cargar configuración, construir dependencias, ejecutar una sola vez, registrar error fatal y asignar `process.exitCode = 1`.
6. Permitir un modo de desarrollo completamente local con fuente/IA fake o fixtures, claramente seleccionado por configuración; no ocultar fallbacks a producción.
7. Implementar los logs en español del recorrido completo y evitar logs excesivos.
8. Añadir una prueba de humo de CLI o entrypoint que confirme que termina por sí solo.
9. Ejecutar manualmente un dry run y validar el preview generado con el esquema de `NewsFile`.

**Verificación:**

- `pnpm dev` en modo local/dry run.
- Validar `output/noticias.preview.json`.
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build && pnpm start` en modo local/dry run.

**Criterio de cierre:** una máquina sin credenciales externas puede ejecutar una corrida completa, generar un preview válido y terminar con el exit code correcto.

**Commit:** `feat(pipeline): orchestrate batch execution and dry run preview`

---

## Hito 12 — Fuente real de AGN

**Objetivo:** integrar AGN usando evidencia real y pruebas offline estables.

**Dependencias:** Hitos 4, 5, 6 y 11.

**Trabajo incluido:**

1. Inspeccionar la página real de AGN respetando robots, términos y límites. Identificar listado, enlaces, paginación necesaria, campos disponibles y formato de fechas.
2. Registrar en documentación técnica la URL inspeccionada, fecha de inspección, estrategia de extracción y limitaciones conocidas.
3. Guardar un fixture HTML representativo y reducido en `tests/fixtures/html/agn-sample.html`, sin scripts innecesarios ni datos sensibles.
4. Implementar `agnSource.ts` usando la infraestructura HTTP común; no ejecutar JavaScript remoto ni evadir anti-bot/CAPTCHA.
5. Extraer `source`, `sourceType`, `originalUrl`, `sourceId` si existe, `publishedAt`, `extractedAt`, `rawTitle` y suficiente `rawContent`.
6. Normalizar enlaces relativos, validar URLs y omitir entradas malformadas con logs acotados.
7. Limitar concurrencia, retries y número de páginas/artículos por corrida mediante configuración razonable.
8. Registrar AGN en `sourceRegistry` solo mediante una opción explícita de fuentes habilitadas.
9. Probar exclusivamente con fixtures: listado válido, campos ausentes tolerables, URL relativa, fecha inválida, HTML cambiado y resultado vacío.
10. Crear una prueba real opt-in, separada de `pnpm test`, para verificar que el contrato básico del sitio sigue vigente.

**Verificación:**

- Ejecutar pruebas offline de AGN.
- Ejecutar la prueba real solo si hay red disponible y de forma manual/opt-in.
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`

**Criterio de cierre:** AGN produce candidatos válidos desde el sitio observado y cambios de markup fallan de forma aislada, sin afectar otras fuentes.

**Commit:** `feat(sources): integrate AGN news source`

---

## Hito 13 — Fuente real de SEGEPLAN

**Objetivo:** integrar SEGEPLAN con el mismo nivel de trazabilidad y aislamiento que AGN.

**Dependencias:** Hitos 4, 5, 6 y 12.

**Trabajo incluido:**

1. Inspeccionar la fuente real de SEGEPLAN y decidir qué sección aporta noticias/convocatorias ciudadanas útiles, sin asumir selectores.
2. Documentar URL, fecha de inspección, campos observados, paginación y limitaciones.
3. Crear `tests/fixtures/html/segeplan-sample.html` a partir de markup representativo y reducido.
4. Implementar `segeplanSource.ts` con las mismas garantías de timeout, User-Agent, pausas, retries y contenido tratado como datos.
5. Mapear convocatorias a `NewsCandidate` sin realizar clasificación anticipada que corresponda a IA.
6. Normalizar URLs, IDs y fechas, tolerando campos opcionales y aislando entradas corruptas.
7. Registrar la fuente mediante configuración explícita.
8. Probar fixtures normales, enlaces relativos, ausencia de fecha/ID, markup inesperado, entradas repetidas y cero resultados.
9. Añadir una prueba real opt-in separada de la suite predeterminada.
10. Verificar una corrida local con AGN y SEGEPLAN donde un fallo simulado de una fuente permita continuar con la otra.

**Verificación:**

- Ejecutar pruebas offline de SEGEPLAN y de convivencia entre fuentes.
- Ejecutar la prueba real solo manualmente y con red disponible.
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`

**Criterio de cierre:** las dos fuentes iniciales funcionan de forma independiente y el registro permite agregar futuros ministerios sin modificar el núcleo del pipeline.

**Commit:** `feat(sources): integrate SEGEPLAN news source`

---

## Hito 14 — Pruebas integrales y comportamiento ante fallos

**Objetivo:** demostrar el contrato completo del pipeline y sus garantías de integridad con dobles de prueba.

**Dependencias:** Hitos 1–13.

**Trabajo incluido:**

1. Implementar `tests/integration/pipeline.test.ts` con el escenario obligatorio: 3 noticias históricas, 5 candidatos, 2 duplicados, 3 candidatos enviados a IA, 1 irrelevante, 2 aceptados y 5 noticias finales.
2. Verificar explícitamente qué candidatos recibió la IA y que ningún duplicado fue procesado.
3. Verificar conservación exacta del histórico, IDs estables, metadata actualizada y validez del documento final.
4. Verificar que un error de una fuente no cancela las demás.
5. Verificar que un candidato con fallo definitivo de IA se omite y los demás continúan.
6. Verificar que un historial inexistente inicializa vacío, mientras errores de red/credenciales al cargar abortan la ejecución.
7. Verificar que una validación final fallida y un fallo fatal previo a publicación dejan storage intacto.
8. Verificar que dry run escribe preview y nunca invoca R2.
9. Separar configuración de Vitest para que `pnpm test` excluya integración y `pnpm test:integration` la ejecute.
10. Revisar cobertura en las fronteras críticas: deduplicación, IA, consolidación, validación y storage. Añadir casos faltantes sin perseguir un porcentaje artificial.

**Verificación:**

- `pnpm test`
- `pnpm test:integration`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

**Criterio de cierre:** las pruebas demuestran el resultado funcional y, especialmente, que nunca se reemplaza el archivo publicado por uno inválido o incompleto ante fallos fatales.

**Commit:** `test(pipeline): cover end-to-end flow and failure isolation`

---

## Hito 15 — Docker y operación en Raspberry Pi

**Objetivo:** empaquetar el batch para ejecución reproducible en PC y Raspberry Pi mediante cron.

**Dependencias:** Hito 14.

**Trabajo incluido:**

1. Crear un `Dockerfile` multi-stage que instale con pnpm y lockfile congelado, compile TypeScript y copie solo artefactos/dependencias de producción a la imagen final.
2. Ejecutar con usuario no-root y un directorio de trabajo con permisos mínimos.
3. No fijar arquitectura en el Dockerfile; garantizar compatibilidad prevista con `linux/amd64` y `linux/arm64`.
4. Usar una imagen base de Node LTS compatible con las dependencias y Raspberry Pi 4.
5. Definir un único comando que ejecute el pipeline una vez y termine; no incluir cron ni supervisor dentro del contenedor.
6. Revisar `.dockerignore` para excluir `.env`, `.git`, tests si no son necesarios, previews y dependencias locales.
7. Documentar build, dry run, ejecución con `--env-file`, montaje de preview local y ejemplo de cron externo.
8. Documentar permisos del `.env`, rotación de credenciales y cómo interpretar exit codes/logs.
9. Construir y ejecutar la imagen local en dry run, comprobando que el proceso termina y que el preview es válido.
10. Si el entorno lo permite, validar build multi-arquitectura o al menos `linux/arm64`; si no, documentar el comando exacto pendiente y no afirmar que fue verificado.

**Verificación:**

- `docker build -t government-news-pipeline .`
- Ejecutar la imagen en dry run con configuración no sensible.
- Validar el preview producido por el contenedor.
- Repetir `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build`.

**Criterio de cierre:** la imagen corre una vez como usuario no-root, termina correctamente y puede ser invocada diariamente por cron en Raspberry Pi.

**Commit:** `build(pipeline): add secure multi-stage Docker runtime`

---

## Hito 16 — Cierre, documentación y aceptación final

**Objetivo:** dejar el news pipeline terminado, operable y listo para relevo, sin tareas funcionales pendientes dentro del alcance definido.

**Dependencias:** Hitos 1–15.

**Trabajo incluido:**

1. Actualizar `news-pipeline/README.md` con arquitectura, flujo, estructura, requisitos, instalación, configuración, ejecución local, dry run, producción, pruebas y troubleshooting.
2. Documentar claramente que no es backend HTTP, que las traducciones K'iche' son automáticas y no certificadas, y que Cloudflare Pages solo consume el JSON publicado en R2.
3. Documentar cómo habilitar fuentes, añadir una nueva fuente y ejecutar pruebas reales opt-in sin incorporarlas a la suite predeterminada.
4. Documentar el contrato final de `noticias.json`, URL/estrategia de exposición desde R2 y consideraciones de CORS/CDN sin inventar una política de caché todavía no decidida.
5. Revisar que no haya secretos, credenciales, previews, outputs generados, fixtures enormes o dependencias de desarrollo dentro de la imagen final.
6. Revisar que todos los logs visibles estén en español y todo el código/estructura técnica en inglés.
7. Revisar imports, código muerto, TODOs bloqueantes, stubs no implementados y fallbacks silenciosos. Resolver todo lo necesario para producción o documentar únicamente decisiones futuras expresamente fuera de alcance, como retención histórica y nuevas fuentes.
8. Ejecutar una corrida local completa con fakes, una corrida dry run con integraciones configuradas cuando existan credenciales y una prueba controlada de publicación R2 en un objeto/bucket no productivo si el entorno lo permite.
9. Confirmar que un fallo antes de `save` conserva el objeto anterior y que el documento publicado se puede descargar y validar.
10. Ejecutar la matriz final completa desde una instalación limpia.
11. Marcar todos los hitos completados en este documento y registrar cualquier verificación externa no ejecutable en el entorno, sin declarar terminado si bloquea un requisito esencial.

**Verificación final obligatoria:**

- `pnpm install --frozen-lockfile`
- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:integration`
- `pnpm build`
- `pnpm start` en una configuración local segura y confirmar terminación.
- `docker build -t government-news-pipeline .`
- Ejecutar el contenedor en dry run y validar `noticias.preview.json`.
- Verificar manualmente que el repositorio no contiene secretos y que `git status` incluye únicamente cambios deliberados antes del commit.

**Criterio de cierre:** el pipeline obtiene candidatos de AGN y SEGEPLAN, deduplica antes de IA, procesa y valida con DeepSeek, conserva el histórico, genera un documento bilingüe válido, soporta preview local, publica con seguridad en R2, tolera fallos parciales, corre como batch en Node/Docker y supera toda la definición de terminado. En este punto `news-pipeline` se considera completo dentro del alcance de la especificación.

**Commit:** `docs(pipeline): finalize operations and completion guide`

---

## Condiciones que nunca deben posponerse al último hito

Estas condiciones son transversales y deben comprobarse desde el primer hito que pueda afectarlas:

- La deduplicación sucede antes de IA.
- La publicación sucede después de validar el documento completo.
- Un fallo parcial de fuente o noticia se aísla; un fallo fatal de histórico, configuración o validación impide publicar.
- El histórico se conserva completo; no hay retención, paginación ni división en múltiples JSON en esta versión.
- `noticias.json` usa propiedades en inglés y contenido visible en español/K'iche'.
- `DRY_RUN=true` nunca modifica R2.
- Las pruebas predeterminadas son offline y deterministas.
- No hay servidor, daemon propio, endpoints ni framework HTTP.
- No se ejecuta HTML remoto, no se evade CAPTCHA y no se registran secretos.
- Cada commit debe ser pequeño, coherente, pasar sus verificaciones y usar únicamente un encabezado Conventional Commit sin body.
