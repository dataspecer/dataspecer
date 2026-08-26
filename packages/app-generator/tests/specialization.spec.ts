import { describe, expect, it } from 'vitest';

import { normalizeLdkitEntity } from '../assets/generated-app/src/shared/data-source/ldkit-entity-mapping.ts';
import {
  createEntityDraft,
  selectEntitySpecialization,
} from '../assets/generated-app/src/shared/forms/form-draft.ts';
import { validateModel } from '../assets/generated-app/src/shared/forms/form-model.ts';
import {
  effectiveFields,
  resolveLoadedSpecialization,
  resolveSpecialization,
} from '../assets/generated-app/src/shared/forms/specialization.ts';
import { ValidationIssueCode } from '../assets/generated-app/src/shared/operations/operation-result.ts';
import {
  RDF_TYPES_PROPERTY as RUNTIME_RDF_TYPES_PROPERTY,
  SPECIALIZATION_IRI_PROPERTY as RUNTIME_SPECIALIZATION_IRI_PROPERTY,
  type AggregateDescriptor,
  type AggregateDescriptorMap,
  type EntityRecord,
  type FieldDescriptor,
  type SpecializationDescriptor,
} from '../assets/generated-app/src/shared/types/aggregate.ts';
import type { EntityTarget } from '../assets/generated-app/src/shared/forms/entity-target.ts';
import {
  RDF_TYPES_PROPERTY as GENERATOR_RDF_TYPES_PROPERTY,
  SPECIALIZATION_IRI_PROPERTY as GENERATOR_SPECIALIZATION_IRI_PROPERTY,
} from '../src/generation-model/types.ts';

const DISTRIBUTION_CLASS = 'https://example.org/Distribution';
const WEB = 'https://example.org/psm/web';
const SERVICE = 'https://example.org/psm/service';

const sharedName = primitive('name', false);
const accessUrl = primitive('accessUrl', false);
const endpointUrl = primitive('endpointUrl', false);
const distributionSpecializations: SpecializationDescriptor[] = [
  specialization(WEB, 'Web distribution', DISTRIBUTION_CLASS, ['name', 'accessUrl']),
  specialization(SERVICE, 'Data service', DISTRIBUTION_CLASS, ['name', 'endpointUrl']),
];
const distributionTarget: EntityTarget = {
  aggregate: aggregate(),
  fieldPath: ['distributions'],
  name: 'Distribution',
  classIri: DISTRIBUTION_CLASS,
  fields: [sharedName, accessUrl, endpointUrl],
  specializations: distributionSpecializations,
};

