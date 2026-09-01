import { describe, expect, it, vi } from 'vitest';

import type { DataSource } from '../assets/generated-app/src/shared/data-source/data-source.ts';
import {
  createComposite,
  deleteComposite,
} from '../assets/generated-app/src/shared/operations/composite-mutation.ts';
import {
  buildCompositeCreatePlan,
  buildCompositeDeletePlan,
  buildCompositeUpdatePlan,
} from '../assets/generated-app/src/shared/operations/composite-mutation-plan.ts';
import { DefaultDeleteStrategy } from '../assets/generated-app/src/shared/operations/delete-strategy.ts';
import { ValidationIssueCode } from '../assets/generated-app/src/shared/operations/operation-result.ts';
import { DefaultUpdateStrategy } from '../assets/generated-app/src/shared/operations/update-strategy.ts';
import {
  MISSING_ENTITY_PROPERTY,
  type EntityModel,
  type AggregateDescriptor,
  type AggregateDescriptorMap,
  type EntityRecord,
  type FieldDescriptor,
} from '../assets/generated-app/src/shared/types/aggregate.ts';
import type { CompositeMutationStep } from '../assets/generated-app/src/shared/operations/composite-mutation-plan.ts';

function upsert(step: CompositeMutationStep | undefined) {
  return step && step.kind !== 'delete' ? step : undefined;
}

const officeName: FieldDescriptor = {
  path: 'label',
  propertyName: 'label',
  label: 'Label',
  kind: 'primitive',
  formControl: 'text',
  many: false,
  required: true,
};

const offices: FieldDescriptor = {
  path: 'offices',
  propertyName: 'offices',
  label: 'Offices',
  kind: 'association',
  associationKind: 'composition',
  targetClassIri: 'https://example.org/class/office',
  fields: [officeName],
  many: true,
  required: false,
};

const departmentAggregate: AggregateDescriptor = {
  iri: 'https://example.org/aggregate/department',
  name: 'Department',
  classIri: 'https://example.org/class/department',
  fields: [
    {
      path: 'name',
      propertyName: 'name',
      label: 'Name',
      kind: 'primitive',
      formControl: 'text',
      many: false,
      required: true,
    },
    offices,
  ],
  createEmpty: () => ({}),
};

const departments: FieldDescriptor = {
  path: 'departments',
  propertyName: 'departments',
  label: 'Departments',
  kind: 'association',
  associationKind: 'composition',
  targetAggregateIri: departmentAggregate.iri,
  targetClassIri: departmentAggregate.classIri,
  many: true,
  required: false,
};

const partners: FieldDescriptor = {
  path: 'partners',
  propertyName: 'partners',
  label: 'Partners',
  kind: 'association',
  associationKind: 'aggregation',
  targetClassIri: 'https://example.org/class/company',
  many: true,
  required: false,
};

const companyAggregate: AggregateDescriptor = {
  iri: 'https://example.org/aggregate/company',
  name: 'Company',
  classIri: 'https://example.org/class/company',
  fields: [partners, departments],
  createEmpty: () => ({}),
};

const inlineDepartments: FieldDescriptor = {
  ...departments,
  targetAggregateIri: undefined,
  fields: departmentAggregate.fields,
};

const inlineCompanyAggregate: AggregateDescriptor = {
  ...companyAggregate,
  fields: [partners, inlineDepartments],
};

const aggregateRegistry: AggregateDescriptorMap = {
  [companyAggregate.iri]: companyAggregate,
  [departmentAggregate.iri]: departmentAggregate,
};

const original: EntityRecord = {
  id: 'urn:company',
  departments: [
    {
      id: 'urn:department:old',
      name: 'Old',
      offices: [{ id: 'urn:office:removed', label: 'Removed' }],
    },
  ],
};

