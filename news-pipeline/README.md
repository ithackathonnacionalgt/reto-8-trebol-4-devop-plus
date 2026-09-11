# Government News Pipeline: despliegue y operación

El pipeline es un proceso batch: el contenedor consulta las fuentes, procesa las noticias con DeepSeek, actualiza `noticias.json` en Cloudflare R2 y termina. La planificación se hace con `cron` en la Raspberry Pi; el contenedor no incluye un servidor ni un planificador interno.

## Despliegue actual

| Recurso        | Valor                                                               |
| -------------- | ------------------------------------------------------------------- |
| Servidor       | Raspberry Pi ARM64                                                  |
| Acceso privado | `ssh trebol4devop@100.101.158.66`                                   |
| Directorio     | `/home/trebol4devop/news-pipeline`                                  |
| Imagen         | `estebansnzt/government-news-pipeline:v2-arm64`                     |
| Programación   | Cada 12 horas, a las 00:00 y 12:00 del servidor                     |
| Log            | `/home/trebol4devop/news-pipeline/pipeline.log`                     |
| Bucket R2      | `todomigobgt`                                                       |
| Objeto R2      | `noticias.json`                                                     |
| URL pública    | `https://pub-b246f9594b0f4cb5960b8f6ec9f1ba2b.r2.dev/noticias.json` |

La dirección `100.101.158.66` pertenece a la red privada usada por el equipo. Para conectarse, la computadora debe tener acceso a esa red y una clave SSH o contraseña válida. Las contraseñas y tokens no deben guardarse en este repositorio.

## Requisitos de la Raspberry Pi

- Sistema operativo de 64 bits. `uname -m` debe mostrar `aarch64`.
- Docker instalado y habilitado.
- Usuario `trebol4devop` autorizado para ejecutar Docker.
- Salida HTTPS hacia las fuentes gubernamentales, DeepSeek y Cloudflare R2.

Verificación:

```bash
uname -m
docker --version
docker run --rm hello-world
```

Si Docker requiere `sudo`, agréguelo a los comandos de esta guía o habilite al usuario de despliegue según la política del servidor.

## Variables de entorno

En la Raspberry, cree `/home/trebol4devop/news-pipeline/.env` a partir de `.env.example`:

```bash
mkdir -p /home/trebol4devop/news-pipeline/output
cd /home/trebol4devop/news-pipeline
nano .env
chmod 600 .env
```

Contenido recomendado para producción:

```dotenv
NODE_ENV=production
LOG_LEVEL=info

DEEPSEEK_API_KEY=<api-key-de-deepseek>
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=<modelo-habilitado-en-la-cuenta>

R2_ACCOUNT_ID=<account-id-de-cloudflare>
R2_ACCESS_KEY_ID=<access-key-id-s3>
R2_SECRET_ACCESS_KEY=<secret-access-key-s3>
R2_BUCKET_NAME=todomigobgt
R2_OBJECT_KEY=noticias.json

SCRAPER_USER_AGENT=GovernmentNewsPipeline/1.0
SCRAPER_TIMEOUT_MS=15000
SCRAPER_DELAY_MS=1000
SCRAPER_MAX_RETRIES=2
SCRAPER_MAX_CANDIDATES=30

AI_TIMEOUT_MS=60000
AI_MAX_RETRIES=2

DRY_RUN=false
OUTPUT_PREVIEW_PATH=/app/output/noticias.preview.json
```

Las variables obligatorias en producción son:

- `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL` y `DEEPSEEK_MODEL`: credenciales y modelo utilizados para clasificar, traducir y resumir cada noticia.
- `R2_ACCOUNT_ID`: identificador de la cuenta de Cloudflare.
- `R2_ACCESS_KEY_ID` y `R2_SECRET_ACCESS_KEY`: credenciales S3 de un token R2 con permisos de lectura y escritura sobre el bucket. No son un API Token general de Cloudflare.
- `R2_BUCKET_NAME` y `R2_OBJECT_KEY`: destino del documento publicado.
- `SCRAPER_MAX_CANDIDATES`: máximo de artículos que se toman de cada fuente en una corrida. Aumentarlo incrementa el tiempo de ejecución y el consumo de DeepSeek.
- `DRY_RUN`: con `true` solo genera el preview local; con `false` publica en R2.

Obtenga las credenciales S3 desde Cloudflare Dashboard, en **R2 Object Storage > Manage R2 API Tokens**. Cree un token limitado al bucket requerido y guarde inmediatamente su `Access Key ID` y `Secret Access Key`, porque el secreto solo se muestra una vez.

## Preparar Cloudflare R2

El objeto puede no existir durante la primera ejecución; el pipeline lo creará. Si `noticias.json` ya existe, debe cumplir el esquema esperado. Para inicializarlo manualmente, suba este contenido y reemplace la fecha por una fecha ISO válida:

