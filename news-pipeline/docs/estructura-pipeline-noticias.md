# Especificación de estructura — Pipeline de noticias gubernamentales

## 1. Objetivo del proyecto

Construir un proceso batch/cronjob profesional, modular y testeable que pueda ejecutarse:

- localmente en una PC para desarrollo y pruebas;
- en una Raspberry Pi 4 para producción;
- directamente con Node.js;
- o dentro de Docker.

La aplicación **no es un backend HTTP**, no expone endpoints y no levanta un servidor.

Su responsabilidad es ejecutar un pipeline una vez al día:

```text
Fuentes gubernamentales
        ↓
Obtención / scraping
        ↓
Normalización inicial
        ↓
Deduplicación temprana
        ↓
Procesamiento con IA
        ↓
Filtrado + clasificación + síntesis + traducción
        ↓
Validación
        ↓
Consolidación con histórico
        ↓
Generación de noticias.json
        ↓
Cloudflare R2
        ↓
Frontend estático en Cloudflare Pages
```

Cloudflare Pages alojará el frontend estático.

Cloudflare R2 alojará el archivo generado:

```text
noticias.json
```

El frontend únicamente hará un `fetch()` del JSON y lo renderizará.

---

# 2. Convenciones de idioma

## Código y estructura

Todo lo siguiente debe nombrarse en **inglés**:

- nombres de archivos;
- nombres de carpetas;
- variables;
- funciones;
- clases;
- interfaces;
- tipos;
- enums;
- propiedades de objetos JSON;
- claves internas;
- nombres de tests;
- nombres de módulos.

Ejemplo:

```ts
interface NewsItem {
  id: string;
  originalUrl: string;
  source: string;
  categoryId: CategoryId;
}
```

NO usar:

```ts
interface Noticia {
  urlOriginal: string;
  fuente: string;
}
```

---

## Strings de dominio y textos visibles

Los textos que verá el usuario deben permanecer en **español**, salvo el contenido traducido a K'iche'.

Ejemplos:

```json
{
  "name": "Educación y Becas"
}
```

Los logs también deben mostrarse en español:

```text
Pipeline iniciado
Cargando histórico de noticias
42 noticias existentes
Consultando fuente AGN
15 candidatos encontrados
12 duplicados descartados
3 candidatos nuevos
Procesando noticias con IA
2 noticias aceptadas
1 noticia descartada por irrelevante
Publicando noticias.json
Pipeline completado correctamente
```

Las excepciones internas pueden usar nombres de clase en inglés:

```ts
throw new StorageError("No fue posible descargar el archivo histórico");
```

---

# 3. Stack

Usar:

- Node.js LTS
- TypeScript
- pnpm
- Vitest
- Zod
- ESLint
- Prettier
- Docker
- AWS SDK compatible con S3 para Cloudflare R2
- `fetch` nativo de Node.js para HTTP salvo justificación técnica

No utilizar frameworks HTTP como:

- Express
- Fastify
- Hono
- NestJS

porque la aplicación no tendrá servidor.

TypeScript debe utilizar modo estricto:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

Evitar `any`.

---

# 4. Estructura esperada del repositorio