describe('composite mutation planning', () => {
  it('creates inline leaves, aggregate children, and the root in post-order', () => {
    const payload: EntityRecord = {
      id: 'urn:company',
      partners: [{ id: 'urn:partner', displayName: 'Not part of the writable reference' }],
      departments: [
        {
          id: 'urn:department',
          name: 'Research',
          offices: [{ id: 'urn:office', label: 'Prague' }],
        },
      ],
    };

    const plan = buildCompositeCreatePlan(companyAggregate, aggregateRegistry, payload);

    expect(plan.map((step) => [step.kind, step.id, step.target.fieldPath])).toEqual([
      ['create', 'urn:office', ['offices']],
      ['create', 'urn:department', []],
      ['create', 'urn:company', []],
    ]);
    expect(upsert(plan[1])?.payload.offices).toEqual([{ id: 'urn:office' }]);
    expect(upsert(plan[2])?.payload.departments).toEqual([{ id: 'urn:department' }]);
    expect(upsert(plan[2])?.payload.partners).toEqual([{ id: 'urn:partner' }]);
  });

  it('carries a child specialization to datasource mutation steps', () => {
    const specializedDepartments: FieldDescriptor = {
      ...inlineDepartments,
      specializations: [
        {
          specializationIri: 'urn:psm:research',
          label: 'Research',
          classIri: 'urn:class:research-department',
          fieldPaths: ['name', 'offices'],
        },
      ],
    };
    const aggregate: AggregateDescriptor = {
      ...companyAggregate,
      fields: [specializedDepartments],
    };

    const plan = buildCompositeCreatePlan(aggregate, aggregateRegistry, {
      id: 'urn:company',
      departments: [
        {
          id: 'urn:department',
          __specializationIri: 'urn:psm:research',
          name: 'Research',
          offices: [],
        },
      ],
    });

    expect(upsert(plan.find((step) => step.id === 'urn:department'))?.specializationIri).toBe(
      'urn:psm:research',
    );
  });

  it('updates only the loaded specialization and ignores another branch and its children', () => {
    const specialized = specializedDepartments();
    const aggregate: AggregateDescriptor = { ...companyAggregate, fields: [specialized] };
    const current: EntityRecord = {
      id: 'urn:company',
      departments: [
        {
          id: 'urn:department',
          __specializationIri: 'urn:psm:organization',
          organizationCode: 'new-code',
          personCode: 'must-not-write',
          personOffices: [{ id: 'urn:office:person', label: 'Must stay untouched' }],
        },
      ],
    };
    const stored: EntityRecord = {
      id: 'urn:company',
      departments: [
        {
          id: 'urn:department',
          __specializationIri: 'urn:psm:organization',
          __rdfTypes: ['urn:class:department'],
          organizationCode: 'old-code',
          personCode: 'stored-other-branch',
          personOffices: [{ id: 'urn:office:person', label: 'Must stay untouched' }],
        },
      ],
    };

    const plan = buildCompositeUpdatePlan(aggregate, aggregateRegistry, current, stored);
    const department = upsert(plan.find((step) => step.id === 'urn:department'));

    expect(plan.map((step) => [step.kind, step.id])).toEqual([
      ['update', 'urn:department'],
      ['update', 'urn:company'],
    ]);
    expect(department?.specializationIri).toBe('urn:psm:organization');
    expect(department?.payload).toMatchObject({ organizationCode: 'new-code' });
    expect(department?.payload).not.toHaveProperty('personCode');
    expect(department?.payload).not.toHaveProperty('personOffices');
  });

  it('rejects changing or removing a child whose loaded specialization is unavailable', () => {
    const specialized = specializedDepartments();
    const aggregate: AggregateDescriptor = { ...companyAggregate, fields: [specialized] };
    const storedOrganization: EntityRecord = {
      id: 'urn:company',
      departments: [
        {
          id: 'urn:department',
          __specializationIri: 'urn:psm:organization',
          __rdfTypes: ['urn:class:department'],
          organizationCode: 'organization',
        },
      ],
    };
    const switched: EntityRecord = {
      id: 'urn:company',
      departments: [
        {
          id: 'urn:department',
          __specializationIri: 'urn:psm:person',
          personCode: 'person',
        },
      ],
    };
    const unresolved: EntityRecord = {
      id: 'urn:company',
      departments: [
        {
          id: 'urn:department',
          __rdfTypes: ['urn:class:department'],
        },
      ],
    };

    expect(() =>
      buildCompositeUpdatePlan(aggregate, aggregateRegistry, switched, storedOrganization),
    ).toThrow('cannot be changed after the entity has been saved');
    expect(() =>
      buildCompositeUpdatePlan(
        aggregate,
        aggregateRegistry,
        { id: 'urn:company', departments: [] },
        unresolved,
      ),
    ).toThrow('cannot be removed');
  });

  it('updates children before their parent and deletes removed subtrees after unlinking', () => {
    const payload: EntityRecord = {
      id: 'urn:company',
      departments: [
        {
          id: 'urn:department:new',
          name: 'New',
          offices: [],
        },
      ],
    };

    const plan = buildCompositeUpdatePlan(companyAggregate, aggregateRegistry, payload, original);

    expect(plan.map((step) => [step.kind, step.id])).toEqual([
      ['create', 'urn:department:new'],
      ['update', 'urn:company'],
      ['delete', 'urn:office:removed'],
      ['delete', 'urn:department:old'],
    ]);
    expect(upsert(plan[1])?.payload.departments).toEqual([{ id: 'urn:department:new' }]);
  });

  it('creates a repaired missing child at its existing IRI', () => {
    const stored: EntityRecord = {
      id: 'urn:company',
      departments: [{ id: 'urn:department', [MISSING_ENTITY_PROPERTY]: true }],
    };
    const payload: EntityRecord = {
      id: 'urn:company',
      departments: [{ id: 'urn:department', name: 'Repaired', offices: [] }],
    };

    const plan = buildCompositeUpdatePlan(companyAggregate, aggregateRegistry, payload, stored);

    expect(plan.find((step) => step.id === 'urn:department')).toMatchObject({
      kind: 'create',
      payload: { id: 'urn:department' },
    });
    expect(plan.find((step) => step.id === 'urn:company')?.kind).toBe('update');
  });

  it('creates only the missing entry of a repeated composition', () => {
    const department = (id: string, missing = false): EntityRecord => ({
      id,
      name: id,
      offices: [],
      ...(missing ? { [MISSING_ENTITY_PROPERTY]: true } : {}),
    });
    const ids = ['urn:department:0', 'urn:department:1', 'urn:department:2'];
    const stored: EntityRecord = {
      id: 'urn:company',
      departments: ids.map((id, index) => department(id, index === 1)),
    };
    const payload: EntityRecord = {
      id: 'urn:company',
      departments: ids.map((id) => department(id)),
    };

    const plan = buildCompositeUpdatePlan(companyAggregate, aggregateRegistry, payload, stored);
    const childKinds = new Map(
      plan.filter((step) => step.id !== 'urn:company').map((step) => [step.id, step.kind]),
    );

    expect(childKinds).toEqual(
      new Map([
        ['urn:department:0', 'update'],
        ['urn:department:1', 'create'],
        ['urn:department:2', 'update'],
      ]),
    );
  });

  it('does not delete a missing child removed by an update', () => {
    const plan = buildCompositeUpdatePlan(
      companyAggregate,
      aggregateRegistry,
      { id: 'urn:company', departments: [] },
      {
        id: 'urn:company',
        departments: [{ id: 'urn:department', [MISSING_ENTITY_PROPERTY]: true }],
      },
    );

    expect(plan.some((step) => step.kind === 'delete' && step.id === 'urn:department')).toBe(false);
  });

  it('skips a missing descendant in a nested cascade', () => {
    const plan = buildCompositeDeletePlan(
      inlineCompanyAggregate,
      aggregateRegistry,
      {
        id: 'urn:company',
        departments: [
          {
            id: 'urn:department',
            offices: [{ id: 'urn:office', [MISSING_ENTITY_PROPERTY]: true }],
          },
        ],
      },
      ['departments', 'departments.offices'],
    );

    expect(plan.map((step) => step.id)).toEqual(['urn:department', 'urn:company']);
  });

  it('creates a repaired missing specialized child after a branch is selected', () => {
    const aggregate: AggregateDescriptor = {
      ...companyAggregate,
      fields: [specializedDepartments()],
    };
    const plan = buildCompositeUpdatePlan(
      aggregate,
      aggregateRegistry,
      {
        id: 'urn:company',
        departments: [
          {
            id: 'urn:department',
            __specializationIri: 'urn:psm:organization',
            organizationCode: 'new-code',
          },
        ],
      },
      {
        id: 'urn:company',
        departments: [{ id: 'urn:department', [MISSING_ENTITY_PROPERTY]: true }],
      },
    );

    expect(plan.find((step) => step.id === 'urn:department')).toMatchObject({
      kind: 'create',
      specializationIri: 'urn:psm:organization',
    });
  });

  it('skips a missing specialized child without requiring branch evidence', () => {
    const aggregate: AggregateDescriptor = {
      ...companyAggregate,
      fields: [specializedDepartments()],
    };
    const plan = buildCompositeDeletePlan(
      aggregate,
      aggregateRegistry,
      {
        id: 'urn:company',
        departments: [{ id: 'urn:department', [MISSING_ENTITY_PROPERTY]: true }],
      },
      ['departments'],
    );

    expect(plan.map((step) => step.id)).toEqual(['urn:company']);
  });

  it('stops before creating an ancestor when a child write fails', async () => {
    const calls: string[] = [];
    const dataSource = {
      create: ({ payload }: { payload: EntityRecord }) => {
        calls.push(payload.id as string);
        if (payload.id === 'urn:office') {
          return Promise.reject(new Error('office failed'));
        }
        return Promise.resolve(payload);
      },
    } as unknown as DataSource;
    const payload: EntityRecord = {
      id: 'urn:company',
      departments: [
        {
          id: 'urn:department',
          name: 'Research',
          offices: [{ id: 'urn:office', label: 'Prague' }],
        },
      ],
    };

    await expect(
      createComposite(dataSource, companyAggregate, aggregateRegistry, payload),
    ).rejects.toThrow('office failed');
    expect(calls).toEqual(['urn:office']);
  });

  it('omits fields without an editable control', () => {
    const aggregate: AggregateDescriptor = {
      iri: 'urn:aggregate:localized',
      name: 'Localized',
      classIri: 'urn:class:localized',
      fields: [
        {
          path: 'labels',
          propertyName: 'labels',
          label: 'Labels',
          kind: 'primitive',
          many: true,
          required: false,
        },
      ],
      createEmpty: () => ({}),
    };
    const labels = { en: ['Name'], cs: ['Název'] };

    const plan = buildCompositeUpdatePlan(
      aggregate,
      { [aggregate.iri]: aggregate },
      { id: 'urn:localized', labels },
      { id: 'urn:localized', labels },
    );

    expect(upsert(plan[0])?.payload).not.toHaveProperty('labels');
  });

  it('keeps multilingual maps intact instead of treating repeated text as an array', () => {
    const aggregate: AggregateDescriptor = {
      iri: 'urn:aggregate:localized',
      name: 'Localized',
      classIri: 'urn:class:localized',
      fields: [
        {
          path: 'labels',
          propertyName: 'labels',
          label: 'Labels',
          kind: 'primitive',
          formControl: 'multilingual',
          many: true,
          required: false,
        },
      ],
      createEmpty: () => ({}),
    };
    const registry = { [aggregate.iri]: aggregate };

    const update = buildCompositeUpdatePlan(
      aggregate,
      registry,
      { id: 'urn:localized', labels: { cs: ['Název'], en: ['Name'] } },
      { id: 'urn:localized', labels: { cs: ['Starý název'] } },
    );
    const clear = buildCompositeUpdatePlan(
      aggregate,
      registry,
      { id: 'urn:localized', labels: {} },
      { id: 'urn:localized', labels: { cs: ['Starý název'] } },
    );
    const untouched = buildCompositeUpdatePlan(
      aggregate,
      registry,
      { id: 'urn:localized' },
      { id: 'urn:localized', labels: { cs: ['Starý název'] } },
    );

    expect(upsert(update[0])?.payload.labels).toEqual({ cs: ['Název'], en: ['Name'] });
    expect(upsert(clear[0])?.payload.labels).toBeNull();
    expect(upsert(untouched[0])?.payload).not.toHaveProperty('labels');
  });

  it('rejects malformed repeating references instead of clearing them', () => {
    expect(() =>
      buildCompositeUpdatePlan(
        companyAggregate,
        aggregateRegistry,
        { id: 'urn:company', partners: { id: 'urn:partner' }, departments: [] },
        { id: 'urn:company', partners: [], departments: [] },
      ),
    ).toThrow('Partners must contain a list of values.');

    expect(() =>
      buildCompositeUpdatePlan(
        companyAggregate,
        aggregateRegistry,
        { id: 'urn:company', partners: [{ id: 42 }], departments: [] },
        { id: 'urn:company', partners: [], departments: [] },
      ),
    ).toThrow('Partners must contain a reference.');
  });

  it('plans selected nested composition deletes leaves first', () => {
    const payload: EntityRecord = {
      id: 'urn:company',
      partners: [{ id: 'urn:partner' }],
      departments: [
        {
          id: 'urn:department',
          offices: [{ id: 'urn:office', label: 'Prague' }],
        },
      ],
    };

    const plan = buildCompositeDeletePlan(inlineCompanyAggregate, aggregateRegistry, payload, [
      'departments',
      'departments.offices',
    ]);

    expect(plan.map((step) => [step.id, step.target.fieldPath])).toEqual([
      ['urn:office', ['departments', 'offices']],
      ['urn:department', ['departments']],
      ['urn:company', []],
    ]);
  });

  it('cascades compositions but not aggregations', () => {
    const payload: EntityRecord = {
      id: 'urn:company',
      partners: [{ id: 'urn:partner' }],
      departments: [{ id: 'urn:department' }],
    };

    const compositionPlan = buildCompositeDeletePlan(companyAggregate, aggregateRegistry, payload, [
      'departments',
    ]);
    const aggregationPlan = buildCompositeDeletePlan(companyAggregate, aggregateRegistry, payload, [
      'partners',
    ]);
    expect(compositionPlan.map((step) => step.id)).toEqual(['urn:department', 'urn:company']);
    expect(aggregationPlan.map((step) => step.id)).toEqual(['urn:company']);
  });

  it('stops cascade execution when a leaf delete fails', async () => {
    const deleted: string[] = [];
    const dataSource = {
      delete: ({ id }: { id: string }) => {
        deleted.push(id);
        return id === 'urn:office'
          ? Promise.reject(new Error('office delete failed'))
          : Promise.resolve();
      },
    } as unknown as DataSource;

    await expect(
      deleteComposite(
        dataSource,
        inlineCompanyAggregate,
        aggregateRegistry,
        {
          id: 'urn:company',
          departments: [{ id: 'urn:department', offices: [{ id: 'urn:office' }] }],
        } as EntityModel,
        ['departments', 'departments.offices'],
      ),
    ).rejects.toThrow('office delete failed');
    expect(deleted).toEqual(['urn:office']);
  });

  it('loads cross-aggregate composition fields before planning a nested cascade', async () => {
    const readIds: string[] = [];
    const deleted: string[] = [];
    const dataSource = {
      readDetail: ({ id }: { id: string }) => {
        readIds.push(id);
        return Promise.resolve({
          id,
          name: 'Research',
          offices: [{ id: 'urn:office', label: 'Prague' }],
        });
      },
      delete: ({ id }: { id: string }) => {
        deleted.push(id);
        return Promise.resolve();
      },
    } as unknown as DataSource;

    await deleteComposite(
      dataSource,
      companyAggregate,
      aggregateRegistry,
      { id: 'urn:company', departments: [{ id: 'urn:department' }] } as EntityModel,
      ['departments', 'departments.offices'],
    );

    expect(readIds).toEqual(['urn:department']);
    expect(deleted).toEqual(['urn:office', 'urn:department', 'urn:company']);
  });

  it('does not load composition branches that are not selected for deletion', async () => {
    const archivedDepartments: FieldDescriptor = {
      ...departments,
      path: 'archivedDepartments',
      propertyName: 'archivedDepartments',
      label: 'Archived departments',
    };
    const aggregate: AggregateDescriptor = {
      ...companyAggregate,
      fields: [departments, archivedDepartments],
    };
    const readIds: string[] = [];
    const dataSource = {
      readDetail: ({ id }: { id: string }) => {
        readIds.push(id);
        return Promise.resolve({ id, name: 'Department', offices: [] });
      },
      delete: () => Promise.resolve(),
    } as unknown as DataSource;

    await deleteComposite(
      dataSource,
      aggregate,
      aggregateRegistry,
      {
        id: 'urn:company',
        departments: [{ id: 'urn:department:active' }],
        archivedDepartments: [{ id: 'urn:department:archived' }],
      } as EntityModel,
      ['departments'],
    );

    expect(readIds).toEqual(['urn:department:active']);
  });
});

