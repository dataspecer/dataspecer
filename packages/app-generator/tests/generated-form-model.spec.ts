import { describe, expect, it } from 'vitest';

import {
  createEntityDraft,
  hydrateCompositionDraft,
  type DraftEntity,
} from '../assets/generated-app/static/src/shared/forms/form-draft.ts';
import type { DataSource } from '../assets/generated-app/static/src/shared/datasource/data-source.ts';
import { rootEntityTarget } from '../assets/generated-app/static/src/shared/forms/entity-target.ts';
import {
  coerceValue,
  resolveControl,
  toInputValue,
  validateModel,
} from '../assets/generated-app/static/src/shared/forms/form-model.ts';
import type {
  AggregateDescriptor,
  AggregateDescriptorMap,
  FieldDescriptor,
} from '../assets/generated-app/static/src/shared/types/aggregate.ts';

const nameField: FieldDescriptor = {
  path: 'name',
  propertyName: 'name',
  label: 'Name',
  kind: 'primitive',
  formControl: 'text',
  many: false,
  required: true,
  minCount: 1,
  maxCount: 1,
};

const childAggregate: AggregateDescriptor = {
  iri: 'https://example.org/aggregate/child',
  name: 'Child',
  classIri: 'https://example.org/class/child',
  fields: [nameField],
  createEmpty: () => ({}),
};

const childrenField: FieldDescriptor = {
  path: 'children',
  propertyName: 'children',
  label: 'Children',
  kind: 'association',
  associationKind: 'composition',
  targetAggregateIri: childAggregate.iri,
  targetClassIri: childAggregate.classIri,
  many: true,
  required: true,
  minCount: 2,
  maxCount: 3,
};

const tagsField: FieldDescriptor = {
  path: 'tags',
  propertyName: 'tags',
  label: 'Tags',
  kind: 'primitive',
  formControl: 'text',
  many: true,
  required: false,
  minCount: 0,
  maxCount: null,
};

const rootAggregate: AggregateDescriptor = {
  iri: 'https://example.org/aggregate/root',
  name: 'Root',
  classIri: 'https://example.org/class/root',
  fields: [tagsField, childrenField],
  createEmpty: () => ({}),
};

const aggregates: AggregateDescriptorMap = {
  [rootAggregate.iri]: rootAggregate,
  [childAggregate.iri]: childAggregate,
};

describe('generated recursive form model', () => {
  it('renders multiplicity independently from the field control', () => {
    expect(resolveControl(tagsField)).toBe('text');
    expect(resolveControl(childrenField)).toBe('composition');
  });

  it('round-trips datetime-local values without a timezone shift', () => {
    const value = coerceValue('datetime', '2026-07-27T12:34', false);

    expect(toInputValue('datetime', value)).toBe('2026-07-27T12:34');
  });

  it('creates the minimum number of required composition children', () => {
    const draft = createEntityDraft(rootEntityTarget(rootAggregate), aggregates, 'urn:test');
    const children = draft.children as DraftEntity[];

    expect(children).toHaveLength(2);
    expect(children.every((child) => child.id?.startsWith('urn:test/'))).toBe(true);
  });

  it('validates exact cardinality and nested fields with indexed paths', () => {
    const model: DraftEntity = {
      id: 'urn:root',
      tags: ['same', 'same'],
      children: [
        { id: 'urn:child:1', name: '' },
        { id: 'urn:child:2', name: 'Second' },
        { id: 'urn:child:3', name: 'Third' },
        { id: 'urn:child:4', name: 'Fourth' },
      ],
    };

    expect(validateModel(model, rootEntityTarget(rootAggregate), aggregates)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'duplicate', path: 'tags' }),
        expect.objectContaining({ code: 'max_count', path: 'children' }),
        expect.objectContaining({ code: 'min_count', path: 'children[0].name' }),
      ])
    );
  });

  it('hydrates cross-aggregate composition references without changing loaded values', async () => {
    const loadedChild: DraftEntity = { id: 'urn:child:1', name: 'Loaded child' };
    const readIds: string[] = [];
    const dataSource = {
      readDetail: ({ id }: { id: string }) => {
        readIds.push(id);
        return Promise.resolve(loadedChild);
      },
    } as unknown as DataSource;
    const source: DraftEntity = {
      id: 'urn:root',
      children: [{ id: 'urn:child:1' }],
    };

    const hydrated = await hydrateCompositionDraft(
      source,
      rootEntityTarget(rootAggregate),
      aggregates,
      dataSource
    );
    const child = (hydrated.children as DraftEntity[])[0];
    child.name = 'Edited';

    expect(readIds).toEqual(['urn:child:1']);
    expect(child).toMatchObject({ id: 'urn:child:1', name: 'Edited' });
    expect(loadedChild.name).toBe('Loaded child');
    expect((source.children as DraftEntity[])[0]).toEqual({ id: 'urn:child:1' });
  });
});
