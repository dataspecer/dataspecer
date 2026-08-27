import { describe, expect, it } from 'vitest';

import {
  createEntityDraft,
  hydrateCompositionTree,
} from '../assets/generated-app/src/shared/forms/form-draft.ts';
import {
  collectMultilingualLanguages,
  containsMultilingualFields,
} from '../assets/generated-app/src/shared/forms/composition-tree.ts';
import type { DataSource } from '../assets/generated-app/src/shared/data-source/data-source.ts';
import {
  referenceDisplayFields,
  rootEntityTarget,
} from '../assets/generated-app/src/shared/forms/entity-target.ts';
import {
  coerceValue,
  resolveControl,
  toInputValue,
  validateModel,
} from '../assets/generated-app/src/shared/forms/form-model.ts';
import { isSafeHttpIri } from '../assets/generated-app/src/shared/forms/iri.ts';
import { ValidationIssueCode } from '../assets/generated-app/src/shared/operations/operation-result.ts';
import {
  fieldValues,
  type AggregateDescriptor,
  type AggregateDescriptorMap,
  type EntityRecord,
  type FieldDescriptor,
} from '../assets/generated-app/src/shared/types/aggregate.ts';

const nameField: FieldDescriptor = {
  path: 'name',
  propertyName: 'name',
  label: 'Name',
  kind: 'primitive',
  propertyIri: 'https://example.org/property/name',
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

const scoresField: FieldDescriptor = {
  path: 'scores',
  propertyName: 'scores',
  label: 'Scores',
  kind: 'primitive',
  formControl: 'integer',
  many: true,
  required: true,
  minCount: 2,
  maxCount: null,
};

const activeField: FieldDescriptor = {
  path: 'active',
  propertyName: 'active',
  label: 'Active',
  kind: 'primitive',
  formControl: 'checkbox',
  many: false,
  required: true,
  minCount: 1,
  maxCount: 1,
};

const localizedTitle: FieldDescriptor = {
  path: 'title',
  propertyName: 'title',
  label: 'Title',
  kind: 'primitive',
  formControl: 'multilingual',
  many: false,
  required: true,
  minCount: 1,
  maxCount: 1,
};

const localizedKeywords: FieldDescriptor = {
  ...localizedTitle,
  path: 'keywords',
  propertyName: 'keywords',
  label: 'Keywords',
  many: true,
  required: false,
  minCount: 0,
  maxCount: null,
};

const localizedAggregate: AggregateDescriptor<EntityRecord> = {
  iri: 'https://example.org/aggregate/localized',
  name: 'Localized',
  classIri: 'https://example.org/class/localized',
  fields: [localizedTitle, localizedKeywords],
  createEmpty: () => ({}),
};

const localizedChildrenField: FieldDescriptor = {
  path: 'localizedChildren',
  propertyName: 'localizedChildren',
  label: 'Localized children',
  kind: 'association',
  associationKind: 'composition',
  targetAggregateIri: localizedAggregate.iri,
  targetClassIri: localizedAggregate.classIri,
  many: true,
  required: false,
};

const localizedRootAggregate: AggregateDescriptor<EntityRecord> = {
  iri: 'https://example.org/aggregate/localized-root',
  name: 'Localized root',
  classIri: 'https://example.org/class/localized-root',
  fields: [localizedChildrenField],
  createEmpty: () => ({ localizedChildren: [] }),
};

const localizedCompositionRegistry: AggregateDescriptorMap = {
  [localizedRootAggregate.iri]: localizedRootAggregate,
  [localizedAggregate.iri]: localizedAggregate,
};

const ownerField: FieldDescriptor = {
  path: 'owner',
  propertyName: 'owner',
  label: 'Owner',
  kind: 'association',
  associationKind: 'aggregation',
  targetClassIri: 'https://example.org/class/owner',
  many: false,
  required: true,
  minCount: 1,
  maxCount: 1,
};

const rootAggregate: AggregateDescriptor<EntityRecord> = {
  iri: 'https://example.org/aggregate/root',
  name: 'Root',
  classIri: 'https://example.org/class/root',
  fields: [tagsField, scoresField, activeField, ownerField, childrenField],
  createEmpty: () => ({ tags: [], scores: [], children: [] }),
};

const aggregateRegistry: AggregateDescriptorMap = {
  [rootAggregate.iri]: rootAggregate,
  [childAggregate.iri]: childAggregate,
};

describe('generated IRI display', () => {
  it('recognizes only safe HTTP IRIs as external links', () => {
    expect(isSafeHttpIri('https://example.org/document')).toBe(true);
    expect(isSafeHttpIri('HTTP://example.org/document')).toBe(true);
    expect(isSafeHttpIri('https://example.org/documentation is here')).toBe(false);
    expect(isSafeHttpIri('http://')).toBe(false);
    expect(isSafeHttpIri('urn:document:1')).toBe(false);
  });
});

describe('generated recursive form model', () => {
  it('renders multiplicity independently from the field control', () => {
    expect(resolveControl(tagsField)).toBe('text');
    expect(resolveControl(childrenField)).toBe('composition');
  });

  it('keeps scalar and repeated multilingual drafts as language maps', () => {
    const draft = createEntityDraft(
      rootEntityTarget(localizedAggregate),
      { [localizedAggregate.iri]: localizedAggregate },
      'urn:test',
    );

    expect(resolveControl(localizedTitle)).toBe('multilingual');
    expect(draft.title).toEqual({});
    expect(draft.keywords).toEqual({});
    expect(() => fieldValues({ cs: ['one', 'two'] }, localizedKeywords)).toThrow(
      'Keywords must contain a list of values.',
    );
  });

  it('finds multilingual fields and stored languages across aggregate compositions', () => {
    const target = rootEntityTarget(localizedRootAggregate);
    const model: EntityRecord = {
      id: 'urn:root',
      localizedChildren: [
        {
          id: 'urn:child',
          title: { cs: ['Název'], de: ['Titel'] },
        },
      ],
    };

    expect(containsMultilingualFields(target, localizedCompositionRegistry)).toBe(true);
    expect(collectMultilingualLanguages(model, target, localizedCompositionRegistry)).toEqual([
      'cs',
      'de',
    ]);
  });

  it('validates multilingual presence, per-language scalar limits, and duplicates', () => {
    const registry = { [localizedAggregate.iri]: localizedAggregate };
    const validate = (model: EntityRecord) =>
      validateModel(model, rootEntityTarget(localizedAggregate), registry);

    expect(validate({ id: 'urn:localized', title: {} })).toContainEqual(
      expect.objectContaining({ code: ValidationIssueCode.MinCount, path: 'title' }),
    );
    expect(validate({ id: 'urn:localized', title: { cs: ['A', 'B'] } })).toContainEqual(
      expect.objectContaining({ code: ValidationIssueCode.MaxCount, path: 'title' }),
    );
    expect(
      validate({
        id: 'urn:localized',
        title: { cs: ['Název'], en: ['Title'] },
        keywords: { cs: ['stejné', 'stejné'] },
      }),
    ).toContainEqual(
      expect.objectContaining({ code: ValidationIssueCode.Duplicate, path: 'keywords' }),
    );
    expect(validate({ id: 'urn:localized', title: { cs: ['Název'], en: ['Title'] } })).toEqual([]);
  });

  it('uses exposed primitive fields to label references', () => {
    const emailField: FieldDescriptor = {
      path: 'email',
      propertyName: 'email',
      label: 'Email',
      kind: 'primitive',
      propertyIri: 'https://example.org/property/email',
      formControl: 'text',
      many: false,
      required: false,
    };
    const association: FieldDescriptor = {
      ...ownerField,
      fields: [nameField, emailField],
    };

    expect(referenceDisplayFields(association, aggregateRegistry)).toEqual([nameField, emailField]);
    expect(referenceDisplayFields(childrenField, aggregateRegistry)).toEqual([nameField]);
  });

  it('queries each reference display property only once', () => {
    const nameAlias: FieldDescriptor = {
      ...nameField,
      path: 'displayName',
      propertyName: 'displayName',
      label: 'Display name',
    };

    expect(
      referenceDisplayFields({ ...ownerField, fields: [nameField, nameAlias] }, aggregateRegistry),
    ).toEqual([nameField]);
  });

  it('prefers name over title and label when no primitive field is exposed', () => {
    const fallbackFields = ['label', 'title', 'name'].map(
      (path): FieldDescriptor => ({
        path,
        propertyName: path,
        label: path,
        kind: 'primitive',
        propertyIri: `https://example.org/property/${path}`,
        formControl: 'text',
        many: false,
        required: false,
      }),
    );
    const fallbackAggregate: AggregateDescriptor = {
      iri: 'https://example.org/aggregate/owner',
      name: 'Owner',
      classIri: 'https://example.org/class/owner',
      fields: fallbackFields,
      createEmpty: () => ({}),
    };

    expect(
      referenceDisplayFields(
        { ...ownerField, fields: [] },
        { ...aggregateRegistry, [fallbackAggregate.iri]: fallbackAggregate },
      ),
    ).toEqual([fallbackFields[2]]);
  });

  it('round-trips datetime-local values without a timezone shift', () => {
    const value = coerceValue('datetime', '2026-07-27T12:34', false);

    expect(toInputValue('datetime', value)).toBe('2026-07-27T12:34');
  });

  it('coerces integer controls to numbers', () => {
    expect(coerceValue('integer', '42', false)).toBe(42);
  });

  it('accepts an absent repeating value but rejects a present scalar', () => {
    expect(fieldValues(undefined, tagsField)).toEqual([]);
    expect(() => fieldValues('tag', tagsField)).toThrow('Tags must contain a list of values.');
  });

  it('creates the minimum number of required composition children', () => {
    const draft = createEntityDraft(rootEntityTarget(rootAggregate), aggregateRegistry, 'urn:test');
    const children = draft.children as EntityRecord[];

    expect(children).toHaveLength(2);
    expect(children.every((child) => child.id?.startsWith('urn:test/'))).toBe(true);
  });

  it('leaves primitive and aggregation values empty while creating required controls', () => {
    const draft = createEntityDraft(rootEntityTarget(rootAggregate), aggregateRegistry, 'urn:test');

    expect(draft.tags).toEqual([]);
    expect(draft.scores).toEqual([undefined, undefined]);
    expect(draft.active).toBe(false);
    expect(draft).not.toHaveProperty('owner');
    expect((draft.children as EntityRecord[])[0]).not.toHaveProperty('name');
  });

  it('validates exact cardinality and nested fields with indexed paths', () => {
    const model: EntityRecord = {
      id: 'urn:root',
      tags: ['same', 'same'],
      children: [
        { id: 'urn:child:1', name: '' },
        { id: 'urn:child:2', name: 'Second' },
        { id: 'urn:child:3', name: 'Third' },
        { id: 'urn:child:4', name: 'Fourth' },
      ],
    };

    expect(validateModel(model, rootEntityTarget(rootAggregate), aggregateRegistry)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: ValidationIssueCode.Duplicate, path: 'tags' }),
        expect.objectContaining({ code: ValidationIssueCode.MaxCount, path: 'children' }),
        expect.objectContaining({ code: ValidationIssueCode.MinCount, path: 'children[0].name' }),
      ]),
    );
  });

  it('validates entity and reference IRIs recursively', () => {
    const model: EntityRecord = {
      id: '/relative-root',
      scores: [1, 2],
      active: false,
      owner: { id: 'not an IRI' },
      children: [
        { id: 'urn:child:1', name: 'First' },
        { id: '/relative-child', name: 'Second' },
      ],
    };

    expect(validateModel(model, rootEntityTarget(rootAggregate), aggregateRegistry)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: ValidationIssueCode.InvalidIri, path: 'id' }),
        expect.objectContaining({ code: ValidationIssueCode.InvalidIri, path: 'owner' }),
        expect.objectContaining({ code: ValidationIssueCode.InvalidIri, path: 'children[1].id' }),
      ]),
    );
  });

  it('accepts absolute entity and reference IRIs', () => {
    const model: EntityRecord = {
      id: 'https://example.org/root/1',
      scores: [1, 2],
      active: false,
      owner: { id: 'urn:owner:1' },
      children: [
        { id: 'urn:child:1', name: 'First' },
        { id: 'https://example.org/child/2', name: 'Second' },
      ],
    };

    expect(
      validateModel(model, rootEntityTarget(rootAggregate), aggregateRegistry).filter(
        (issue) => issue.code === ValidationIssueCode.InvalidIri,
      ),
    ).toEqual([]);
  });

  it('validates text, multilingual, and reference values against alternative patterns', () => {
    const constrainedTags: FieldDescriptor = {
      ...tagsField,
      patterns: ['^tag-[0-9]+$'],
      examples: ['tag-1'],
    };
    const constrainedOwner: FieldDescriptor = {
      ...ownerField,
      patterns: ['^urn:owner:', '^https://example\\.org/owner/'],
      examples: ['urn:owner:1'],
    };
    const constrainedTitle: FieldDescriptor = {
      ...localizedTitle,
      patterns: ['^[A-Z]'],
    };
    const constrainedAggregate: AggregateDescriptor = {
      iri: 'https://example.org/aggregate/constrained',
      name: 'Constrained',
      classIri: 'https://example.org/class/constrained',
      fields: [constrainedTags, constrainedOwner, constrainedTitle],
      createEmpty: () => ({}),
    };
    const target = rootEntityTarget(constrainedAggregate);
    const registry = { [constrainedAggregate.iri]: constrainedAggregate };

    const issues = validateModel(
      {
        id: 'urn:constrained:1',
        tags: ['wrong'],
        owner: { id: 'urn:other:1' },
        title: { cs: ['lowercase'] },
      },
      target,
      registry,
    );
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: ValidationIssueCode.PatternMismatch,
          path: 'tags',
          message: expect.stringContaining('tag-1'),
        }),
        expect.objectContaining({ code: ValidationIssueCode.PatternMismatch, path: 'owner' }),
        expect.objectContaining({ code: ValidationIssueCode.PatternMismatch, path: 'title' }),
      ]),
    );
    const ownerIssue = issues.find((issue) => issue.path === 'owner');
    expect(ownerIssue?.message).toContain('^urn:owner:');
    expect(ownerIssue?.message).toContain('^https://example\\.org/owner/');
    const titleIssue = issues.find((issue) => issue.path === 'title');
    expect(titleIssue?.message).toContain('^[A-Z]');
    expect(titleIssue?.message).not.toContain('For example');

    expect(
      validateModel(
        {
          id: 'urn:constrained:1',
          tags: ['tag-1'],
          owner: { id: 'https://example.org/owner/1' },
          title: { cs: ['Title'] },
        },
        target,
        registry,
      ),
    ).toEqual([]);
  });

  it('hydrates cross-aggregate composition references without changing loaded values', async () => {
    const loadedChild: EntityRecord = { id: 'urn:child:1', name: 'Loaded child' };
    const readIds: string[] = [];
    const dataSource = {
      readDetail: ({ id }: { id: string }) => {
        readIds.push(id);
        return Promise.resolve(loadedChild);
      },
    } as unknown as DataSource;
    const source: EntityRecord = {
      id: 'urn:root',
      children: [{ id: 'urn:child:1' }],
    };

    const hydrated = await hydrateCompositionTree(
      source,
      rootEntityTarget(rootAggregate),
      aggregateRegistry,
      dataSource,
    );
    const child = (hydrated.children as EntityRecord[])[0];
    child.name = 'Edited';

    expect(readIds).toEqual(['urn:child:1']);
    expect(child).toMatchObject({ id: 'urn:child:1', name: 'Edited' });
    expect(loadedChild.name).toBe('Loaded child');
    expect((source.children as EntityRecord[])[0]).toEqual({ id: 'urn:child:1' });
  });
});