describe('immutable specialization selection', () => {
  it('keeps generator and generated-runtime property names aligned', () => {
    expect(RUNTIME_RDF_TYPES_PROPERTY).toBe(GENERATOR_RDF_TYPES_PROPERTY);
    expect(RUNTIME_SPECIALIZATION_IRI_PROPERTY).toBe(GENERATOR_SPECIALIZATION_IRI_PROPERTY);
  });

  it.each([
    ['https://example.org/Organization', 'https://example.org/psm/organization'],
    ['https://example.org/Person', 'https://example.org/psm/person'],
  ])('uses RDF type %s for distinct-class choice %s', (classIri, specializationIri) => {
    const target = contactTarget();
    const loaded = resolveLoadedSpecialization(target, {
      id: 'https://example.org/contact/1',
      __rdfTypes: [classIri],
      name: 'Example',
    });

    expect(loaded.__specializationIri).toBe(specializationIri);
  });

  it.each([
    ['accessUrl', 'https://example.org/download', WEB],
    ['endpointUrl', 'https://example.org/sparql', SERVICE],
  ])(
    'uses populated field %s with value %s for same-class choice %s',
    (path, value, specializationIri) => {
      const loaded = resolveLoadedSpecialization(distributionTarget, {
        id: 'https://example.org/distribution/1',
        __rdfTypes: [DISTRIBUTION_CLASS],
        [path]: value,
      });

      expect(loaded.__specializationIri).toBe(specializationIri);
    },
  );

  it('rejects RDF types that identify different specializations', () => {
    const resolution = resolveSpecialization(contactTarget(), {
      __rdfTypes: ['https://example.org/Organization', 'https://example.org/Person'],
    });

    expect(resolution.kind).toBe('conflicting');
  });

  it('leaves absent and conflicting evidence unresolved', () => {
    const ambiguous = resolveSpecialization(distributionTarget, {
      __rdfTypes: [DISTRIBUTION_CLASS],
      name: 'Shared only',
    });
    const conflicting = resolveSpecialization(distributionTarget, {
      __rdfTypes: [DISTRIBUTION_CLASS],
      accessUrl: 'https://example.org/download',
      endpointUrl: 'https://example.org/sparql',
    });
    const conflictingContact = resolveSpecialization(contactTarget(), {
      __rdfTypes: ['https://example.org/Organization'],
      birthDate: new Date('2000-01-01'),
    });

    expect(ambiguous.kind).toBe('ambiguous');
    expect(conflicting.kind).toBe('conflicting');
    expect(conflictingContact.kind).toBe('conflicting');
  });

  it('shows shared fields before selection, the selected branch, and the union for unresolved loaded data', () => {
    expect(effectiveFields(distributionTarget, {}).map((field) => field.path)).toEqual(['name']);
    expect(
      effectiveFields(distributionTarget, { __specializationIri: WEB }).map((field) => field.path),
    ).toEqual(['name', 'accessUrl']);
    expect(
      effectiveFields(distributionTarget, { __rdfTypes: [DISTRIBUTION_CLASS] }).map(
        (field) => field.path,
      ),
    ).toEqual(['name', 'accessUrl', 'endpointUrl']);
  });

  it('requires a selection and recoverable same-class evidence', () => {
    const registry = { [distributionTarget.aggregate.iri]: distributionTarget.aggregate };
    const missing = validateModel(
      { id: 'https://example.org/distribution/1' },
      distributionTarget,
      registry,
    );
    const noEvidence = validateModel(
      { id: 'https://example.org/distribution/1', __specializationIri: WEB },
      distributionTarget,
      registry,
    );
    const valid = validateModel(
      {
        id: 'https://example.org/distribution/1',
        __specializationIri: WEB,
        accessUrl: 'https://example.org/download',
      },
      distributionTarget,
      registry,
    );

    expect(missing).toContainEqual(
      expect.objectContaining({ code: ValidationIssueCode.SpecializationRequired }),
    );
    expect(noEvidence).toContainEqual(
      expect.objectContaining({ code: ValidationIssueCode.SpecializationEvidenceRequired }),
    );
    expect(valid).toEqual([]);
  });

  it('initializes only shared fields and discards the previous branch when a new choice changes', () => {
    const registry: AggregateDescriptorMap = {
      [distributionTarget.aggregate.iri]: distributionTarget.aggregate,
    };
    const unselected = createEntityDraft(distributionTarget, registry, 'https://example.org/id');
    const web = selectEntitySpecialization(
      { ...unselected, name: 'Distribution' },
      distributionTarget,
      registry,
      'https://example.org/id',
      WEB,
    );
    const service = selectEntitySpecialization(
      { ...web, accessUrl: 'https://example.org/download' },
      distributionTarget,
      registry,
      'https://example.org/id',
      SERVICE,
    );

    expect(unselected).not.toHaveProperty('accessUrl');
    expect(unselected).not.toHaveProperty('endpointUrl');
    expect(service).toMatchObject({ id: unselected.id, name: 'Distribution' });
    expect(service).not.toHaveProperty('accessUrl');
  });

  it('resolves nested specialization state during LDKit normalization', () => {
    const distributions: FieldDescriptor = {
      path: 'distributions',
      propertyName: 'distributions',
      label: 'Distributions',
      kind: 'association',
      propertyIri: 'https://example.org/distribution',
      targetClassIri: DISTRIBUTION_CLASS,
      associationKind: 'composition',
      fields: distributionTarget.fields,
      specializations: distributionSpecializations,
      many: true,
      required: false,
    };

    const normalized = normalizeLdkitEntity(
      {
        $id: 'https://example.org/dataset/1',
        distributions: [
          {
            $id: 'https://example.org/distribution/1',
            __rdfTypes: [DISTRIBUTION_CLASS],
            accessUrl: 'https://example.org/download',
          },
        ],
      },
      [distributions],
    ) as EntityRecord;

    expect((normalized.distributions as EntityRecord[])[0]).toMatchObject({
      __rdfTypes: [DISTRIBUTION_CLASS],
      __specializationIri: WEB,
    });
  });
});

function aggregate(): AggregateDescriptor {
  return {
    iri: 'https://example.org/aggregate/dataset',
    name: 'Dataset',
    classIri: 'https://example.org/Dataset',
    fields: [],
    createEmpty: () => ({}),
  };
}

function contactTarget(): EntityTarget {
  return {
    aggregate: aggregate(),
    fieldPath: ['contacts'],
    name: 'Contact',
    classIri: 'https://example.org/Contact',
    fields: [sharedName, primitive('registrationNumber', false), primitive('birthDate', false)],
    specializations: [
      specialization(
        'https://example.org/psm/organization',
        'Organization',
        'https://example.org/Organization',
        ['name', 'registrationNumber'],
      ),
      specialization('https://example.org/psm/person', 'Person', 'https://example.org/Person', [
        'name',
        'birthDate',
      ]),
    ],
  };
}

function primitive(path: string, required: boolean): FieldDescriptor {
  return {
    path,
    propertyName: path,
    label: path,
    kind: 'primitive',
    propertyIri: `https://example.org/${path}`,
    formControl: path === 'birthDate' ? 'date' : 'text',
    many: false,
    required,
  };
}

function specialization(
  specializationIri: string,
  label: string,
  classIri: string,
  fieldPaths: string[],
): SpecializationDescriptor {
  return { specializationIri, label, classIri, fieldPaths };
}
