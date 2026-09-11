# Documentacion Tecnica del Proyecto: TODOMIGOB

---

## 1. Resumen Ejecutivo

TODOMIGOB es una plataforma ciudadana omnicanal diseñada para democratizar el acceso a la informacion publica, convocatorias y tramites ministeriales en Guatemala mediante inteligencia artificial y despliegues edge computing de bajo costo. El problema central identificado es la dispersion, opacidad y lenguaje excesivamente tecnico de los portales gubernamentales, lo cual aisla a la poblacion —en especial a comunidades del interior y hablantes de idiomas mayas como el K'iche'— de oportunidades sociales, sanitarias y educativas. La solucion desarrollada por el equipo Trebol 4 DevOps+ combina un pipeline automatizado de extraccion y sintesis con IA (DeepSeek), una arquitectura hibrida de alta disponibilidad (Cloudflare Workers + R2) y un nucleo de notificaciones personalizadas ejecutado en hardware embebido (Raspberry Pi 4 via Tailscale), garantizando consultas instantaneas con coste de infraestructura casi nulo y entrega proactiva de avisos oficiales al ciudadano.

---

## 2. Arquitectura del Sistema

La arquitectura de TODOMIGOB opera bajo un modelo hibrido y desacoplado, disenado para maximizar la disponibilidad y minimizar los costos de infraestructura. Se separan estrictamente las consultas de lectura masiva (servidas globalmente en el edge de Cloudflare) de las tareas de procesamiento batch y gestion de suscriptores (alojadas en una Raspberry Pi 4 en el borde fisico).

```mermaid
flowchart TD
    subgraph FuentesExternas [Fuentes Externas y Servicios Cloud]
        Gob[Portales Gubernamentales: AGN, MSPAS, MINGOB]
        DeepSeekAPI[DeepSeek Cloud AI API]
        GoogleSMTP[Servidor SMTP Google]
    end

    subgraph EdgeCloudflare [Capa Edge Global: Cloudflare]
        CF_Worker[Cloudflare Worker y Pages]
        CF_R2[(Bucket Cloudflare R2: noticias.json)]
    end

    subgraph CapaRed [Tunel Seguro Ingress]
        TailscaleFunnel[Tailscale Funnel HTTPS]
    end

    subgraph ServidorEdge [Host Edge: Raspberry Pi 4 ARM64]
        subgraph PipelineContenedor [News Pipeline Docker Cron]
            ScraperEngine[Motor de Scraping Node.js]
            Deduplicador[Deduplicador y Validador]
            R2Publisher[Publicador S3 SDK]
        end

        subgraph BackendNotificaciones [Backend API y Despacho Python 3]
            APIRest[Servidor REST HTTP server.py]
            Dispatcher[Despachador de Noticias]
            MailerWorker[Worker Asincrono de Correo]
            DBLocal[(Base de Datos SQLite todomigob.db)]
        end
    end

    subgraph DispositivosClientes [Clientes Ciudadanos]
        Navegador[Ciudadano: Navegador Web]
        BandejaCorreo[Ciudadano: Correo Electronico]
    end

    Gob --> ScraperEngine
    ScraperEngine --> Deduplicador
    Deduplicador --> DeepSeekAPI
    DeepSeekAPI --> Deduplicador
    Deduplicador --> R2Publisher
    R2Publisher --> CF_R2

    Navegador --> CF_Worker
    CF_Worker --> CF_R2
    CF_R2 --> Navegador

    Navegador --> TailscaleFunnel
    TailscaleFunnel --> APIRest
    APIRest <--> DBLocal
    APIRest --> CF_R2
    APIRest --> MailerWorker
    Dispatcher --> MailerWorker
    MailerWorker --> GoogleSMTP
    GoogleSMTP --> BandejaCorreo
```

### Diagrama Esquemático de Arquitectura

