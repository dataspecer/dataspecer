import { sortBy } from 'es-toolkit';

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
    fields: sortBy(aggregate.fields, [(field) => field.path]).map(buildFieldDescriptor),
  };
}

function buildFieldDescriptor(field: AggregateFieldMetadata): GeneratedFieldDescriptor {
  return {
    path: field.path,
    label: field.label,
    kind: field.kind,
    ...(field.propertyIri ? { propertyIri: field.propertyIri } : {}),
    ...(field.datatype ? { datatype: field.datatype } : {}),
    many: field.many ?? false,
    required: field.required ?? false,
    ...(field.targetAggregateIri ? { targetAggregateIri: field.targetAggregateIri } : {}),
    ...(field.targetClassIri ? { targetClassIri: field.targetClassIri } : {}),
    ...(field.associationKind ? { associationKind: field.associationKind } : {}),
    ...(field.isReverse ? { isReverse: true } : {}),
    ...(field.fields
      ? { fields: sortBy(field.fields, [(child) => child.path]).map(buildFieldDescriptor) }
      : {}),
  };
}
