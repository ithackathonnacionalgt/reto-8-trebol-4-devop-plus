export interface NoticiaContenido {
  title: string;
  summary: string;
  citizenAction: string;
  // Fallbacks de compatibilidad
  titulo?: string;
  resumen?: string;
  accionCiudadana?: string;
}

export interface NoticiaItem {
  id: string;
  originalUrl: string;
  source: string;
  sourceType: string;
  categoryId: string;
  tags: string[];
  publishedAt: string;
  extractedAt: string;
  urgent: boolean;
  content: {
    es: NoticiaContenido;
    quc?: NoticiaContenido;
    kch?: NoticiaContenido;
  };
  // Fallbacks de compatibilidad
  urlOriginal?: string;
  fuente?: string;
  tipoFuente?: string;
  categoriaId?: string;
  etiquetas?: string[];
  fechaPublicacion?: string;
  fechaExtraccion?: string;
  urgente?: boolean;
  contenido?: {
    es: NoticiaContenido;
    quc?: NoticiaContenido;
    kch?: NoticiaContenido;
  };
}

export interface CategoriaItem {
  id: string;
  name: string;
  nameKch?: string;
  // Fallbacks de compatibilidad
  nombre?: string;
  nombreKch?: string;
}

export interface NoticiasData {
  lastUpdatedAt: string;
  totalNews: number;
  availableCategories: CategoriaItem[];
  news: NoticiaItem[];
  // Fallbacks de compatibilidad
  ultimaActualizacion?: string;
  totalNoticias?: number;
  categoriasDisponibles?: CategoriaItem[];
  noticias?: NoticiaItem[];
}

let cachedData: NoticiasData | null = null;

export const R2_NOTICIAS_URL = 'https://pub-b246f9594b0f4cb5960b8f6ec9f1ba2b.r2.dev/noticias.json';

/**
 * Obtiene el origen de noticias.json.
 * Usa por defecto el bucket de Cloudflare R2 con fallback a variable de entorno
 */
export function getNoticiasEndpoint(): string {
  if (typeof window !== 'undefined' && (window as any).PUBLIC_NOTICIAS_URL) {
    return (window as any).PUBLIC_NOTICIAS_URL;
  }
  return import.meta.env.PUBLIC_NOTICIAS_URL || R2_NOTICIAS_URL;
}

/**
 * Normaliza la estructura del JSON para garantizar compatibilidad total
 */
