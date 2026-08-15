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

const dateField: FieldDescriptor = {
  ...primitiveField,
  datatype: 'http://www.w3.org/2001/XMLSchema#date',
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
    const formatted = formatFieldValue(dateField, new Date('2024-05-01T09:30:00.000Z'));

    expect(formatted).toContain('2024');
    expect(formatted).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it('renders an invalid date as empty', () => {
    expect(formatPrimitiveValue(new Date('nonsense'))).toBe('');
  });
});
