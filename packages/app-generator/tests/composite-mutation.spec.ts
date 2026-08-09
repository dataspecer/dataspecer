import { describe, expect, it } from 'vitest';

import type { DataSource } from '../assets/generated-app/static/src/shared/datasource/data-source.ts';
import type { DraftEntity } from '../assets/generated-app/static/src/shared/forms/form-draft.ts';
import {
  buildCompositeCreatePlan,
  buildCompositeDeletePlan,
  buildCompositeUpdatePlan,
  createComposite,
  deleteComposite,
} from '../assets/generated-app/static/src/shared/operations/composite-mutation.ts';
import { DefaultDeleteStrategy } from '../assets/generated-app/static/src/shared/operations/delete-strategy.ts';
import { ValidationIssueCode } from '../assets/generated-app/static/src/shared/operations/operation-result.ts';
import { DefaultUpdateStrategy } from '../assets/generated-app/static/src/shared/operations/update-strategy.ts';
import type {
  AggregateDescriptor,
  AggregateDescriptorMap,
  FieldDescriptor,
} from '../assets/generated-app/static/src/shared/types/aggregate.ts';

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

const original: DraftEntity = {
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
    const payload: DraftEntity = {
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
    expect(plan[1].payload?.offices).toEqual([{ id: 'urn:office' }]);
    expect(plan[2].payload?.departments).toEqual([{ id: 'urn:department' }]);
    expect(plan[2].payload?.partners).toEqual([{ id: 'urn:partner' }]);
  });

  it('updates children before their parent and deletes removed subtrees after unlinking', () => {
    const payload: DraftEntity = {
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
    expect(plan[1].payload?.departments).toEqual([{ id: 'urn:department:new' }]);
  });

  it('stops before creating an ancestor when a child write fails', async () => {
    const calls: string[] = [];
    const dataSource = {
      create: ({ payload }: { payload: DraftEntity }) => {
        calls.push(payload.id as string);
        if (payload.id === 'urn:office') {
          return Promise.reject(new Error('office failed'));
        }
        return Promise.resolve(payload);
      },
    } as unknown as DataSource;
    const payload: DraftEntity = {
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
      createComposite(dataSource, companyAggregate, aggregateRegistry, payload)
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
      { id: 'urn:localized', labels }
    );

    expect(plan[0].payload).not.toHaveProperty('labels');
  });

  it('plans selected nested composition deletes leaves first', () => {
    const payload: DraftEntity = {
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

  it('accepts a declared cascade without a form kind and does not cascade aggregations', () => {
    const payload: DraftEntity = {
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
    const deleteOnlyAggregate: AggregateDescriptor = {
      ...companyAggregate,
      fields: [{ ...departments, associationKind: undefined }],
    };
    const declaredPlan = buildCompositeDeletePlan(deleteOnlyAggregate, aggregateRegistry, payload, [
      'departments',
    ]);

    expect(compositionPlan.map((step) => step.id)).toEqual(['urn:department', 'urn:company']);
    expect(aggregationPlan.map((step) => step.id)).toEqual(['urn:company']);
    expect(declaredPlan.map((step) => step.id)).toEqual(['urn:department', 'urn:company']);
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
        },
        ['departments', 'departments.offices']
      )
    ).rejects.toThrow('office delete failed');
    expect(deleted).toEqual(['urn:office']);
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
      payload: { id: 'urn:company', departments: [] },
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
