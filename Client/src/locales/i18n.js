import en from './en.json';
import bn from './bn.json';

const locales = { en, bn };
let current = localStorage.getItem('mealmate_locale') || 'en';

export const setLocale = (lang) => {
    if (locales[lang]) {
        current = lang;
        localStorage.setItem('mealmate_locale', lang);
    }
};

export const getLocale = () => current;

export const t = (key, params = {}) => {
    const segments = key.split('.');
    let value = locales[current];
    for (const seg of segments) {
        value = value?.[seg];
    }
    if (value == null) {
        value = locales.en;
        for (const seg of segments) {
            value = value?.[seg];
        }
    }
    if (typeof value !== 'string') return key;
    return value.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] != null ? params[k] : `{{${k}}}`);
};