```json
{
  "lastUpdatedAt": "2026-01-01T00:00:00.000Z",
  "totalNews": 0,
  "availableCategories": [
    { "id": "education_scholarships", "name": "Educación y Becas" },
    { "id": "health_wellbeing", "name": "Salud y Prevención" },
    { "id": "social_programs", "name": "Apoyo Social" },
    { "id": "procedures_services", "name": "Trámites y Documentos" },
    { "id": "security_alerts", "name": "Alertas y Emergencias" },
    { "id": "employment_development", "name": "Empleo y Emprendimiento" }
  ],
  "news": []
}
```

Un JSON vacío, un arreglo `[]` o un objeto con categorías diferentes detendrá la ejecución con el mensaje `El histórico de Cloudflare R2 no cumple el esquema esperado`.

## Instalar y probar la imagen

Conéctese y descargue la imagen publicada para ARM64:

```bash
ssh trebol4devop@100.101.158.66
docker pull estebansnzt/government-news-pipeline:v2-arm64
```

Primero haga una ejecución de prueba. `-e DRY_RUN=true` sobrescribe temporalmente el valor del `.env`, carga el histórico desde R2 y guarda el resultado en `output/noticias.preview.json` sin publicarlo:

```bash
docker run --rm \
  --env-file /home/trebol4devop/news-pipeline/.env \
  -e DRY_RUN=true \
  -v /home/trebol4devop/news-pipeline/output:/app/output \
  estebansnzt/government-news-pipeline:v2-arm64
```

Revise el preview:

```bash
python3 -m json.tool /home/trebol4devop/news-pipeline/output/noticias.preview.json >/dev/null
```

Después ejecute una corrida real. Este comando usa `DRY_RUN=false` definido en el `.env` y actualiza R2:

```bash
docker run --rm \
  --env-file /home/trebol4devop/news-pipeline/.env \
  -v /home/trebol4devop/news-pipeline/output:/app/output \
  estebansnzt/government-news-pipeline:v2-arm64
```

Al finalizar correctamente debe aparecer `Pipeline completado correctamente`. Como es un proceso batch, no debe quedar un contenedor ejecutándose.

## Configurar la ejecución cada 12 horas

Abra el crontab del usuario de despliegue:

```bash
crontab -e
```

Agregue una sola línea:

```cron
0 */12 * * * /usr/bin/docker run --rm --env-file /home/trebol4devop/news-pipeline/.env -v /home/trebol4devop/news-pipeline/output:/app/output estebansnzt/government-news-pipeline:v2-arm64 >> /home/trebol4devop/news-pipeline/pipeline.log 2>&1
```

Confirme la instalación:

```bash
crontab -l
systemctl status cron --no-pager
```

Cron usa la zona horaria configurada en la Raspberry. Compruébela con:

```bash
timedatectl
```

## Operación y diagnóstico

Ver las últimas ejecuciones:

```bash
tail -n 200 /home/trebol4devop/news-pipeline/pipeline.log
```

Seguir una ejecución en tiempo real:

```bash
tail -f /home/trebol4devop/news-pipeline/pipeline.log
```

Validar la publicación pública:

```bash
curl -fsS https://pub-b246f9594b0f4cb5960b8f6ec9f1ba2b.r2.dev/noticias.json | python3 -m json.tool >/dev/null
```

Errores habituales:

- `El histórico ... no cumple el esquema esperado`: el objeto existente en R2 no tiene la estructura indicada arriba.
- `Falta la variable de entorno ...`: el `.env` está incompleto, tiene un nombre incorrecto o no fue entregado al contenedor.
- Errores HTTP de una fuente: el pipeline continúa con las demás fuentes; revise si el sitio cambió de dirección o estructura.
- Error de arquitectura al iniciar la imagen: confirme `aarch64` y que la etiqueta descargada sea ARM64.

## Publicar y desplegar una actualización

Desde una computadora de desarrollo, valide el proyecto y publique una nueva etiqueta ARM64. No reutilice una etiqueta ya desplegada:

```bash
cd news-pipeline
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm lint
pnpm build
docker login
docker buildx build \
  --platform linux/arm64 \
  -t estebansnzt/government-news-pipeline:v3-arm64 \
  --push .
```

En la Raspberry:

```bash
docker pull estebansnzt/government-news-pipeline:v3-arm64
```

Ejecute la nueva etiqueta primero con `DRY_RUN=true`. Si el resultado es correcto, reemplace `v2-arm64` por `v3-arm64` en el crontab y haga una corrida real manual. Conserve temporalmente la etiqueta anterior para poder restaurarla en el cron si la nueva versión falla.

Después de modificar el `.env`, ejecute otra prueba manual; Docker lee el archivo de nuevo en cada corrida. Rote inmediatamente cualquier credencial expuesta y nunca copie `.env` dentro de la imagen ni lo agregue a Git.