describe('default composite update strategy', () => {
  it('requires the original hydrated payload', async () => {
    const update = vi.fn();
    const strategy = new DefaultUpdateStrategy();

    const result = await strategy.execute({
      aggregate: companyAggregate,
      aggregateRegistry,
      datasource: { update } as unknown as DataSource,
      params: { id: 'urn:company' },
      payload: { id: 'urn:company', departments: [] } as EntityModel,
    });

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          code: ValidationIssueCode.MissingOriginalPayload,
          message: 'Original update payload is missing.',
        },
      ],
    });
    expect(update).not.toHaveBeenCalled();
  });
});

function specializedDepartments(): FieldDescriptor {
  const organizationCode: FieldDescriptor = {
    path: 'organizationCode',
    propertyName: 'organizationCode',
    label: 'Organization code',
    kind: 'primitive',
    formControl: 'text',
    many: false,
    required: false,
  };
  const personCode: FieldDescriptor = {
    ...organizationCode,
    path: 'personCode',
    propertyName: 'personCode',
    label: 'Person code',
  };
  const personOffices: FieldDescriptor = {
    ...offices,
    path: 'personOffices',
    propertyName: 'personOffices',
    label: 'Person offices',
  };
  return {
    ...inlineDepartments,
    fields: [organizationCode, personCode, personOffices],
    specializations: [
      {
        specializationIri: 'urn:psm:organization',
        label: 'Organization',
        classIri: 'urn:class:department',
        fieldPaths: ['organizationCode'],
      },
      {
        specializationIri: 'urn:psm:person',
        label: 'Person',
        classIri: 'urn:class:department',
        fieldPaths: ['personCode', 'personOffices'],
      },
    ],
  };
}

describe('default composite delete strategy', () => {
  it('requires the loaded payload only when cascade paths are configured', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const strategy = new DefaultDeleteStrategy();
    const context = {
      aggregate: companyAggregate,
      aggregateRegistry,
      datasource: { delete: remove } as unknown as DataSource,
      params: { id: 'urn:company' },
    };

    await expect(strategy.execute(context)).resolves.toEqual({ ok: true, data: undefined });
    await expect(strategy.execute({ ...context, cascadePaths: ['departments'] })).resolves.toEqual({
      ok: false,
      issues: [{ code: ValidationIssueCode.MissingPayload, message: 'Delete payload is missing.' }],
    });
    expect(remove).toHaveBeenCalledOnce();
  });
});