```text
news-pipeline/
├── src/
│   ├── index.ts
│   │
│   ├── app/
│   │   └── runPipeline.ts
│   │
│   ├── config/
│   │   ├── env.ts
│   │   └── constants.ts
│   │
│   ├── domain/
│   │   ├── news.ts
│   │   ├── newsCandidate.ts
│   │   ├── newsFile.ts
│   │   ├── categories.ts
│   │   └── source.ts
│   │
│   ├── sources/
│   │   ├── newsSource.ts
│   │   ├── sourceRegistry.ts
│   │   └── providers/
│   │       ├── mockSource.ts
│   │       ├── agnSource.ts
│   │       ├── segeplanSource.ts
│   │       └── ministries/
│   │           └── .gitkeep
│   │
│   ├── scraping/
│   │   ├── httpClient.ts
│   │   ├── fetchPage.ts
│   │   ├── htmlParser.ts
│   │   ├── normalizeUrl.ts
│   │   └── types.ts
│   │
│   ├── deduplication/
│   │   ├── buildNewsFingerprint.ts
│   │   ├── deduplicateCandidates.ts
│   │   └── deduplicateNews.ts
│   │
│   ├── ai/
│   │   ├── aiProcessor.ts
│   │   ├── prompts.ts
│   │   ├── schemas.ts
│   │   └── providers/
│   │       └── deepseekProcessor.ts
│   │
│   ├── storage/
│   │   ├── newsStorage.ts
│   │   ├── r2NewsStorage.ts
│   │   └── localNewsStorage.ts
│   │
│   ├── services/
│   │   ├── loadHistoricalNews.ts
│   │   ├── collectCandidates.ts
│   │   ├── processCandidates.ts
│   │   ├── consolidateNews.ts
│   │   ├── createNewsFile.ts
│   │   └── publishNews.ts
│   │
│   ├── validation/
│   │   ├── newsSchemas.ts
│   │   └── validateNewsFile.ts
│   │
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── retry.ts
│   │   ├── sleep.ts
│   │   ├── hash.ts
│   │   └── dates.ts
│   │
│   └── errors/
│       ├── AppError.ts
│       ├── ConfigurationError.ts
│       ├── SourceError.ts
│       ├── AIError.ts
│       ├── ValidationError.ts
│       └── StorageError.ts
│
├── tests/
│   ├── unit/
│   │   ├── deduplication/
│   │   ├── services/
│   │   ├── validation/
│   │   ├── config/
│   │   └── storage/
│   │
│   ├── integration/
│   │   └── pipeline.test.ts
│   │
│   ├── fixtures/
│   │   ├── html/
│   │   ├── ai/
│   │   ├── news/
│   │   └── sources/
│   │
│   └── helpers/
│       ├── fakeAIProcessor.ts
│       ├── fakeNewsSource.ts
│       └── fakeNewsStorage.ts
│
├── output/
│   └── .gitkeep
│
├── .env.example
├── .gitignore
├── .dockerignore
├── Dockerfile
├── eslint.config.js
├── prettier.config.js
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

Esta estructura es una guía esperada. Puede ajustarse si existe una razón técnica clara, pero debe conservar separación de responsabilidades.

---

# 5. Responsabilidades por módulo

## `src/index.ts`

Debe ser mínimo.

Responsabilidades:

1. cargar configuración;
2. construir dependencias;
3. ejecutar `runPipeline`;
4. capturar errores fatales;
5. establecer el exit code.

Ejemplo conceptual:

```ts
async function main(): Promise<void> {
  const dependencies = createDependencies();
  await runPipeline(dependencies);
}

main().catch((error) => {
  logger.error("El pipeline terminó con un error fatal", { error });
  process.exitCode = 1;
});
```

No colocar lógica de negocio aquí.

---

## `src/app/runPipeline.ts`

Orquesta la ejecución completa.

Flujo esperado:

```text
load historical news
        ↓
collect candidates
        ↓
deduplicate candidates
        ↓
process only new candidates
        ↓
discard irrelevant items
        ↓
consolidate accepted news
        ↓
validate final document
        ↓
