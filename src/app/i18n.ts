import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ru: {
    translation: {
      appName: 'Writer Tool',
      tagline: 'От идеи до рукописи',
      login: 'Войти',
      register: 'Создать аккаунт',
      email: 'Email',
      password: 'Пароль',
      displayName: 'Как вас зовут',
      projects: 'Проекты',
      structure: 'Структура',
      characters: 'Персонажи',
      exports: 'Экспорт',
      newProject: 'Новый проект',
      newChapter: 'Новая глава',
      loading: 'Загрузка…',
      emptyProjects: 'Пока нет проектов. Создайте первый.',
    },
  },
  en: {
    translation: {
      appName: 'Writer Tool',
      tagline: 'From idea to manuscript',
      login: 'Sign in',
      register: 'Create account',
      email: 'Email',
      password: 'Password',
      displayName: 'Your name',
      projects: 'Projects',
      structure: 'Structure',
      characters: 'Characters',
      exports: 'Export',
      newProject: 'New project',
      newChapter: 'New chapter',
      loading: 'Loading…',
      emptyProjects: 'No projects yet. Create your first one.',
    },
  },
};

void i18n.use(initReactI18next).init({
  resources,
  lng: 'ru',
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
});

export default i18n;