```text
+---------------------------------------------------------------------------------------+
| FUENTES EXTERNAS & SERVICIOS CLOUD                                                    |
|  [Portales Gob: AGN, MSPAS, MINGOB]   [DeepSeek AI API]   [Google SMTP: 465]          |
+---------------------------------------------------------------------------------------+
        | (1. Scraping)                   ^             ^            ^
        v                                 | (3. Prompt) | (4. Resp)  | (8. Envio TLS)
+--------------------------------------------------------------------+------------------+
| HOST EDGE: RASPBERRY PI 4 (ARM64)       |             |            |
|                                         v             |            |
|  +-- NEWS PIPELINE (Docker / Cron) -------------------+            |
|  | [Scraper] --> [Deduplicador / Validador]                        |
|  |                      | (5. Compila feed)                        |
|  |                      v                                          |
|  |                 [S3 Uploader] --------(6. PutObject S3)----+    |
|  +----------------------------------------------------+       |    |
|                                                       |       |    |
|  +-- BACKEND API & NOTIFICACIONES (Python 3.12 / 8080)+       |    |
|  | [SQLite todomigob.db (WAL)] <---> [REST Server] <---+      |    |
|  |                                         |           |      |    |
|  |                                  (Encola envios)    |      |    |
|  |                                         v           |      |    |
|  |                                  [Async Mailer] ----+------+----+
|  +-----------------------------------------^----------+      |
+--------------------------------------------|------------------|-----------------------+
                                             | (Tunel seguro)   |
+--------------------------------------------|------------------|-----------------------+
| INGRESS: TAILSCALE FUNNEL (HTTPS)          |                  |
|  https://trebol4devop.tail41b60f.ts.net ---+                  |
+--------------------------------------------^------------------|-----------------------+
                                             | (POST /api/users)|
+--------------------------------------------|------------------v-----------------------+
| CAPA EDGE GLOBAL: CLOUDFLARE               |       [Bucket Cloudflare R2]             |
|  [Cloudflare Worker / Pages] --------------+       (noticias.json + multimedia)       |
|            ^                                                  |
+------------|--------------------------------------------------|-----------------------+
             | (A. Visita web)                                  | (B. Lectura directa)
+------------|--------------------------------------------------v-----------------------+
| CLIENTES CIUDADANOS                                                                   |
|  [Navegador Web / Dispositivo Movil]             [Bandeja de Correo Ciudadano]        |
+---------------------------------------------------------------------------------------+
```

### Capas del Sistema y Componentes Tecnologicos

* **Capa Edge de Distribucion Global (Cloudflare Workers & Cloudflare R2):**
  * **Astro 5 + TailwindCSS v4:** Interfaz reactiva, ligera y accesible, optimizada para dispositivos moviles y conexiones de bajo ancho de banda.
  * **Cloudflare Worker (`worker.js`):** Actua como router perimetral. Intercepta solicitudes a `/noticias.json` y `/media/*` sirviendolas directamente desde el binding de R2 (`env.DB`), proveyendo encabezados CORS y cache perimetral (`stale-while-revalidate`).
  * **Cloudflare R2:** Almacenamiento de objetos compatible con S3 sin costo de transferencia saliente (egress), donde reside la fuente unica de verdad de las noticias procesadas.
* **Capa de Procesamiento e Ingesta Batch (Raspberry Pi 4 ARM64):**
  * **News Pipeline (`news-pipeline`):** Proceso batch contenido en Docker (`estebansnzt/government-news-pipeline:v2-arm64`) orquestado por `cron` cada 12 horas.
  * **Scrapers Modulares:** Modulos individuales dedicados para AGN, MINGOB, MSPAS, Segeplan, Conred, Mintrab, Mineduc, entre otros.
  * **Integracion con DeepSeek Cloud AI:** La Raspberry Pi no ejecuta modelos pesados localmente; consume la API externa de DeepSeek (`deepseek-chat`) para filtrar contenido irrelevante, redactar resumenes breves para la ciudadania, clasificar por ejes tematicos y generar traducciones al idioma K'iche'.