publish or generate preview
```

Debe depender de interfaces, no de implementaciones concretas cuando sea razonable.

---

# 6. Modelo de dominio

## `NewsCandidate`

Representa una noticia antes de procesarla con IA.

Ejemplo:

```ts
export interface NewsCandidate {
  source: string;
  sourceType: string;
  originalUrl: string;
  sourceId?: string;
  publishedAt?: string;
  extractedAt: string;
  rawTitle?: string;
  rawContent: string;
}
```

---

## `NewsItem`

Representa una noticia procesada y validada.

```ts
export interface NewsItem {
  id: string;
  originalUrl: string;
  source: string;
  sourceType: string;
  categoryId: CategoryId;
  tags: string[];
  publishedAt: string | null;
  extractedAt: string;
  urgent: boolean;
  content: {
    es: LocalizedNewsContent;
    quc: LocalizedNewsContent;
  };
}
```

Contenido localizado:

```ts
export interface LocalizedNewsContent {
  title: string;
  summary: string;
  citizenAction: string;
}
```

---

# 7. Taxonomía cerrada

Los IDs internos deben estar en inglés o en formato técnico consistente.

Usar:

```ts
export const CATEGORY_IDS = [
  "education_scholarships",
  "health_wellbeing",
  "social_programs",
  "procedures_services",
  "security_alerts",
  "employment_development",
] as const;
```

Los nombres visibles permanecen en español:

```ts
export const CATEGORIES = [
  {
    id: "education_scholarships",
    name: "Educación y Becas",
  },
  {
    id: "health_wellbeing",
    name: "Salud y Prevención",
  },
  {
    id: "social_programs",
    name: "Apoyo Social",
  },
  {
    id: "procedures_services",
    name: "Trámites y Documentos",
  },
  {
    id: "security_alerts",
    name: "Alertas y Emergencias",
  },
  {
    id: "employment_development",
    name: "Empleo y Emprendimiento",
  },
] as const;
```

La IA no puede crear categorías nuevas.

---

# 8. Estructura final de cada noticia

Las propiedades JSON deben estar en inglés.

Los strings de contenido permanecen en español y K'iche'.

Ejemplo:

```json
{
  "id": "segeplan-becas-taiwan-2026-09",
  "originalUrl": "https://becas.segeplan.gob.gt/convocatoria/123",
  "source": "SEGEPLAN",
  "sourceType": "convocatoria",
  "categoryId": "education_scholarships",
  "tags": [
    "becas",
    "licenciatura",
    "extranjero",
    "cooperación"
  ],
  "publishedAt": "2026-09-08T10:00:00Z",
  "extractedAt": "2026-09-10T12:00:00Z",
  "urgent": false,
  "content": {
    "es": {
      "title": "Becas completas de pregrado en Taiwán para 2027",
      "summary": "Convocatoria abierta para guatemaltecos que deseen cursar estudios universitarios con cobertura completa de matrícula y estadía.",
      "citizenAction": "Postular antes del 31 de octubre en el portal de SEGEPLAN presentando constancia de calificaciones y título de diversificado."
    },
    "quc": {
      "title": "Taqanik rech tob'anem tijonem pa Taiwán pa le junab' 2027",
      "summary": "Taqanem rech ajtijoxelab' aj-wate' aj-iximulew rech kekowinik ketijon pa nimalaj tijob'al ruk' tojb'al tijob'al xuquje' ja.",
      "citizenAction": "Tz'ib'aj ab'i' chanim maj ok 31 rech octubre pa le portal rech SEGEPLAN."
    }
  }
}
```

---

# 9. Estructura global de `noticias.json`

Las claves JSON deben estar en inglés.

Ejemplo esperado:

```json
{
  "lastUpdatedAt": "2026-09-10T12:00:00Z",
  "totalNews": 42,
  "availableCategories": [
    {
      "id": "education_scholarships",
      "name": "Educación y Becas"
    },
    {
      "id": "health_wellbeing",
      "name": "Salud y Prevención"
    },
    {
      "id": "social_programs",
      "name": "Apoyo Social"
    },
    {
      "id": "procedures_services",
      "name": "Trámites y Documentos"
    },
    {
      "id": "security_alerts",
      "name": "Alertas y Emergencias"
    },
    {
      "id": "employment_development",
      "name": "Empleo y Emprendimiento"
    }
  ],
  "news": []
}
```

Por ahora:

- conservar todo el histórico;
- no eliminar automáticamente noticias antiguas;
- no paginar;
- no dividir todavía en varios JSON;
- dejar preparado el diseño para añadir retención futura.

---

# 10. Fuentes de noticias

Crear una abstracción común.

```ts
export interface NewsSource {
  readonly name: string;

