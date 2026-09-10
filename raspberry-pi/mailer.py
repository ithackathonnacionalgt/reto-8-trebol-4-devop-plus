"""
mailer.py - Servicio de Notificaciones por Correo Electrónico para TODOMIGOB
Soporta servidor SMTP Gmail con contraseña de aplicación oficial ('todomigob').
Diseño oficial con la bandera de Guatemala (#4997D0), responsive para móviles y fallback texto plano.
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Any, Optional

# Configuración por defecto solicitada por el usuario
DEFAULT_SMTP_HOST = "smtp.gmail.com"
DEFAULT_SMTP_PORT = 465
DEFAULT_SMTP_PASS = "lykc jsej osgf ezee".replace(" ", "")
DEFAULT_APP_NAME = "todomigob"

CATEGORY_NAMES = {
    "education_scholarships": "Educación y Becas",
    "health_wellbeing": "Salud y Prevención",
    "social_programs": "Apoyo Social",
    "procedures_services": "Trámites y Documentos",
    "security_alerts": "Alertas y Emergencias",
    "employment_development": "Empleo y Emprendimiento"
}

class TodoMiGobMailer:
    def __init__(
        self,
        smtp_host: Optional[str] = None,
        smtp_port: Optional[int] = None,
        smtp_user: Optional[str] = None,
        smtp_pass: Optional[str] = None,
        sender_name: str = "TODOMIGOB Alertas Ciudadanas"
    ):
        self.smtp_host = smtp_host or os.getenv("SMTP_HOST", DEFAULT_SMTP_HOST)
        self.smtp_port = int(smtp_port or os.getenv("SMTP_PORT", str(DEFAULT_SMTP_PORT)))
        # El usuario puede definir SMTP_USER en el archivo .env o pasar su correo
        self.smtp_user = (smtp_user or os.getenv("SMTP_USER", "")).strip()
        raw_pass = smtp_pass or os.getenv("SMTP_PASS", DEFAULT_SMTP_PASS)
        self.smtp_pass = raw_pass.replace(" ", "").strip()
        self.sender_name = sender_name

    def render_news_html(self, user_name: str, news: Dict[str, Any], category_name: str) -> str:
        """
        Genera el correo HTML con la identidad gráfica oficial de TODOMIGOB:
        - Banderín de Guatemala (#4997D0 / #FFFFFF / #4997D0)
        - Encabezado oficial del gobierno
        - Título, resumen y Acción Ciudadana
        - Botón de llamado a la acción al portal oficial
        """
        content_es = news.get("content", {}).get("es", {})
        title = content_es.get("title", news.get("title", "Nueva actualización importante"))
        summary = content_es.get("summary", news.get("summary", "Se ha publicado información de tu interés en el portal."))
        citizen_action = content_es.get("citizenAction", news.get("citizenAction", ""))
        original_url = news.get("originalUrl", "https://todomigob.gob.gt")
        is_urgent = news.get("urgent", False)

        urgent_banner = ""
        if is_urgent:
            urgent_banner = """
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px;">
                <p style="margin: 0; color: #991b1b; font-weight: bold; font-size: 14px;">⚠️ ALERTA IMPORTANTE - INFORMACIÓN PRIORITARIA</p>
            </div>
            """

        action_section = ""
        if citizen_action:
            action_section = f"""
            <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 6px 0; color: #166534; font-size: 15px;">¿Qué debes hacer? (Acción Ciudadana):</h3>
                <p style="margin: 0; color: #14532d; font-size: 14px; line-height: 1.5;">{citizen_action}</p>
            </div>
            """

        return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - TODOMIGOB</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 600px; width: 100%;">
                    
                    <!-- Borde superior: Bandera de Guatemala (Azul - Blanco - Azul) -->
                    <tr>
                        <td>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="height: 8px;">
                                <tr>
                                    <td width="33.3%" style="background-color: #4997D0;"></td>
                                    <td width="33.3%" style="background-color: #FFFFFF;"></td>
                                    <td width="33.3%" style="background-color: #4997D0;"></td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Encabezado Oficial -->
                    <tr>
                        <td style="padding: 24px 30px; background-color: #ffffff; border-bottom: 1px solid #e5e7eb; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px; color: #0f172a; letter-spacing: 0.5px;">TODOMIGOB</h1>
                            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 500;">
                                Portal de Noticias y Servicios Oficiales de Guatemala
                            </p>
                        </td>
                    </tr>

                    <!-- Cuerpo de la Notificación -->
                    <tr>
                        <td style="padding: 32px 30px;">
                            {urgent_banner}

                            <!-- Distintivo de categoría -->
                            <div style="display: inline-block; padding: 4px 12px; background-color: #e0f2fe; color: #0369a1; border-radius: 9999px; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 16px;">
                                🏷️ {category_name}
                            </div>

                            <p style="margin: 0 0 16px 0; font-size: 15px; color: #475569;">
                                Estimado/a <strong>{user_name}</strong>,
                            </p>
                            
                            <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #0f172a; line-height: 1.4;">
                                {title}
                            </h2>

                            <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.6;">
                                {summary}
                            </p>

                            {action_section}

                            <!-- Botón de acción -->
                            <div style="text-align: center; margin: 32px 0 16px 0;">
                                <a href="{original_url}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #4997D0; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; box-shadow: 0 2px 4px rgba(73, 151, 208, 0.3);">
                                    Ver Notificación Completa
                                </a>
                            </div>

                            <p style="margin: 24px 0 0 0; font-size: 13px; color: #94a3b8; text-align: center;">
                                Fuente original: <a href="{original_url}" style="color: #4997D0; text-decoration: underline;">{news.get('source', 'Gobierno de Guatemala')}</a>
                            </p>
                        </td>
                    </tr>

                    <!-- Pie de página Institucional -->
                    <tr>
                        <td style="padding: 20px 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                            <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">
                                Recibiste esta notificación porque estás suscrito a la categoría <strong>{category_name}</strong> en TODOMIGOB.
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                                TODOMIGOB · Desplegado en Raspberry Pi 4 · Este es un sitio oficial del gobierno
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

    def render_news_text(self, user_name: str, news: Dict[str, Any], category_name: str) -> str:
        """Versión en texto plano para clientes de correo sin soporte HTML."""
        content_es = news.get("content", {}).get("es", {})
        title = content_es.get("title", news.get("title", "Nueva noticia"))
        summary = content_es.get("summary", news.get("summary", ""))
        action = content_es.get("citizenAction", news.get("citizenAction", ""))
        url = news.get("originalUrl", "https://todomigob.gob.gt")

        text = f"TODOMIGOB - {category_name.upper()}\n"
        text += "=" * 40 + "\n\n"
        text += f"Estimado/a {user_name},\n\n"
        text += f"NOTICIA: {title}\n\n"
        text += f"RESUMEN:\n{summary}\n\n"
        if action:
            text += f"¿QUÉ DEBES HACER?:\n{action}\n\n"
        text += f"Más detalles en: {url}\n\n"
        text += "---\nTODOMIGOB Alertas Ciudadanas\n"
        return text

    def send_notification(self, to_email: str, user_name: str, news: Dict[str, Any]) -> bool:
        """
        Envía un correo de notificación individual.
        Retorna True si fue exitoso, o lanza excepción si falló.
        """
        category_id = news.get("categoryId", "procedures_services")
        category_name = CATEGORY_NAMES.get(category_id, "Información Oficial")
        content_es = news.get("content", {}).get("es", {})
        title = content_es.get("title", news.get("title", "Nueva notificación de TODOMIGOB"))

        subject = f"[TODOMIGOB] {category_name}: {title}"
        html_body = self.render_news_html(user_name, news, category_name)
        text_body = self.render_news_text(user_name, news, category_name)

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        sender_address = self.smtp_user if self.smtp_user else "notificaciones@todomigob.gob.gt"
        msg["From"] = f"{self.sender_name} <{sender_address}>"
        msg["To"] = to_email

        # Adjuntar ambas versiones
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        if not self.smtp_user:
            raise ValueError("No se ha configurado SMTP_USER (tu correo de Gmail). Por favor defínelo en el archivo .env o en la configuración.")

        # Conexión SMTP
        if self.smtp_port == 465:
            server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, timeout=15)
        else:
            server = smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=15)
            server.starttls()

        try:
            server.login(self.smtp_user, self.smtp_pass)
            server.sendmail(sender_address, [to_email], msg.as_string())
            return True
        finally:
            server.quit()
