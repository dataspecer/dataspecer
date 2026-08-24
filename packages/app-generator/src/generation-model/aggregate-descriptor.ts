import type { AggregateFieldMetadata, AggregateMetadata } from '../metadata/types.ts';
import type { GeneratedAggregateDescriptor, GeneratedFieldDescriptor } from './types.ts';

import { toAggregateTypeName } from '../utils/naming.ts';

export function buildAggregateDescriptor(
  aggregate: AggregateMetadata
): GeneratedAggregateDescriptor {
  return {
    iri: aggregate.iri,
    name: aggregate.name,
    safeName: toAggregateTypeName(aggregate.name),
    classIri: aggregate.classIri,
    fields: aggregate.fields.map(buildFieldDescriptor),
  };
}

function buildFieldDescriptor(field: AggregateFieldMetadata): GeneratedFieldDescriptor {
  return {
    path: field.path,
    label: field.label,
    ...(field.description ? { description: field.description } : {}),
    kind: field.kind,
    ...(field.propertyIri ? { propertyIri: field.propertyIri } : {}),
    ...(field.datatype ? { datatype: field.datatype } : {}),
    ...(field.patterns?.length ? { patterns: [...field.patterns] } : {}),
    ...(field.examples?.length ? { examples: [...field.examples] } : {}),
    many: field.many ?? false,
    required: field.required ?? false,
    ...(field.minCount !== undefined ? { minCount: field.minCount } : {}),
    ...(field.maxCount !== undefined ? { maxCount: field.maxCount } : {}),
    ...(field.targetAggregateIri ? { targetAggregateIri: field.targetAggregateIri } : {}),
    ...(field.targetClassIri ? { targetClassIri: field.targetClassIri } : {}),
    ...(field.specializations
      ? {
          // identity policy is needed while validating the specification, not by generated apps
          specializations: field.specializations.map(
            ({ identityPolicy: _identityPolicy, ...specialization }) => specialization
          ),
        }
      : {}),
    ...(field.associationKind ? { associationKind: field.associationKind } : {}),
    ...(field.isReverse ? { isReverse: true } : {}),
    ...(field.fields ? { fields: field.fields.map(buildFieldDescriptor) } : {}),
  };
}