* **Capa de Persistencia, API y Notificaciones (Raspberry Pi 4):**
  * **Servidor API REST (`server.py`):** Implementado en Python 3.12 nativo sin dependencias de frameworks pesados, minimizando la huella de memoria RAM en el dispositivo embebido.
  * **Motor SQLite (`database.py`):** Base de datos relacional ligera configurada en modo WAL (`Write-Ahead Logging`), encargada de almacenar usuarios, categorias seleccionadas y el historico de notificaciones.
  * **Despachador y Mailer Asincrono (`dispatcher.py` y `mailer.py`):** Cruza las publicaciones de R2 con las preferencias de los ciudadanos y despacha correos con plantillas HTML limpias y enlaces funcionales hacia el portal.
* **Capa de Conectividad Segura (Tailscale Funnel):**
  * Tunel criptografico punto a punto que publica el puerto 8080 del host local hacia internet bajo el dominio publico con certificado TLS automatico (`trebol4devop.tail41b60f.ts.net`).

---

### Flujos de Datos Principales

1. **Flujo de Ingesta y Publicacion de Noticias (Batch):**
   * El planificador `cron` arranca el contenedor Docker del pipeline en la Raspberry Pi.
   * Se extraen los comunicados desde los portales gubernamentales.
   * Se envian los articulos a la API de DeepSeek para extraccion de puntos clave y traduccion.
   * El pipeline compila el documento `noticias.json` y lo transfiere directamente al bucket Cloudflare R2 mediante credenciales S3.
2. **Flujo de Lectura Ciudadana (Edge CDN):**
   * El usuario accede al dominio en Cloudflare Workers desde su navegador.
   * El Worker resuelve los activos estaticos y solicita `noticias.json` a R2 mediante enlace directo de memoria.
   * El ciudadano navega, busca por palabra clave y filtra por categoria de forma instantanea sin emitir ninguna peticion a la Raspberry Pi.
3. **Flujo de Suscripcion y Notificacion:**
   * El usuario completa el formulario de preferencias en el portal web.
   * La peticion `POST /api/users` viaja a traves de Tailscale Funnel directo a la API de la Raspberry Pi.
   * La API almacena el registro en SQLite y despierta un hilo asincrono que consulta las noticias destacadas de R2 y envia el correo de confirmacion via Gmail SMTP.

---

### Problemas Tecnicos Encontrados y Soluciones Aplicadas

* **Problema: Saturacion de recursos en hardware edge (Raspberry Pi 4) ante alta demanda de usuarios.**
  * *Solucion:* Descarga total del trafico de lectura hacia Cloudflare Workers y R2. La Raspberry Pi queda completamente aislada del trafico web general y solo procesa el pipeline batch y peticiones puntuales de suscripcion.
* **Problema: Ejecucion de modelos de lenguaje en procesadores ARM embebidos.**
  * *Solucion:* En lugar de intentar correr LLMs locales cuantizados que colapsarian la memoria y CPU de la placa, se implemento una arquitectura de cliente ligero que consume la API en la nube de DeepSeek con reintentos y timeouts controlados.
* **Problema: Acceso publico seguro y transversalidad de NAT en redes residenciales/universitarias sin IP publica estatica.**
  * *Solucion:* Integracion de Tailscale Funnel. Establece un tunel cifrado saliente que otorga terminacion TLS valida y dominio publico sin requerir apertura de puertos en el router ni contratar servicios de IP fija.
* **Problema: Concurrencia y bloqueos en base de datos SQLite.**
  * *Solucion:* Configuracion de la base de datos en modo `PRAGMA journal_mode=WAL;` y ajuste de `PRAGMA busy_timeout=5000;`. Esto permite lecturas y escrituras simultaneas sin errores de tipo `database is locked`.
* **Problema: Bloqueo de hilos HTTP durante el envio de correos electronicos.**
  * *Solucion:* Implementacion de despacho asincrono mediante hilos (`threading.Thread`) en Python. La API responde inmediatamente al navegador (`201 Created` en menos de 100 ms) mientras la sesion SMTP TLS con Gmail se negocia en segundo plano con control de reintentos y bitacora en la base de datos.
