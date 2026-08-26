import type { FieldDescriptor, MultilingualValue } from '../types/aggregate.ts';

export function isMultilingualField(field: FieldDescriptor): boolean {
  return field.kind === 'primitive' && field.formControl === 'multilingual';
}

/** Normalizes both LDKit multilingual shapes to arrays without losing repeated literals. */
export function normalizeMultilingualValue(
  value: unknown,
  fieldLabel = 'Multilingual value',
): MultilingualValue {
  if (value === null || value === undefined) {
    return {};
  }
  // LDKit returns an empty array for an absent optional @multilang @array property
  if (Array.isArray(value) && value.length === 0) {
    return {};
  }
  if (typeof value !== 'object' || Array.isArray(value) || value instanceof Date) {
    throw new Error(`${fieldLabel} must contain values grouped by language.`);
  }

  const result: MultilingualValue = {};
  for (const [language, languageValue] of Object.entries(value)) {
    const values = Array.isArray(languageValue) ? languageValue : [languageValue];
    if (!values.every((entry) => typeof entry === 'string')) {
      throw new Error(`${fieldLabel} must contain text values grouped by language.`);
    }
    result[language] = [...values] as string[];
  }
  return result;
}

export function nonEmptyMultilingualValues(value: unknown): string[] {
  return Object.values(normalizeMultilingualValue(value))
    .flat()
    .filter((entry) => entry.trim() !== '');
}

export function compactMultilingualValue(value: unknown, fieldLabel?: string): MultilingualValue {
  return Object.fromEntries(
    Object.entries(normalizeMultilingualValue(value, fieldLabel)).flatMap(([language, values]) => {
      const present = values.filter((entry) => entry.trim() !== '');
      return present.length > 0 ? [[language, present]] : [];
    }),
  );
}

export function multilingualValuesForLanguage(value: unknown, language: string): string[] {
  return normalizeMultilingualValue(value)[language] ?? [];
}

export function withMultilingualLanguage(
  value: unknown,
  language: string,
  values: string[],
): MultilingualValue {
  return { ...normalizeMultilingualValue(value), [language]: values };
}

export function multilingualLanguageTags(value: unknown): string[] {
  return Object.entries(normalizeMultilingualValue(value)).flatMap(([language, values]) =>
    values.some((entry) => entry.trim() !== '') ? [language] : [],
  );
}

export function hasDuplicateMultilingualValues(value: unknown): boolean {
  return Object.values(compactMultilingualValue(value)).some(
    (values) => new Set(values).size !== values.length,
  );
}

export function multilingualLanguagesOverLimit(value: unknown, maximum: number): string[] {
  return Object.entries(compactMultilingualValue(value)).flatMap(([language, values]) =>
    values.length > maximum ? [language] : [],
  );
}

/** Chooses one language in preference order, then falls back predictably. */
export function selectMultilingualValues(
  value: unknown,
  preferredLanguages: readonly string[],
): { language: string; values: string[] } | null {
  const multilingual = compactMultilingualValue(value);
  const available = Object.keys(multilingual);
  if (available.length === 0) {
    return null;
  }

  for (const preferred of preferredLanguages) {
    const exact = available.find((language) => language.toLowerCase() === preferred.toLowerCase());
    if (exact !== undefined) {
      return { language: exact, values: multilingual[exact] };
    }
    const primary = preferred.split('-')[0]?.toLowerCase();
    const compatible = available.find(
      (language) => language.split('-')[0]?.toLowerCase() === primary,
    );
    if (compatible !== undefined) {
      return { language: compatible, values: multilingual[compatible] };
    }
  }

  const fallback = available.includes('') ? '' : [...available].sort()[0];
  return { language: fallback, values: multilingual[fallback] };
}

export function languageLabel(language: string): string {
  return language || 'No language';
}

/** Returns the language name with its tag, for example "Czech (cs)". */
export function languageDisplayName(language: string): string {
  if (!language) {
    return 'No language';
  }
  try {
    const name = new Intl.DisplayNames(['en'], { type: 'language' }).of(language);
    return name && name !== language ? `${name} (${language})` : language;
  } catch {
    return language;
  }
}

/** Prefers the reader's browser languages and uses configured languages as stable fallbacks. */
export function displayLanguagePreferences(configuredLanguages: readonly string[]): string[] {
  const browserLanguages = typeof navigator === 'undefined' ? [] : navigator.languages;
  return [...new Set([...browserLanguages, ...configuredLanguages])];
}