export function normalizeNoticiasData(raw: any): NoticiasData {
  const availableCategories: CategoriaItem[] = (raw.availableCategories || raw.categoriasDisponibles || []).map((cat: any) => ({
    id: cat.id,
    name: cat.name || cat.nombre || '',
    nameKch: cat.nameKch || cat.nombreKch || cat.name || cat.nombre || '',
    nombre: cat.nombre || cat.name || '',
    nombreKch: cat.nombreKch || cat.nameKch || ''
  }));

  const news: NoticiaItem[] = (raw.news || raw.noticias || []).map((item: any) => {
    const rawContent = item.content || item.contenido || {};
    const contentEs = rawContent.es || {};
    const contentQuc = rawContent.quc || rawContent.kch || {};

    const esContenido: NoticiaContenido = {
      title: contentEs.title || contentEs.titulo || '',
      summary: contentEs.summary || contentEs.resumen || '',
      citizenAction: contentEs.citizenAction || contentEs.accionCiudadana || '',
      titulo: contentEs.titulo || contentEs.title || '',
      resumen: contentEs.resumen || contentEs.summary || '',
      accionCiudadana: contentEs.accionCiudadana || contentEs.citizenAction || ''
    };

    const qucContenido: NoticiaContenido = {
      title: contentQuc.title || contentQuc.titulo || esContenido.title,
      summary: contentQuc.summary || contentQuc.resumen || esContenido.summary,
      citizenAction: contentQuc.citizenAction || contentQuc.accionCiudadana || esContenido.citizenAction,
      titulo: contentQuc.titulo || contentQuc.title || esContenido.titulo,
      resumen: contentQuc.resumen || contentQuc.summary || esContenido.resumen,
      accionCiudadana: contentQuc.accionCiudadana || contentQuc.citizenAction || esContenido.accionCiudadana
    };

    return {
      id: item.id,
      originalUrl: item.originalUrl || item.urlOriginal || '',
      source: item.source || item.fuente || '',
      sourceType: item.sourceType || item.tipoFuente || '',
      categoryId: item.categoryId || item.categoriaId || '',
      tags: item.tags || item.etiquetas || [],
      publishedAt: item.publishedAt || item.fechaPublicacion || '',
      extractedAt: item.extractedAt || item.fechaExtraccion || '',
      urgent: item.urgent !== undefined ? item.urgent : (item.urgente || false),
      content: {
        es: esContenido,
        quc: qucContenido,
        kch: qucContenido
      },
      // Compatibilidad
      urlOriginal: item.originalUrl || item.urlOriginal || '',
      fuente: item.source || item.fuente || '',
      tipoFuente: item.sourceType || item.tipoFuente || '',
      categoriaId: item.categoryId || item.categoriaId || '',
      etiquetas: item.tags || item.etiquetas || [],
      fechaPublicacion: item.publishedAt || item.fechaPublicacion || '',
      fechaExtraccion: item.extractedAt || item.fechaExtraccion || '',
      urgente: item.urgent !== undefined ? item.urgent : (item.urgente || false),
      contenido: {
        es: esContenido,
        quc: qucContenido,
        kch: qucContenido
      }
    };
  });

  return {
    lastUpdatedAt: raw.lastUpdatedAt || raw.ultimaActualizacion || '',
    totalNews: raw.totalNews || raw.totalNoticias || news.length,
    availableCategories,
    news,
    // Compatibilidad
    ultimaActualizacion: raw.lastUpdatedAt || raw.ultimaActualizacion || '',
    totalNoticias: raw.totalNews || raw.totalNoticias || news.length,
    categoriasDisponibles: availableCategories,
    noticias: news
  };
}

/**
 * Carga noticias desde Cloudflare R2 con soporte para recarga fresca
 */
export async function loadNoticias(forceReload = false): Promise<NoticiasData> {
  if (cachedData && !forceReload) {
    return cachedData;
  }

  const endpoint = getNoticiasEndpoint();
  const res = await fetch(endpoint, {
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-cache'
  });

  if (!res.ok) {
    throw new Error(`Error cargando noticias desde ${endpoint}: ${res.statusText}`);
  }

  const raw = await res.json();
  cachedData = normalizeNoticiasData(raw);
  return cachedData;
}

/**
 * Helper para obtener el contenido localizado (es o quc/kch)
 */
export function getLocalizedContent(item: NoticiaItem, lang: string): NoticiaContenido {
  if (lang === 'kch' || lang === 'quc') {
    return item.content.quc || item.content.kch || item.content.es;
  }
  return item.content.es;
}

/**
 * Helper para obtener el nombre de la categoría localizado
 */
export function getCategoryName(cat: CategoriaItem, lang: string): string {
  if (lang === 'kch' || lang === 'quc') {
    return cat.nameKch || cat.nombreKch || cat.name || cat.nombre || '';
  }
  return cat.name || cat.nombre || '';
}

/**
 * Obtiene los datos de noticias priorizando Cloudflare R2 con fallback local
 */
export async function getNoticiasData(): Promise<NoticiasData> {
  try {
    const res = await fetch(R2_NOTICIAS_URL, { cache: 'no-cache' });
    if (res.ok) {
      const raw = await res.json();
      return normalizeNoticiasData(raw);
    }
  } catch (e) {
    console.warn('Fallo al obtener noticias de R2, usando fallback:', e);
  }

  try {
    // Fallback dinámico para entorno Node / Build
    const localData = await import('../../public/noticias.json');
    return normalizeNoticiasData(localData.default || localData);
  } catch (e) {
    return {
      lastUpdatedAt: new Date().toISOString(),
      totalNews: 0,
      availableCategories: [],
      news: []
    };
  }
}