  fetchCandidates(): Promise<NewsCandidate[]>;
}
```

Cada fuente debe ser independiente.

Ejemplos futuros:

```text
AGN
SEGEPLAN
Ministerio de Salud
Ministerio de Educación
MINTRAB
MAGA
CONRED
INSIVUMEH
```

No inventar selectores CSS.

Si todavía no se ha inspeccionado una página real:

- crear infraestructura;
- usar fixtures;
- implementar fuentes mock;
- dejar preparada la integración.

---

# 11. Scraping

Las peticiones deben ser responsables.

Requisitos:

- timeout configurable;
- User-Agent configurable;
- concurrencia baja;
- retries limitados;
- pausa entre solicitudes;
- errores aislados por fuente;
- no abortar todo el pipeline si una sola fuente falla;
- no evadir CAPTCHA;
- no evadir mecanismos anti-bot;
- no ejecutar contenido obtenido de HTML.

Logs de ejemplo:

```text
Consultando fuente AGN
8 candidatos encontrados en AGN
Esperando antes de consultar la siguiente fuente
No fue posible consultar SEGEPLAN
Continuando con las demás fuentes
```

---

# 12. Deduplicación

Debe ocurrir antes de llamar a la IA.

Prioridad:

1. URL original normalizada;
2. ID estable de la fuente;
3. fingerprint determinista.

No usar únicamente:

- título;
- resumen;
- texto generado por IA.

Ejemplo conceptual:

```text
20 candidatos encontrados
        ↓
16 ya existen en el histórico
        ↓
4 candidatos nuevos
        ↓
solo 4 se envían a IA
```

También deduplicar dentro del mismo lote.

---

# 13. Normalización de URLs

Crear una función centralizada:

```ts
normalizeUrl(url: string): string
```

Debe poder eliminar o normalizar cuando sea razonable:

- fragmentos `#...`;
- trailing slash inconsistente;
- parámetros de tracking como `utm_*`;
- diferencias irrelevantes de casing donde aplique.

No eliminar parámetros que puedan identificar recursos distintos.

---

# 14. Identificadores

Preferencia:

```text
sourceId existente
        ↓
URL normalizada
        ↓
hash determinista
```

El campo final:

```json
{
  "id": "..."
}
```

debe ser estable entre ejecuciones.

---

# 15. Procesamiento con IA

Crear una interfaz:

```ts
export interface AIProcessor {
  process(candidate: NewsCandidate): Promise<ProcessedNewsResult>;
}
```

El proveedor inicial será DeepSeek.

Debe poder reemplazarse posteriormente.

La IA tendrá que:

- decidir relevancia ciudadana;
- clasificar usando la taxonomía cerrada;
- generar etiquetas;
- sintetizar la noticia;
- generar una acción ciudadana clara cuando aplique;
- producir versión en español;
- producir traducción automática a K'iche';
- devolver JSON estructurado.

---

# 16. Resultado de IA

Ejemplo conceptual:

```ts
export type ProcessedNewsResult =
  | {
      relevant: false;
      reason?: string;
    }
  | {
      relevant: true;
      data: AIProcessedNews;
    };
```

Los campos estructurales en inglés.

Los textos devueltos al usuario en español/K'iche'.

Ejemplo:

```json
{
  "relevant": true,
  "data": {
    "categoryId": "education_scholarships",
    "tags": ["becas", "universidad"],
    "urgent": false,
    "content": {
      "es": {
        "title": "Nueva convocatoria de becas",
        "summary": "SEGEPLAN anunció...",
        "citizenAction": "Consultar los requisitos..."
      },
      "quc": {
        "title": "...",
        "summary": "...",
        "citizenAction": "..."
      }
    }
  }
}
```

---

# 17. Validación de IA

Nunca confiar directamente en la respuesta del modelo.

Usar Zod.

Validar:

- `relevant`;
- `categoryId`;
- arrays;
- strings obligatorios;
- booleanos;
- contenido bilingüe;
- campos faltantes;
- categorías inventadas.

Si la IA devuelve JSON inválido:

```text
Respuesta inválida recibida desde IA
Reintentando procesamiento de la noticia
```

Retries limitados.

