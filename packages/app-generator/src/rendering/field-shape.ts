import type { GeneratedFieldDescriptor } from '../generation-model/types.ts';

/**
 * An association expands into a nested entity only when it exposes inline fields and its target
 * class is known. Without a class IRI there is no @type for the nested schema, so the association
 * is treated as a reference instead.
 */
export function hasNestedSchema(field: GeneratedFieldDescriptor): boolean {
  return Boolean(field.fields?.length && field.targetClassIri);
}
