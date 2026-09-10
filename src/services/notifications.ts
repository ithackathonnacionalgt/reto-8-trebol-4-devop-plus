/**
 * Servicio de Notificaciones por Correo
 * 
 * Gestiona la suscripción de los ciudadanos a alertas de noticias según sus categorías de interés.
 * Actualmente implementado con almacenamiento local (mock / localStorage) y diseñado para
 * conectarse directamente a una API backend con base de datos (PostgreSQL, Supabase, Express, etc.).
 */

export interface NotificationSubscription {
  email: string;
  categories: string[];
  frequency: 'instant' | 'weekly';
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscribePayload {
  email: string;
  categories: string[];
  frequency?: 'instant' | 'weekly';
}

export interface SubscriptionResult {
  success: boolean;
  data?: NotificationSubscription;
  error?: string;
}

export const NOTIFICATION_STORAGE_KEY = 'todomigob_notification_subscription';

/**
 * Endpoint del backend para cuando se conecte con la base de datos real.
 * Ejemplo: POST https://api.gob.gt/v1/notifications/subscribe
 */
export const BACKEND_API_ENDPOINT = '/api/notifications/subscribe';

/**
 * Valida el formato de correo electrónico
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Obtiene la suscripción actual del usuario desde almacenamiento local o backend
 */
export function getNotificationSubscription(): NotificationSubscription | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.email || !parsed.active) return null;
    return parsed as NotificationSubscription;
  } catch (err) {
    console.error('Error al leer suscripción de notificaciones:', err);
    return null;
  }
}

/**
 * Guarda o actualiza la suscripción a notificaciones
 * 
 * En el futuro con backend y base de datos:
 * ```ts
 * const res = await fetch(BACKEND_API_ENDPOINT, {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify(payload)
 * });
 * return await res.json();
 * ```
 */
export async function saveNotificationSubscription(payload: SubscribePayload): Promise<SubscriptionResult> {
  const trimmedEmail = (payload.email || '').trim().toLowerCase();

  // Validación de correo
  if (!isValidEmail(trimmedEmail)) {
    return {
      success: false,
      error: 'Correo electrónico inválido',
    };
  }

  // Validación de categorías
  if (!payload.categories || !Array.isArray(payload.categories) || payload.categories.length === 0) {
    return {
      success: false,
      error: 'Debes seleccionar al menos una categoría',
    };
  }

  // Simulación de latencia de red (mock API)
  await new Promise((resolve) => setTimeout(resolve, 350));

  const now = new Date().toISOString();
  const existing = getNotificationSubscription();

  const subscription: NotificationSubscription = {
    email: trimmedEmail,
    categories: [...payload.categories],
    frequency: payload.frequency || 'instant',
    active: true,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(subscription));
      // Despachar evento para sincronizar interfaz reactivamente
      window.dispatchEvent(new CustomEvent('todomigob:subscription-changed', {
        detail: subscription
      }));
    } catch (err) {
      console.error('Error al persistir suscripción:', err);
      return {
        success: false,
        error: 'No se pudo guardar la suscripción localmente',
      };
    }
  }

  return {
    success: true,
    data: subscription,
  };
}

/**
 * Cancela la suscripción actual a notificaciones
 */
export async function cancelNotificationSubscription(): Promise<{ success: boolean; error?: string }> {
  // Simulación de latencia de red (mock API)
  await new Promise((resolve) => setTimeout(resolve, 200));

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(NOTIFICATION_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('todomigob:subscription-changed', {
        detail: null
      }));
    } catch (err) {
      console.error('Error al cancelar suscripción:', err);
      return { success: false, error: 'Error al cancelar la suscripción' };
    }
  }

  return { success: true };
}
