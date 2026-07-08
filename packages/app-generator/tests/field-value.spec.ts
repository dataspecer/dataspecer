import { describe, expect, it } from 'vitest';

import {
  formatFieldValue,
  formatPrimitiveValue,
} from '../assets/generated-app/static/src/shared/components/field-value.ts';
import type { FieldDescriptor } from '../assets/generated-app/static/src/shared/types/aggregate.ts';

const primitiveField: FieldDescriptor = {
  path: 'label',
  propertyName: 'label',
  label: 'Label',
  kind: 'primitive',
  many: false,
  required: false,
};

describe('formatFieldValue', () => {
  it('formats Date values as ISO strings', () => {
    expect(formatPrimitiveValue(new Date('2024-05-01T09:30:00.000Z'))).toBe(
      '2024-05-01T09:30:00.000Z'
    );
  });

  it('formats language maps by preferred language', () => {
    expect(formatFieldValue(primitiveField, { cs: 'Název', en: 'Title' })).toBe('Title');
    expect(formatFieldValue(primitiveField, { cs: 'Název' })).toBe('Název');
    expect(formatFieldValue(primitiveField, { de: 'Titel' })).toBe('Titel');
  });
});