* **Problema: Politicas de Cross-Origin Resource Sharing (CORS) entre el dominio web y la API de la Raspberry.**
  * *Solucion:* Manejo explcito de peticiones preflight (`OPTIONS`) en `worker.js` y en el servidor Python, incluyendo encabezados `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods` y `Access-Control-Allow-Headers`.

---

## 3. Configuracion y Despliegue

Esta seccion detalla los procedimientos necesarios para desplegar la infraestructura completa, obtener las credenciales de integracion, aprovisionar el almacenamiento distribuido y exponer servicios de forma segura en cualquier entorno de nube o edge.

---

### Requisitos Previos Generales

* **Entorno Local o Servidor:** Node.js 20+, `pnpm` (`npm install -g pnpm`), Python 3.10+ y Docker con soporte para la arquitectura del host (ARM64 o x86_64).
* **Cuentas de Servicios:**
  * Cuenta activa en Cloudflare (para Workers y R2 Object Storage).
  * Cuenta en DeepSeek Platform con saldo/creditos disponibles para la API de inferencia.
  * Cuenta en Tailscale con permisos de administrador en la Tailnet.
  * Cuenta de Gmail con Contrasena de Aplicacion para el servicio de correo SMTP.

---

### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/ithackathonnacionalgt/reto-8-trebol-4-devop-plus.git
cd reto-8-trebol-4-devop-plus
```

---

### Paso 2: Creacion y Configuracion del Bucket Cloudflare R2

Cloudflare R2 almacena el feed principal `noticias.json` y los recursos multimedia sin costos de transferencia saliente (egress).

1. **Crear el Bucket en Cloudflare:**
   * Iniciar sesion en el panel de Cloudflare (`dash.cloudflare.com`).
   * En el menu lateral izquierdo, seleccionar **R2 Object Storage**.
   * Pulsar el boton **Create bucket**.
   * Asignar como nombre del bucket: `todomigobgt`.
   * Seleccionar la ubicacion predeterminada (Automatic) y confirmar en **Create Bucket**.

2. **Habilitar Dominio Publico (Acceso Directo o Fallback):**
   * Dentro del bucket `todomigobgt`, ingresar a la pestana **Settings**.
   * Desplazarse hasta la seccion **Public Access**.
   * En **R2.dev Subdomain**, pulsar **Allow Access** y confirmar escribiendo `allow`.
   * Copiar la URL publica generada (por ejemplo: `https://pub-b246f9594b0f4cb5960b8f6ec9f1ba2b.r2.dev`).

3. **Cargar el Archivo Inicial `noticias.json`:**
   * En la pestana **Objects**, pulsar **Upload > Upload File**.
   * Subir un archivo inicial con nombre `noticias.json` y la siguiente estructura base:
   ```json
   {
     "lastUpdatedAt": "2026-01-01T00:00:00.000Z",
     "totalNews": 0,
     "availableCategories": [
       { "id": "education_scholarships", "name": "Educacion y Becas" },
       { "id": "health_wellbeing", "name": "Salud y Prevencion" },
       { "id": "social_programs", "name": "Apoyo Social" },
       { "id": "employment_work", "name": "Empleo y Trabajo" },
       { "id": "security_justice", "name": "Seguridad y Tramites" }
     ],
     "news": []
   }
   ```

---

### Paso 3: Obtencion de API Tokens y Credenciales para News Pipeline

El proceso batch `news-pipeline` requiere credenciales para interactuar con DeepSeek y subir el archivo resultante a Cloudflare R2 via protocolo compatible con Amazon S3.