Si falla definitivamente:

```text
No fue posible procesar una noticia después de los reintentos
La noticia será omitida en esta ejecución
```

No guardar estructuras inválidas.

---

# 18. K'iche'

El código ISO usado en el JSON será:

```text
quc
```

Debe tratarse como traducción automática.

No afirmar en documentación que las traducciones son:

- humanas;
- certificadas;
- verificadas oficialmente.

---

# 19. Consolidación

Cada ejecución debe:

```text
descargar histórico
        ↓
procesar nuevas noticias
        ↓
conservar histórico
        ↓
agregar únicamente nuevas noticias válidas
        ↓
actualizar metadatos
        ↓
validar documento completo
```

La consolidación debe ser una función pura siempre que sea posible.

Ejemplo:

```ts
consolidateNews(
  historicalNews: NewsItem[],
  newNews: NewsItem[],
  now: Date
): NewsFile
```

---

# 20. Integridad del archivo

Nunca sobrescribir R2 con un JSON inválido.

Orden obligatorio:

```text
crear documento en memoria
        ↓
validar documento completo
        ↓
serializar
        ↓
publicar
```

Si ocurre un error fatal antes de publicar:

```text
el archivo existente en R2 debe permanecer intacto
```

---

# 21. Storage abstraction

Crear:

```ts
export interface NewsStorage {
  load(): Promise<NewsFile | null>;
  save(newsFile: NewsFile): Promise<void>;
}
```

Implementaciones previstas:

```text
R2NewsStorage
LocalNewsStorage
FakeNewsStorage
```

`LocalNewsStorage` permitirá desarrollar sin Cloudflare.

---

# 22. Cloudflare R2

Usar API S3 compatible.

R2 almacenará:

```text
noticias.json
```

Variables de entorno:

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_OBJECT_KEY=noticias.json
```

No hardcodear secretos.

Al guardar el JSON, utilizar metadata HTTP apropiada:

```text
Content-Type: application/json; charset=utf-8
```

La estrategia final de caché se definirá posteriormente.

---

# 23. Dry run

Implementar:

```env
DRY_RUN=true
```

Cuando esté activo:

- ejecutar scraping;
- deduplicar;
- llamar IA si las credenciales están disponibles;
- consolidar;
- validar;
- generar preview local;
- NO sobrescribir R2.

Ruta:

```env
OUTPUT_PREVIEW_PATH=./output/noticias.preview.json
```

Log:

```text
Modo de prueba activado
El archivo remoto no será modificado
Preview guardado en ./output/noticias.preview.json
```

---

# 24. Variables de entorno

`.env.example` esperado:

```env
NODE_ENV=development

LOG_LEVEL=info

DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=
DEEPSEEK_MODEL=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_OBJECT_KEY=noticias.json

SCRAPER_USER_AGENT=GovernmentNewsPipeline/1.0
SCRAPER_TIMEOUT_MS=15000
SCRAPER_DELAY_MS=1000
SCRAPER_MAX_RETRIES=2

AI_TIMEOUT_MS=60000
AI_MAX_RETRIES=2

