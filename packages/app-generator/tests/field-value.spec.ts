import { describe, expect, it } from 'vitest';

import {
  formatFieldValue,
  formatPrimitiveValue,
} from '../assets/generated-app/src/shared/forms/field-value.ts';
import type { FieldDescriptor } from '../assets/generated-app/src/shared/types/aggregate.ts';

const primitiveField: FieldDescriptor = {
  path: 'label',
  propertyName: 'label',
  label: 'Label',
  kind: 'primitive',
  many: false,
  required: false,
};

// the datatype can be an OFN or an xsd IRI, so the control is what says a value has no time
const dateField: FieldDescriptor = {
  ...primitiveField,
  datatype: 'https://ofn.gov.cz/zdroj/základní-datové-typy/2020-07-01/datum',
  formControl: 'date',
};

const multilingualField: FieldDescriptor = {
  ...primitiveField,
  formControl: 'multilingual',
};

describe('formatFieldValue', () => {
  it('formats Date values for the reader, not as machine timestamps', () => {
    const value = new Date('2024-05-01T09:30:00.000Z');

    for (const formatted of [
      formatPrimitiveValue(value),
      formatFieldValue(primitiveField, value),
    ]) {
      expect(formatted).toContain('2024');
      expect(formatted).not.toContain('T09:30');
      expect(formatted).not.toContain('.000Z');
    }
  });

  it('leaves the time out of a date-only field', () => {
    const value = new Date('2024-05-01T23:30:00.000Z');
    const formatted = formatFieldValue(dateField, value);

    expect(formatted).toBe(
      new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(value),
    );
    expect(formatted).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it('renders an invalid date as empty', () => {
    expect(formatPrimitiveValue(new Date('nonsense'))).toBe('');
  });

  it('selects a preferred multilingual value and falls back deterministically', () => {
    const value = { de: ['Name', 'Alternative'], cs: ['Název'], '': ['Untagged'] };

    expect(formatFieldValue(multilingualField, value, ['cs'])).toBe('Název');
    expect(formatFieldValue(multilingualField, value, ['de-DE'])).toBe('Name, Alternative');
    expect(formatFieldValue(multilingualField, value, ['fr'])).toBe('Untagged');
  });

  // A reference is summarized by the display fields its structure selected. An empty one must not
  // hide the rest, otherwise the reference reads as a blank cell instead of a name or an IRI.
  it('summarizes a reference by its first display field that has a value', () => {
    const reference: FieldDescriptor = {
      path: 'publisher',
      propertyName: 'publisher',
      label: 'Publisher',
      kind: 'association',
      many: false,
      required: false,
      targetClassIri: 'https://example.org/Publisher',
      fields: [
        { ...primitiveField, path: 'alias', propertyName: 'alias', many: true },
        { ...primitiveField, path: 'name', propertyName: 'name' },
      ],
    };
    const id = 'https://example.org/library/publisher/argo';

    expect(formatFieldValue(reference, { id, alias: [], name: 'Argo' })).toBe('Argo');
    expect(formatFieldValue(reference, { id, alias: '', name: 'Argo' })).toBe('Argo');
    expect(formatFieldValue(reference, { id, alias: [], name: '' })).toBe(
      `${id} (details unavailable)`,
    );
  });
});
