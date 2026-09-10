export const languages = {
  es: {
    code: 'es',
    label: 'Español',
    native: 'Español',
  },
  kch: {
    code: 'kch',
    label: 'K\'iche\'',
    native: 'Qatzij / K\'iche\'',
  },
} as const;

export type LanguageKey = keyof typeof languages;
export const defaultLang: LanguageKey = 'es';

export const ui = {
  es: {
    'header.title': 'TODOMIGOB',
    'header.subtitle': 'Este es un sitio oficial del gobierno',
    'footer.nonprofit': 'Este es un sitio sin fines de lucro',
    'footer.copyright': '© 2024 - Todos los Derechos Reservados',
    'search.instruction': 'Escribe una palabra o frase corta que describa lo que buscas',
    'search.placeholder': 'Describe lo que buscas',
    'search.button': 'Buscar',
    'results.match': 'Coincidencias - resumen',
    'results.placeholder': 'Palabra buscada',
    'detail.back': 'Atrás',
    'detail.title': 'Titulo',
    'detail.subtitle': 'Subtitulo',
    'detail.link.site': 'Sitio',
    'detail.link.contact': 'Contacto',
    'detail.link.location': 'Ubicacion',
    'detail.show_more': 'mostrar mas',
  },
  kch: {
    'header.title': 'TODOMIGOB',
    'header.subtitle': 'Wa\' jun uq\'ijil k\'olib\'al rech ri qatinamit',
    'footer.nonprofit': 'Wa\' k\'olib\'al man rech ta ch\'akik pwaq',
    'footer.copyright': '© 2024 - Ronojel ya\'talik',
    'search.instruction': 'Tz\'ib\'aj jun tzij o ch\'ob\'oj che katzukuj',
    'search.placeholder': 'Tz\'ib\'aj jas katzukuj',
    'search.button': 'Tzukuj',
    'results.match': 'K\'ulmatajem - uk\'olilem',
    'results.placeholder': 'Tzij tzukum',
    'detail.back': 'Tzalijik',
    'detail.title': 'Ub\'i\'',
    'detail.subtitle': 'Ukab\' ub\'i\'',
    'detail.link.site': 'K\'olib\'al',
    'detail.link.contact': 'Ch\'aweb\'al',
    'detail.link.location': 'Uq\'ijilal',
    'detail.show_more': 'k\'utu nik\'aj chik',
  },
} as const;
