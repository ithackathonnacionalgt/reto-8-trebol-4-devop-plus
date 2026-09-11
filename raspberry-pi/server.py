"""
server.py - Servidor Web y API REST de Suscripciones y Notificaciones TODOMIGOB
Diseñado para correr en Raspberry Pi 4 con CERO dependencias externas (usa Python http.server estándar).
Incluye portal web para ciudadanos y panel de administración.
"""

import os
import json
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
from typing import Any, Dict, List, Optional
from database import TodoMiGobDB
from mailer import TodoMiGobMailer, DEFAULT_APP_NAME
from dispatcher import NotificationDispatcher

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("todomigob.server")

DB_PATH = os.getenv("DB_PATH", "todomigob.db")
PORT = int(os.getenv("PORT", "8080"))
HOST = os.getenv("HOST", "0.0.0.0")

db = TodoMiGobDB(DB_PATH)
mailer = TodoMiGobMailer()
dispatcher = NotificationDispatcher(db, mailer)

HTML_PORTAL = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TODOMIGOB - Notificaciones Oficiales de Guatemala</title>
    <style>
        :root {
            --primary: #4997D0;
            --primary-dark: #2d7bb4;
            --bg: #f3f4f6;
            --surface: #ffffff;
            --text: #1f2937;
            --text-muted: #6b7280;
            --border: #e5e7eb;
            --success: #16a34a;
            --danger: #dc2626;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        body { background-color: var(--bg); color: var(--text); line-height: 1.5; padding-bottom: 50px; }
        
        .flag-bar { height: 8px; width: 100%; display: flex; }
        .flag-blue { width: 33.33%; background-color: #4997D0; }
        .flag-white { width: 33.34%; background-color: #ffffff; }

        header { background: var(--surface); padding: 25px 20px; text-align: center; border-bottom: 1px solid var(--border); }
        header h1 { font-size: 26px; color: #111827; letter-spacing: 0.5px; }
        header p { color: var(--text-muted); font-size: 13px; text-transform: uppercase; margin-top: 4px; font-weight: 600; }
        
        .container { max-width: 800px; margin: 30px auto; padding: 0 20px; }
        .tabs { display: flex; gap: 10px; margin-bottom: 20px; }
        .tab-btn { background: #e5e7eb; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; color: var(--text-muted); transition: 0.2s; }
        .tab-btn.active { background: var(--primary); color: white; }

        .card { background: var(--surface); border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid var(--border); margin-bottom: 25px; }
        .card h2 { font-size: 20px; margin-bottom: 15px; color: #111827; border-bottom: 2px solid var(--border); padding-bottom: 10px; }
        
        .form-group { margin-bottom: 20px; }
        label { display: block; font-weight: 600; font-size: 14px; margin-bottom: 6px; color: #374151; }
        input[type="text"], input[type="email"] { width: 100%; padding: 12px 16px; border: 1px solid var(--border); border-radius: 8px; font-size: 15px; outline: none; transition: 0.2s; }
        input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(73, 151, 208, 0.2); }

        .category-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 10px; }
        .category-option { border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; align-items: flex-start; gap: 10px; cursor: pointer; transition: 0.2s; background: #fafafa; }
        .category-option:hover { border-color: var(--primary); background: #f0f9ff; }
        .category-option input[type="checkbox"] { margin-top: 4px; accent-color: var(--primary); transform: scale(1.2); }
        .category-title { font-weight: 600; font-size: 14px; color: #1f2937; }
        .category-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

        .btn { display: inline-block; background-color: var(--primary); color: white; padding: 12px 24px; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .btn:hover { background-color: var(--primary-dark); }
        .btn-secondary { background-color: #64748b; }
        .btn-secondary:hover { background-color: #475569; }

        .alert { padding: 15px; border-radius: 8px; margin-bottom: 20px; display: none; font-size: 14px; }
        .alert-success { background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        .alert-error { background-color: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }

        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid var(--border); }
        th { background-color: #f8fafc; font-weight: 600; color: #475569; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background: #e0f2fe; color: #0369a1; margin: 2px; }
        .badge-success { background: #dcfce7; color: #15803d; }
        .badge-failed { background: #fee2e2; color: #b91c1c; }

        .footer-note { text-align: center; color: var(--text-muted); font-size: 12px; margin-top: 40px; }
    </style>
</head>
<body>
    <div class="flag-bar">
        <div class="flag-blue"></div>
        <div class="flag-white"></div>
        <div class="flag-blue"></div>
    </div>
    
    <header>
        <h1>TODOMIGOB</h1>
        <p>Sistema de Alertas y Suscripciones Ciudadanas · Raspberry Pi 4 Edition</p>
    </header>

    <div class="container">
        <div class="tabs">
            <button class="tab-btn active" onclick="showTab('subscribe')">🔔 Registro de Ciudadano</button>
            <button class="tab-btn" onclick="showTab('users'); loadUsers();">👥 Usuarios Registrados</button>
            <button class="tab-btn" onclick="showTab('logs'); loadLogs();">📜 Historial de Notificaciones</button>
            <button class="tab-btn" onclick="showTab('test')">🧪 Probar Correo SMTP</button>
        </div>

        <div id="alertBox" class="alert"></div>

        <!-- Pestaña 1: Registro -->
        <div id="tab-subscribe" class="card">
            <h2>Registro de Preferencias de Noticias</h2>
            <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">
                Recibe avisos inmediatos en tu correo electrónico cada vez que el gobierno publique información o trámites de las categorías que elijas.
            </p>
            <form id="subscribeForm" onsubmit="handleSubscribe(event)">
                <div class="form-group">
                    <label for="userName">Nombre Completo:</label>
                    <input type="text" id="userName" required placeholder="Ej. María Josefa Álvarez">
                </div>
                <div class="form-group">
                    <label for="userEmail">Correo Electrónico:</label>
                    <input type="email" id="userEmail" required placeholder="ejemplo@correo.com">
                </div>

                <div class="form-group">
                    <label>Selecciona tus Preferencias de Información:</label>
                    <div class="category-grid" id="categoryContainer">
                        <!-- Categorías cargadas dinámicamente -->
                    </div>
                </div>

                <button type="submit" class="btn">Guardar y Activar Notificaciones</button>
            </form>
        </div>

        <!-- Pestaña 2: Lista de Usuarios -->
        <div id="tab-users" class="card" style="display: none;">
            <h2>Ciudadanos Registrados en la Base de Datos</h2>
            <div style="overflow-x: auto;">
                <table id="usersTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Correo</th>
                            <th>Preferencias Seleccionadas</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>

        <!-- Pestaña 3: Historial de Envíos -->
        <div id="tab-logs" class="card" style="display: none;">
            <h2>Auditoría de Notificaciones Enviadas</h2>
            <div style="overflow-x: auto;">
                <table id="logsTable">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Destinatario</th>
                            <th>Categoría</th>
                            <th>Noticia ID</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>

        <!-- Pestaña 4: Prueba de SMTP -->
        <div id="tab-test" class="card" style="display: none;">
            <h2>Probar Conectividad SMTP</h2>
            <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">
                Envía un correo de prueba a tu dirección utilizando el servidor Gmail con la contraseña de aplicación configurada ('todomigob').
            </p>
            <form id="testForm" onsubmit="handleTestEmail(event)">
                <div class="form-group">
                    <label for="testEmail">Enviar correo de prueba a:</label>
                    <input type="email" id="testEmail" required placeholder="tu-correo@ejemplo.com">
                </div>
                <button type="submit" class="btn">Enviar Notificación de Prueba</button>
            </form>
        </div>

        <div class="footer-note">
            Servidor TODOMIGOB activo en Raspberry Pi 4 · Base de Datos SQLite · Puerto 8080
        </div>
    </div>

    <script>
        const CATEGORIES = [
            { id: "education_scholarships", name: "Educación y Becas", desc: "Becas, convocatorias estudiantiles y programas de educación." },
            { id: "health_wellbeing", name: "Salud y Prevención", desc: "Campañas de vacunación, centros de salud y alertas sanitarias." },
            { id: "social_programs", name: "Apoyo Social", desc: "Subsidios, programas de asistencia y transferencias monetarias." },
            { id: "procedures_services", name: "Trámites y Documentos", desc: "DPI, pasaportes, licencias, certificaciones y requisitos." },
            { id: "security_alerts", name: "Alertas y Emergencias", desc: "Avisos de seguridad, protección civil, clima y emergencias." },
            { id: "employment_development", name: "Empleo y Emprendimiento", desc: "Ferias de empleo, capacitaciones y financiamiento productivo." }
        ];

        function renderCategoryCheckboxes() {
            const container = document.getElementById("categoryContainer");
            container.innerHTML = CATEGORIES.map(c => `
                <label class="category-option">
                    <input type="checkbox" name="preferences" value="${c.id}">
                    <div>
                        <div class="category-title">${c.name}</div>
                        <div class="category-desc">${c.desc}</div>
                    </div>
                </label>
            `).join("");
        }
        renderCategoryCheckboxes();

        function showTab(tab) {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            event.target.classList.add("active");
            document.getElementById("tab-subscribe").style.display = tab === "subscribe" ? "block" : "none";
            document.getElementById("tab-users").style.display = tab === "users" ? "block" : "none";
            document.getElementById("tab-logs").style.display = tab === "logs" ? "block" : "none";
            document.getElementById("tab-test").style.display = tab === "test" ? "block" : "none";
        }

        function showAlert(message, isError = false) {
            const box = document.getElementById("alertBox");
            box.className = "alert " + (isError ? "alert-error" : "alert-success");
            box.innerText = message;
            box.style.display = "block";
            setTimeout(() => { box.style.display = "none"; }, 5000);
        }

        async function handleSubscribe(e) {
            e.preventDefault();
            const name = document.getElementById("userName").value.trim();
            const email = document.getElementById("userEmail").value.trim();
            const checkedBoxes = Array.from(document.querySelectorAll("input[name='preferences']:checked")).map(b => b.value);

            if (checkedBoxes.length === 0) {
                showAlert("Por favor selecciona al menos una categoría de preferencia.", true);
                return;
            }

            try {
                const res = await fetch("/api/users", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, preferences: checkedBoxes })
                });
                const data = await res.json();
                if (res.ok) {
                    showAlert("¡Registro exitoso! Tus preferencias se han guardado correctamente.");
                    document.getElementById("subscribeForm").reset();
                } else {
                    showAlert(data.error || "Error al registrar preferencias.", true);
                }
            } catch (err) {
                showAlert("Error de conexión con el servidor: " + err.message, true);
            }
        }

        async function loadUsers() {
            try {
                const res = await fetch("/api/users");
                const users = await res.json();
                const tbody = document.querySelector("#usersTable tbody");
                tbody.innerHTML = users.map(u => `
                    <tr>
                        <td>#${u.id}</td>
                        <td><strong>${u.name}</strong></td>
                        <td>${u.email}</td>
                        <td>${(u.preferences || []).map(p => `<span class="badge">${p.name}</span>`).join("")}</td>
                    </tr>
                `).join("");
            } catch (err) {
                console.error(err);
            }
        }

        async function loadLogs() {
            try {
                const res = await fetch("/api/logs");
                const logs = await res.json();
                const tbody = document.querySelector("#logsTable tbody");
                tbody.innerHTML = logs.map(l => `
                    <tr>
                        <td>${new Date(l.sent_at).toLocaleString()}</td>
                        <td>${l.user_name} (${l.email})</td>
                        <td><span class="badge">${l.category_name || l.category_id}</span></td>
                        <td>${l.news_id}</td>
                        <td><span class="badge ${l.status === 'SENT' ? 'badge-success' : 'badge-failed'}">${l.status}</span></td>
                    </tr>
                `).join("");
            } catch (err) {
                console.error(err);
            }
        }

        async function handleTestEmail(e) {
            e.preventDefault();
            const to = document.getElementById("testEmail").value.trim();
            try {
                showAlert("Enviando correo de prueba vía SMTP Gmail...");
                const res = await fetch("/api/test-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ to })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    showAlert("¡Correo de prueba enviado con éxito a " + to + "!");
                } else {
                    showAlert("Fallo al enviar correo: " + (data.error || "Error desconocido"), true);
                }
            } catch (err) {
                showAlert("Error al conectar con la API: " + err.message, true);
            }
        }
    </script>
</body>
</html>
"""

class TodoMiGobRequestHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code: int, data: Any):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8"))

    def _send_html(self, status_code: int, html: str):
        self.send_response(status_code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(html.encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path in ("/", "/index.html"):
            self._send_html(200, HTML_PORTAL)
        elif path == "/api/health":
            self._send_json(200, {"status": "ok", "service": "todomigob-raspi", "db": DB_PATH})
        elif path == "/api/categories":
            self._send_json(200, db.get_categories())
        elif path == "/api/users":
            self._send_json(200, db.list_all_users())
        elif path == "/api/logs":
            self._send_json(200, db.get_notification_logs(limit=100))
        else:
            self._send_json(404, {"error": "Ruta no encontrada"})

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get("Content-Length", 0))
        body_bytes = self.rfile.read(content_length) if content_length > 0 else b"{}"
        
        try:
            body = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
        except Exception:
            self._send_json(400, {"error": "El cuerpo de la solicitud no es un JSON válido"})
            return

        if path == "/api/users":
            name = body.get("name")
            email = body.get("email")
            preferences = body.get("preferences", [])
            allow_update = bool(body.get("allow_update", False))

            if not name or not email:
                self._send_json(400, {"error": "Los campos 'name' y 'email' son obligatorios."})
                return

            try:
                user = db.register_user(name, email, preferences, allow_update=allow_update)
                self._send_json(201, user)
            except Exception as e:
                self._send_json(400, {"error": str(e)})

        elif path == "/api/news/dispatch":
            # Endpoint para recibir noticias y despacharlas a usuarios suscritos
            news_data = body.get("news") or body
            if isinstance(news_data, dict):
                news_list = [news_data]
            elif isinstance(news_data, list):
                news_list = news_data
            else:
                self._send_json(400, {"error": "Se esperaba un objeto de noticia o una lista en 'news'."})
                return

            try:
                results = dispatcher.dispatch_batch(news_list)
                self._send_json(200, {"success": True, "dispatched_items": results})
            except Exception as e:
                self._send_json(500, {"error": str(e)})

        elif path == "/api/test-email":
            to_email = body.get("to")
            if not to_email:
                self._send_json(400, {"error": "Debe especificar el campo 'to' con la dirección de correo."})
                return

            mock_news = {
                "id": "test-news-welcome",
                "categoryId": "procedures_services",
                "source": "TODOMIGOB",
                "originalUrl": "https://todomigob.gob.gt",
                "urgent": False,
                "content": {
                    "es": {
                        "title": "Verificación de Notificaciones TODOMIGOB en Raspberry Pi",
                        "summary": "Este es un correo de prueba enviado automáticamente desde el servidor TODOMIGOB en tu Raspberry Pi 4.",
                        "citizenAction": "No se requiere ninguna acción adicional. Tu conexión SMTP está funcionando correctamente."
                    }
                }
            }

            try:
                mailer.send_notification(to_email, "Ciudadano", mock_news)
                self._send_json(200, {"success": True, "message": f"Correo enviado exitosamente a {to_email}"})
            except Exception as e:
                self._send_json(500, {"success": False, "error": str(e)})
        else:
            self._send_json(404, {"error": "Ruta POST no encontrada"})

def run():
    server_address = (HOST, PORT)
    httpd = HTTPServer(server_address, TodoMiGobRequestHandler)
    print("===========================================================")
    print("[TODOMIGOB] Servidor iniciado para Raspberry Pi 4")
    print(f"[HTTP] Interfaz Web: http://localhost:{PORT} (o la IP de tu Raspi)")
    print(f"[DB]   Base de Datos: {os.path.abspath(DB_PATH)}")
    print(f"[SMTP] Host: {mailer.smtp_host}:{mailer.smtp_port}")
    print(f"[SMTP] App: {DEFAULT_APP_NAME}")
    print("===========================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido por el usuario.")
        httpd.server_close()

if __name__ == "__main__":
    run()
