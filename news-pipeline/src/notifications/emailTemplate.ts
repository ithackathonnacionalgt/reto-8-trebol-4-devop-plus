import type { NewsItem } from "../domain/news.js";
import { CATEGORIES } from "../domain/categories.js";

const CATEGORY_NAMES: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, cat.name]),
);

export function getCategoryDisplayName(categoryId: string): string {
  return CATEGORY_NAMES[categoryId] ?? "Información Oficial";
}

export function renderNewsHtml(userName: string, news: NewsItem): string {
  const categoryName = getCategoryDisplayName(news.categoryId);
  const title = news.content.es.title;
  const summary = news.content.es.summary;
  const citizenAction = news.content.es.citizenAction;
  const originalUrl = news.originalUrl || "https://todomigob.gob.gt";

  const urgentBanner = news.urgent
    ? `
    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px;">
      <p style="margin: 0; color: #991b1b; font-weight: bold; font-size: 14px;">ALERTA IMPORTANTE - INFORMACIÓN PRIORITARIA</p>
    </div>`
    : "";

  const actionSection = citizenAction
    ? `
    <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
      <h3 style="margin: 0 0 6px 0; color: #166534; font-size: 15px;">¿Qué debes hacer? (Acción Ciudadana):</h3>
      <p style="margin: 0; color: #14532d; font-size: 14px; line-height: 1.5;">${citizenAction}</p>
    </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - TODOMIGOBGT</title>
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
              <h1 style="margin: 0; font-size: 24px; color: #0f172a; letter-spacing: 0.5px;">TODOMIGOBGT</h1>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 500;">
                Portal de Noticias y Servicios Oficiales de Guatemala
              </p>
            </td>
          </tr>

          <!-- Cuerpo de la Notificación -->
          <tr>
            <td style="padding: 32px 30px;">
              ${urgentBanner}

              <!-- Distintivo de categoría -->
              <div style="display: inline-block; padding: 4px 12px; background-color: #e0f2fe; color: #0369a1; border-radius: 9999px; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 16px;">
                ${categoryName}
              </div>

              <p style="margin: 0 0 16px 0; font-size: 15px; color: #475569;">
                Estimado/a <strong>${userName}</strong>,
              </p>
              
              <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #0f172a; line-height: 1.4;">
                ${title}
              </h2>

              <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.6;">
                ${summary}
              </p>

              ${actionSection}

              <!-- Botón de acción -->
              <div style="text-align: center; margin: 32px 0 16px 0;">
                <a href="${originalUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #4997D0; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; box-shadow: 0 2px 4px rgba(73, 151, 208, 0.3);">
                  Ver Notificación Completa
                </a>
              </div>

              <p style="margin: 24px 0 0 0; font-size: 13px; color: #94a3b8; text-align: center;">
                Fuente: <a href="${originalUrl}" style="color: #4997D0; text-decoration: underline;">${news.source}</a>
              </p>
            </td>
          </tr>

          <!-- Pie de página Institucional -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                Recibiste esta notificación porque estás suscrito a la categoría <strong>${categoryName}</strong> en TODOMIGOBGT.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderNewsText(userName: string, news: NewsItem): string {
  const categoryName = getCategoryDisplayName(news.categoryId);
  const title = news.content.es.title;
  const summary = news.content.es.summary;
  const action = news.content.es.citizenAction;
  const url = news.originalUrl || "https://todomigob.gob.gt";

  let text = `TODOMIGOBGT - ${categoryName.toUpperCase()}\n`;
  text += `${"=".repeat(40)}\n\n`;
  text += `Estimado/a ${userName},\n\n`;
  text += `NOTICIA: ${title}\n\n`;
  text += `RESUMEN:\n${summary}\n\n`;
  if (action) {
    text += `¿QUÉ DEBES HACER?:\n${action}\n\n`;
  }
  text += `Enlace oficial: ${url}\n\n`;
  text += `---\nTODOMIGOBGT Alertas Ciudadanas\n`;
  return text;
}
