import { defineConfig } from 'i18next-cli';

export default defineConfig({
  locales: ['en', 'cs'],
  extract: {
    input: ['src/**/*.{ts,tsx}'],
    output: 'locales/{{language}}/{{namespace}}.json',
    sort: true,
    defaultValue: (locale, namespace) => `${namespace}.${locale}`,
  },
});