DRY_RUN=true
OUTPUT_PREVIEW_PATH=./output/noticias.preview.json
```

Validar con Zod.

Nunca imprimir secretos en logs.

---

# 25. Logging

Los logs deben estar en español.

Ejemplo de una ejecución:

```text
[INFO] Pipeline iniciado
[INFO] Cargando histórico de noticias
[INFO] 42 noticias existentes
[INFO] Consultando fuente AGN
[INFO] 10 candidatos encontrados en AGN
[INFO] Consultando fuente SEGEPLAN
[INFO] 5 candidatos encontrados en SEGEPLAN
[INFO] 15 candidatos encontrados en total
[INFO] 11 duplicados descartados
[INFO] 4 candidatos nuevos
[INFO] Procesando candidatos con IA
[INFO] Noticia descartada por falta de relevancia ciudadana
[INFO] 3 noticias aceptadas
[INFO] Consolidando histórico
[INFO] Documento final validado correctamente
[INFO] Publicando noticias.json en Cloudflare R2
[INFO] Pipeline completado correctamente
```

En error:

```text
[ERROR] No fue posible consultar la fuente SEGEPLAN
[WARN] Se continuará con las demás fuentes
```

No hacer logs excesivos.

---

# 26. Manejo de errores

Tipos esperados:

```text
AppError
ConfigurationError
SourceError
AIError
ValidationError
StorageError
```

Los nombres de clases en inglés.

Los mensajes visibles en español.

Ejemplo:

```ts
throw new ConfigurationError(
  "Falta la variable de entorno DEEPSEEK_API_KEY"
);
```

---

# 27. Retries

Usar únicamente para errores temporales.

Ejemplos:

- HTTP 429;
- HTTP 502;
- HTTP 503;
- timeout;
- error temporal de IA.

No reintentar:

- validaciones imposibles;
- 404 permanentes;
- configuración inválida.

Utilizar backoff limitado.

---

# 28. Tests unitarios

Usar Vitest.

Los nombres técnicos de los tests pueden estar en inglés.

Ejemplo:

```ts
describe("deduplicateCandidates", () => {
  it("removes candidates with an existing normalized URL", () => {
    // ...
  });
});
```

Cubrir como mínimo:

## Deduplicación

- misma URL;
- URL con tracking;
- trailing slash;
- noticias diferentes;
- duplicados dentro del lote;
- ID estable.

## Consolidación

- conserva histórico;
- agrega nuevas noticias;
- evita duplicados;
- actualiza total;
- actualiza fecha;
- no muta los arrays originales si se diseña como función pura.

## Validación IA

- respuesta válida;
- categoría inválida;
- string faltante;
- `urgent` inválido;
- JSON corrupto;
- ausencia de traducción;
- respuesta irrelevante válida.

## Configuración

- variables faltantes;
- números;
- booleanos;
- valores inválidos.

## Storage

- fake storage;
- carga inexistente;
- guardado;
- error simulado.

---

# 29. Test del pipeline

Crear un test donde:

```text
histórico:
3 noticias

scraper:
5 candidatos

de esos:
2 ya existen
3 son nuevos

IA:
1 irrelevante
2 aceptados

resultado esperado:
5 noticias totales
```

Verificar también que:

- la IA reciba únicamente los 3 candidatos nuevos;
- no se procesen los duplicados;
- el histórico permanezca;
- el archivo final sea válido.

---

# 30. Fixtures

Los tests no deben depender de Internet.

```text
tests/fixtures/
├── html/
│   ├── agn-sample.html
│   └── segeplan-sample.html
├── ai/
│   ├── valid-response.json
│   ├── irrelevant-response.json
│   └── invalid-response.json
├── news/
│   └── historical-news.json
└── sources/
    └── candidates.json
```

---

# 31. Integration tests

Separarlos.

Comando:

```bash
pnpm test:integration
```

No deben ejecutarse con:

```bash
pnpm test
```

Por defecto no hacer llamadas reales a:

- DeepSeek;
- Cloudflare;
- sitios gubernamentales.

---

# 32. Scripts de pnpm

Esperados:

```json
{
  "scripts": {
    "dev": "...",
    "build": "...",
    "start": "...",
    "test": "...",
    "test:watch": "...",
    "test:integration": "...",
    "lint": "...",
    "format": "...",
    "format:check": "...",
    "typecheck": "..."
  }
}
```

Debe poder ejecutarse:

```bash
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm start
```

---

# 33. Docker

Crear Dockerfile multi-stage.

Requisitos:

- build con pnpm;
- ejecutar JavaScript compilado;
- no incluir dependencias de desarrollo en imagen final;
- usuario no-root si es razonablemente posible;
- compatible con `linux/amd64`;
- compatible con `linux/arm64`;
- no fijar una arquitectura dentro del Dockerfile.

Uso esperado:

```bash
docker build -t government-news-pipeline .
```

```bash
docker run --rm \
  --env-file .env \
  government-news-pipeline
