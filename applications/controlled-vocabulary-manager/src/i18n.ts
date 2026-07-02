import i18n from 'i18next'
// @ts-ignore
import resources from 'virtual:i18next-loader';
import { initReactI18next } from "react-i18next";
import LanguageDetector from 'i18next-browser-languagedetector';


export const i18nConfig = i18n;
export const supportedLanguages = Object.keys(resources);

i18nConfig.use(initReactI18next)
.use(LanguageDetector)
.init({
  resources,
  fallbackLng: 'en',
  interpolation: {
    // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
    escapeValue: false,
  },
  supportedLngs: supportedLanguages
});