#### 1. Obtener Credenciales S3 de Cloudflare R2
* En el panel de Cloudflare, ingresar a **R2 Object Storage**.
* En el panel lateral derecho, seleccionar **Manage R2 API Tokens**.
* Pulsar **Create API token**.
* Asignar un nombre descriptivo (ejemplo: `news-pipeline-uploader`).
* En **Permissions**, seleccionar **Object Read & Write**.
* En **Apply to specific buckets only**, seleccionar el bucket `todomigobgt`.
* En **TTL**, seleccionar la vigencia requerida (o dejar sin expiracion segun politicas de operacion).
* Pulsar **Create API Token**.
* Guardar inmediatamente los siguientes valores mostrados en pantalla (no se podran consultar despues):
  * **Account ID:** Visible en la URL o en la seccion de resumen de R2 (`https://<account_id>.r2.cloudflarestorage.com`).
  * **Access Key ID:** Identificador publico de la credencial S3.
  * **Secret Access Key:** Clave secreta criptografica S3.

#### 2. Obtener API Key de DeepSeek AI
* Iniciar sesion en la consola de DeepSeek (`platform.deepseek.com`).
* En el menu lateral, acceder a **API Keys**.
* Pulsar **Create new secret key**.
* Asignar un nombre (ejemplo: `todomigob-pipeline`) y generar la clave.
* Copiar la clave generada (`sk-...`).
* Comprobar que la cuenta disponga de creditos activos en la seccion **Top up**.

---

### Paso 4: Despliegue del Frontend en Cloudflare Workers

El frontend esta disenado en Astro 5 y se publica en la red perimetral de Cloudflare como un Worker con enlace nativo al almacenamiento R2.

1. **Instalar dependencias del frontend:**
   ```bash
   cd todo-mi-gob-gt
   pnpm install
   ```

2. **Configurar variables de entorno (`.env`):**
   Crear o modificar el archivo `.env` dentro de `todo-mi-gob-gt/`:
   ```ini
   # URL publica del backend API (dominio generado por Tailscale Funnel o balanceador)
   PUBLIC_API_URL=https://trebol4devop.tail41b60f.ts.net
   ```

3. **Verificar el archivo de configuracion `wrangler.toml`:**
   Asegurarse de que `wrangler.toml` contenga el binding correcto hacia el bucket creado:
   ```toml
   name = "todomigobgt"
   main = "./worker.js"
   compatibility_date = "2026-09-10"

   [assets]
   directory = "./dist"
   binding = "ASSETS"

   [[r2_buckets]]
   binding = "DB"
   bucket_name = "todomigobgt"
   ```

4. **Autenticarse en Cloudflare mediante Wrangler:**
   ```bash
   npx wrangler login
   ```
   Se abrira una ventana en el navegador para autorizar a Wrangler CLI en su cuenta.

5. **Compilar el proyecto Astro y publicar:**
   ```bash
   # Compilar los activos estaticos y paginas en la carpeta dist/
   pnpm run build

   # Desplegar en la red perimetral de Cloudflare
   npx wrangler deploy
   ```
   El comando devolvera la URL publica de produccion:
   `https://todomigobgt.<subdominio>.workers.dev`

---

### Paso 5: Despliegue y Automatizacion del News Pipeline (`news-pipeline`)

1. **Configurar variables de entorno (`.env`):**
   ```bash
   cd ../news-pipeline
   mkdir -p output
   cp .env.example .env
   nano .env
   ```

   *Contenido del archivo `.env`:*
   ```ini
   NODE_ENV=production
   LOG_LEVEL=info

   # Credenciales DeepSeek AI
   DEEPSEEK_API_KEY=tu_deepseek_api_key_aqui
   DEEPSEEK_BASE_URL=https://api.deepseek.com
   DEEPSEEK_MODEL=deepseek-chat

   # Credenciales Cloudflare R2
   R2_ACCOUNT_ID=tu_account_id_cloudflare
   R2_ACCESS_KEY_ID=tu_access_key_s3_r2
   R2_SECRET_ACCESS_KEY=tu_secret_key_s3_r2
   R2_BUCKET_NAME=todomigobgt
   R2_OBJECT_KEY=noticias.json

   # Parametros del Scraper
   SCRAPER_MAX_CANDIDATES=30
   SCRAPER_TIMEOUT_MS=15000
   SCRAPER_DELAY_MS=1000

   # Publicacion activa
   DRY_RUN=false
   OUTPUT_PREVIEW_PATH=/app/output/noticias.preview.json
   ```