```

---

# 34. Raspberry Pi

La Raspberry Pi será el entorno de producción del cronjob.

La aplicación:

```text
inicia
↓
ejecuta una corrida
↓
termina
```

No permanece como daemon propio.

Linux cron será quien la invoque diariamente.

Ejemplo conceptual:

```cron
0 6 * * * cd /opt/government-news-pipeline && docker run --rm --env-file .env government-news-pipeline
```

La hora definitiva queda abierta.

---

# 35. Cloudflare Pages

Pages alojará exclusivamente el frontend:

```text
index.html
assets/
JavaScript
CSS
```

No usar Pages como mecanismo principal para almacenar o actualizar el histórico de noticias.

---

# 36. Cloudflare R2

R2 alojará los datos dinámicamente actualizados:

```text
noticias.json
```

Separación conceptual:

```text
Cloudflare Pages
      ↓
frontend estático

Cloudflare R2
      ↓
noticias.json
```

El frontend leerá el JSON desde R2/CDN.

---

# 37. Caché

La política exacta queda abierta.

Objetivo:

- permitir CDN;
- evitar servir durante demasiado tiempo una versión antigua;
- no requerir purgas manuales innecesarias.

No implementar una estrategia compleja hasta definir cómo se expondrá públicamente R2.

---

# 38. Principios de seguridad

- `.env` en `.gitignore`;
- `.env.example` sin secretos;
- no loguear tokens;
- no guardar API keys en código;
- validar respuestas externas;
- sanitizar contenido de scraping;
- no ejecutar HTML obtenido;
- no confiar en IA;
- no modificar R2 si el documento final no valida.

---

# 39. Comportamiento ante fallos parciales

Si falla una fuente:

```text
registrar
continuar
```

Si falla una noticia al procesarse con IA:

```text
registrar
omitir noticia
continuar
```

Si falla R2 al cargar histórico:

- distinguir entre archivo inexistente y error real;
- un archivo inexistente puede inicializar histórico vacío;
- un fallo de credenciales/red debe tratarse como error.

Si falla la validación final:

```text
NO publicar
```

---

# 40. Primera implementación

No inventar scrapers reales.

Primero construir:

- arquitectura;
- interfaces;
- fake sources;
- fixtures;
- deduplicación;
- AI abstraction;
- mock AI;
- DeepSeek provider;
- local storage;
- R2 storage;
- consolidación;
- validación;
- logging;
- Docker;
- tests.

Después integrar fuentes gubernamentales reales una por una.

---

# 41. Definición de terminado

Antes de considerar completa una implementación, deben pasar:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Sin errores.

La imagen también debe poder construirse:

```bash
docker build -t government-news-pipeline .
```

---

# 42. Resultado arquitectónico esperado

```text
┌────────────────────────────┐
│ Raspberry Pi / PC          │
│                            │
│ Linux cron / ejecución     │
│ manual                     │
└──────────────┬─────────────┘
               │
               ▼
┌────────────────────────────┐
│ Node.js + TypeScript       │
│ Pipeline                   │
└──────────────┬─────────────┘
               │
      ┌────────┴─────────┐
      ▼                  ▼
Government Sources     DeepSeek
      │                  │
      └────────┬─────────┘
               ▼
       Deduplication
               │
               ▼
       AI Processing
               │
               ▼
         Validation
               │
               ▼
        Consolidation
               │
               ▼
         noticias.json
               │
               ▼
        Cloudflare R2
               │
               ▼
         Cloudflare CDN
               │
               ▼
      Static Frontend
      Cloudflare Pages
```

---

# 43. Idea central que no debe perderse

Este proyecto NO debe evolucionar accidentalmente hacia un backend tradicional.

La idea deliberada es:

```text
cron diario
+
pipeline batch
+
JSON estático versionado lógicamente como histórico
+
R2
+
frontend estático
```

La Raspberry Pi realiza el trabajo pesado.

Cloudflare se utiliza para distribución pública y almacenamiento del archivo final.

El frontend permanece liviano y solo consume los datos ya procesados.
