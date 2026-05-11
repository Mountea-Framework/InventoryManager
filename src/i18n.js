import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import cs from './locales/cs.json';

if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    lng: localStorage.getItem('arch.lang') || 'en',
    fallbackLng: 'en',
    resources: {
      en: { translation: en },
      cs: { translation: cs },
    },
    interpolation: { escapeValue: false },
  });
}

export default i18next;
