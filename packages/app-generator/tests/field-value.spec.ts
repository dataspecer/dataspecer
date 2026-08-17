import { describe, expect, it } from 'vitest';

import {
  formatFieldValue,
  formatPrimitiveValue,
} from '../assets/generated-app/app/src/shared/components/field-value.ts';
import type { FieldDescriptor } from '../assets/generated-app/app/src/shared/types/aggregate.ts';

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
