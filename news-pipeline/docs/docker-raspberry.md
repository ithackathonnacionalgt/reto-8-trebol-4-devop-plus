# Docker y operación en Raspberry Pi

El pipeline es un proceso batch: el contenedor se inicia, ejecuta una corrida y termina. No incluye un servidor HTTP, cron ni un supervisor interno.

## Construcción local

Desde `news-pipeline/`:

```bash
docker build -t government-news-pipeline:latest .
```

La imagen usa Node.js 22 LTS, instala dependencias con el lockfile y ejecuta como el usuario no-root `node`. El mismo Dockerfile puede construirse para `linux/amd64` y `linux/arm64`.

Para construir una imagen ARM64 desde una PC compatible con Buildx:

```bash
docker buildx build --platform linux/arm64 -t government-news-pipeline:arm64 .
```

Agrega `--push` únicamente cuando exista un registro configurado. La validación física en Raspberry debe hacerse en el dispositivo objetivo.

## Ejecución segura (dry run)

No copies `.env` a la imagen ni lo agregues al contexto de construcción. Usa un archivo de entorno montado en tiempo de ejecución:

```bash
docker run --rm \
  --env-file .env \
  -v "$(pwd)/output:/app/output" \
  government-news-pipeline:latest
```

Con `DRY_RUN=true`, R2 no se modifica y el preview queda en el directorio local `output/`.

## Publicación

Después de validar el preview, configura `DRY_RUN=false` en el `.env` y vuelve a ejecutar el mismo comando. Las credenciales solo deben existir en el archivo de entorno de la máquina y deben tener permisos mínimos sobre el bucket.

## Raspberry Pi

Instala Docker en la Raspberry, copia el proyecto sin `.env` o copia únicamente los archivos necesarios, crea el `.env` directamente en la Raspberry y constrúyelo allí:

```bash
docker build -t government-news-pipeline:latest .
```

También puedes transferir una imagen `linux/arm64` creada con Buildx. Confirma que la Raspberry sea de 64 bits antes de usar esa plataforma.

## Ejecución periódica

El cron debe ejecutarse fuera del contenedor. Por ejemplo, cada hora:

```cron
0 * * * * cd /home/pi/news-pipeline && /usr/bin/docker run --rm --env-file .env -v /home/pi/news-pipeline/output:/app/output government-news-pipeline:latest >> /home/pi/news-pipeline/pipeline.log 2>&1
```

Usa rutas absolutas, protege el `.env` (`chmod 600 .env`) y revisa el código de salida y los logs. Rota o revoca las credenciales si se exponen.