2. **Ejecucion manual de prueba con Docker:**
   ```bash
   docker run --rm \
     --env-file .env \
     -v $(pwd)/output:/app/output \
     estebansnzt/government-news-pipeline:v2-arm64
   ```
   *(Para servidores x86_64, compilar localmente con `docker build -t news-pipeline .`)*.

3. **Programar corrida recurrente con Cron (cada 12 horas):**
   ```bash
   crontab -e
   ```
   *Agregar la siguiente linea:*
   ```cron
   0 0,12 * * * docker run --rm --env-file /home/trebol4devop/news-pipeline/.env -v /home/trebol4devop/news-pipeline/output:/app/output estebansnzt/government-news-pipeline:v2-arm64 >> /home/trebol4devop/news-pipeline/pipeline.log 2>&1
   ```

---

### Paso 6: Backend de Suscripciones y Configuracion de Tailscale Funnel para Cualquier Instancia en la Nube

El backend puede ejecutarse en la Raspberry Pi original o en cualquier maquina virtual / VPS en la nube (AWS EC2, Google Cloud Compute Engine, Oracle Cloud Infrastructure, DigitalOcean, etc.) sin abrir puertos en firewalls ni pagar por direcciones IP elasticas estaticas.

#### 1. Despliegue del Backend Python en la Instancia

1. **Configurar el entorno en la instancia (`raspberry-pi/` o servidor):**
   ```bash
   cd ../raspberry-pi
   cp .env.example .env
   nano .env
   ```
   *Definir puerto, base de datos y credenciales SMTP:*
   ```ini
   PORT=8080
   HOST=0.0.0.0
   DB_PATH=todomigob.db

   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=trebol4devop@gmail.com
   SMTP_PASS=tu_contrasena_de_aplicacion_gmail
   SMTP_FROM_NAME=TODOMIGOB Notificaciones Oficiales

   APP_URL=https://tu-nodo.tu-tailnet.ts.net
   R2_BUCKET_URL=https://pub-b246f9594b0f4cb5960b8f6ec9f1ba2b.r2.dev/noticias.json
   ```

2. **Ejecutar como servicio de sistema `systemd`:**
   ```bash
   sudo cp todomigob.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable todomigob
   sudo systemctl start todomigob
   ```
   *O mediante Docker Compose:*
   ```bash
   docker compose up -d --build
   ```

---

#### 2. Guia Detallada: Configuracion de Tailscale Funnel en Cualquier Servidor en la Nube

Tailscale Funnel permite enrutar trafico HTTPS publico desde internet hacia un puerto local del servidor mediante un tunel criptografico inverso.

1. **Habilitar MagicDNS y HTTPS en la Consola de Tailscale:**
   * Ingresar a la consola de administracion (`login.tailscale.com/admin/dns`).
   * Asegurarse de que **MagicDNS** este habilitado.
   * En la seccion **HTTPS Certificates**, pulsar **Enable HTTPS**.

2. **Configurar la Politica de Acceso (ACL) para permitir Funnel:**
   * En el panel de Tailscale, ir a **Access Controls** (`login.tailscale.com/admin/acls`).
   * En la configuracion JSON de las ACLs, agregar o verificar el atributo `nodeAttrs` para autorizar Funnel a los miembros o a una etiqueta (tag):
   ```json
   "nodeAttrs": [
     {
       "target": ["autogroup:member", "tag:server"],
       "attr": ["funnel"]
     }
   ]
   ```
   * Guardar los cambios.

