import { ui, defaultLang } from './ui';

export function getLangFromUrl(url: URL) {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof (typeof ui)[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key];
  };
}

export function getLocalizedPath(pathname: string, targetLang: string) {
  const segments = pathname.split('/').filter(Boolean);
  const currentLang = segments[0] in ui ? segments[0] : defaultLang;

  // Remove current language prefix if present
  if (segments[0] in ui) {
    segments.shift();
  }

  const remainingPath = segments.join('/');

  if (targetLang === defaultLang) {
    return remainingPath ? `/${remainingPath}` : '/';
  }

  return remainingPath ? `/${targetLang}/${remainingPath}` : `/${targetLang}`;
}