3. **Instalar Tailscale en la nueva instancia (Ubuntu / Debian / Linux):**
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   ```

4. **Conectar e iniciar sesion en la Tailnet:**
   ```bash
   sudo tailscale up --operator=$USER
   ```
   *En servidores headless (sin navegador), el comando mostrara una URL de autenticacion para abrir en el navegador, o se puede autenticar directamente con una auth key:*
   ```bash
   sudo tailscale up --authkey=tskey-auth-kXXXXX-XXXXX --operator=$USER
   ```

5. **Exponer el puerto 8080 publicamente con Funnel:**
   ```bash
   # Habilitar el reenvio y generar el certificado TLS automatico
   sudo tailscale funnel 8080
   ```

6. **Verificar el estado y obtener la URL publica:**
   ```bash
   tailscale funnel status
   ```
   El sistema devolvera la URL publica segura asignada por Tailscale:
   `https://<nombre-servidor>.<id-tailnet>.ts.net`

7. **Comprobar conectividad publica:**
   ```bash
   curl -I https://<nombre-servidor>.<id-tailnet>.ts.net/api/health
   # Respuesta esperada: HTTP/1.1 200 OK
   ```
   Esta URL resultante es la que debe colocarse como `PUBLIC_API_URL` en el archivo `.env` del Frontend antes de compilar y desplegar en Cloudflare.

---

### Paso 7: Verificacion Integral del Despliegue

* **Verificar API de Suscripciones:**
  ```bash
  curl -I https://<nombre-servidor>.<id-tailnet>.ts.net/api/health
  # Esperado: {"status": "ok", "service": "todomigob-raspi", "db": "todomigob.db"}
  ```
* **Verificar Disponibilidad del JSON en Cloudflare R2:**
  ```bash
  curl -I https://pub-b246f9594b0f4cb5960b8f6ec9f1ba2b.r2.dev/noticias.json
  # Esperado: HTTP/2 200 OK con Content-Type application/json
  ```
* **Verificar Resolucion de Noticias a traves del Worker:**
  ```bash
  curl -I https://todomigobgt.<subdominio>.workers.dev/noticias.json
  # Esperado: HTTP/2 200 OK servido a traves del binding R2
  ```
* **Prueba Funcional de Registro de Usuario:**
  ```bash
  curl -X POST https://<nombre-servidor>.<id-tailnet>.ts.net/api/users \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Prueba Final",
      "email": "tu_correo@gmail.com",
      "preferences": ["salud_prevencion", "educacion_becas"]
    }'
  # Esperado: HTTP/1.1 201 Created con envio de correo en segundo plano
  ```

---

## 4. Trabajo Futuro y Roadmap

Para transformar este MVP en una plataforma nacional escalable de gobernanza digital, se contemplan las siguientes fases:

* **Fase 1: Cobertura Multilingue Integral (Q1)**
  * Ampliacion del motor de traduccion a mas idiomas mayas (Q'eqchi', Kaqchikel y Mam).
  * Sintesis de voz (Text-to-Speech) en lenguas nativas para ciudadanos con analfabetismo o discapacidad visual.
* **Fase 2: Expansion de Canales de Notificacion (Q2)**
  * Integracion de chatbot en WhatsApp y bot de Telegram mediante webhooks para envio de alertas directas sin requerir correo electronico.
  * Notificaciones Web Push nativas en el navegador soportadas mediante Progressive Web App (PWA).
* **Fase 3: Asistente Interactivo de Tramites y Requisitos (Q3)**
  * Incorporacion de un modelo RAG (Retrieval-Augmented Generation) para responder dudas ciudadanas paso a paso (ej. checklist previa para licencias sanitarias o registro mercantil).
  * Generacion automatica de listas de verificacion de requisitos personalizadas antes de firmar contratos o alquilar locales comerciales.
* **Fase 4: Alta Disponibilidad e Integracion Institucional (Q4)**
  * Migracion del almacenamiento de suscriptores hacia una base de datos distribuida en el borde (Cloudflare D1 o PostgreSQL gestionado).
  * Exposicion de webhooks para que las oficinas de comunicacion social de los ministerios puedan emitir comunicados urgentes directamente a la plataforma.
